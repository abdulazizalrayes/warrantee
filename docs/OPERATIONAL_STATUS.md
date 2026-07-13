# Warrantee Operational Status

Last updated: 2026-07-13

## 2026-07-13 Auth Funnel Diagnostics

- Production health remains green: latest main CI passed, latest Production Security Gates passed, production smoke passed, operational readiness passed, and agent-readiness validation passed.
- Live production onboarding counts still show no new account movement compared with the June 23 baseline: auth users remain `15`, profiles remain `15`, companies remain `2`, seller invitations remain `0`, API usage events remain `0`, and HubSpot has `0` new contacts in the last 30 days.
- The last 7 days do show traffic: `1,341` server-side funnel page views and `421` auth-intent events. The traffic is concentrated on `/en/auth`, but there are still `0` signup submissions, `0` successful signup events, `0` contact submissions, `0` seller application submissions, and `0` onboarding completions.
- The funnel logger now preserves privacy-safe auth diagnostics (`tab`, `auth_mode`, `account_type`, `has_company_name`) so future checks can distinguish login traffic, signup traffic, consumer/business intent, and auth mode without storing personal data.
- Current interpretation: production health is not blocking onboarding. The immediate measurement gap was that `/auth` traffic could not be separated into login versus signup intent; future reads should use the new metadata before changing the auth-page visual experience.

## 2026-07-08 External Items Recheck

- Stripe Professional live price remains blocked externally. Vercel Production contains `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, but `STRIPE_PRO_PRICE_ID` is not configured. Vercel env pull does not expose the live Stripe secret locally, and regular Chrome opens Stripe at the login screen for `https://dashboard.stripe.com/products`. Required next action: sign in to Stripe or provide a usable live Stripe secret, then create/confirm the recurring Professional price at `SAR 149/month`, record the `price_...` id, and set Vercel Production `STRIPE_PRO_PRICE_ID`.
- Per founder direction, Stripe Professional live-price setup is postponed. Stripe dashboard/account setup has no monthly dashboard cost, but live payments still require a configured live price id and Stripe processing fees once customers pay.
- Stripe account memory: the founder reported on 2026-07-08 that logging in to `stripe.com` with `abdulaziz.alrayes@gmail.com` shows a Warrantee account. Use that email/account context first when Stripe work is resumed.
- A local ignored private OCR QA corpus was added under `tests/fixtures/ocr-corpus/private` with 12 redacted local fixtures across English, Arabic, mixed-language, receipts, invoices, warranty certificates, poor scans, duplicate invoices, and corrupted-PDF fallback text. `npm run qa:ocr-corpus:private` now passes locally with 12 file-backed entries. This improves repeatability but is not a substitute for later real approved customer/vendor scan coverage.
- Added `docs/OCR_REAL_CORPUS_EXECUTION_2026-07-08.md` with the real-document OCR collection target, founder outreach script, redaction rules, intake steps, and completion criteria.
- Independent third-party pentest remains an external vendor engagement, not a code task. Internal pre-pentest checks passed on 2026-07-08: `npm audit --omit=dev --audit-level=moderate`, `npm run guard:loopback`, `npm run qa:agent-readiness`, `npm run security:rls-probe`, `npm run smoke:prod`, `npm run readiness:operational`, and `npm run qa:pentest-readiness`. The actual signed third-party report still requires vendor selection, authorization/rules of engagement, test accounts/data, assessment execution, and retest evidence.
- Added `docs/PENTEST_OUTREACH_EXECUTION_2026-07-08.md` with vendor requirements, outreach email, decision checklist, and safe sharing instructions. No vendor was contacted or contracted from code because that requires recipient selection, commercial approval, and signed authorization.
- Production onboarding/language analytics were rechecked through Supabase service-role backend counts without exposing secrets. Compared with the June 23 baseline, auth users remain `15`, profiles remain `15`, companies remain `2`, seller invitations remain `0`, and API usage events remain `0`. No new auth users, profiles, companies, seller invitations, contact submissions, seller applications, or API usage were created in the last 30 days.
- The last 30 days contain `2,561` server-side funnel events: `1,923` page views, `637` auth-intent events, `1` pricing CTA click, `0` signup submissions, `0` successful signup events, `0` contact form submissions, `0` seller application submissions, and `0` onboarding completions. Locale split is `2,560` English events and `1` Arabic event. Top paths were `/en/auth`, `/en/notifications`, `/en/settings/team`, `/en`, `/en/pricing`, `/en/contact`, `/en/seller/register`, and `/ar/pricing`.
- Added `docs/CONTROLLED_ACQUISITION_EXECUTION_2026-07-08.md` with a 7-day founder-led outreach plan, approved tracked EN/AR campaign links, message templates, follow-up copy, and 48-hour measurement rules.
- Current interpretation: production health is not the limiting factor. The visible blocker is distribution and conversion: almost no tagged campaign traffic, only one pricing CTA click, and no signup/form submissions from recent traffic.

## 2026-07-07 Takeover Audit Closure

