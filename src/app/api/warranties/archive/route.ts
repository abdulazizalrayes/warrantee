import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { canMutateWarranty } from '@/lib/warranty-access';

const ADMIN_ROLES = new Set(['admin', 'super_admin', 'platform_admin']);

async function getAuthenticatedUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  return user;
}

async function isPlatformAdmin(supabase: ReturnType<typeof createSupabaseAdminClient>, userId: string) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  return ADMIN_ROLES.has(profile?.role || '');
}

// POST: Archive a warranty (soft-delete)
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createSupabaseAdminClient();
    const body = await request.json();
    const { warranty_id, reason } = body;

    if (!warranty_id) {
      return NextResponse.json(
        { error: 'warranty_id is required' },
        { status: 400 }
      );
    }

    // Check if warranty is under legal hold
    const { data: warranty, error: fetchError } = await supabase
      .from('warranties')
      .select('id, legal_hold, is_archived, user_id, created_by, seller_id, issuer_user_id')
      .eq('id', warranty_id)
      .single();

    if (fetchError || !warranty) {
      return NextResponse.json(
        { error: 'Warranty not found' },
        { status: 404 }
      );
    }

    const isAdmin = await isPlatformAdmin(supabase, user.id);
    if (!isAdmin && !canMutateWarranty(warranty, user.id)) {
      return NextResponse.json(
        { error: 'You do not have permission to archive this warranty' },
        { status: 403 }
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
        archived_by: user.id,
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
        archived_by: user.id,
      })
      .eq('warranty_id', warranty_id)
      .eq('is_archived', false);

    return NextResponse.json({
      success: true,
      message: 'Warranty and related claims archived successfully',
    });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH: Restore an archived warranty
export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createSupabaseAdminClient();
    const body = await request.json();
    const { warranty_id } = body;

    if (!warranty_id) {
      return NextResponse.json(
        { error: 'warranty_id is required' },
        { status: 400 }
      );
    }

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

    const isAdmin = await isPlatformAdmin(supabase, user.id);
    const isArchiver = warranty.archived_by === user.id;

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
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
