# Production QA And Monitoring Gate

Last updated: 2026-06-11

## Purpose

Warrantee should not move to production on screenshots, hope, or a single manual pass. Every rollout should pass an automated QA gate, then be watched by production monitoring after release.

## Mandatory Amendment Rule

Every Warrantee amendment must improve, enhance, or fix the product. No code, configuration, content, workflow, integration, analytics, security, or UX change should be treated as complete until it has been reviewed and tested against the actual user journey it affects.

Before rollout, the owner of the change must confirm:

- The change matches the requested business outcome and does not contradict existing product behavior, copy, pricing, language, analytics, security, or operational workflows.
- The user experience and usability were checked as an actual user would experience them, including navigation, forms, empty/error/loading states, mobile behavior, accessibility basics, and visible copy.
- The change does not introduce broken buttons, dead routes, bad redirects, overlapping UI, confusing states, data leakage, security weakening, provider/integration regressions, or development-only/preview-only dependencies.
- The appropriate automated checks passed for the affected surface, and any skipped or unavailable check is documented as a risk with a replacement verification path.
- Post-rollout production smoke/readiness checks pass when the change reaches production, and monitoring is reviewed for new Sentry, Vercel, API, payment, OCR, email, or database errors.
- A rollback path is known before rollout for any customer-facing, payment, auth, database, or security-sensitive change.

If a change cannot be adequately QA-tested, it must not be called fully done or fully operational. It can only be marked as pending verification with the exact blocker, affected workflow, risk, and next action.

## Automated QA Gate

Run before deployment:

```bash
npm run type-check
npm run guard:loopback
npm test
npm run test:e2e
npm run test:e2e:business
npm run observability:sentry
```

Run against production after deployment:

```bash
npm run smoke:prod
npm run observability:sentry
OPERATIONAL_BASE_URL=https://warrantee.io npm run readiness:operational
E2E_BASE_URL=https://warrantee.io npm run test:e2e:business
E2E_BASE_URL=https://warrantee.io npm run test:e2e:operational
npm run load:prod
npm run security:rls-probe
npm run indexnow:submit
```

Run against a preview or staging URL:

```bash
E2E_BASE_URL=https://your-preview-url.vercel.app npm run test:e2e
E2E_BASE_URL=https://your-preview-url.vercel.app npm run test:e2e:business
SMOKE_BASE_URL=https://your-preview-url.vercel.app npm run smoke:prod
```

Post-deploy log review:

```bash
vercel logs warrantee.io --since 30m
```

## Current E2E Coverage

- Public marketing pages load without browser errors.
- Legacy `.html` and favicon redirects stay healthy.
- Protected buyer, seller, admin, warranty, claim, extension, document, notification, and team routes redirect unauthenticated users safely.
- SEO and agent-readiness endpoints stay available:
  - `/robots.txt`
  - `/sitemap.xml`
  - `/llms.txt`
  - `/.well-known/agent-card.json`
  - `/.well-known/api-catalog`
  - `/.well-known/mcp.json`
  - `/.well-known/agent-skills`
- Optional signed-in shell QA runs when `E2E_USER_EMAIL` and `E2E_USER_PASSWORD` are configured.
- Deeper signed-in business QA runs when `E2E_USER_EMAIL`, `E2E_USER_PASSWORD`, `NEXT_PUBLIC_SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` are configured:
  - signs in as the QA user
  - seeds a safe QA warranty
  - opens warranty detail
  - creates a draft claim
  - requests an extension
  - checks notifications and team APIs
  - verifies the self-delete guardrail
  - cleans QA claim and extension artifacts
- Controlled load testing covers public pages, health, redirects, and protected API rejection behavior without forcing destructive production workflows.
- Destructive operational workflow QA runs only when `OPERATIONAL_E2E=1` is set. It seeds and cleans QA data while checking bulk import, approval/rejection, documents, OCR, team guardrails, and payment checkout.

## Monitoring Implemented

- Sentry is configured for browser, server, and edge surfaces with environment/release tagging.
- Sentry release uploads are configured in Vercel production through private `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and `SENTRY_PROJECT` values.
- `npm run observability:sentry` verifies runtime DSNs and release-upload readiness for production.
- Sentry sampling is configurable through:
  - `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE`
  - `SENTRY_TRACES_SAMPLE_RATE`
- Vercel Web Analytics is installed for first-party page analytics.
- Vercel Speed Insights is installed for real-user Core Web Vitals.
- `/api/health` emits structured logs with route, request ID, duration, status, and database health.
- `npm run smoke:prod` verifies public routes, protected redirects, SEO endpoints, agent endpoints, and health status.

## Latest Production Evidence

- June 11, 2026 remaining-item closure:
  - Public Google search returns both `https://warrantee.io/en/api-docs` and `https://warrantee.io/en/faq`; no additional Search Console indexing request is currently needed for those priority URLs.
  - GitHub `CI` passed on latest `main` commit `af6ca28`.
  - Manually triggered `Production Security Gates` passed on latest `main` commit `af6ca28`, including production smoke, Supabase anonymous RLS probe, operational readiness, production operational E2E, and controlled load.
  - `npm run smoke:prod` passed locally against `https://warrantee.io` after the external-item check.
  - `npm run observability:sentry` passed for local and Vercel production release readiness.
  - `npm run guard:loopback` passed with no disallowed local development or loopback references.
  - Local QA credentials were rotated for `qa-user@warrantee.io`, restored in `.env.local`, and synced to GitHub Actions secrets.
  - Local `OPERATIONAL_BASE_URL=https://warrantee.io npm run readiness:operational` now passes authenticated Supabase, Mistral OCR, document scanner, Stripe, Stripe webhook, Resend, CRM, security header, and production URL checks.
  - Entity profile creation/claiming remains intentionally postponed.