- Added `docs/TAKEOVER_AUDIT_2026-07-07.md` with a fresh full-system handover audit covering frontend, backend, API, portal/authenticated routes, Supabase/RLS, integrations, CLI/MCP/agent readiness, production readiness, security, UX, mobile/RTL behavior, performance, and operational risks.
- Closed the code-addressable audit findings:
  - homepage embedded pricing and bottom CTAs now use campaign-preserving tracked signup links;
  - the payment create route now reads Stripe/Moyasar provider secrets at request runtime instead of module scope;
  - `npm run qa:full-local` now provides a repeatable QA path that loads ignored local env files, builds once, starts one local server, runs authenticated suites sequentially, and falls back to production for the operational payment/OCR workflow if local write-only Stripe secrets are unavailable.
  - `/api/health` now runs on the Node runtime because it uses Supabase, removing the Supabase Edge-runtime build warning while preserving the public health contract;
  - static public content pages (`features`, `faq`, `guide`, `privacy`, `terms`, and `cookies`) are server-rendered instead of page-level client components;
  - public `pricing` and `seller/register` no longer load the authenticated route provider unnecessarily.
- Remaining external items are still explicit: approved private OCR corpus and independent third-party pentest execution/signoff. A deeper shared-JS/provider split remains optional future optimization, not a current blocker.

## 2026-06-30 Remaining Practical Uplift Closure

- Added `npm run qa:growth-readiness` as a repeatable handover/growth gate.
- The new gate verifies funnel instrumentation, privacy-safe server funnel logging, onboarding diagnosis docs, asset intelligence API / CLI / MCP / OpenAPI coverage, production security gates, OCR private-corpus handover docs, pentest execution packet, category positioning, and sales/campaign operating notes.
- Production smoke now checks that anonymous `GET /api/v1/intelligence` is rejected with `401`.
- Agent-readiness validation now checks that OpenAPI includes `/api/v1/intelligence`, MCP discovery advertises `get_asset_intelligence`, and the private intelligence endpoint rejects anonymous access.
- MCP and agent discovery metadata now advertise authenticated asset lifecycle intelligence so discovery, OpenAPI, CLI, hosted MCP, and stdio MCP stay aligned.
- Remaining items that cannot be completed in code remain external: formal third-party pentest execution/sign-off, approved private OCR document collection, and real campaign traffic/onboarding analysis after distribution starts.

## 2026-06-29 Asset Lifecycle Intelligence API / CLI / MCP

- Added a shared asset lifecycle intelligence model in `src/lib/asset-intelligence.ts` so the analytics UI, REST API, CLI, and MCP surfaces use the same warranty, claim, supplier, expiry, data-quality, and next-action calculations.
- Added authenticated `GET /api/v1/intelligence`, guarded by the existing API v1 authorization layer and requiring `warranties:read`.
- Added OpenAPI documentation for `/api/v1/intelligence` with scoped token/bearer authentication and no username/password integration pattern.
- Added CLI support through `warrantee intelligence summary --limit 5000`.
- Added MCP support through `get_asset_intelligence` for registered users with scoped API keys.
- Added targeted unit coverage for the intelligence model, API documentation/route guard, and CLI/MCP wiring.

## 2026-06-21 Vercel Domain Configuration Cleanup

- Vercel notified that `api.warrantee.io` was misconfigured for the `warrantee` project because the active DNS is managed on Cloudflare, not Vercel DNS.
- Live production API usage remains on `https://warrantee.io/api/...`; `api.warrantee.io` did not resolve publicly during verification.
- The stale `api.warrantee.io` project-domain assignment was removed through the Vercel project-domain API. The active project domains are now `warrantee.io` and `warrantee.vercel.app`.
- `npm run smoke:prod` passed after the cleanup, including public pages, agent-readiness files, `/api/health`, protected API rejection checks, and auth callback safety.
- If a dedicated API subdomain is approved later, add `A api.warrantee.io 76.76.21.21` in the active Cloudflare DNS zone first, then reattach the subdomain in Vercel.

## 2026-06-17 Handover Hardening Closure

