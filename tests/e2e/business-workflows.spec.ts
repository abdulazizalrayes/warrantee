import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import { openDashboardNavigationOnMobile, signInWithPassword, watchForPageErrors } from "./helpers";

const hasCredentials = Boolean(process.env.E2E_USER_EMAIL && process.env.E2E_USER_PASSWORD);
const hasSupabaseAdmin = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const claimTitlePrefix = "QA Business Flow Claim";
const apiClientNamePrefix = "QA API Lifecycle";

let qaWarrantyId: string | null = null;
let qaUserId: string | null = null;
let qaWarrantySerial: string | null = null;
const qaApiTokenIds = new Set<string>();
const qaApiClientIds = new Set<string>();
const qaImportBatchIds = new Set<string>();
const qaImportedWarrantyIds = new Set<string>();

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

function missingColumn(message: string) {
  return message.match(/'([^']+)' column/)?.[1] || message.match(/column "?([a-zA-Z0-9_]+)"?/)?.[1] || null;
}

async function adaptiveUpsert(table: string, payload: Record<string, unknown>, onConflict?: string) {
  const supabase = adminClient();
  const draft = { ...payload };

  for (let attempt = 0; attempt < 24; attempt += 1) {
    const { data, error } = await supabase
      .from(table)
      .upsert(draft, onConflict ? { onConflict } : undefined)
      .select()
      .single();
    if (!error) return data as Record<string, unknown>;

    const column = missingColumn(error.message || "");
    if (!column || !(column in draft)) throw error;
    delete draft[column];
  }

  throw new Error(`Could not seed ${table}; schema adaptation did not converge.`);
}

async function cleanupQaArtifacts() {
  const supabase = adminClient();
  const importBatchIds = [...qaImportBatchIds];
  const importedWarrantyIds = [...qaImportedWarrantyIds];

  if (importedWarrantyIds.length > 0) {
    const importedCleanupResults = await Promise.all([
      supabase.from("notifications").delete().in("warranty_id", importedWarrantyIds),
      supabase
        .from("activity_log")
        .delete()
        .eq("entity_type", "warranty")
        .in("entity_id", importedWarrantyIds),
    ]);
    const importedCleanupError = importedCleanupResults.find((result) => result.error)?.error;
    if (importedCleanupError) throw importedCleanupError;

    const { error: importedAuditError } = await supabase
      .from("platform_audit_events")
      .delete()
      .eq("table_name", "warranties")
      .in("record_id", importedWarrantyIds);
    if (importedAuditError) throw importedAuditError;
  }

  if (importBatchIds.length > 0) {
    const { error: importActivityError } = await supabase
      .from("activity_log")
      .delete()
      .eq("entity_type", "warranty_import")
      .in("entity_id", importBatchIds);
    if (importActivityError) throw importActivityError;
  }

  if (importedWarrantyIds.length > 0) {
    const { error: importedWarrantyError } = await supabase
      .from("warranties")
      .delete()
      .in("id", importedWarrantyIds);
    if (importedWarrantyError) throw importedWarrantyError;
  }

  if (qaUserId) {
    const tokenIds = [...qaApiTokenIds];
    const clientIds = [...qaApiClientIds];

    if (tokenIds.length > 0) {
      const { error: usageError } = await supabase
        .from("api_usage_events")
        .delete()
        .in("token_id", tokenIds);
      if (usageError) throw usageError;

      const { error: tokensError } = await supabase
        .from("api_integration_tokens")
        .delete()
        .in("id", tokenIds)
        .eq("user_id", qaUserId);
      if (tokensError) throw tokensError;

      const { error: auditError } = await supabase
        .from("platform_audit_events")
        .delete()
        .eq("table_name", "api_integration_tokens")
        .in("record_id", tokenIds);
      if (auditError) throw auditError;
    }

    if (clientIds.length > 0) {
      const { error: clientsError } = await supabase
        .from("api_clients")
        .delete()
        .in("id", clientIds)
        .eq("owner_user_id", qaUserId);
      if (clientsError) throw clientsError;
    }

  }

  if (qaWarrantyId) {
    const { data: qaClaims, error: qaClaimsLookupError } = await supabase
      .from("warranty_claims")
      .select("id")
      .eq("warranty_id", qaWarrantyId)
      .ilike("title", `${claimTitlePrefix}%`);
    if (qaClaimsLookupError) throw qaClaimsLookupError;
    const claimIds = (qaClaims || []).map((claim) => claim.id);

    const cleanupQueries = [
      supabase.from("notifications").delete().eq("warranty_id", qaWarrantyId),
      supabase.from("warranty_extensions").delete().eq("warranty_id", qaWarrantyId),
      supabase
      .from("activity_log")
      .delete()
      .eq("entity_type", "warranty")
      .eq("entity_id", qaWarrantyId),
    ];
    const results = await Promise.all(cleanupQueries);
    const cleanupError = results.find((result) => result.error)?.error;
    if (cleanupError) throw cleanupError;

    if (claimIds.length > 0) {
      const { error: claimNotificationsError } = await supabase
        .from("notifications")
        .delete()
        .in("claim_id", claimIds);
      if (claimNotificationsError) throw claimNotificationsError;

      const { error: claimsError } = await supabase
        .from("warranty_claims")
        .delete()
        .eq("warranty_id", qaWarrantyId)
        .in("id", claimIds);
      if (claimsError) throw claimsError;
    }
  }

  if (qaWarrantyId) {
    const { error: warrantyError } = await supabase
      .from("warranties")
      .delete()
      .eq("id", qaWarrantyId);
    if (warrantyError) throw warrantyError;
  }
}

