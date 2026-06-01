import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import { signInWithPassword, watchForPageErrors } from "./helpers";

const hasCredentials = Boolean(process.env.E2E_USER_EMAIL && process.env.E2E_USER_PASSWORD);
const hasSupabaseAdmin = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const claimTitlePrefix = "QA Business Flow Claim";

let qaWarrantyId: string | null = null;
let qaUserId: string | null = null;

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
  if (qaWarrantyId) {
    await supabase.from("warranty_extensions").delete().eq("warranty_id", qaWarrantyId);
    await supabase
      .from("activity_log")
      .delete()
      .eq("entity_type", "warranty")
      .eq("entity_id", qaWarrantyId)
      .in("action", ["extension_interest_registered", "warranty_extension_requested"]);
  }

  await supabase.from("warranty_claims").delete().ilike("title", `${claimTitlePrefix}%`);
}

function projectSlug(projectName: string) {
  return projectName.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toUpperCase() || "DEFAULT";
}

async function seedBusinessQaData(projectName: string) {
  const email = process.env.E2E_USER_EMAIL!;
  const slug = projectSlug(projectName);
  const referenceNumber = `WR-QA-BUSINESS-FLOW-${slug}`;
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
      serial_number: `QA-BUSINESS-SN-${slug}`,
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
  await cleanupQaArtifacts();
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

    await page.goto(`/en/warranties/${qaWarrantyId}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /QA Business Flow Warranty/i })).toBeVisible();
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
      await page.getByRole("button", { name: /Request Extension from Seller/i }).click();
      await expect(page.getByRole("heading", { name: /Extension request sent/i })).toBeVisible();
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

    const selfDeleteResponse = await page.request.delete("/api/team/members", {
      data: { memberId: qaUserId },
    });
    expect(selfDeleteResponse.status()).toBe(422);

    errors.assertClean();
  });
});
