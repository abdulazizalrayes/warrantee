import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const envFiles = [".env.production.local", ".env.local"];
const baseUrl = (process.env.OPERATIONAL_BASE_URL || process.env.SMOKE_BASE_URL || "https://warrantee.io").replace(/\/$/, "");
const timeoutMs = Number(process.env.OPERATIONAL_TIMEOUT_MS || 15000);
const indexNowKey = "99975fddf27362d564d730362b73f94d";

function parseEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;
  const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (!match) return null;
  let value = match[2].trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  if (!value) return null;
  return [match[1], value];
}

async function loadEnvFiles() {
  for (const file of envFiles) {
    if (!existsSync(file)) continue;
    const text = await readFile(file, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const parsed = parseEnvLine(line);
      if (!parsed) continue;
      const [key, value] = parsed;
      if (!(key in process.env)) process.env[key] = value;
    }
  }
}

function requireEnv(keys) {
  const missing = keys.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(", ")}`);
  }
}

function createSupabaseAdminClient() {
  requireEnv([
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  ]);

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

async function findQaUser(supabase) {
  requireEnv(["E2E_USER_EMAIL"]);

  const { data: users, error: usersError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (usersError) throw new Error("Supabase admin user lookup failed");

  const user = users.users.find(
    (item) => item.email?.toLowerCase() === process.env.E2E_USER_EMAIL.toLowerCase(),
  );
  if (!user) throw new Error("Supabase QA auth user was not found");
  return user;
}

async function withAuthenticatedPage(callback) {
  requireEnv(["E2E_USER_EMAIL", "E2E_USER_PASSWORD"]);

  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ baseURL: baseUrl });
  const page = await context.newPage();

  try {
    await page.goto("/en/auth", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /reject all/i }).click({ timeout: 3000 }).catch(() => {});
    await page.getByRole("button", { name: /password instead/i }).click();
    await page.getByLabel(/email/i).fill(process.env.E2E_USER_EMAIL);
    await page.getByLabel(/^password$/i).fill(process.env.E2E_USER_PASSWORD);
    await page.getByRole("button", { name: /^sign in$/i }).click();
    await page.waitForURL(/\/en\/dashboard/, { timeout: 20000 });
    return await callback(page);
  } finally {
    await browser.close();
  }
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function checkUrl(name, path, expectedStatus = 200, contains) {
  const response = await fetchWithTimeout(`${baseUrl}${path}`, { redirect: "follow" });
  if (response.status !== expectedStatus) {
    throw new Error(`${name} returned ${response.status}, expected ${expectedStatus}`);
  }
  if (contains) {
    const text = await response.text();
    if (!text.includes(contains)) {
      throw new Error(`${name} did not include expected production marker`);
    }
  }
  return { name, status: response.status };
}

async function checkSecurityHeaders() {
  const response = await fetchWithTimeout(`${baseUrl}/en`, { redirect: "follow" });
  if (response.status !== 200) {
    throw new Error(`security headers probe returned ${response.status}`);
  }

  const requiredHeaders = [
    "strict-transport-security",
    "x-content-type-options",
    "x-frame-options",
    "referrer-policy",
    "permissions-policy",
    "content-security-policy",
  ];
  const missing = requiredHeaders.filter((header) => !response.headers.get(header));
  if (missing.length > 0) {
    throw new Error(`Missing security headers: ${missing.join(", ")}`);
  }

  const csp = response.headers.get("content-security-policy") || "";
  if (!csp.includes("default-src 'self'") || !csp.includes("object-src 'none'")) {
    throw new Error("CSP header is missing core directives");
  }

  return { name: "security-headers", status: "ok", csp: "enforced" };
}

async function checkSupabase() {
  const admin = createSupabaseAdminClient();
  const user = await findQaUser(admin);

  const { error: profileError } = await admin
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .limit(1);
  if (profileError) throw new Error("Supabase profile read failed");

  return { name: "supabase", status: "ok" };
}

async function checkResend() {
  requireEnv(["RESEND_API_KEY", "EMAIL_FROM"]);
  if (!/@warrantee\.io\b/i.test(process.env.EMAIL_FROM)) {
    throw new Error("EMAIL_FROM is not using the warrantee.io domain");
  }

  const response = await fetchWithTimeout("https://api.resend.com/domains", {
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
  });
  if (response.status !== 200) {
    throw new Error(`Resend domain check returned ${response.status}`);
  }

  return { name: "resend", status: "ok" };
}

async function checkHubSpot() {
  requireEnv(["HUBSPOT_ACCESS_TOKEN"]);
  const response = await fetchWithTimeout("https://api.hubapi.com/crm/v3/objects/contacts?limit=1&archived=false", {
    headers: { Authorization: `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}` },
  });
  if (response.status !== 200) {
    throw new Error(`HubSpot contact read check returned ${response.status}`);
  }

  return { name: "hubspot", status: "ok" };
}

async function checkStripe() {
  requireEnv(["NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"]);
  if (!process.env.STRIPE_SECRET_KEY) {
    return checkRemoteStripeCheckout();
  }

  const response = await fetchWithTimeout("https://api.stripe.com/v1/balance", {
    headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
  });
  if (response.status !== 200) {
    const payload = await response.json().catch(() => ({}));
    const stripeMessage = payload?.error?.message || "";
    const stripeReason = /invalid api key/i.test(stripeMessage)
      ? "invalid API key"
      : payload?.error?.code || payload?.error?.type;
    const details = stripeReason ? ` (${stripeReason})` : "";
    throw new Error(`Stripe balance check returned ${response.status}${details}`);
  }

  return { name: "stripe", status: "ok" };
}

async function checkStripeWebhook() {
  const response = await fetchWithTimeout(`${baseUrl}/api/stripe/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  const payload = await response.json().catch(() => ({}));

  if (response.status === 503) {
    throw new Error("Stripe webhook endpoint is not configured; set STRIPE_WEBHOOK_SECRET in Vercel Production.");
  }
  if (response.status !== 400) {
    throw new Error(`Unsigned Stripe webhook probe returned ${response.status}, expected 400`);
  }
  if (!/signature/i.test(payload?.error || "")) {
    throw new Error("Unsigned Stripe webhook probe did not fail on signature validation");
  }

  return { name: "stripe-webhook", status: "ok", mode: "rejects-unsigned" };
}

