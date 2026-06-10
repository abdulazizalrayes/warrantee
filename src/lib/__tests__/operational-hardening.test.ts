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
    expect(nextConfig).toContain("https://static.cloudflareinsights.com");
    expect(readiness).toContain('"content-security-policy"');
    expect(readiness).toContain('csp: "enforced"');
  });

  it("keeps dashboard browser counts aligned with production schema", () => {
    const dashboard = readProjectFile("src/app/[locale]/dashboard/page.tsx");

    expect(dashboard).toContain('.eq("is_read", false)');
    expect(dashboard).not.toContain('.eq("read", false)');
    expect(dashboard).toContain('.in("warranty_id", visibleWarrantyIds)');
    expect(dashboard).not.toMatch(/from\("warranty_claims"\)[\s\S]{0,300}\.eq\("user_id", user\.id\)/);
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

  it("keeps production rate limiting distributed by default", () => {
    const rateLimit = readProjectFile("src/lib/rate-limit.ts");

    expect(rateLimit).toContain("process.env.NODE_ENV === \"production\"");
    expect(rateLimit).toContain("RATE_LIMIT_ALLOW_MEMORY_FALLBACK");
    expect(rateLimit).toContain("return { success: false, remaining: 0, resetIn: windowMs }");
  });

  it("keeps high-risk API responses on the shared no-store security helper", () => {
    const helper = readProjectFile("src/lib/api-response.ts");
    const publicVerify = readProjectFile("src/app/api/v1/warranties/verify/route.ts");

    expect(helper).toContain("\"Cache-Control\": \"no-store\"");
    expect(helper).toContain("\"X-Content-Type-Options\": \"nosniff\"");
    expect(publicVerify).toContain("apiJson");
  });

  it("keeps document uploads bounded and routed through signed download paths", () => {
    const uploadRoute = readProjectFile("src/app/api/warranties/[id]/documents/route.ts");
    const uploadUrlRoute = readProjectFile("src/app/api/warranties/[id]/documents/upload-url/route.ts");
    const downloadRoute = readProjectFile("src/app/api/documents/[id]/download/route.ts");
    const documentsHelper = readProjectFile("src/lib/documents.ts");
    const scanner = readProjectFile("src/lib/server/document-security-scanner.ts");
    const scanRoute = readProjectFile("src/app/api/cron/scan-documents/route.ts");
    const documentSecurityMigration = readProjectFile(
      "supabase/migrations/20260610194500_document_security_status.sql"
    );
    const uploadComponent = readProjectFile("src/components/DocumentUpload.tsx");

    expect(documentSecurityMigration).toContain("security_status");
    expect(documentSecurityMigration).toContain("pending_scan");
    expect(documentSecurityMigration).toContain("blocked");
    expect(uploadRoute).toContain("WARRANTY_DOCUMENT_MAX_SIZE");
    expect(uploadRoute).toContain('security_status: "pending_scan"');
    expect(uploadUrlRoute).toContain("createSignedUploadUrl");
    expect(uploadUrlRoute).toContain("buildWarrantyAccessOrClause");
    expect(uploadUrlRoute).toContain("document-signed-upload");
    expect(downloadRoute).toContain("isWarrantyDocumentDownloadBlocked");
    expect(downloadRoute).toContain("Document is blocked by security review");
    expect(documentsHelper).toContain("DOCUMENT_DOWNLOAD_REQUIRE_CLEAN");
    expect(scanner).toContain("DOCUMENT_SECURITY_SCANNER_URL");
    expect(scanner).toContain("security_status: input.verdict");
    expect(scanner).toContain("document_security_scanned");
    expect(scanRoute).toContain("requireInternalBearer");
    expect(scanRoute).toContain("scanPendingWarrantyDocuments");
    expect(uploadRoute).toContain("File too large (max 20MB)");
    expect(uploadRoute).not.toContain("getPublicUrl(filePath)");
    expect(uploadComponent).toContain("max 20MB");
    expect(uploadComponent).toContain("uploadToSignedUrl");
    expect(uploadComponent).toContain("computeSha256Hex");
  });

  it("keeps Stripe extension fulfillment verified against stored offer values", () => {
    const webhook = readProjectFile("src/app/api/stripe/webhook/route.ts");

    expect(webhook).toContain("fulfillVerifiedExtensionPayment");
    expect(webhook).toContain("Stripe payment amount did not match extension offer");
    expect(webhook).toContain("Stripe payment currency did not match extension offer");
    expect(webhook).toContain("warranty_end_date");
  });

  it("keeps public API usage metered and token lifecycle audited", () => {
    const migration = readProjectFile("supabase/migrations/20260610193000_api_usage_events.sql");
    const apiCollection = readProjectFile("src/app/api/v1/warranties/route.ts");
    const apiItem = readProjectFile("src/app/api/v1/warranties/[id]/route.ts");
    const tokenCreate = readProjectFile("src/app/api/integration-tokens/route.ts");
    const tokenDelete = readProjectFile("src/app/api/integration-tokens/[id]/route.ts");
    const tokenUsage = readProjectFile("src/app/api/integration-tokens/usage/route.ts");

    expect(migration).toContain("create table if not exists public.api_usage_events");
    expect(migration).toContain("user_id = auth.uid()");
    expect(apiCollection).toContain("authorizeApiV1Request");
    expect(apiCollection).toContain("recordApiV1Usage");
    expect(apiItem).toContain("recordApiV1Usage");
    expect(apiItem).toContain(".or(buildWarrantyAccessOrClause(requester.userId))");
    expect(tokenCreate).toContain("api_token_created");
    expect(tokenDelete).toContain("api_token_revoked");
    expect(tokenUsage).toContain(".eq(\"user_id\", user.id)");
    expect(tokenUsage).toContain("api_usage_events");
  });

  it("keeps production smoke failures diagnostic", () => {
    const smoke = readProjectFile("scripts/production-smoke.mjs");

    expect(smoke).toContain("class SmokeCheckError");
    expect(smoke).toContain("runCheck(\"public\"");
    expect(smoke).toContain("Request timed out after 15000ms");
    expect(smoke).toContain("details:");
  });
});
