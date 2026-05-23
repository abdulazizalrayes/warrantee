import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  canApproveWarranty,
  isPlatformAdminRole,
} from "@/lib/server/company-team";
import { NextRequest, NextResponse } from "next/server";

type ApprovalWarranty = {
  id: string;
  status: string;
  product_name: string | null;
  company_id?: string | null;
  issuer_company_id?: string | null;
  created_by?: string | null;
  issuer_user_id?: string | null;
};

const REJECTED_WARRANTY_STATUS = "cancelled";

function isMissingColumnError(error: unknown, column: string) {
  const message = String((error as { message?: unknown })?.message || "");
  return (
    message.includes(`'${column}' column`) ||
    message.includes(`column ${column}`) ||
    message.includes(`column "${column}"`) ||
    message.includes(`.${column}`)
  );
}

async function getApproverProfile(admin: ReturnType<typeof createSupabaseAdminClient>, userId: string) {
  const result = await admin
    .from("profiles")
    .select("role, company_id")
    .eq("id", userId)
    .single();

  if (!result.error) return result.data as { role: string | null; company_id?: string | null };

  if (isMissingColumnError(result.error, "company_id")) {
    const fallback = await admin
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (!fallback.error && fallback.data) {
      return { ...(fallback.data as { role: string | null }), company_id: null };
    }
  }

  return null;
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

  if (!profile || !canApproveWarranty(profile.role)) {
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
  const warrantySelect = isPlatformAdmin
    ? "id, status, product_name, created_by, issuer_user_id"
    : "id, status, product_name, company_id, issuer_company_id, created_by, issuer_user_id";

  const { data: warrantyRow, error: fetchError } = await admin
    .from("warranties")
    .select(warrantySelect)
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

  const warrantyCompanyId = "company_id" in warranty
    ? warranty.company_id || warranty.issuer_company_id || null
    : null;
  if (!isPlatformAdmin) {
    if (!profile.company_id || !warrantyCompanyId || profile.company_id !== warrantyCompanyId) {
      return NextResponse.json(
        { error: "Forbidden: you can only reject warranties for your own company" },
        { status: 403 }
      );
    }
  }

  const { error: updateError } = await admin
    .from("warranties")
    .update({ status: REJECTED_WARRANTY_STATUS, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "pending_approval");

  if (updateError) {
    return NextResponse.json({ error: "Failed to reject warranty" }, { status: 500 });
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