- Dependency audit was remediated with updated production dependencies; `npm audit --omit=dev --audit-level=moderate` reports no known moderate-or-higher production vulnerabilities.
- API v1 claims and document metadata list routes no longer prefetch visible warranties with a `1000` row cap. They now use inner warranty joins plus referenced-table access filters so large accounts are not silently truncated.
- Supabase production schema now has the June operational migrations recorded as applied, including API integration tokens, subscription billing state, API usage events, document security status, expanded API token scopes, and operational data-retention controls.
- Production API integration token validation now allows `claims:read` and `documents:read` scopes, matching the API / CLI / MCP docs and routes.
- Production rate-limit readiness now requires the distributed Upstash Redis backend through `RATE_LIMIT_REQUIRE_REDIS=1` in Production Security Gates.
- Public verification lookup throttling was tightened from 60/minute to 30/minute per subject to reduce enumeration risk while preserving normal customer verification use.
- A protected operational data-retention endpoint was added at `/api/cron/data-retention`, guarded by `CRON_SECRET`.
- Data-retention controls now redact old raw email ingestion payloads, old OCR raw text, and old API usage events in bounded batches. Default retention windows are 90 days for sensitive ingestion/OCR text and 400 days for API usage events.
- Vercel cron scheduling now includes daily expiry checks, daily document-security scanning, and daily operational data retention. The document scan cron is daily because the current Vercel Hobby account blocks more-than-daily cron schedules.
- Production smoke/readiness checks now verify that the data-retention endpoint rejects unauthenticated access and that Redis-backed rate limiting is configured for production.
- GitHub Actions repository secrets now include normalized `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`, matching the already-configured Vercel production Redis settings without quoted values.
- Final production deployment for this hardening batch is `dpl_Ei2Nn1D2JvmHiZnDXsFzv3QhSZ8N`, ready and aliased to `https://warrantee.io` and `https://warrantee.vercel.app`.
- Latest GitHub `CI` passed on commit `32fe4b3`, including loopback guard, type-check, lint, tests, build, and E2E smoke.
- Manually triggered Production Security Gates passed on run `27678426397`, including production smoke, anonymous RLS probe, operational readiness, production operational E2E, and controlled load.
- Local production verification after the final deployment passed `npm run smoke:prod` and `npm run readiness:operational` against `https://warrantee.io`.
- OCR regression coverage now has a committed synthetic corpus, a manifest validator, and parser regression tests for English, Arabic, mixed-language, poor OCR text, and duplicate-invoice cases. The private real-document gate remains intentionally fail-fast until approved private fixture files are placed in `tests/fixtures/ocr-corpus/private`.
- Private OCR collection is now operationalized in `docs/OCR_PRIVATE_CORPUS_COLLECTION_CHECKLIST_2026-06-17.md`. The ignored local folder includes a README and manifest template, but real private coverage still requires approved redacted documents and a passing `npm run qa:ocr-corpus:private` run.
- External penetration-test readiness is packaged in `docs/EXTERNAL_PENTEST_SCOPE_2026-06-17.md`, including scope, rules of engagement, priority abuse cases, and required vendor deliverables. Vendor selection/RFP guidance is packaged in `docs/PENTEST_VENDOR_SELECTION_2026-06-17.md`. The actual signed third-party test remains an external engagement.
- External items that cannot be completed from code alone remain explicit: local authenticated E2E requires local ignored QA credentials, private OCR torture coverage requires real private fixture files, and formal third-party penetration testing requires an external vendor engagement.

## 2026-06-11 Current Launch Status

- Latest production deployment is ready and aliased to `https://warrantee.io`.
- Latest GitHub `CI` passed type-check, lint, tests, build, and E2E smoke.
- Latest manually triggered `Production Security Gates` passed on commit `98b29db` in run `27365307861`, including production smoke, Supabase anonymous RLS probe, operational readiness, production operational E2E, and controlled load.
- Email sending is active and guarded by `EMAIL_SEND_API_SECRET`; readiness proves the endpoint is authenticated without sending mail.
- Document scanning is active through Warrantee's protected baseline scanner, and strict clean-before-download gating is enabled.
- Mistral OCR is the active production OCR provider. Google Vision/CNTXT remains optional legacy/provider expansion work, not a current launch blocker.
- No current Search Console action is needed for `/en/faq` or `/en/api-docs`; both are indexed.
- LinkedIn and Crunchbase are active official Warrantee entity profiles.

## 2026-06-12 Crunchbase Logo Update

- Crunchbase profile/account session used for Warrantee.io: `abdulaziz.alrayes@gmail.com`.
- Official Warrantee company verification email: `hello@warrantee.io`.
- Attempted to upload the Warrantee logo from `public/icons/icon.svg`.
- Crunchbase blocked direct logo upload because the profile image field is employee-locked: `This field is only editable by verified employees.`
- Started Crunchbase employee verification for the Warrantee.io profile using `hello@warrantee.io`.
- Crunchbase confirmed: `Verification e-mail is on the way!`
- After the first reported confirmation, the edit page still showed the profile image field as employee-locked.
- Verification was retried on 2026-06-12 using `hello@warrantee.io`; Crunchbase again confirmed: `Verification e-mail is on the way!`
- The latest verification email was opened in the same Chrome/Crunchbase session, and Crunchbase confirmed: `You're now verified as a Warrantee.io employee.`
- Despite successful employee verification, the Warrantee.io edit page still keeps the profile image field locked with `This field is only editable by verified employees`, exposes no file input, and does not open a file chooser when the image placeholder is clicked.
- Remaining action: contact Crunchbase support or wait for Crunchbase permission propagation so the verified `abdulaziz.alrayes@gmail.com` account can edit the profile image, then upload `public/icons/icon.svg` as the Warrantee.io Crunchbase logo.

## 2026-06-11 Crunchbase Setup Attempt

