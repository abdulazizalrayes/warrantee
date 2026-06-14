# Warrantee Full-System Audit - 2026-06-14

Scope: Warrantee only (`warrantee.io` and this repository). This audit covered more than landing pages: frontend routes, API routes, auth/session boundaries, Supabase/RLS posture, documents, OCR, Stripe, email ingestion, integration tokens, CLI/MCP readiness, production smoke/readiness, mobile/RTL layout, and operational QA gates.

## Evidence Run

- `npm run lint` passed.
- `npm test` passed: 19 files, 105 tests.
- `npm run type-check` passed after removing duplicate generated `.next/types/* 2.ts` cache artifacts.
- `npm run guard:loopback` passed.
- `NEXT_TELEMETRY_DISABLED=1 NODE_ENV=production ./node_modules/.bin/next build` passed.
- `npm run smoke:prod` passed against `https://warrantee.io`.
- `npm run security:rls-probe` passed: anonymous access to protected business tables was denied.
- `npm run readiness:operational` passed: security headers, Supabase, Resend, HubSpot, Mistral OCR, document scanner, Stripe, and Stripe unsigned-webhook rejection were healthy.
- `npm run load:prod` passed: 2,936 requests, 0 failures, p95 301.2 ms, p99 442.9 ms.
- `npx playwright test tests/e2e/public-routes.spec.ts tests/e2e/protected-routes.spec.ts tests/e2e/seo-agent-ready.spec.ts --project=chromium` passed: 29 tests.
- CLI/MCP package dry run passed: `warrantee@0.1.0`, 5 files, no bundled dependencies.
- Local MCP stdio `tools/list` passed.
- Targeted mobile/RTL check passed for `/en/api-docs` and `/ar/api-docs` after the layout fix: status 200, correct `dir`/`lang`, no console errors, no horizontal overflow at 390 px.

## Architecture Map

- App framework: Next.js App Router with bilingual `/en` and `/ar` routing.
- Auth: Supabase Auth via server/browser clients, route middleware for protected app pages, and explicit API route checks.
- Data: Supabase Postgres with RLS migrations for warranties, documents, claims, extensions, notifications, profiles, company/team tables, integration tokens, API usage, subscriptions, document security status, and operational support.
- Core business modules: warranties, documents, OCR, claims, approvals, extensions, billing, notifications, seller flows, team management, support/contact, public verification.
- Integrations: Stripe, Resend, HubSpot, Mistral OCR with Google Vision/local fallbacks, Sentry, GA/Meta, IndexNow, hosted MCP, CLI package.
- Agent/developer surfaces: `/api/v1/warranties`, `/api/mcp`, `/.well-known/*`, `/llms.txt`, CLI/MCP package, API docs.

## Findings

### Fixed During Audit

1. Mobile API docs horizontal overflow.
   - Problem: `/en/api-docs` and `/ar/api-docs` overflowed horizontally on 390 px mobile due to long code strings inside flex/card layouts.
   - Fix: Added `min-w-0`, `overflow-x-auto`, wrapping, and mobile-first endpoint row stacking in `src/app/[locale]/api-docs/page.tsx`.
   - Verification: targeted mobile EN/AR checks show no overflow, no console errors, status 200, correct `dir`/`lang`; lint/type/test/build passed.

2. Password recovery pages were visually inconsistent with the current Warrantee system.
   - Problem: `/[locale]/forgot-password` and `/[locale]/reset-password` used older standalone styling, mixed accent colors, and no shared navbar/footer shell.
   - Fix: Restyled both pages with the current Warrantee shell, blue accent, neutral background, localized direction handling, navbar, footer, and accessible form focus/error states while preserving the Supabase reset flow.
   - Verification: covered by operational hardening tests and targeted browser/mobile checks in the follow-up QA run.

3. Admin ingestion management depended on user-scoped Supabase reads after role checks.
   - Problem: admin role authorization was correct, but ingestion list/stat reads could still depend on RLS policy shape for the signed-in user.
   - Fix: kept Supabase Auth + profile role verification, then switched ingestion management reads to the service-role admin client; also added bounded pagination and stricter resolve-action validation.
   - Verification: covered by operational hardening tests and route-level build/type checks in the follow-up QA run.

### Operationally Healthy

1. Public pages, SEO/agent readiness, and protected-route redirects are healthy.
2. Production readiness gates pass for core external integrations.
3. Anonymous RLS probe denies protected tables.
4. API/CLI/MCP authentication guidance correctly says to use scoped integration tokens, not usernames/passwords.
5. Stripe webhook rejects unsigned requests and readiness reports Stripe healthy.
6. Resend, HubSpot, Mistral OCR, and document scanner are configured in production readiness.
7. Controlled production load at moderate concurrency produced no failures.

### Remaining Risks / Recommendations

1. Local authenticated E2E cannot be run unless `E2E_USER_EMAIL` and `E2E_USER_PASSWORD` are available in the local shell.
   - Risk: local workstation cannot reproduce the same signed-in journey as GitHub Production Security Gates.
   - Recommendation: restore local QA credentials in a secure, ignored env file or continue relying on GitHub secrets for authenticated production E2E.

2. API v1 currently covers warranties only.
   - Risk: CLI/MCP/API is useful but not yet a complete external operating surface for claims, documents, recalls, assets, or lifecycle intelligence.
   - Recommendation: add versioned endpoints for claims, documents metadata, verification certificates, and future asset lifecycle events before selling larger enterprise integrations.

3. Rate limiting is production-strict only when Redis is configured.
   - Risk: if Redis env vars are removed, production can fail closed or degrade depending on configuration.
   - Recommendation: keep `RATE_LIMIT_REQUIRE_REDIS=1` in production and monitor readiness checks for Redis/rate-limit backend.

4. Full OCR torture testing remains limited by sample corpus.
   - Risk: hard scans, multi-invoice PDFs, handwriting, and multilingual receipts may still route to review or parse incorrectly.
   - Recommendation: maintain a private OCR regression corpus for Arabic/English receipts, PDFs, bad scans, duplicates, and fraud attempts.

5. Public verification intentionally exposes proof-safe warranty fields.
   - Risk: reference/serial lookup can still be enumerated if abused.
   - Recommendation: keep public lookup rate limiting strict; consider CAPTCHA or proof-token mode if abuse appears.

6. Team management is domain-based for company bootstrapping.
   - Risk: enterprise/government customers will need stronger workspace boundaries than email domain matching alone.
   - Recommendation: add explicit organization/workspace ownership tables and invite acceptance before enterprise rollout.

7. Product readiness is stronger than GTM readiness.
   - Risk: technical platform can operate, but content depth, onboarding copy, demo flows, and sales proof still decide conversion.
   - Recommendation: continue building reference-grade EN/AR and additional-language content, plus demo/account onboarding flows tied to clear ICPs.

## Deployment Guidance

The API docs mobile fix is low-risk and verified. It can be deployed after normal CI and Production Security Gates pass. Do not deploy broader visual restyles or admin ingestion changes without separate QA because those touch auth and user trust surfaces.