async function checkGoogleVision() {
  requireEnv(["GOOGLE_CLOUD_VISION_API_KEY"]);

  const response = await fetchWithTimeout(
    `https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_CLOUD_VISION_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [
          {
            image: {
              content:
                "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
            },
            features: [{ type: "TEXT_DETECTION" }],
          },
        ],
      }),
    },
  );

  const payload = await response.json().catch(() => ({}));
  if (response.status !== 200) {
    const details = payload?.error?.message ? `: ${payload.error.message}` : "";
    throw new Error(`Google Vision check returned ${response.status}${details}`);
  }
  const responseError = payload?.responses?.[0]?.error?.message;
  if (responseError) {
    throw new Error(`Google Vision response error: ${responseError}`);
  }

  return { name: "google-vision", status: "ok" };
}

async function getSampleOcrImageDataUrl() {
  const { createCanvas } = await import("@napi-rs/canvas");
  const canvas = createCanvas(360, 140);
  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#111111";
  context.font = "32px Arial";
  context.fillText("WARRANTEE OCR", 24, 80);
  return `data:image/png;base64,${canvas.toBuffer("image/png").toString("base64")}`;
}

async function checkMistralOCR() {
  if (!process.env.MISTRAL_API_KEY) {
    return checkRemoteOCRProvider();
  }

  const model = process.env.MISTRAL_OCR_MODEL || "mistral-ocr-latest";
  const response = await fetchWithTimeout("https://api.mistral.ai/v1/ocr", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      document: {
        type: "image_url",
        image_url: await getSampleOcrImageDataUrl(),
      },
      include_image_base64: false,
      confidence_scores_granularity: "page",
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (response.status !== 200) {
    const details = payload?.error?.message || payload?.message;
    throw new Error(`Mistral OCR check returned ${response.status}${details ? `: ${details}` : ""}`);
  }
  if (!Array.isArray(payload.pages)) {
    throw new Error("Mistral OCR check returned no pages array");
  }

  return { name: "mistral-ocr", status: "ok", model: payload.model || model };
}

async function checkRemoteOCRProvider() {
  const image = await getSampleOcrImageDataUrl();
  const result = await withAuthenticatedPage(async (page) => {
    const response = await page.request.post(`${baseUrl}/api/ocr`, {
      data: { image },
      timeout: timeoutMs + 15000,
    });
    const payload = await response.json().catch(() => ({}));
    return { status: response.status(), payload };
  });

  if (result.status !== 200) {
    const details = result.payload?.error ? `: ${result.payload.error}` : "";
    throw new Error(`Production OCR endpoint returned ${result.status}${details}`);
  }
  if (!result.payload?.success || !/WARRANTEE|OCR/i.test(result.payload?.text || "")) {
    throw new Error("Production OCR endpoint did not return the expected extracted text");
  }
  const telemetry = result.payload?.ocr || {};
  if (!telemetry.provider || !telemetry.engine) {
    throw new Error("Production OCR endpoint did not report provider telemetry");
  }

  return {
    name: "ocr-provider",
    status: "ok",
    mode: "production-api",
    provider: telemetry.provider,
    engine: telemetry.engine,
    fallback: Boolean(telemetry.fallback),
    model: telemetry.model,
  };
}

function missingColumn(message) {
  return message.match(/'([^']+)' column/)?.[1] || message.match(/column "?([a-zA-Z0-9_]+)"?/)?.[1] || null;
}

async function adaptiveUpsert(table, payload, onConflict) {
  const supabase = createSupabaseAdminClient();
  const draft = { ...payload };

  for (let attempt = 0; attempt < 24; attempt += 1) {
    const { data, error } = await supabase
      .from(table)
      .upsert(draft, onConflict ? { onConflict } : undefined)
      .select()
      .single();
    if (!error) return data;

    const column = missingColumn(error.message || "");
    if (!column || !(column in draft)) throw error;
    delete draft[column];
  }

  throw new Error(`Could not seed ${table}; schema adaptation did not converge.`);
}

async function adaptiveInsert(table, payload) {
  const supabase = createSupabaseAdminClient();
  const draft = { ...payload };

  for (let attempt = 0; attempt < 24; attempt += 1) {
    const { data, error } = await supabase
      .from(table)
      .insert(draft)
      .select()
      .single();
    if (!error) return data;

    const column = missingColumn(error.message || "");
    if (!column || !(column in draft)) throw error;
    delete draft[column];
  }

  throw new Error(`Could not seed ${table}; schema adaptation did not converge.`);
}

async function seedStripeCheckoutData() {
  const supabase = createSupabaseAdminClient();
  const user = await findQaUser(supabase);
  const runId = `QA-READINESS-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString("hex").toUpperCase()}`;

  const warranty = await adaptiveUpsert(
    "warranties",
    {
      reference_number: `${runId}-STRIPE`,
      product_name: `${runId} Stripe Warranty`,
      product_name_ar: "ضمان اختبار Stripe",
      sku: `${runId}-SKU`,
      quantity: 1,
      start_date: "2026-01-01",
      end_date: "2028-01-01",
      purchase_date: "2026-01-01",
      warranty_start_date: "2026-01-01",
      warranty_end_date: "2028-01-01",
      description: "Seeded only for the operational readiness Stripe checkout probe.",
      serial_number: `${runId}-SN`,
      category: "qa",
      product_category: "qa",
      seller_name: "QA Seller",
      seller_email: "qa-seller@warrantee.io",
      currency: "SAR",
      terms_and_conditions: "QA operational readiness terms.",
      source: "qa_operational_readiness",
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

  const extension = await adaptiveInsert("warranty_extensions", {
    warranty_id: warranty.id,
    new_end_date: "2029-01-01",
    price: 150,
    currency: "SAR",
    commission_rate: 8,
    commission_amount: 12,
    terms: "Operational readiness Stripe checkout verification.",
    offered_by: user.id,
    is_purchased: false,
  });

  return { warrantyId: warranty.id, extensionId: extension.id };
}

async function cleanupStripeCheckoutData(seed) {
  if (!seed) return;
  const supabase = createSupabaseAdminClient();
  if (seed.extensionId) {
    await supabase.from("warranty_extensions").delete().eq("id", seed.extensionId);
  }
  if (seed.warrantyId) {
    await supabase.from("warranties").delete().eq("id", seed.warrantyId);
  }
}

async function checkRemoteStripeCheckout() {
  let seed;
  try {
    seed = await seedStripeCheckoutData();
    const result = await withAuthenticatedPage(async (page) => {
      const response = await page.request.post(`${baseUrl}/api/payments/create`, {
        data: {
          warrantyId: seed.warrantyId,
          extensionId: seed.extensionId,
          extensionMonths: 12,
          provider: "stripe",
          locale: "en",
          returnUrl: baseUrl,
        },
        timeout: timeoutMs + 15000,
      });
      const payload = await response.json().catch(() => ({}));
      return { status: response.status(), payload };
    });

    if (result.status !== 200) {
      const details = result.payload?.error ? `: ${result.payload.error}` : "";
      throw new Error(`Production Stripe checkout endpoint returned ${result.status}${details}`);
    }
    if (result.payload?.provider !== "stripe" || !result.payload?.sessionId || !/^https:\/\/checkout\.stripe\.com\//.test(result.payload?.url || "")) {
      throw new Error("Production Stripe checkout endpoint did not return a Stripe Checkout session");
    }

    return { name: "stripe", status: "ok", mode: "production-api" };
  } finally {
    await cleanupStripeCheckoutData(seed);
  }
}

async function checkOCRProvider() {
  const provider = (process.env.OCR_PROVIDER || "auto").trim().toLowerCase();
  if (provider === "mistral" || (provider === "auto" && process.env.MISTRAL_API_KEY)) {
    return checkMistralOCR();
  }
  if (provider === "google" || provider === "google-vision" || (provider === "auto" && process.env.GOOGLE_CLOUD_VISION_API_KEY)) {
    return checkGoogleVision();
  }
  if (provider === "tesseract") {
    return { name: "tesseract-local", status: "ok", note: "Local OCR provider selected; not recommended for production image OCR." };
  }

  return checkRemoteOCRProvider();
}

async function checkDocumentSecurityScanner() {
  const scannerUrl = process.env.DOCUMENT_SECURITY_SCANNER_URL?.trim() || "";
  const strictDownloads = process.env.DOCUMENT_DOWNLOAD_REQUIRE_CLEAN === "1";

  if (!scannerUrl) {
    return {
      name: "document-security-scanner",
      status: "pending_provider",
      mode: "not-configured",
      strictDownloads,
      nextAction: "Set DOCUMENT_SECURITY_SCANNER_URL before enabling DOCUMENT_DOWNLOAD_REQUIRE_CLEAN=1.",
    };
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(scannerUrl);
  } catch {
    throw new Error("DOCUMENT_SECURITY_SCANNER_URL must be a valid URL");
  }

  if (parsedUrl.protocol !== "https:") {
    throw new Error("DOCUMENT_SECURITY_SCANNER_URL must use HTTPS");
  }

  return {
    name: "document-security-scanner",
    status: "ok",
    mode: "external-provider",
    strictDownloads,
    host: parsedUrl.host,
  };
}

function getErrorMessage(error) {
  if (error instanceof Error) return error.message;
  return String(error);
}

async function checkProductionAppUrl() {
  requireEnv(["NEXT_PUBLIC_APP_URL"]);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  if (appUrl !== "https://warrantee.io") {
    throw new Error("NEXT_PUBLIC_APP_URL must be https://warrantee.io for production readiness");
  }

  return { name: "next-public-app-url", status: "ok" };
}

async function main() {
  await loadEnvFiles();
  const checks = [];
  const plannedChecks = [
    { name: "next-public-app-url", run: checkProductionAppUrl },
    { name: "home", run: () => checkUrl("home", "/en") },
    { name: "robots", run: () => checkUrl("robots", "/robots.txt", 200, "Sitemap: https://warrantee.io/sitemap.xml") },
    { name: "sitemap", run: () => checkUrl("sitemap", "/sitemap.xml", 200, "https://warrantee.io/en") },
    { name: "indexnow-key", run: () => checkUrl("indexnow-key", `/${indexNowKey}.txt`, 200, indexNowKey) },
    { name: "health", run: () => checkUrl("health", "/api/health") },
    { name: "security-headers", run: checkSecurityHeaders },
    { name: "supabase", run: checkSupabase },
    { name: "resend", run: checkResend },
    { name: "hubspot", run: checkHubSpot },
    { name: "ocr-provider", run: checkOCRProvider },
    { name: "document-security-scanner", run: checkDocumentSecurityScanner },
    { name: "stripe", run: checkStripe },
    { name: "stripe-webhook", run: checkStripeWebhook },
  ];

  for (const check of plannedChecks) {
    try {
      checks.push(await check.run());
    } catch (error) {
      checks.push({ name: check.name, status: "failed", error: getErrorMessage(error) });
    }
  }

  const failed = checks.some((check) => check.status === "failed");
  console.log(JSON.stringify({ status: failed ? "failed" : "ok", baseUrl, checks }, null, 2));
  if (failed) process.exit(1);
}

main().catch((error) => {
  console.error(JSON.stringify({ status: "failed", baseUrl, error: getErrorMessage(error) }, null, 2));
  process.exit(1);
});