- Created and verified the official Warrantee.io Crunchbase company profile from the `abdulaziz.alrayes@gmail.com` Crunchbase session.
- Public profile: `https://www.crunchbase.com/organization/warrantee-io`.
- A pre-existing `Warrantee` profile exists on Crunchbase for a different Japan-based insurance/InsurTech company, so the official Warrantee entity is intentionally named `Warrantee.io`.
- Profile fields submitted: name, also-known-as, short description, website, LinkedIn, support email, full description, Riyadh headquarters, and industries.
- The verified Crunchbase profile URL was added to Warrantee structured data `sameAs`.

## 2026-06-11 Latest Production Gate Recheck

- Manually triggered `Production Security Gates` against `main` after the API-auth, reset-password, and Arabic typography changes.
- Run: `27358595969`.
- Commit: `5ed1dfa1370177e9ea511bf82237964609bc9f3b`.
- Result: passed.
- Passed checks included loopback guard, production smoke, Supabase anonymous RLS probe, operational readiness, production operational E2E, and controlled production load.

## 2026-06-11 Crunchbase Schema Production Gate Recheck

- Manually triggered `Production Security Gates` against `main` after adding the verified Crunchbase entity profile to Warrantee schema `sameAs`.
- Run: `27365307861`.
- Commit: `98b29db72f9a8001513e5c6723655b05957e13dc`.
- Result: passed.
- Passed checks included loopback guard, production smoke, Supabase anonymous RLS probe, operational readiness, production operational E2E, and controlled production load.

## 2026-06-11 Search Console / Public Index Recheck

- Public Google results return `https://warrantee.io/en/api-docs`.
- Public Google results return `https://warrantee.io/en/faq`.
- The `/en/api-docs` search result includes the current no-shared-password API integration guidance, confirming the updated production page is visible to Google.
- Direct Search Console access in the in-app browser remains blocked because that browser is not authenticated to the `abdulaziz.alrayes@gmail.com` Warrantee property. The page returned `Oops, you don't have access to this property`.
- No new indexing request is needed for `/en/api-docs` or `/en/faq` based on public index visibility and the prior authenticated Search Console result that both pages are indexed.

## 2026-06-11 Remaining External Items Closure

- Public Google search now returns both `https://warrantee.io/en/api-docs` and `https://warrantee.io/en/faq`, matching the prior Search Console result that both URLs are indexed.
- Latest GitHub `CI` on `main` passed for commit `af6ca28`.
- Latest manually triggered `Production Security Gates` on `main` passed for commit `af6ca28`.
- `npm run smoke:prod` passed locally against `https://warrantee.io`, including protected API rejection checks for email, cron, document scanner, notifications, integration tokens, and public API routes.
- `npm run observability:sentry` passed for both local and Vercel production readiness, with runtime DSNs and release-upload configuration present.
- `npm run guard:loopback` passed with no disallowed local development or loopback references.
- The local QA login was rotated and restored in `.env.local`, and GitHub Actions `E2E_USER_EMAIL` / `E2E_USER_PASSWORD` secrets were updated.
- Local `OPERATIONAL_BASE_URL=https://warrantee.io npm run readiness:operational` now passes authenticated Supabase, Mistral OCR, document scanner, Stripe, Stripe webhook, Resend, HubSpot, security header, and production URL checks.

## 2026-06-11 Document Scanner Activation Status

- Warrantee now has a protected document scanning endpoint at `/api/cron/scan-documents`, guarded by `CRON_SECRET`.
- Production Vercel env now contains `CRON_SECRET`, `DOCUMENT_SECURITY_SCANNER_URL`, `DOCUMENT_SECURITY_SCANNER_TOKEN`, and `DOCUMENT_DOWNLOAD_REQUIRE_CLEAN`.
- The initial scanner provider is Warrantee's protected internal baseline endpoint at `/api/internal/document-security-scan`.
- The baseline scanner blocks unsupported types, executable extensions, file-size/hash mismatches, content magic mismatches, and risky PDF actions such as JavaScript, launch actions, embedded files, and rich media.
- Strict document download gating is enabled with `DOCUMENT_DOWNLOAD_REQUIRE_CLEAN=1`, so documents must be marked clean before download.

## 2026-06-11 Email Send Activation

- Resend domain `warrantee.io` is verified.
- `EMAIL_SEND_API_SECRET` is configured in Vercel Production and GitHub Actions.
- `npm run readiness:operational` now probes `/api/email/send` with an unauthenticated request expecting `401`, then an authenticated invalid-template request expecting `404` so the endpoint is proven active without sending an email.

## 2026-06-11 Search Console Recheck

- Rechecked the Warrantee Search Console property under `abdulaziz.alrayes@gmail.com`.
- `https://warrantee.io/en/api-docs` remains on Google. URL Inspection reports `URL is on Google` and `Page is indexed`.
- No Search Console Request Indexing action is currently needed for `/en/api-docs`.

## 2026-06-08 Search Console Indexing Completion

