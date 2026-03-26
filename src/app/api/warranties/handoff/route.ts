import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

// POST: Create a servicing handoff (manufacturer delegates servicing to a local company)
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json();
    const {
      warranty_id,
      servicing_company_id,
      initiated_by,
      notes,
    } = body;

    if (!warranty_id || !servicing_company_id || !initiated_by) {
      return NextResponse.json(
        { error: 'warranty_id, servicing_company_id, and initiated_by are required' },
        { status: 400 }
      );
    }

    // Verify warranty exists and is not archived
    const { data: warranty, error: wErr } = await supabase
      .from('warranties')
      .select('id, issuer_company_id, is_archived, legal_hold')
      .eq('id', warranty_id)
      .single();

    if (wErr || !warranty) {
      return NextResponse.json({ error: 'Warranty not found' }, { status: 404 });
    }

    if (warranty.is_archived) {
      return NextResponse.json(
        { error: 'Cannot handoff an archived warranty' },
        { status: 403 }
      );
    }

    // Verify the initiator belongs to the issuer company
    const { data: membership } = await supabase
      .from('company_members')
      .select('id')
      .eq('company_id', warranty.issuer_company_id)
      .eq('user_id', initiated_by)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: 'Only the issuing company can delegate servicing' },
        { status: 403 }
      );
    }

    // Verify servicing company exists
    const { data: servicingCompany } = await supabase
      .from('companies')
      .select('id, name_en, name_ar')
      .eq('id', servicing_company_id)
      .single();

    if (!servicingCompany) {
      return NextResponse.json(
        { error: 'Servicing company not found' },
        { status: 404 }
      );
    }

    // Check for existing active handoff
    const { data: existingHandoff } = await supabase
      .from('warranty_chain_assignments')
      .select('id')
      .eq('warranty_id', warranty_id)
      .eq('assignment_type', 'servicing_handoff')
      .is('revoked_at', null)
      .single();

    if (existingHandoff) {
      return NextResponse.json(
        { error: 'An active servicing handoff already exists for this warranty. Revoke it first.' },
        { status: 409 }
      );
    }

    // Create the handoff assignment
    const { data: assignment, error: insertErr } = await supabase
      .from('warranty_chain_assignments')
      .insert({
        warranty_id,
        assigned_to: servicing_company_id,
        assigned_by: initiated_by,
        assignment_type: 'servicing_handoff',
        servicing_company_id,
        initiated_by,
        notes: notes || null,
      })
      .select()
      .single();

    if (insertErr) {
      return NextResponse.json(
        { error: 'Failed to create handoff', details: insertErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      assignment,
      message: `Servicing handoff to ${servicingCompany.name_en || servicingCompany.name_ar} created`,
    });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: Revoke a servicing handoff
export async function DELETE(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json();
    const { assignment_id, revoked_by, reason } = body;

    if (!assignment_id || !revoked_by) {
      return NextResponse.json(
        { error: 'assignment_id and revoked_by are required' },
        { status: 400 }
      );
    }

    // Fetch the assignment
    const { data: assignment } = await supabase
      .from('warranty_chain_assignments')
      .select('id, warranty_id, assignment_type, revoked_at')
      .eq('id', assignment_id)
      .single();

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    if (assignment.assignment_type !== 'servicing_handoff') {
      return NextResponse.json(
        { error: 'Only servicing handoffs can be revoked via this endpoint' },
        { status: 400 }
      );
    }

    if (assignment.revoked_at) {
      return NextResponse.json(
        { error: 'This handoff is already revoked' },
        { status: 409 }
      );
    }

    // Verify revoker belongs to the issuer company
    const { data: warranty } = await supabase
      .from('warranties')
      .select('issuer_company_id')
      .eq('id', assignment.warranty_id)
      .single();

    if (warranty) {
      const { data: membership } = await supabase
        .from('company_members')
        .select('id')
        .eq('company_id', warranty.issuer_company_id)
        .eq('user_id', revoked_by)
        .single();

      // Also allow admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', revoked_by)
        .single();

      if (!membership && profile?.role !== 'admin') {
        return NextResponse.json(
          { error: 'Only the issuing company or admin can revoke a handoff' },
          { status: 403 }
        );
      }
    }

    const { error: updateErr } = await supabase
      .from('warranty_chain_assignments')
      .update({
        revoked_at: new Date().toISOString(),
        revoked_by,
        revocation_reason: reason || 'Handoff revoked by issuer',
      })
      .eq('id', assignment_id);

    if (updateErr) {
      return NextResponse.json(
        { error: 'Failed to revoke handoff' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Servicing handoff revoked successfully',
    });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET: List active handoffs for a warranty
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const warranty_id = searchParams.get('warranty_id');

    if (!warranty_id) {
      return NextResponse.json(
        { error: 'warranty_id query param is required' },
        { status: 400 }
      );
    }

    const { data: handoffs, error } = await supabase
      .from('warranty_chain_assignments')
      .select(`
        id,
        warranty_id,
        assigned_to,
        assigned_by,
        assignment_type,
        servicing_company_id,
        initiated_by,
        notes,
        revoked_at,
        revoked_by,
        revocation_reason,
        created_at
      `)
      .eq('warranty_id', warranty_id)
      .eq('assignment_type', 'servicing_handoff')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch handoffs' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      handoffs: handoffs || [],
      active_count: (handoffs || []).filter((h: { revoked_at: string | null }) => !h.revoked_at).length,
    });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
