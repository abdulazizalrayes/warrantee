# Warrantee Operational Status

Last updated: 2026-05-24

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

- Local `.env.production.local` still has empty `STRIPE_SECRET_KEY` and `MISTRAL_API_KEY` values, so local operational checkout cannot complete from that file alone.
- The deployed production API passed readiness and the full operational E2E, including Stripe Checkout and OCR.
- `GOOGLE_CLOUD_VISION_API_KEY` is present, but Google Vision still returns a billing-disabled 403 from the configured Cloud project; the deployed OCR path no longer depends on it for launch availability.

Corrections made in the May 24 pass:

- Added an in-house production OCR fallback so image OCR does not hard-fail while the Google reseller/billing path and Mistral key are unresolved.
- Fixed the Tesseract worker path that caused the Sentry `Cannot find module '/var/task/.next/worker-script/node/index.js'` production error.
- Sanitized OCR provider logging so upstream error payloads are not dumped into application logs.
- Hardened document upload/delete, inbound email attachment names, public warranty verification query construction, and Hotjar script injection.
- Extended production CI to run the operational Playwright workflow against `https://warrantee.io`.

Current launch position:

- Code-level launch hardening is substantially complete.
- Production smoke, readiness, RLS, and operational E2E now pass on the May 24 deployment.
- Warrantee is ready for controlled production operation.
- For OCR scale, install a real `MISTRAL_API_KEY`; the Tesseract fallback is an availability bridge, not the preferred long-term provider.

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

## Still Open Before "Fully Operational"

- Google Cloud Vision image OCR is still blocked by the configured Google Cloud project requiring billing to be enabled, but this is no longer a launch blocker because production OCR passed through the deployed provider/fallback path.
- Google Cloud self-serve billing is blocked for the Saudi Arabia billing address. Google redirects the project to CNTXT reseller onboarding for Google Cloud in KSA; the next step requires an explicit CNTXT Google sign-in and likely reseller billing setup if Google Vision remains part of the provider plan.
- Full operational E2E is complete in production for the May 24 deployment:
  - passed: bulk import, approval, rejection, document upload/list/download/delete, OCR, Stripe Checkout, and team guardrails
- Brand-new teammate onboarding is still intentionally conservative:
  - teammates must already have a Warrantee account before being added to a company workspace
- CRM is intentionally postponed until the core operational surface is fully signed off.
- Optional channels are not part of the core operational blocker set:
  - WhatsApp
  - additional social pages beyond LinkedIn
- Meta paid acquisition is prepared at the playbook/agent-skill level, but no Meta ad account has been connected and no campaign has been launched.
- Bing Webmaster Tools should still be used to inspect sampled submitted URLs after IndexNow processing; the May 23 public search sample shows the homepage indexed, but submission acceptance does not guarantee immediate indexing or ranking for deeper URLs.

## Current Definition Of Done

Warrantee should only be called fully operational at scale when:

- every critical signed-in workflow, including import, approval/rejection, payment/webhook, OCR, documents, and account/team edge cases, is tested end to end with staging data or explicitly approved production QA records
- all primary business emails route through approved mailbox rules
- CRM capture is verified with live submissions after CRM is un-postponed
- OCR is verified with real image and PDF samples
- permissions and company isolation are validated on live data
- no critical production blockers remain open