- Rechecked the Warrantee Search Console property under `abdulaziz.alrayes@gmail.com`.
- `https://warrantee.io/en/faq` is now on Google. URL Inspection reports `URL is on Google` and `Page is indexed`; Search Console also detected valid HTTPS, Breadcrumbs, and FAQ enhancements for the page.
- `https://warrantee.io/en/api-docs` is now on Google. URL Inspection reports `URL is on Google` and `Page is indexed`; Search Console also detected valid HTTPS and Breadcrumbs enhancements for the page.
- No Warrantee code, sitemap, robots, canonical, `hreflang`, structured-data, or Search Console Request Indexing action remains open for these two URLs.

## 2026-06-07 Search Console Indexing Retry

- Rechecked the Warrantee Search Console property under `abdulaziz.alrayes@gmail.com`.
- `https://warrantee.io/en/faq` remains not on Google; URL Inspection still reports `Crawled - currently not indexed`, crawl allowed, fetch successful, indexing allowed, and sitemap discovery. Request Indexing was retried and Google returned `Quota Exceeded` with the instruction to try again tomorrow. The Discovery/Sitemaps panel also showed `Temporary processing error` during the live inspection retry.
- `https://warrantee.io/en/api-docs` remains not on Google; URL Inspection still reports `Discovered - currently not indexed` with sitemap discovery. Request Indexing was retried and Google returned `Quota Exceeded` with the instruction to try again tomorrow.
- No Warrantee code, sitemap, robots, canonical, `hreflang`, or structured-data fix is indicated by this retry. The remaining action is external: retry Search Console Request Indexing after Google's daily quota resets.

## 2026-06-06 Search Console And SEO Validation

- Google Search Console access was verified in the Chrome profile for `abdulaziz.alrayes@gmail.com`.
- Warrantee property: `https://warrantee.io/`.
- Search Console URL: `https://search.google.com/search-console?resource_id=https%3A%2F%2Fwarrantee.io%2F`.
- Search Console overview showed 24 indexed pages, 19 not indexed pages, and 4 total web search clicks.
- `/sitemap.xml` is submitted in Search Console with status `Success`, last read May 31, 2026, and 28 discovered pages.
- URL Inspection results:
  - `https://warrantee.io/en`: URL is on Google; page is indexed.
  - `https://warrantee.io/ar`: URL is on Google; page is indexed.
  - `https://warrantee.io/en/pricing`: URL is on Google; page is indexed.
  - `https://warrantee.io/en/features`: URL is on Google; page is indexed.
  - `https://warrantee.io/en/verify`: URL is on Google; page is indexed.
  - `https://warrantee.io/en/faq`: not currently on Google; Search Console reports `Crawled - currently not indexed`, crawl allowed, fetch successful, indexing allowed, sitemap discovered.
  - `https://warrantee.io/en/api-docs`: not currently on Google; Search Console reports `Discovered - currently not indexed`, sitemap discovered.
- Request Indexing was attempted for the not-indexed URLs, but Google returned `Quota Exceeded`; retry after the daily Search Console quota resets.
- Page indexing report showed 19 not-indexed URLs across 6 reasons: `Excluded by noindex tag` 4, `Page with redirect` 1, `Discovered - currently not indexed` 6, `Crawled - currently not indexed` 2, `Blocked by robots.txt` 5, and `Not found (404)` 1.
- Search Console HTTPS report showed 0 non-HTTPS URLs and no critical issues.
- Search Console Manual Actions and Security Issues both showed no issues detected.
- Google Rich Results Test passed:
  - `/en`: 2 valid items, Organization and Software Apps.
  - `/ar`: 2 valid items, Organization and Software Apps.
  - `/en/pricing`: 3 valid items, Breadcrumbs, Organization, and Software Apps.
- Live production SEO crawl verified priority URLs return 200, publish a canonical URL, expose five reciprocal `hreflang` alternates (`en`, `en-US`, `ar`, `ar-SA`, `x-default`), include parseable JSON-LD, and have no public-page `noindex`.
- `npm run indexnow:submit` resubmitted 28 public sitemap URLs to IndexNow and Bing with HTTP 200 responses.
- `npm run smoke:prod`, `npm run readiness:operational`, and `npm run guard:loopback` passed after the Search Console check.

## 2026-05-24 Recheck

### Security Hardening Addendum

The latest hardening pass added stricter launch gates for abuse protection and payment integrity:

- central client IP extraction now prefers Cloudflare and forwarded proxy headers consistently
- OCR, bulk import, payment, contact, certificate, public lookup, and webhook routes have endpoint-specific rate limits
- contact and Meta conversion browser endpoints now reject cross-origin direct posts
- Stripe webhooks now fail closed when `STRIPE_WEBHOOK_SECRET` is missing and reject unsigned probes in readiness
- the app now emits a report-only Content Security Policy so violations can be observed before enforcement
- operational readiness now validates production security headers and Stripe webhook signature enforcement

Launch status depends on the stricter readiness gate. If the new `stripe-webhook` readiness check reports that `STRIPE_WEBHOOK_SECRET` is not configured in Vercel Production, subscriptions and invoice/payment lifecycle updates must not be considered fully operational until the Stripe dashboard webhook signing secret is installed and the production readiness gate passes again.

The latest end-to-end launch recheck found a local env-pull inconsistency, then verified the deployed production API directly:

