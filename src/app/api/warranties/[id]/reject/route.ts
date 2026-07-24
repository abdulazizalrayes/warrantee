import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  isPlatformAdminRole,
} from "@/lib/server/company-team";
import { NextRequest, NextResponse } from "next/server";

type ApprovalWarranty = {
  id: string;
  status: string;
  product_name: string | null;
  issuer_company_id?: string | null;
  created_by?: string | null;
  issuer_user_id?: string | null;
};

const REJECTED_WARRANTY_STATUS = "cancelled";

async function getApproverProfile(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  userId: string
) {
  const { data, error } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  return error ? null : data as { role: string | null };
}

async function canApproveForCompany(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
  companyId: string | null | undefined
) {
  if (!companyId) return false;
  const { data, error } = await admin
    .from("company_members")
    .select("id")
    .eq("company_id", companyId)
    .eq("user_id", userId)
    .eq("is_active", true)
    .in("role", ["approver", "company_admin", "platform_admin"])
    .limit(1)
    .maybeSingle();

  return !error && Boolean(data);
}

// POST /api/warranties/[id]/reject
// Body: { reason: string }
// Transitions: pending_approval -> cancelled. The product labels this terminal
// state as "Rejected" in approval views, while the live database enum stores it
// as "cancelled".
// Requires role: approver, company_admin, or platform_admin
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const admin = createSupabaseAdminClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getApproverProfile(admin, user.id);

  if (!profile) {
    return NextResponse.json(
      { error: "Forbidden: approver role required" },
      { status: 403 }
    );
  }

  let reason = "";
  try {
    const body = await req.json();
    reason = (body?.reason || "").trim();
  } catch {
    // no body is fine; reason stays empty
  }

  if (!reason) {
    return NextResponse.json(
      { error: "A rejection reason is required" },
      { status: 400 }
    );
  }

  const isPlatformAdmin = isPlatformAdminRole(profile.role);
  const { data: warrantyRow, error: fetchError } = await admin
    .from("warranties")
    .select("id, status, product_name, issuer_company_id, created_by, issuer_user_id")
    .eq("id", id)
    .single();
  const warranty = warrantyRow as ApprovalWarranty | null;

  if (fetchError || !warranty) {
    return NextResponse.json({ error: "Warranty not found" }, { status: 404 });
  }

  if (warranty.status !== "pending_approval") {
    return NextResponse.json(
      { error: `Cannot reject warranty in '${warranty.status}' status. Must be 'pending_approval'.` },
      { status: 422 }
    );
  }

  if (
    !isPlatformAdmin &&
    !(await canApproveForCompany(admin, user.id, warranty.issuer_company_id))
  ) {
    return NextResponse.json(
      { error: "Forbidden: approver membership required for this company" },
      { status: 403 }
    );
  }

  const { data: updatedWarranty, error: updateError } = await admin
    .from("warranties")
    .update({ status: REJECTED_WARRANTY_STATUS, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "pending_approval")
    .select("id")
    .maybeSingle();

  if (updateError) {
    return NextResponse.json({ error: "Failed to reject warranty" }, { status: 500 });
  }
  if (!updatedWarranty) {
    return NextResponse.json(
      { error: "Warranty status changed before rejection completed" },
      { status: 409 }
    );
  }

  await admin.from("activity_log").insert({
    actor_id: user.id,
    entity_type: "warranty",
    entity_id: id,
    action: "rejected",
    previous_state: { status: "pending_approval" },
    new_state: { status: REJECTED_WARRANTY_STATUS },
    details: { reason },
  });

  const recipients = [...new Set([warranty.created_by, warranty.issuer_user_id].filter(Boolean))];
  if (recipients.length > 0) {
    await admin.from("notifications").insert(
      recipients.map((recipientId) => ({
        user_id: recipientId,
        warranty_id: id,
        type: "warranty_rejected",
        title: "Warranty Rejected",
        body: `${warranty.product_name} was rejected: ${reason}`,
      }))
    );
  }

  return NextResponse.json({ success: true, status: REJECTED_WARRANTY_STATUS, reason });
}
