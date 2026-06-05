import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import { signInWithPassword, watchForPageErrors } from "./helpers";

const hasCredentials = Boolean(process.env.E2E_USER_EMAIL && process.env.E2E_USER_PASSWORD);
const hasSupabaseAdmin = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
);

let qaWarrantyId: string | null = null;

function missingColumn(message: string) {
  return message.match(/'([^']+)' column/)?.[1] || message.match(/column "?([a-zA-Z0-9_]+)"?/)?.[1] || null;
}

async function adaptiveUpsert(table: string, payload: Record<string, unknown>, onConflict?: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const draft = { ...payload };

  for (let attempt = 0; attempt < 24; attempt += 1) {
    const query = supabase.from(table).upsert(draft, onConflict ? { onConflict } : undefined).select().single();
    const { data, error } = await query;
    if (!error) return data as Record<string, unknown>;

    const column = missingColumn(error.message || "");
    if (!column || !(column in draft)) throw error;
    delete draft[column];
  }

  throw new Error(`Could not seed ${table}; schema adaptation did not converge.`);
}

async function seedAuthenticatedQaData() {
  const email = process.env.E2E_USER_EMAIL!;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: users, error: usersError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (usersError) throw usersError;

  const user = users.users.find((item) => item.email?.toLowerCase() === email.toLowerCase());
  if (!user) throw new Error("E2E user does not exist in Supabase auth.");

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

  const referenceNumber = "WR-QA-AUTH-FLOW-001";
  const warranty = await adaptiveUpsert(
    "warranties",
    {
      reference_number: referenceNumber,
      product_name: "QA Authenticated Flow Warranty",
      product_name_ar: "ضمان اختبار تسجيل الدخول",
      sku: "QA-AUTH-001",
      quantity: 1,
      start_date: "2026-01-01",
      end_date: "2028-01-01",
      purchase_date: "2026-01-01",
      warranty_start_date: "2026-01-01",
      warranty_end_date: "2028-01-01",
      description: "Seeded warranty used only for authenticated production QA.",
      serial_number: "QA-AUTH-SN-001",
      category: "qa",
      product_category: "qa",
      seller_name: "QA Seller",
      seller_email: "qa-seller@warrantee.io",
      currency: "SAR",
      terms_and_conditions: "QA terms for automated signed-in flow checks.",
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
}

test.describe("authenticated core operating flows", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(!hasCredentials, "Set E2E_USER_EMAIL and E2E_USER_PASSWORD to enable signed-in flow QA.");
  test.skip(!hasSupabaseAdmin, "Set Supabase admin env vars to seed signed-in flow QA data.");

  test.beforeAll(async () => {
    await seedAuthenticatedQaData();
  });

  test.beforeEach(async ({ page }) => {
    await signInWithPassword(page);
  });

  for (const route of [
    "/en/dashboard",
    "/en/warranties",
    "/en/dashboard/claims",
    "/en/extensions",
    "/en/documents",
    "/en/notifications",
    "/en/settings/team",
    "/en/seller",
    "/en/admin",
  ]) {
    test(`${route} loads with signed-in navigation intact`, async ({ page }, testInfo) => {
      const errors = watchForPageErrors(page, testInfo);

      await page.goto(route, { waitUntil: "domcontentloaded" });

      if (route === "/en/admin") {
        await expect(page.getByRole("heading", { name: /Admin|Overview/i }).first()).toBeVisible();
        await expect(page.getByRole("link", { name: /Back to Dashboard/i }).first()).toBeVisible();
      } else {
        await expect(page.getByRole("link", { name: /^Dashboard$/i }).first()).toBeVisible();
        await expect(page.getByRole("link", { name: /^Warranties$/i }).first()).toBeVisible();
        await expect(page.getByRole("link", { name: /^Notifications$/i }).first()).toBeVisible();
        await expect(page.getByRole("link", { name: /^Settings$/i }).first()).toBeVisible();
      }

      await errors.assertClean();
    });
  }

  test("warranty detail, claim, and extension workflows remain reachable", async ({ page }, testInfo) => {
    const errors = watchForPageErrors(page, testInfo);
    expect(qaWarrantyId, "QA warranty should be seeded").toBeTruthy();

    await page.goto(`/en/warranties/${qaWarrantyId}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /QA Authenticated Flow Warranty/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Documents/i }).first()).toBeVisible();

    await page.goto(`/en/warranties/${qaWarrantyId}/claim`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /File a Claim/i })).toBeVisible();
    await expect(page.getByLabel(/Claim Title/i)).toBeVisible();
    await expect(page.getByLabel(/Describe the Issue/i)).toBeVisible();

    await page.goto(`/en/warranties/${qaWarrantyId}/extend`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Extend Warranty/i })).toBeVisible();
    await expect(page.getByLabel(/Extension Period/i)).toBeVisible();

    await errors.assertClean();
  });
});