- Local env pulls may not expose sensitive provider secrets, so production provider health should be verified through production-safe readiness probes rather than by echoing local secret values.
- The deployed production API passed readiness and the full operational E2E, including Stripe Checkout and OCR.
- `GOOGLE_CLOUD_VISION_API_KEY` is present, but Google Vision still returns a billing-disabled 403 from the configured Cloud project; the deployed OCR path no longer depends on it for launch availability.

Corrections made in the May 24 pass:

- Added an in-house production OCR fallback so image OCR does not hard-fail while hosted OCR providers are unavailable.
- Fixed the Tesseract worker path that caused the Sentry `Cannot find module '/var/task/.next/worker-script/node/index.js'` production error.
- Sanitized OCR provider logging so upstream error payloads are not dumped into application logs.
- Hardened document upload/delete, inbound email attachment names, public warranty verification query construction, and Hotjar script injection.
- Extended production CI to run the operational Playwright workflow against `https://warrantee.io`.

Current launch position:

- Code-level launch hardening is substantially complete.
- Production smoke, readiness, RLS, and operational E2E now pass on the May 24 deployment.
- Warrantee is ready for controlled production operation.
- Production readiness now verifies Mistral OCR as the active provider; the Tesseract fallback remains an availability bridge, not the preferred long-term provider.

## Closed

- Production is live on `warrantee.io`.
- Latest verified May 24 production deployment is aliased to `https://warrantee.io`.
- The May 22 launch gate is closed for controlled production usage:
  - `npm test` passed with 48/48 tests
  - `npm run type-check` passed
  - `npm run build` passed and generated 151 app routes
  - `npm run smoke:prod` passed after deployment
  - `npm run guard:loopback` passed and CI now blocks disallowed local loopback links outside intentional test/guard files
  - `npm run test:e2e:business` passed against production with sign-in, warranty detail, draft claim creation, extension request, notifications API, team API, and self-delete guardrail coverage
  - `npm run test:e2e:operational` verifies import, approve/reject, document upload/list/download/delete, OCR, Stripe Checkout, and team guardrails in production
  - `npm run load:prod` passed with 2,824 requests, 0 failures, p95 355.6 ms, and p99 572 ms
  - `npm run security:rls-probe` completed without exposing anonymous warranty rows
  - `npm run indexnow:submit` submitted 28 public URLs successfully to IndexNow and Bing
  - `npm run readiness:operational` passes production app URL, home, robots, sitemap, IndexNow key file, health, Supabase, Resend, HubSpot, OCR, and Stripe checks
  - current smoke, readiness, RLS, and operational checks returned no HTTP or workflow failures
  - Stripe production env was replaced in Vercel production and redeployed; a targeted authenticated production checkout probe returned a Stripe Checkout URL and session ID, then cleaned its QA rows
- Sentry production observability is closed for launch:
  - runtime DSNs are present through `NEXT_PUBLIC_SENTRY_DSN` and `SENTRY_DSN`
  - release-upload env is configured through private Vercel production variables `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and `SENTRY_PROJECT`
  - the production build uploaded Sentry artifact bundles/source maps for org `abdulazizalrayes`, project `warrantee`
  - `npm run observability:sentry` passed for Vercel production
  - the browser-side React Flight `Connection closed.` unhandled-rejection noise from `/en` is filtered narrowly when it originates from Next static chunks, and a fresh Playwright pass on `https://warrantee.io/en` returned 200 with no browser or console errors
- The deeper May 22 workflow gate found and fixed two production-schema/workflow issues:
  - `/api/claims` no longer selects the non-existent `warranties.brand` column
  - warranty extension pages now load warranty and extension data through authenticated server API routes instead of fragile browser-side direct warranty queries
- AI / agent readiness endpoints are live and validated.
- Team management is now enforced server-side with company isolation.
- Approval and rejection actions are scoped to the correct company.
- Warranty creation now goes through the protected API path instead of relying on a direct client insert.
- Bulk import now writes full ownership metadata and reference numbers, so imported warranties stay visible to the right users and workflows.
- Warranty status validation now supports live workflow states used by the approval system:
  - `draft`
  - `pending_approval`
  - `cancelled`
  - `rejected`
- Anonymous users are redirected away from warranty creation/import workflow surfaces instead of sitting on half-usable private pages.
- OCR no longer depends exclusively on Google Cloud Vision for PDFs:
  - embedded-text PDF OCR is verified in production
  - the PDF worker file is explicitly included in the Vercel serverless trace for `/api/ocr`
- production image OCR now falls back to in-house Tesseract when hosted providers are unavailable instead of timing out behind Cloudflare
- Outbound operational mail is standardized to the approved business mailbox path:
  - sender defaults to `hello@warrantee.io`
  - admin and seller invite flows BCC the business inbox
- Production Resend sending has been exercised successfully against the approved mailbox path.
- CRM capture now covers:
  - contact form submissions
  - seller invitation leads
  - new signup/contact creation sync
