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

function isMissingColumnError(error: unknown, column: string) {
  const message = String((error as { message?: unknown })?.message || "");
  return (
    message.includes(`'${column}' column`) ||
    message.includes(`column ${column}`) ||
    message.includes(`column "${column}"`) ||
    message.includes(`.${column}`)
  );
}

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

// POST /api/warranties/[id]/approve
// Transitions: pending_approval → active
// Requires role: approver, company_admin, or platform_admin
export async function POST(
  _req: NextRequest,
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
      { error: `Cannot approve warranty in '${warranty.status}' status. Must be 'pending_approval'.` },
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

  const now = new Date().toISOString();
  let { data: updatedWarranty, error: updateError } = await admin
    .from("warranties")
    .update({
      status: "active",
      approved_by: user.id,
      approved_at: now,
      updated_at: now,
    })
    .eq("id", id)
    .eq("status", "pending_approval")
    .select("id")
    .maybeSingle();

  if (updateError && (isMissingColumnError(updateError, "approved_by") || isMissingColumnError(updateError, "approved_at"))) {
    const retry = await admin
      .from("warranties")
      .update({
        status: "active",
        updated_at: now,
      })
      .eq("id", id)
      .eq("status", "pending_approval")
      .select("id")
      .maybeSingle();
    updateError = retry.error;
    updatedWarranty = retry.data;
  }

  if (updateError) {
    return NextResponse.json({ error: "Failed to approve warranty" }, { status: 500 });
  }
  if (!updatedWarranty) {
    return NextResponse.json(
      { error: "Warranty status changed before approval completed" },
      { status: 409 }
    );
  }

  await admin.from("activity_log").insert({
    actor_id: user.id,
    entity_type: "warranty",
    entity_id: id,
    action: "approved",
    previous_state: { status: "pending_approval" },
    new_state: { status: "active" },
  });

  const recipients = [...new Set([warranty.created_by, warranty.issuer_user_id].filter(Boolean))];
  if (recipients.length > 0) {
    await admin.from("notifications").insert(
      recipients.map((recipientId) => ({
        user_id: recipientId,
        warranty_id: id,
        type: "warranty_approved",
        title: "Warranty Approved",
        body: `${warranty.product_name} has been approved and is now active`,
      }))
    );
  }

  return NextResponse.json({ success: true, status: "active", approved_at: now });
}
