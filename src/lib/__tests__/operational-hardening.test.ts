import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();

function readProjectFile(relativePath: string) {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

describe("operational hardening", () => {
  it("keeps dashboard, seller, billing, and email ingestion off broken summary RPCs", () => {
    const checkedFiles = [
      "src/app/[locale]/dashboard/page.tsx",
      "src/app/[locale]/billing/page.tsx",
      "src/app/[locale]/seller/page.tsx",
      "src/app/api/ingest/email/route.ts",
    ];

    for (const file of checkedFiles) {
      const source = readProjectFile(file);
      expect(source).not.toContain("get_user_dashboard_stats");
      expect(source).not.toContain("get_user_subscription");
      expect(source).not.toContain("get_seller_dashboard_stats");
      expect(source).not.toContain("check_rate_limit");
    }
  });

  it("enforces CSP and keeps the readiness gate aligned with production headers", () => {
    const nextConfig = readProjectFile("next.config.ts");
    const readiness = readProjectFile("scripts/operational-readiness-check.mjs");

    expect(nextConfig).toContain('key: "Content-Security-Policy"');
    expect(nextConfig).not.toContain("Content-Security-Policy-Report-Only");
    expect(readiness).toContain('"content-security-policy"');
    expect(readiness).toContain('csp: "enforced"');
  });

  it("defines subscription state with RLS and webhook-only writes", () => {
    const migration = readProjectFile(
      "supabase/migrations/20260605175727_subscription_billing_state.sql"
    ).toLowerCase();
    const webhook = readProjectFile("src/app/api/stripe/webhook/route.ts");

    expect(migration).toContain("create table if not exists public.subscriptions");
    expect(migration).toContain("alter table public.subscriptions enable row level security");
    expect(migration).toContain("revoke all on table public.subscriptions from anon");
    expect(migration).toContain("grant select on table public.subscriptions to authenticated");
    expect(migration).toContain("grant select, insert, update, delete on table public.subscriptions to service_role");
    expect(migration).toContain("user_id = auth.uid()");
    expect(webhook).toContain('case "customer.subscription.updated"');
    expect(webhook).toContain('from("subscriptions")');
  });

  it("keeps the edge health route free of Node-only process APIs", () => {
    const healthRoute = readProjectFile("src/app/api/health/route.ts");

    expect(healthRoute).toContain('export const runtime = "edge"');
    expect(healthRoute).not.toContain("process.uptime");
  });
});