- GA4/GTM analytics are configured on the existing Warrantee property:
  - GA4 account/property: `Warrantee / Warrantee.io`
  - measurement ID: `G-ZQJ4LRG4GN`
  - GTM container: `GTM-N6G95MQL`
  - no new GA4 account, property, stream, or GTM container was created
  - browser business events are consolidated so GTM `dataLayer` is used when GTM is configured, with direct GA4 `gtag` used only as the no-GTM fallback
- Google Search Console access is recorded for Warrantee only:
  - Google account: `abdulaziz.alrayes@gmail.com`
  - Search Console property: `https://warrantee.io/`
  - Search Console URL: `https://search.google.com/search-console?resource_id=https%3A%2F%2Fwarrantee.io%2F`
  - use this property for Warrantee sitemap submission, URL inspection, indexing checks, and search performance review
- GA4 Key events are configured and read back in the existing property:
  - `sign_up`
  - `warranty_created`
  - `claim_submitted`
  - `warranty_scan`
  - `extension_request`
  - `extension_wishlist`
  - `document_view`
  - `team_invite`
  - `approval_action`
  - `report_export_requested`
  - `seller_invite_sent`
  - `contact_form_submit`
  - `purchase`
- Live authenticated route-shell QA was completed on April 30, 2026:
  - `/en/dashboard`
  - `/en/warranties`
  - `/en/documents`
  - `/en/extensions`
  - `/en/settings/team`
  - `/en/analytics`
  - `/en/reports`
- Team management was verified in the live authenticated session:
  - sidebar remained visible
  - roster loaded
  - invite modal opened
  - role controls were visible
  - approved-domain messaging was visible
- Production probes passed on April 30, 2026:
  - public landing page returned `200`
  - API docs returned `200`
  - `.well-known` agent/API endpoints returned `200`
  - `/api/health` returned `200`
  - protected dashboard routes returned `307` when unauthenticated, as expected
- QA gates passed on April 30, 2026:
  - `npm run type-check`
  - `npm run test -- --reporter=dot` with 7 files / 48 tests passing
- Vercel production logs showed no production error logs in the last hour at the time of the check.
- Paperclip cloud agent health was checked for Warrantee only:
  - 18 Warrantee agents found
  - all use `opencode_local`
  - no cross-company agent scope was changed
- Meta Ads AI Connectors were reviewed as a Warrantee paid-growth opportunity:
  - added `docs/META_ADS_AI_CONNECTORS_PLAYBOOK.md`
  - added a public agent skill for `paid-growth-ops`
  - added consent-aware Meta Pixel and disabled-by-default Conversions API hooks
  - live Meta account linking, campaign changes, audience uploads, and spend changes remain approval-gated
- IndexNow/Bing submission support is implemented:
  - root IndexNow key file is configured
  - `npm run indexnow:submit` submits public sitemap URLs to IndexNow and Bing
  - `npm run smoke:prod` now validates the key file after deployment
- Official Warrantee LinkedIn page is recorded:
  - https://www.linkedin.com/company/warrantee-io
  - this is the only active Warrantee social channel currently recorded
- Automated QA and monitoring baseline is implemented and part of the release gate:
  - Playwright E2E covers public routes, protected redirects, SEO endpoints, agent-readiness endpoints, authenticated route shells, and deeper business workflow checks
  - Vercel Web Analytics and Speed Insights are installed
  - Sentry is tagged by environment, release, product, and runtime surface
  - production smoke, Sentry readiness, business E2E, load, and RLS checks are available through package scripts

## Open Monitoring And External Items

- 2026-07-07 approved takeover fixes:
  - Added Phase 0-2 handover docs:
    - `docs/SYSTEM_MAP.md`
    - `docs/AUDIT_REPORT.md`
    - `docs/BACKLOG.md`
    - `docs/PRICING_BILLING_EXTENSION_ROLLOUT_2026-07-07.md`
  - Replaced the public `$1/month` Professional story with a Saudi-first `SAR 149/month` launch offer in plan definitions, pricing copy, metadata, FAQ, and JSON-LD.
  - Removed the hidden Stripe 30-day trial from subscription checkout so billing behavior matches the public pricing story.
  - Clarified that Free keeps warranty history and that warranty-extension transaction fees are separate from subscription benefits.
  - Strengthened the certificate/passport growth loop with understated `Powered by Warrantee.io` wording on public passports and certificate outputs.
  - Kept beta languages as noindexed/fallback language routes; only English and Arabic remain indexed production locales until analytics proves additional demand.
  - Local verification passed:
    - `npm run type-check`
    - `npm run lint`
    - `npm test -- --run src/lib/__tests__/seo-readiness.test.ts src/lib/__tests__/operational-hardening.test.ts src/lib/__tests__/qr-code.test.ts`
    - `npm test`
    - `npm run build`
    - `npm run guard:loopback`
    - `npm run qa:growth-readiness`
    - `npx playwright test tests/e2e/public-routes.spec.ts tests/e2e/seo-agent-ready.spec.ts --project=chromium --workers=1`
  - Production checks passed against the currently deployed site:
    - `npm run readiness:operational`
    - `npm run smoke:prod`
  - Production deployment is still pending for the local pricing/handover patch set. Before deploying the billing story as commercial go-live, confirm the live Stripe Professional recurring price is `SAR 149/month` and `STRIPE_PRO_PRICE_ID` points to it in Vercel Production.
