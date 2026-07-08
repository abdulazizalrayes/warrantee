import { readFileSync, existsSync } from "node:fs";

const checks = [];

function read(path) {
  return readFileSync(path, "utf8");
}

function assertCheck(name, ok, details = {}) {
  checks.push({ name, ok: Boolean(ok), ...details });
  if (!ok) {
    throw new Error(`${name} failed${details.reason ? `: ${details.reason}` : ""}`);
  }
}

function fileContains(path, snippets) {
  if (!existsSync(path)) return { ok: false, reason: `${path} is missing` };
  const text = read(path);
  const missing = snippets.filter((snippet) => !text.includes(snippet));
  return {
    ok: missing.length === 0,
    reason: missing.length ? `missing ${missing.join(", ")}` : undefined,
  };
}

function anyFileContains(paths, snippets) {
  const combined = paths.filter(existsSync).map((path) => read(path)).join("\n\n");
  const missing = snippets.filter((snippet) => !combined.includes(snippet));
  return {
    ok: missing.length === 0,
    reason: missing.length ? `missing ${missing.join(", ")}` : undefined,
  };
}

const funnelClient = fileContains("src/lib/ga4-events.ts", [
  "funnel_cta_click",
  "signup_submit",
  "sign_up",
  "seller_application_submit",
  "onboarding_completed",
  "sendServerFunnelEvent",
  "readCampaignParams",
  "appendCampaignParams",
  "utm_source",
  "utm_campaign",
]);
assertCheck("client and server funnel events are wired", funnelClient.ok, funnelClient);

const funnelServer = fileContains("src/app/api/funnel/events/route.ts", [
  "allowedEvents",
  "isTrustedSameOriginRequest",
  "activity_log",
  "funnel_event",
  "sanitizeMetadata",
  "utm_source",
  "utm_campaign",
]);
assertCheck("server funnel endpoint is privacy-safe and origin-guarded", funnelServer.ok, funnelServer);

const marketingPageViews = anyFileContains([
  "src/app/[locale]/page.tsx",
  "src/app/[locale]/pricing/page.tsx",
], [
  "PageViewTracker",
  'pageName="home"',
  'pageName="pricing"',
  'pageType="marketing"',
]);
assertCheck("high-intent marketing pages emit server-side funnel page views", marketingPageViews.ok, marketingPageViews);

const campaignCarryThrough = anyFileContains([
  "src/components/TrackedLink.tsx",
  "src/app/[locale]/pricing/page.tsx",
], [
  "appendCampaignParams",
  "attributedHref",
  "trackedDestination",
]);
assertCheck("internal CTAs preserve campaign attribution into conversion paths", campaignCarryThrough.ok, campaignCarryThrough);

const onboardingDocs = fileContains("docs/ONBOARDING_FUNNEL_ANALYTICS_2026-06-23.md", [
  "How To Read The Funnel",
  "If page views are low",
  "If `sign_up` exists but users do not create warranties",
  "Server-Side Funnel Visibility",
]);
assertCheck("onboarding diagnosis playbook exists", onboardingDocs.ok, onboardingDocs);

const assetIntelligence = anyFileContains([
  "src/lib/asset-intelligence.ts",
  "src/app/api/v1/intelligence/route.ts",
  "tools/warrantee/cli.mjs",
  "tools/warrantee/mcp-server.mjs",
  "src/lib/public-openapi.ts",
], [
  "computeAssetIntelligence",
  "lifecycleHealthScore",
  "supplierRiskSignals",
  "/api/v1/intelligence",
  "get_asset_intelligence",
  "warrantee intelligence summary",
]);
assertCheck("asset intelligence is exposed across API CLI MCP and OpenAPI", assetIntelligence.ok, assetIntelligence);

const productionGates = anyFileContains([
  "scripts/production-smoke.mjs",
  "scripts/operational-readiness-check.mjs",
  ".github/workflows/production-security.yml",
], [
  "/api/v1/intelligence",
  "security-headers",
  "security:rls-probe",
  "load:prod",
]);
assertCheck("production gates cover security and intelligence boundaries", productionGates.ok, productionGates);

const ocrCorpus = anyFileContains([
  "docs/OCR_PRIVATE_CORPUS_COLLECTION_CHECKLIST_2026-06-17.md",
  "docs/OCR_REAL_CORPUS_EXECUTION_2026-07-08.md",
  "docs/OCR_REGRESSION_CORPUS.md",
  "tests/fixtures/ocr-corpus/synthetic/manifest.json",
  "scripts/check-ocr-corpus.mjs",
], [
  "private corpus",
  "manifest",
  "expectedFields",
  "requirements",
  "locales",
  "kinds",
]);
assertCheck("OCR regression and private-corpus handover are documented", ocrCorpus.ok, ocrCorpus);

const pentest = anyFileContains([
  "docs/EXTERNAL_PENTEST_SCOPE_2026-06-17.md",
  "docs/PENTEST_VENDOR_SELECTION_2026-06-17.md",
  "docs/PENTEST_EXECUTION_PACKET.md",
  "docs/PENTEST_OUTREACH_EXECUTION_2026-07-08.md",
  "scripts/check-pentest-readiness.mjs",
], [
  "API / CLI / MCP",
  "OCR",
  "rules of engagement",
  "vendor",
]);
assertCheck("external pentest packet is ready for vendor execution", pentest.ok, pentest);

const trustAndPositioning = anyFileContains([
  "src/lib/seo-content.ts",
  "src/lib/agent-public-data.ts",
  "src/lib/agent-ready.ts",
  "docs/Warrantee_Investment_Grade_Strategic_Review_2026-06-11.docx",
], [
  "Asset lifecycle intelligence",
  "Warranty reminders are the acquisition mechanism",
  "Vendor reliability intelligence",
  "API / CLI / MCP",
]);
assertCheck("category and agent positioning are recorded", trustAndPositioning.ok, trustAndPositioning);

const salesCampaigns = anyFileContains([
  "scripts/generate-campaign-links.mjs",
  "docs/CONTROLLED_ACQUISITION_EXECUTION_2026-07-08.md",
  "docs/META_ADS_AI_CONNECTORS_PLAYBOOK.md",
  "docs/SOCIAL_CHANNELS.md",
  "src/lib/agent-skills.ts",
], [
  "seller onboarding",
  "campaign",
  "seller_pilot_july_2026",
  "business_pilot_july_2026",
  "integration_pilot_july_2026",
  "Meta",
  "Draft",
]);
assertCheck("sales and campaign operating notes exist", salesCampaigns.ok, salesCampaigns);

console.log(JSON.stringify({
  ok: true,
  checks,
  externalStillRequired: [
    "Formal third-party penetration test execution and signed report.",
    "Real approved customer/vendor OCR document corpus collection and private-corpus run.",
    "Real campaign traffic and onboarding analysis after distribution starts.",
  ],
}, null, 2));
