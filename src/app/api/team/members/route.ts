import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  TEAM_TIERS,
  canManageCompanyTeam,
  getEmailDomain,
  isCommonEmailDomain,
  mapStoredRoleToTeamTier,
  mapTeamTierToStoredRole,
  normalizeEmail,
} from "@/lib/server/company-team";
import { isValidEmail, isValidUUID, isOneOf } from "@/lib/validation";

type TeamProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  created_at?: string;
};

type CompanyMembershipRow = {
  id: string;
  company_id: string;
  user_id: string;
  is_active?: boolean | null;
};

type RequesterContext = {
  admin: ReturnType<typeof createSupabaseAdminClient>;
  user: any;
  profile: TeamProfileRow;
  allowedDomain: string;
  companyId: string | null;
};

const PROFILE_SELECT = "id, email, full_name, role, created_at";

const FOUNDER_TEAM_EMAILS = new Set(
  (process.env.WARRANTEE_SUPERADMIN_EMAILS || "hello@warrantee.io,abdulaziz.alrayes@gmail.com")
    .split(",")
    .map((email) => normalizeEmail(email))
    .filter(Boolean)
);

function getUserEmail(user: any) {
  return normalizeEmail(user?.email || user?.user_metadata?.email || "");
}

function getUserFullName(user: any) {
  return (
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.user_metadata?.user_name ||
    user?.email?.split("@")[0] ||
    null
  );
}

function isWarranteeCompanyBootstrapEmail(email: string) {
  return getEmailDomain(email) === "warrantee.io";
}

function getManagedCompanyDomain(email: string) {
  if (FOUNDER_TEAM_EMAILS.has(email) || isWarranteeCompanyBootstrapEmail(email)) {
    return "warrantee.io";
  }

  const domain = getEmailDomain(email);
  return domain && !isCommonEmailDomain(domain) ? domain : "";
}

async function createBootstrapProfile(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  user: any
) {
  const email = getUserEmail(user);
  const domain = getEmailDomain(email);
  if (!email || !domain || isCommonEmailDomain(domain)) {
    return null;
  }

  let role = "viewer";
  if (FOUNDER_TEAM_EMAILS.has(email) || isWarranteeCompanyBootstrapEmail(email)) {
    role = "company_admin";
  } else {
    const { count } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .ilike("email", `%@${domain}`);

    if (!count) {
      role = "company_admin";
    }
  }

  const { data, error } = await admin
    .from("profiles")
    .upsert({
      id: user.id,
      email,
      full_name: getUserFullName(user),
      role,
    })
    .select(PROFILE_SELECT)
    .single();

  if (!error && data) return data as TeamProfileRow;
  return null;
}

async function getRequesterContext() {
  const supabase = await createServerSupabaseClient();
  const admin = createSupabaseAdminClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("id", user.id)
    .single();

  let requesterProfile = profile as TeamProfileRow | null;
  if (profileError || !requesterProfile) {
    requesterProfile = await createBootstrapProfile(admin, user);
  }

  const email = getUserEmail(user) || normalizeEmail(requesterProfile?.email || "");
  const allowedDomain = getManagedCompanyDomain(email);
  const { data: membership } = await admin
    .from("company_members")
    .select("id, company_id, user_id, is_active")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!requesterProfile) {
    requesterProfile = {
      id: user.id,
      email,
      full_name: getUserFullName(user),
      role: allowedDomain ? "company_admin" : "viewer",
      created_at: new Date().toISOString(),
    };
  }

  if (!allowedDomain) {
    return {
      error: NextResponse.json(
        { error: "Your company must use a business email domain before managing teammates" },
        { status: 403 }
      ),
    };
  }

  if (!canManageCompanyTeam(requesterProfile.role)) {
    const { count } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .ilike("email", `%@${allowedDomain}`);

    const shouldBootstrapCompanyAdmin =
      allowedDomain === "warrantee.io" || !count || count <= 1;

    if (shouldBootstrapCompanyAdmin) {
      const { data: updatedProfile } = await admin
        .from("profiles")
        .update({ role: "company_admin" })
        .eq("id", requesterProfile.id)
        .select(PROFILE_SELECT)
        .single();

      if (updatedProfile) {
        requesterProfile = updatedProfile as TeamProfileRow;
      } else {
        requesterProfile = { ...requesterProfile, role: "company_admin" };
      }
    }
  }

  return {
    admin,
    user,
    profile: requesterProfile,
    allowedDomain,
    companyId: membership?.company_id || null,
  } satisfies RequesterContext;
}

