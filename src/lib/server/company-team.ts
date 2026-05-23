const COMPANY_SUPERADMIN_ROLES = new Set([
  "owner",
  "admin",
  "super_admin",
  "company_admin",
]);

const PLATFORM_ADMIN_ROLES = new Set([
  "admin",
  "super_admin",
  "platform_admin",
]);

const APPROVER_ROLES = new Set([
  "approver",
  "company_admin",
  "platform_admin",
  "admin",
  "super_admin",
]);

const COMMON_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "icloud.com",
  "aol.com",
  "mail.com",
  "protonmail.com",
  "live.com",
  "msn.com",
]);

export const TEAM_TIERS = ["superadmin", "manager", "viewer"] as const;

export type TeamTier = (typeof TEAM_TIERS)[number];

export function normalizeEmail(value: string) {
  return String(value || "").trim().toLowerCase();
}

export function getEmailDomain(email: string | null | undefined) {
  const normalized = normalizeEmail(email || "");
  const [, domain = ""] = normalized.split("@");
  return domain;
}

export function isCommonEmailDomain(domain: string) {
  return COMMON_EMAIL_DOMAINS.has(domain.toLowerCase());
}

export function getCompanyInviteDomain(profile: {
  email?: string | null;
  company_domain?: string | null;
}) {
  return normalizeEmail(profile.company_domain || getEmailDomain(profile.email));
}

export function canManageCompanyTeam(role: string | null | undefined) {
  return COMPANY_SUPERADMIN_ROLES.has(String(role || ""));
}

export function isPlatformAdminRole(role: string | null | undefined) {
  return PLATFORM_ADMIN_ROLES.has(String(role || ""));
}

export function canApproveWarranty(role: string | null | undefined) {
  return APPROVER_ROLES.has(String(role || ""));
}

export function mapStoredRoleToTeamTier(role: string | null | undefined): TeamTier {
  if (COMPANY_SUPERADMIN_ROLES.has(String(role || ""))) {
    return "superadmin";
  }

  if (role === "manager") {
    return "manager";
  }

  return "viewer";
}

export function mapTeamTierToStoredRole(tier: TeamTier) {
  switch (tier) {
    case "superadmin":
      return "company_admin";
    case "manager":
      return "manager";
    default:
      return "viewer";
  }
}
