import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();

function readProjectFile(relativePath: string) {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

describe("profile role hardening", () => {
  it("keeps browser profile updates away from authorization columns", () => {
    const migration = readProjectFile(
      "supabase/migrations/20260714171612_harden_authorization_and_invitation_delivery.sql"
    ).toLowerCase();
    const writableColumnList = migration.match(/writable_columns text\[\] := array\[([\s\S]*?)\];/);
    const writableColumns = Array.from(
      (writableColumnList?.[1] || "").matchAll(/'([^']+)'/g),
      (match) => match[1]
    );

    expect(migration).toContain("revoke all privileges on table public.profiles from anon, authenticated");
    expect(migration).toContain("grant update (%i) on table public.profiles to authenticated");

    expect(writableColumns).toEqual(
      expect.arrayContaining([
        "full_name",
        "phone",
        "avatar_url",
        "preferred_language",
        "preferred_locale",
        "email_notifications",
        "push_notifications",
        "notify_expiry",
        "notify_claims",
        "notify_newsletter",
        "onboarding_completed",
      ])
    );
    expect(writableColumns).not.toContain("role");
    expect(writableColumns).not.toContain("company_id");
    expect(writableColumns).not.toContain("company_domain");
  });

  it("keeps signup metadata and public RPCs away from authorization decisions", () => {
    const migration = readProjectFile(
      "supabase/migrations/20260714171612_harden_authorization_and_invitation_delivery.sql"
    ).toLowerCase();
    const claimPage = readProjectFile("src/app/[locale]/dashboard/claims/[id]/page.tsx");
    const onboardingPage = readProjectFile("src/app/[locale]/onboarding/page.tsx");

    expect(migration).toContain("'user'");
    expect(migration).not.toContain("raw_user_meta_data->>'role'");
    expect(migration).toContain("and p.prosecdef");
    expect(migration).toContain("from public, anon, authenticated");
    expect(migration).toContain("function private.is_admin(user_id uuid)");
    expect(claimPage).not.toContain(".rpc('is_admin')");
    expect(onboardingPage).not.toMatch(/from\(["']profiles["']\)\.upsert/);
    expect(onboardingPage).not.toMatch(/\brole\s*:/);
    expect(onboardingPage).not.toMatch(/\bemail\s*:\s*user\.email/);
  });

  it("does not let browser admin pages or billing webhooks mutate profile roles directly", () => {
    const checkedFiles = [
      "src/app/[locale]/admin/page.tsx",
      "src/app/[locale]/admin/accept-invite/page.tsx",
      "src/app/api/stripe/webhook/route.ts",
    ];

    for (const file of checkedFiles) {
      const source = readProjectFile(file);
      expect(source).not.toMatch(/from\(["']profiles["']\)[\s\S]{0,240}\.update\(\s*\{[\s\S]{0,120}role\s*:/);
    }
  });
});
