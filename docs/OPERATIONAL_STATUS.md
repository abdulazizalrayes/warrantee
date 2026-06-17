# Warrantee Operational Status

Last updated: 2026-06-17

## 2026-06-17 Handover Hardening Closure

- Dependency audit was remediated with updated production dependencies; `npm audit --omit=dev --audit-level=moderate` reports no known moderate-or-higher production vulnerabilities.
- API v1 claims and document metadata list routes no longer prefetch visible warranties with a `1000` row cap. They now use inner warranty joins plus referenced-table access filters so large accounts are not silently truncated.
- Production rate-limit readiness now requires the distributed Upstash Redis backend through `RATE_LIMIT_REQUIRE_REDIS=1` in Production Security Gates.
- Public verification lookup throttling was tightened from 60/minute to 30/minute per subject to reduce enumeration risk while preserving normal customer verification use.
- A protected operational data-retention endpoint was added at `/api/cron/data-retention`, guarded by `CRON_SECRET`.
- Data-retention controls now redact old raw email ingestion payloads, old OCR raw text, and old API usage events in bounded batches. Default retention windows are 90 days for sensitive ingestion/OCR text and 400 days for API usage events.
- Production smoke/readiness checks now verify that the data-retention endpoint rejects unauthenticated access and that Redis-backed rate limiting is configured for production.
- External items that cannot be completed from code alone remain explicit: local authenticated E2E requires local ignored QA credentials, the private OCR regression corpus requires private fixture files, and formal third-party penetration testing requires an external engagement.

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