function projectSlug(projectName: string) {
  return projectName.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toUpperCase() || "DEFAULT";
}

async function seedBusinessQaData(projectName: string) {
  const email = process.env.E2E_USER_EMAIL!;
  const slug = projectSlug(projectName);
  const referenceNumber = `WR-QA-BUSINESS-FLOW-${slug}`;
  const serialNumber = `QA-BUSINESS-SN-${slug}`;
  const supabase = adminClient();
  const { data: users, error: usersError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (usersError) throw usersError;

  const user = users.users.find((item) => item.email?.toLowerCase() === email.toLowerCase());
  if (!user) throw new Error("E2E user does not exist in Supabase auth.");
  qaUserId = user.id;

  await adaptiveUpsert(
    "profiles",
    {
      id: user.id,
      email,
      full_name: "Warrantee QA User",
      role: "super_admin",
      preferred_language: "en",
      preferred_locale: "en",
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    },
    "id",
  );

  const warranty = await adaptiveUpsert(
    "warranties",
    {
      reference_number: referenceNumber,
      product_name: "QA Business Flow Warranty",
      product_name_ar: "ضمان اختبار الأعمال",
      sku: `QA-BUSINESS-${slug}`,
      quantity: 1,
      start_date: "2026-01-01",
      end_date: "2028-01-01",
      purchase_date: "2026-01-01",
      warranty_start_date: "2026-01-01",
      warranty_end_date: "2028-01-01",
      description: "Seeded warranty used only for production business workflow QA.",
      serial_number: serialNumber,
      category: "qa",
      product_category: "qa",
      seller_name: "QA Seller",
      seller_email: "qa-seller@warrantee.io",
      currency: "SAR",
      terms_and_conditions: "QA terms for automated business flow checks.",
      source: "qa_e2e",
      coverage_type: "standard",
      status: "active",
      user_id: user.id,
      created_by: user.id,
      issuer_user_id: user.id,
      recipient_user_id: user.id,
      buyer_id: user.id,
      seller_id: user.id,
      updated_at: new Date().toISOString(),
    },
    "reference_number",
  );

  qaWarrantyId = String(warranty.id);
  qaWarrantySerial = serialNumber;
}

test.describe("deeper authenticated business workflows", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(!hasCredentials, "Set E2E_USER_EMAIL and E2E_USER_PASSWORD to enable signed-in workflow QA.");
  test.skip(!hasSupabaseAdmin, "Set Supabase admin env vars to seed and clean signed-in workflow QA data.");

  test.beforeAll(async ({}, testInfo) => {
    await seedBusinessQaData(testInfo.project.name);
  });

  test.afterAll(async () => {
    await cleanupQaArtifacts();
  });

  test.beforeEach(async ({ page }) => {
    await signInWithPassword(page);
  });

  test("claim, extension, API, notification, and team guardrails work together", async ({ page }, testInfo) => {
    const errors = watchForPageErrors(page, testInfo);
    const runId = Date.now().toString(36).toUpperCase();
    const claimTitle = `${claimTitlePrefix} ${runId}`;
    const extensionMonths = testInfo.project.name.includes("mobile") ? "24" : "12";

    expect(qaWarrantyId, "QA warranty should be seeded").toBeTruthy();
    expect(qaUserId, "QA user should be discovered").toBeTruthy();
    expect(qaWarrantySerial, "QA warranty serial should be seeded").toBeTruthy();
    const appOrigin = new URL(page.url()).origin;

    const duplicateImportResponse = await page.request.post("/api/warranties/bulk-import", {
      headers: { Origin: appOrigin, Referer: `${appOrigin}/en/warranties/import` },
      multipart: {
        mode: "preview",
        file: {
          name: "qa-duplicate-warranty.csv",
          mimeType: "text/csv",
          buffer: Buffer.from(
            `product_name,serial_number,start_date,end_date\nDuplicate QA Warranty,${qaWarrantySerial},2026-01-01,2028-01-01\nInvalid Date Warranty,QA-INVALID-DATE-${runId},2026-99-99,2028-01-01\n`,
          ),
        },
      },
    });
    expect(duplicateImportResponse.status()).toBe(200);
    const duplicateImportPayload = await duplicateImportResponse.json();
    expect(duplicateImportPayload.summary).toMatchObject({
      total: 2,
      valid: 0,
      invalid: 2,
      duplicates: 1,
    });

    const importedSerial = `QA-IMPORT-SN-${runId}`;
    const importCommitResponse = await page.request.post("/api/warranties/bulk-import", {
      headers: { Origin: appOrigin, Referer: `${appOrigin}/en/warranties/import` },
      multipart: {
        mode: "commit",
        file: {
          name: "qa-valid-warranty.csv",
          mimeType: "text/csv",
          buffer: Buffer.from(
            `product_name,serial_number,start_date,end_date\nRollback QA Warranty,${importedSerial},2026-01-01,2028-01-01\n`,
          ),
        },
      },
    });
    expect(importCommitResponse.status()).toBe(200);
    const importCommitPayload = await importCommitResponse.json();
    expect(importCommitPayload).toMatchObject({ imported: 1, summary: { total: 1, valid: 1, invalid: 0, duplicates: 0 } });
    expect(importCommitPayload.batchId).toMatch(/^[0-9a-f-]{36}$/i);
    qaImportBatchIds.add(importCommitPayload.batchId);

    const { data: importedWarranty, error: importedWarrantyLookupError } = await adminClient()
      .from("warranties")
      .select("id, deleted_at, is_archived")
      .eq("source", `bulk_import:${importCommitPayload.batchId}`)
      .single();
    if (importedWarrantyLookupError) throw importedWarrantyLookupError;
    qaImportedWarrantyIds.add(importedWarranty.id);
    expect(importedWarranty.deleted_at).toBeNull();

    const crossOriginRollbackResponse = await page.request.post(
      `/api/warranties/bulk-import/${importCommitPayload.batchId}/rollback`,
      { headers: { Origin: "https://attacker.invalid", Referer: "https://attacker.invalid/" } },
    );
    expect(crossOriginRollbackResponse.status()).toBe(403);

    const importRollbackResponse = await page.request.post(
      `/api/warranties/bulk-import/${importCommitPayload.batchId}/rollback`,
      { headers: { Origin: appOrigin, Referer: `${appOrigin}/en/warranties/import` } },
    );
    expect(importRollbackResponse.status()).toBe(200);
    await expect(importRollbackResponse.json()).resolves.toMatchObject({ rolledBack: 1 });

    const { data: rolledBackWarranty, error: rolledBackWarrantyLookupError } = await adminClient()
      .from("warranties")
      .select("deleted_at, is_archived, archive_reason")
      .eq("id", importedWarranty.id)
      .single();
    if (rolledBackWarrantyLookupError) throw rolledBackWarrantyLookupError;
    expect(rolledBackWarranty.deleted_at).toBeTruthy();
    expect(rolledBackWarranty.is_archived).toBe(true);
    expect(rolledBackWarranty.archive_reason).toBe("bulk_import_rollback");

    await page.goto(`/en/warranties/${qaWarrantyId}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /QA Business Flow Warranty/i })).toBeVisible();
    await openDashboardNavigationOnMobile(page);
    await expect(page.getByRole("link", { name: /Documents/i }).first()).toBeVisible();

    await page.goto(`/en/warranties/${qaWarrantyId}/claim`, { waitUntil: "domcontentloaded" });
    await page.getByLabel(/Claim Title/i).fill(claimTitle);
    await page.getByLabel(/Describe the Issue/i).fill("Automated QA claim confirms the buyer claim workflow remains operational.");
    await page.getByRole("button", { name: /Save as Draft/i }).click();
    await expect(page.getByRole("heading", { name: /Claim Filed Successfully/i })).toBeVisible();

    const claimsResponse = await page.request.get("/api/claims");
    expect(claimsResponse.status()).toBe(200);
    const claimsPayload = await claimsResponse.json();
    expect(JSON.stringify(claimsPayload)).toContain(claimTitle);

    await page.goto(`/en/warranties/${qaWarrantyId}/extend`, { waitUntil: "domcontentloaded" });
    await page.getByLabel(/Extension Period/i).selectOption(extensionMonths);
    const extensionButton = page.getByRole("button", {
      name: /Request Extension from Seller|Request Already Sent/i,
    });
    await expect(extensionButton).toBeVisible();
    if (await page.getByRole("button", { name: /Request Extension from Seller/i }).isVisible()) {
      const [extensionCreateResponse] = await Promise.all([
        page.waitForResponse((response) =>
          response.request().method() === "POST"
          && response.url().includes(`/api/warranties/${qaWarrantyId}/extensions`)
        ),
        page.getByRole("button", { name: /Request Extension from Seller/i }).click(),
      ]);
      expect(extensionCreateResponse.status()).toBe(201);
      await expect(page.getByRole("heading", { name: /Extension request sent/i })).toBeVisible({ timeout: 15_000 });
    }

    const extensionsResponse = await page.request.get(`/api/warranties/${qaWarrantyId}/extensions`);
    expect(extensionsResponse.status()).toBe(200);
    const extensionsPayload = await extensionsResponse.json();
    expect((extensionsPayload.data || []).length).toBeGreaterThan(0);

    const notificationsResponse = await page.request.get("/api/notifications");
    expect(notificationsResponse.status()).toBe(200);

    const teamResponse = await page.request.get("/api/team/members");
    expect(teamResponse.status()).toBe(200);
    const teamPayload = await teamResponse.json();
    expect(teamPayload.canManage).toBe(true);

    const apiClientName = `${apiClientNamePrefix} ${runId}`;
    const tokenCreateResponse = await page.request.post("/api/integration-tokens", {
      headers: { Origin: appOrigin, Referer: `${appOrigin}/en/settings` },
      data: {
        name: apiClientName,
        scopes: ["warranties:read"],
        rate_limit_per_minute: 25,
      },
    });
    expect(tokenCreateResponse.status()).toBe(201);
    const tokenCreatePayload = await tokenCreateResponse.json();
    expect(tokenCreatePayload.token).toMatch(/^wrt_/);
    expect(tokenCreatePayload.data.name).toBe(apiClientName);
    expect(tokenCreatePayload.data.client_id).toBeTruthy();
    qaApiTokenIds.add(tokenCreatePayload.data.id);
    qaApiClientIds.add(tokenCreatePayload.data.client_id);

    const tokenListResponse = await page.request.get("/api/integration-tokens");
    expect(tokenListResponse.status()).toBe(200);
    const tokenListPayload = await tokenListResponse.json();
    const listedToken = tokenListPayload.data.find(
      (item: { id: string }) => item.id === tokenCreatePayload.data.id,
    );
    expect(listedToken).toBeTruthy();
    expect(listedToken.token).toBeUndefined();
    expect(listedToken.token_hash).toBeUndefined();

    const apiStatusResponse = await page.request.get("/api/v1/status", {
      headers: { "x-api-key": tokenCreatePayload.token },
    });
    expect(apiStatusResponse.status()).toBe(200);
    const apiStatusPayload = await apiStatusResponse.json();
    expect(apiStatusPayload.credential.kind).toBe("api_key");
    expect(apiStatusPayload.boundaries.usernameOrPasswordRequired).toBe(false);

    const tokenUsageResponse = await page.request.get(
      `/api/integration-tokens/usage?token_id=${tokenCreatePayload.data.id}`,
    );
    expect(tokenUsageResponse.status()).toBe(200);
    const tokenUsagePayload = await tokenUsageResponse.json();
    expect(tokenUsagePayload.summary.requests_24h).toBeGreaterThanOrEqual(1);
    expect(tokenUsagePayload.data.some(
      (item: { token_id: string; path: string }) =>
        item.token_id === tokenCreatePayload.data.id && item.path === "/api/v1/status",
    )).toBe(true);

    const tokenRevokeResponse = await page.request.delete(
      `/api/integration-tokens/${tokenCreatePayload.data.id}`,
      { headers: { Origin: appOrigin, Referer: `${appOrigin}/en/settings` } },
    );
    expect(tokenRevokeResponse.status()).toBe(200);

    const revokedStatusResponse = await page.request.get("/api/v1/status", {
      headers: { "x-api-key": tokenCreatePayload.token },
    });
    expect(revokedStatusResponse.status()).toBe(401);

    const selfDeleteResponse = await page.request.delete("/api/team/members", {
      data: { memberId: qaUserId },
    });
    expect(selfDeleteResponse.status()).toBe(422);

    await errors.assertClean();
  });
});