- 2026-07-05 Search Console robots fix:
  - Opened the regular Chrome browser, not the in-app browser, and verified the Warrantee Search Console property under `abdulaziz.alrayes@gmail.com`.
  - Search Console `Blocked by robots.txt` showed 6 examples: `/api/mcp`, `/en/seller/register`, `/ar/warranties`, `/en/warranties/new`, `/en/warranties`, and `/en/dashboard`.
  - Live production already allowed `/api/mcp` and `/en/seller/register`; the remaining examples were protected UI routes that redirected unauthenticated users.
  - Updated robots policy so protected UI routes are crawlable but still auth-protected and non-indexable, while private APIs remain blocked except public MCP/health endpoints.
  - Updated middleware redirects for protected/auth/admin flows to include `X-Robots-Tag: noindex, nofollow`, preserving security while preventing the protected UI routes from remaining in the `Blocked by robots.txt` bucket.
  - GitHub CI passed for commit `e01b849`, and live production showed the updated robots policy plus `X-Robots-Tag: noindex, nofollow` on `/en/dashboard`.
  - Started a new Search Console validation for `Blocked by robots.txt` on July 5, 2026. Search Console now shows validation started with 6 pending examples and 0 failed examples.
- 2026-07-05 remaining-items recheck:
  - Production smoke passed for public pages, agent-readiness files, protected route redirects, protected APIs, auth callback safety, `/api/health`, and `/api/mcp`.
  - Operational readiness passed for Supabase, Resend, HubSpot, Mistral OCR, document-security scanning, Stripe, unsigned webhook rejection, CSP, and Redis-required backend rate limiting.
  - Agent readiness passed for 13 JSON discovery endpoints and 6 text endpoints.
  - Growth readiness, pentest readiness, and OCR corpus readiness all passed.
  - Live `robots.txt` allows public content and intentionally blocks private app/API surfaces. The sitemap currently has 50 URLs, and none of those sitemap URLs are blocked by `robots.txt`.
  - The in-app browser still cannot inspect exact Search Console affected examples because it redirects to the public Search Console landing page instead of the authenticated `abdulaziz.alrayes@gmail.com` Warrantee property. No Warrantee code fix is indicated for the latest Google Search Console `Blocked by robots.txt` email unless the authenticated Search Console affected examples show public sitemap URLs. Private app/API URLs should remain blocked.
  - Private OCR cannot be marked complete yet: `tests/fixtures/ocr-corpus/private` contains only the README and manifest template, and `npm run qa:ocr-corpus:private` correctly fails because the ignored private `manifest.json` is not present.
  - Remaining non-code/external actions are formal third-party pentest execution and signed report, approved private OCR document corpus collection, real campaign/outreach traffic, and post-traffic onboarding analysis.
- 2026-06-30 onboarding monitor:
  - GitHub CI, Production Security Gates, and production smoke were green.
  - Backend counters still showed no new external accounts, companies, seller applications, invitations, API tokens, or API usage versus the June 23 baseline.
  - Server-side funnel attribution now captures privacy-safe `utm_*` and `ref` values so the next seller/business outreach push can be measured by source, medium, and campaign without storing personal data in analytics metadata.
- Google Cloud Vision is not required for launch because Mistral OCR is active and verified in production. CNTXT/Google reseller billing can remain postponed unless we explicitly decide to add Google Vision back as an OCR provider.
- Full operational E2E is complete in production for the latest June 11 deployment:
  - passed: bulk import, approval, rejection, document upload, strict scan-before-download document flow, OCR, Stripe Checkout, and team guardrails
- Brand-new teammate onboarding is still intentionally conservative:
  - teammates must already have a Warrantee account before being added to a company workspace
- CRM is intentionally postponed until the core operational surface is fully signed off.
- Optional channels are not part of the core operational blocker set:
  - WhatsApp
  - additional social pages beyond LinkedIn
- Meta paid acquisition is prepared at the playbook/agent-skill level, but no Meta ad account has been connected and no campaign has been launched.
- Bing Webmaster Tools should still be used to inspect sampled submitted URLs after IndexNow processing; the May 23 public search sample shows the homepage indexed, but submission acceptance does not guarantee immediate indexing or ranking for deeper URLs.
- Google Search Console Request Indexing no longer needs to be retried for `/en/faq` or `/en/api-docs`; both are indexed as of 2026-06-08.

## Current Definition Of Done

Warrantee should only be called fully operational at scale when:

- every critical signed-in workflow, including import, approval/rejection, payment/webhook, OCR, documents, and account/team edge cases, is tested end to end with staging data or explicitly approved production QA records
- all primary business emails route through approved mailbox rules
- CRM capture is verified with live submissions after CRM is un-postponed
- OCR is verified with real image and PDF samples
- permissions and company isolation are validated on live data
- no critical production blockers remain open