function formatMember(member: TeamProfileRow) {
  return {
    id: member.id,
    email: member.email,
    full_name: member.full_name,
    role: mapStoredRoleToTeamTier(member.role),
    raw_role: member.role,
    created_at: member.created_at ?? null,
  };
}

async function getActiveCompanyMemberships(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  companyId: string
) {
  const { data } = await admin
    .from("company_members")
    .select("id, company_id, user_id, is_active")
    .eq("company_id", companyId)
    .eq("is_active", true);

  return (data || []) as CompanyMembershipRow[];
}

async function getCompanyMemberProfileMap(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  memberships: CompanyMembershipRow[]
) {
  const memberIds = Array.from(
    new Set(memberships.map((membership) => membership.user_id).filter(Boolean))
  );

  if (!memberIds.length) {
    return new Map<string, TeamProfileRow>();
  }

  const { data } = await admin
    .from("profiles")
    .select(PROFILE_SELECT)
    .in("id", memberIds);

  return new Map(
    ((data || []) as TeamProfileRow[]).map((member) => [member.id, member])
  );
}

async function getCompanyMemberProfiles(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  companyId: string
) {
  const memberships = await getActiveCompanyMemberships(admin, companyId);
  const profileMap = await getCompanyMemberProfileMap(admin, memberships);

  return memberships
    .map((membership) => profileMap.get(membership.user_id))
    .filter(Boolean) as TeamProfileRow[];
}

async function countActiveMembershipsForUser(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  userId: string
) {
  const { count, error } = await admin
    .from("company_members")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_active", true);

  if (error) {
    console.error("Active membership count error:", error);
    return null;
  }

  return count ?? 0;
}

async function countCompanySuperadmins(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  companyId: string | null,
  domain: string
) {
  if (companyId) {
    const members = await getCompanyMemberProfiles(admin, companyId);
    return members.filter((member) => mapStoredRoleToTeamTier(member.role) === "superadmin").length;
  }

  const { data } = await admin
    .from("profiles")
    .select("id, email, role")
    .ilike("email", `%@${domain}`);

  return (data || []).filter((member: any) => mapStoredRoleToTeamTier(member.role) === "superadmin").length;
}

async function findMemberProfile(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  companyId: string | null,
  allowedDomain: string,
  memberId: string
) {
  if (companyId) {
    const memberships = await getActiveCompanyMemberships(admin, companyId);
    const targetMembership = memberships.find((membership) => membership.user_id === memberId);
    if (!targetMembership) {
      return { member: null, membership: null };
    }

    const profileMap = await getCompanyMemberProfileMap(admin, memberships);
    return {
      member: profileMap.get(memberId) || null,
      membership: targetMembership,
    };
  }

  const { data: member, error: memberError } = await admin
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("id", memberId)
    .single();

  if (memberError || !member || getEmailDomain(member.email) !== allowedDomain) {
    return { member: null, membership: null };
  }

  return { member: member as TeamProfileRow, membership: null };
}

