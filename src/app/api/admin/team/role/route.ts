import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { apiRateLimit, getClientIp, getRateLimitHeaders } from "@/lib/rate-limit";
import { isValidEmail } from "@/lib/validation";

const ASSIGNABLE_ADMIN_ROLES = new Set(["user", "support", "admin"]);

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

async function getRequester() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, email")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "super_admin") return null;
  return { user, profile };
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export async function PATCH(request: NextRequest) {
  const rateLimitResult = await apiRateLimit(getClientIp(request));
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: "Too many admin team updates" },
      { status: 429, headers: getRateLimitHeaders(rateLimitResult) },
    );
  }

  const requester = await getRequester();
  if (!requester) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { userId?: string; email?: string; role?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const requestedRole = body.role;
  if (!requestedRole || !ASSIGNABLE_ADMIN_ROLES.has(requestedRole)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  let query = supabaseAdmin
    .from("profiles")
    .select("id, email, full_name, role")
    .limit(1);

  if (body.userId) {
    query = query.eq("id", body.userId);
  } else if (body.email && isValidEmail(body.email)) {
    query = query.eq("email", normalizeEmail(body.email));
  } else {
    return NextResponse.json({ error: "A valid user ID or email is required" }, { status: 400 });
  }

  const { data: target, error: lookupError } = await query.maybeSingle();
  if (lookupError) {
    return NextResponse.json({ error: "Failed to look up that user" }, { status: 500 });
  }
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (target.id === requester.user.id) {
    return NextResponse.json({ error: "Use another super admin account to change your own access" }, { status: 422 });
  }
  if (target.role === "super_admin") {
    return NextResponse.json({ error: "Super admin access cannot be changed here" }, { status: 422 });
  }

  const { data: updatedProfile, error: updateError } = await supabaseAdmin
    .from("profiles")
    .update({ role: requestedRole })
    .eq("id", target.id)
    .select("id, email, full_name, role, created_at")
    .single();

  if (updateError || !updatedProfile) {
    return NextResponse.json({ error: "Failed to update that role" }, { status: 500 });
  }

  await supabaseAdmin.from("admin_audit_log").insert({
    admin_id: requester.user.id,
    action: "role_change",
    entity_type: "profile",
    entity_id: target.id,
    details: { email: target.email, changed_by: requester.user.id },
    previous_state: { role: target.role },
    new_state: { role: requestedRole },
    risk_level: target.role === "super_admin" || requestedRole === "admin" ? "high" : "medium",
  });

  return NextResponse.json({ profile: updatedProfile });
}
