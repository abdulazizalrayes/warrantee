import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { apiRateLimit, getClientIp, getRateLimitHeaders } from "@/lib/rate-limit";

const ADMIN_INVITE_ROLES = new Set(["admin", "support", "super_admin"]);

type AdminInvitation = {
  id: string;
  email: string;
  role: string;
  status: string;
  expires_at: string;
  invited_by_name: string | null;
};

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

async function getAuthUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  );

  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

function normalizeEmail(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase();
}

function validateInvitation(invitation: AdminInvitation) {
  if (!ADMIN_INVITE_ROLES.has(invitation.role)) return "Invitation role is invalid";
  if (invitation.status === "accepted") return "Invitation already accepted";
  if (invitation.status === "revoked") return "Invitation has been revoked";
  if (invitation.status === "expired" || new Date(invitation.expires_at) < new Date()) {
    return "Invitation has expired";
  }
  if (!["pending", "sent"].includes(invitation.status)) return "Invitation is not active";
  return null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const rateLimitResult = await apiRateLimit(getClientIp(request));
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: "Too many invitation checks" },
      { status: 429, headers: getRateLimitHeaders(rateLimitResult) },
    );
  }

  const { token } = await params;
  const supabaseAdmin = getSupabaseAdmin();
  const { data: invitation } = await supabaseAdmin
    .from("admin_invitations")
    .select("id, email, role, status, expires_at, invited_by_name")
    .eq("token", token)
    .maybeSingle<AdminInvitation>();

  if (!invitation) {
    return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  }
  const validationError = validateInvitation(invitation);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 404 });
  }

  return NextResponse.json({
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    invited_by_name: invitation.invited_by_name,
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const rateLimitResult = await apiRateLimit(getClientIp(request));
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: "Too many invitation attempts" },
      { status: 429, headers: getRateLimitHeaders(rateLimitResult) },
    );
  }

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Please sign in first" }, { status: 401 });
  }

  const { token } = await params;
  const supabaseAdmin = getSupabaseAdmin();
  const { data: invitation } = await supabaseAdmin
    .from("admin_invitations")
    .select("id, email, role, status, expires_at, invited_by_name")
    .eq("token", token)
    .maybeSingle<AdminInvitation>();

  if (!invitation) {
    return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  }
  const validationError = validateInvitation(invitation);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 404 });
  }

  if (normalizeEmail(invitation.email) !== normalizeEmail(user.email)) {
    return NextResponse.json(
      { error: "Sign in with the invited email address to accept this invitation" },
      { status: 403 },
    );
  }

  const { data: acceptedInvitation, error: invitationError } = await supabaseAdmin
    .from("admin_invitations")
    .update({
      status: "accepted",
      accepted_at: new Date().toISOString(),
      accepted_by: user.id,
    })
    .eq("id", invitation.id)
    .in("status", ["pending", "sent"])
    .select("id")
    .maybeSingle();

  if (invitationError || !acceptedInvitation) {
    return NextResponse.json({ error: "Failed to finalize invitation" }, { status: 500 });
  }

  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .update({ role: invitation.role })
    .eq("id", user.id);

  if (profileError) {
    return NextResponse.json({ error: "Failed to update account role" }, { status: 500 });
  }

  await supabaseAdmin.from("admin_audit_log").insert({
    admin_id: user.id,
    action: "admin_invitation_accepted",
    entity_type: "admin_invitation",
    entity_id: invitation.id,
    details: { email: invitation.email, role: invitation.role },
    risk_level: invitation.role === "super_admin" ? "high" : "medium",
  });

  return NextResponse.json({ status: "accepted", role: invitation.role });
}