export async function GET() {
  const context = await getRequesterContext();
  if ("error" in context) return context.error;

  const { admin, profile, allowedDomain, companyId } = context;
  if (!canManageCompanyTeam(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (companyId) {
    const members = await getCompanyMemberProfiles(admin, companyId);
    return NextResponse.json({
      members: members
        .slice()
        .sort((a, b) => (a.created_at || "").localeCompare(b.created_at || ""))
        .map((member) => formatMember(member)),
      allowedDomain,
      canManage: canManageCompanyTeam(profile.role),
    });
  }

  const { data, error } = await admin
    .from("profiles")
    .select(PROFILE_SELECT)
    .ilike("email", `%@${allowedDomain}`)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Team members load error:", error);
    return NextResponse.json({
      members: [formatMember(profile)],
      allowedDomain,
      canManage: canManageCompanyTeam(profile.role),
      warning: "Loaded fallback team state because the company directory query failed.",
    });
  }

  return NextResponse.json({
    members: ((data || []).length ? (data || []) : [profile]).map((member: any) => formatMember(member)),
    allowedDomain,
    canManage: canManageCompanyTeam(profile.role),
  });
}

export async function POST(req: NextRequest) {
  const context = await getRequesterContext();
  if ("error" in context) return context.error;

  const { admin, profile, user, allowedDomain, companyId } = context;
  if (!canManageCompanyTeam(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { email?: string; role?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const email = normalizeEmail(body.email || "");
  const requestedTier = body.role;

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  }

  if (!isOneOf(requestedTier, TEAM_TIERS)) {
    return NextResponse.json({ error: "Invalid team role" }, { status: 400 });
  }

  const inviteDomain = getEmailDomain(email);

  if (!allowedDomain || isCommonEmailDomain(allowedDomain)) {
    return NextResponse.json(
      { error: "Your company must use a business email domain before inviting teammates" },
      { status: 422 }
    );
  }

  if (inviteDomain !== allowedDomain) {
    return NextResponse.json(
      { error: `Only teammates with the ${allowedDomain} email domain can be added` },
      { status: 422 }
    );
  }

  const { data: existingProfile, error: existingProfileError } = await admin
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("email", email)
    .maybeSingle();

  if (existingProfileError) {
    return NextResponse.json({ error: "Failed to look up that teammate" }, { status: 500 });
  }

  if (!existingProfile) {
    return NextResponse.json(
      {
        error:
          "That colleague does not have a Warrantee account yet. Ask them to register first, then add them here.",
      },
      { status: 404 }
    );
  }

  if (existingProfile.id === user.id) {
    return NextResponse.json({ error: "Your own account is already active in this team" }, { status: 409 });
  }

  if (companyId) {
    const { data: existingMembership, error: membershipLookupError } = await admin
      .from("company_members")
      .select("id, company_id, user_id, is_active")
      .eq("company_id", companyId)
      .eq("user_id", existingProfile.id)
      .limit(1)
      .maybeSingle();

    if (membershipLookupError) {
      return NextResponse.json({ error: "Failed to look up that teammate" }, { status: 500 });
    }

    if (existingMembership?.is_active) {
      return NextResponse.json(
        { error: "That colleague is already active in this company workspace" },
        { status: 409 }
      );
    }

    if (existingMembership) {
      const { error: membershipUpdateError } = await admin
        .from("company_members")
        .update({ is_active: true })
        .eq("id", existingMembership.id);

      if (membershipUpdateError) {
        return NextResponse.json({ error: "Failed to add that teammate" }, { status: 500 });
      }
    } else {
      const { error: membershipInsertError } = await admin.from("company_members").insert({
        company_id: companyId,
        user_id: existingProfile.id,
        is_active: true,
      });

      if (membershipInsertError) {
        return NextResponse.json({ error: "Failed to add that teammate" }, { status: 500 });
      }
    }
  }

  const { data: updatedProfile, error: updateError } = await admin
    .from("profiles")
    .update({
      role: mapTeamTierToStoredRole(requestedTier),
    })
    .eq("id", existingProfile.id)
    .select(PROFILE_SELECT)
    .single();

  if (updateError || !updatedProfile) {
    return NextResponse.json({ error: "Failed to add that teammate" }, { status: 500 });
  }

  try {
    await admin.from("notifications").insert({
      user_id: existingProfile.id,
      type: "team_added",
      title: "Added to company workspace",
      body: `${profile.full_name || profile.email} added you to the company workspace as ${requestedTier}.`,
    });
  } catch {
    // Notification delivery is non-blocking for team management changes.
  }

  return NextResponse.json({ member: formatMember(updatedProfile as TeamProfileRow) });
}

export async function PATCH(req: NextRequest) {
  const context = await getRequesterContext();
  if ("error" in context) return context.error;

  const { admin, profile, user, allowedDomain, companyId } = context;
  if (!canManageCompanyTeam(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { memberId?: string; role?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const memberId = String(body.memberId || "");
  const requestedTier = body.role;

  if (!isValidUUID(memberId)) {
    return NextResponse.json({ error: "Invalid member ID" }, { status: 400 });
  }

  if (!isOneOf(requestedTier, TEAM_TIERS)) {
    return NextResponse.json({ error: "Invalid team role" }, { status: 400 });
  }

  const { member } = await findMemberProfile(admin, companyId, allowedDomain, memberId);
  if (!member) {
    return NextResponse.json({ error: "Team member not found" }, { status: 404 });
  }

  if (member.id === user.id && requestedTier !== "superadmin") {
    return NextResponse.json(
      { error: "Use another superadmin account if you need to demote yourself" },
      { status: 422 }
    );
  }

  if (
    mapStoredRoleToTeamTier(member.role) === "superadmin" &&
    requestedTier !== "superadmin" &&
    (await countCompanySuperadmins(admin, companyId, allowedDomain)) <= 1
  ) {
    return NextResponse.json(
      { error: "Your company must keep at least one superadmin" },
      { status: 422 }
    );
  }

  const { data: updatedProfile, error: updateError } = await admin
    .from("profiles")
    .update({ role: mapTeamTierToStoredRole(requestedTier) })
    .eq("id", member.id)
    .select(PROFILE_SELECT)
    .single();

  if (updateError || !updatedProfile) {
    return NextResponse.json({ error: "Failed to update that role" }, { status: 500 });
  }

  return NextResponse.json({ member: formatMember(updatedProfile as TeamProfileRow) });
}

export async function DELETE(req: NextRequest) {
  const context = await getRequesterContext();
  if ("error" in context) return context.error;

  const { admin, profile, user, allowedDomain, companyId } = context;
  if (!canManageCompanyTeam(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { memberId?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const memberId = String(body.memberId || "");
  if (!isValidUUID(memberId)) {
    return NextResponse.json({ error: "Invalid member ID" }, { status: 400 });
  }

  if (memberId === user.id) {
    return NextResponse.json(
      { error: "Use another superadmin account if you need to remove yourself" },
      { status: 422 }
    );
  }

  const { member, membership } = await findMemberProfile(admin, companyId, allowedDomain, memberId);
  if (!member) {
    return NextResponse.json({ error: "Team member not found" }, { status: 404 });
  }

  if (
    mapStoredRoleToTeamTier(member.role) === "superadmin" &&
    (await countCompanySuperadmins(admin, companyId, allowedDomain)) <= 1
  ) {
    return NextResponse.json(
      { error: "Your company must keep at least one superadmin" },
      { status: 422 }
    );
  }

  if (membership) {
    const { error: membershipUpdateError } = await admin
      .from("company_members")
      .update({ is_active: false })
      .eq("id", membership.id);

    if (membershipUpdateError) {
      return NextResponse.json({ error: "Failed to remove that teammate" }, { status: 500 });
    }

    // In membership-backed workspaces, deactivating the membership is the
    // primary removal action. Role cleanup is best-effort so a profile-role
    // edge case does not leave the teammate visibly "stuck" in the company.
    const remainingMemberships = await countActiveMembershipsForUser(admin, member.id);
    if (remainingMemberships === 0) {
      const { error: updateError } = await admin
        .from("profiles")
        .update({
          role: "viewer",
        })
        .eq("id", member.id);

      if (updateError) {
        console.error("Team member role cleanup error:", updateError);
      }
    }
  } else {
    const { error: updateError } = await admin
      .from("profiles")
      .update({
        role: "viewer",
      })
      .eq("id", member.id);

    if (updateError) {
      return NextResponse.json({ error: "Failed to remove that teammate" }, { status: 500 });
    }
  }

  try {
    await admin.from("notifications").insert({
      user_id: member.id,
      type: "team_removed",
      title: "Removed from company workspace",
      body: `${profile.full_name || profile.email} removed you from the company workspace.`,
    });
  } catch {
    // Notification delivery is non-blocking for team management changes.
  }

  return NextResponse.json({ success: true });
}
