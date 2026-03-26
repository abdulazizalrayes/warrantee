import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

// POST: Archive a warranty (soft-delete)
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json();
    const { warranty_id, reason, user_id } = body;

    if (!warranty_id || !user_id) {
      return NextResponse.json(
        { error: 'warranty_id and user_id are required' },
        { status: 400 }
      );
    }

    // Check if warranty is under legal hold
    const { data: warranty, error: fetchError } = await supabase
      .from('warranties')
      .select('id, legal_hold, is_archived, creator_id')
      .eq('id', warranty_id)
      .single();

    if (fetchError || !warranty) {
      return NextResponse.json(
        { error: 'Warranty not found' },
        { status: 404 }
      );
    }

    if (warranty.legal_hold) {
      return NextResponse.json(
        { error: 'Cannot archive: warranty is under legal hold' },
        { status: 403 }
      );
    }

    if (warranty.is_archived) {
      return NextResponse.json(
        { error: 'Warranty is already archived' },
        { status: 409 }
      );
    }

    // Archive the warranty
    const { error: updateError } = await supabase
      .from('warranties')
      .update({
        is_archived: true,
        archived_at: new Date().toISOString(),
        archived_by: user_id,
        archive_reason: reason || 'User requested archive',
      })
      .eq('id', warranty_id);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to archive warranty', details: updateError.message },
        { status: 500 }
      );
    }

    // Also archive related claims
    await supabase
      .from('warranty_claims')
      .update({
        is_archived: true,
        archived_at: new Date().toISOString(),
        archived_by: user_id,
      })
      .eq('warranty_id', warranty_id)
      .eq('is_archived', false);

    return NextResponse.json({
      success: true,
      message: 'Warranty and related claims archived successfully',
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH: Restore an archived warranty
export async function PATCH(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json();
    const { warranty_id, user_id } = body;

    if (!warranty_id || !user_id) {
      return NextResponse.json(
        { error: 'warranty_id and user_id are required' },
        { status: 400 }
      );
    }

    // Check admin role for restore
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user_id)
      .single();

    // Only admin or the original archiver can restore
    const { data: warranty } = await supabase
      .from('warranties')
      .select('id, is_archived, archived_by, legal_hold')
      .eq('id', warranty_id)
      .single();

    if (!warranty || !warranty.is_archived) {
      return NextResponse.json(
        { error: 'Warranty not found or not archived' },
        { status: 404 }
      );
    }

    const isAdmin = profile?.role === 'admin';
    const isArchiver = warranty.archived_by === user_id;

    if (!isAdmin && !isArchiver) {
      return NextResponse.json(
        { error: 'Only admin or the person who archived can restore' },
        { status: 403 }
      );
    }

    const { error: updateError } = await supabase
      .from('warranties')
      .update({
        is_archived: false,
        archived_at: null,
        archived_by: null,
        archive_reason: null,
      })
      .eq('id', warranty_id);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to restore warranty' },
        { status: 500 }
      );
    }

    // Restore related claims
    await supabase
      .from('warranty_claims')
      .update({
        is_archived: false,
        archived_at: null,
        archived_by: null,
      })
      .eq('warranty_id', warranty_id)
      .eq('is_archived', true);

    return NextResponse.json({
      success: true,
      message: 'Warranty and related claims restored successfully',
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