- June 11, 2026 continuation:
  - Production deployment `dpl_Hsyy7Z62sFxQegjQ9E8icY5eHWwn` is ready and aliased to `https://warrantee.io`.
  - `npm run smoke:prod` passed locally against `https://warrantee.io`, including protected checks for `/api/email/send`, `/api/cron/scan-documents`, and `/api/internal/document-security-scan`.
  - GitHub `CI` passed on `main` for type-check, lint, tests, build, and E2E smoke gate after the email/scanner activation batch.
  - Manually triggered `Production Security Gates` passed loopback guard, production smoke, Supabase anonymous RLS probe, operational readiness, production operational E2E, and controlled load check.
  - Document security status now has a provider-ready scanner endpoint at `/api/cron/scan-documents`, protected by `CRON_SECRET`.
  - Production Vercel env now has `EMAIL_SEND_API_SECRET`, `DOCUMENT_SECURITY_SCANNER_URL`, `DOCUMENT_SECURITY_SCANNER_TOKEN`, and `DOCUMENT_DOWNLOAD_REQUIRE_CLEAN`.
  - `npm run readiness:operational` includes a no-send authenticated probe for `/api/email/send`, preventing the endpoint from silently becoming inactive.
  - Document scanning is activated through Warrantee's protected baseline scanner endpoint, and `DOCUMENT_DOWNLOAD_REQUIRE_CLEAN=1` blocks downloads until documents are marked clean.
  - `npm run observability:sentry` passed for local and Vercel production release readiness. Direct `sentry-cli issues list` reached Sentry but returned `403`, so unresolved issue listing requires a Sentry token with issue-read permissions or UI review.
- Historical June 2026 deployment `dpl_DzRpiCkJ9Kayx4ZBBLRn2moTh1ib` was superseded by the current production deployment above.
- `npm test` passed in CI.
- `npm run type-check` passed.
- `npm run build` passed in CI.
- `npm run guard:loopback` passed and CI now blocks disallowed local loopback links.
- `npm run smoke:prod` passed after deployment.
- `npm run observability:sentry` passed for Vercel production.
- Production Sentry source maps were uploaded for org `abdulazizalrayes`, project `warrantee`.
- Production business workflow E2E passed against `https://warrantee.io`.
- Production operational workflow E2E passed bulk import, approval, rejection, document upload, strict scan-before-download document flow, text/PDF OCR, Stripe Checkout, and team guardrails.
- Google Vision/CNTXT reseller onboarding is no longer a production readiness blocker because Mistral is the active verified OCR provider.
- Stripe production checkout is verified with a targeted authenticated payment probe returning a Stripe Checkout URL and session ID.
- Production load check passed with 2,824 requests, 0 failures, p95 355.6 ms, p99 572 ms.
- Fresh browser verification of `https://warrantee.io/en` returned 200 with no page or console errors after adding the narrow React Flight `Connection closed.` Sentry filter.
- Supabase RLS probe completed without exposing anonymous warranty rows.
- IndexNow submission succeeded for 28 public URLs at both IndexNow and Bing endpoints.
- May 23 Google Vision readiness failures are historical. Current production readiness passes with Mistral OCR as the active provider.

## Agent Review Assignment

- CEO: owns launch readiness and confirms CRM/social/WhatsApp remain postponed unless explicitly reopened.
- CTO: owns CI gate, production deployment, API health, and route protection.
- QA Engineer: owns Playwright failures, authenticated shell coverage, and route regression evidence.
- Frontend/UX: owns visual consistency, sidebar persistence, empty states, and route ergonomics.
- Security Engineer: owns protected redirects, auth isolation, API exposure, and same-domain team rules.
- Metrics/Growth Agent: owns Vercel Analytics, Speed Insights, GA4/GTM event quality, and conversion gaps.

## Remaining Upgrade Path

- Add a dedicated staging account and seed data for destructive create/import/approve/claim/payment tests.
- Add Checkly or another scheduled synthetic monitor once the production account plan/tooling is approved.
- Add Vercel log drains if the project moves to a plan that supports drains.
- Add a production alert policy for:
  - health endpoint degradation
  - Sentry issue spike
  - failed warranty creation/import
  - failed OCR
  - failed email ingestion
  - failed payment or webhook processing
- CNTXT / Google Cloud reseller billing onboarding is optional and can remain postponed unless Google Vision is reintroduced as a preferred OCR provider.
- Stripe webhook signature verification is already covered by operational readiness and production gates.
