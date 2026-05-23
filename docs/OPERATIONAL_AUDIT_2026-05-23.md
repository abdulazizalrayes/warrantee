# Warrantee Operational Audit - 2026-05-23

## Scope

This audit covered launch readiness across public pages, protected routes, authenticated buyer/seller/admin workflows, OCR, Stripe checkout/webhooks, support tickets, team management, Supabase RLS exposure, production smoke/load checks, dependency security, CI gates, and local QA reliability.

Audited surface:

- 151 generated app routes in the production build.
- 53 `src/app/api/**/route.ts` API handlers.
- Public, protected, authenticated, business, operational, SEO, and agent-readiness Playwright suites.
- Supabase anonymous RLS probe and production readiness scripts.
- Dependency vulnerability and outdated-package posture.
- Loopback/localhost references.
- Payment, OCR, signed email action, document, support, team, and webhook boundaries.

## Corrections Applied

- Replaced deprecated interactive `next lint` with noninteractive `eslint .`, adding `eslint.config.mjs` so GitHub CI can run lint without hanging or prompting.
- Kept launch-blocking lint rules as errors and downgraded existing historical debt to warnings. Current baseline: `0 errors`, `268 warnings`.
- Fixed a real React hook violation in `ContextSwitcher` by moving hooks before the dual-role early return.
- Replaced mojibake/emoji buyer-seller markers in `ContextSwitcher` with lucide icons.
- Upgraded `stripe` from `18.5.0` to `22.1.1`, removing the vulnerable transitive `qs` package. `npm audit --omit=dev` is now clean.
- Hardened `/api/stripe/checkout` so Stripe success/cancel URLs use the configured app origin, not a caller-controlled `Origin` header.
- Hardened signed buyer email action pages by escaping rendered HTML values.
- Removed the hardcoded production fallback for buyer email action token signing; production now requires a real secret source.
- Fixed local QA false failures by rendering Vercel Analytics and Speed Insights only when a real `VERCEL_URL` is present, not merely when a pulled env file sets `VERCEL=1`.

## Verification Evidence

Latest local verification on the fixed code:

- `npm run type-check`: passed.
- `npm run lint`: passed with `0 errors`, `268 warnings`.
- `npm run test`: passed, 7 files / 48 tests.
- `npm audit --omit=dev`: passed, 0 vulnerabilities.
- `npm run guard:loopback`: passed, no disallowed loopback references.
- `NEXT_TELEMETRY_DISABLED=1 npm run build`: passed, 151 static pages generated.
- Local rebuilt app E2E with QA credentials: passed, 88 tests passed / 2 operational tests intentionally skipped.

Production baseline checks run before this final hardening pass:

- Production smoke: passed.
- Sentry readiness: passed.
- Operational readiness: passed with OCR and Stripe in production API mode.
- Supabase anonymous RLS probe: passed.
- Controlled production load: passed, 0 failures, p95 under threshold.
- Production Playwright E2E: passed, 88 passed / 2 skipped.
- Production operational E2E: passed for bulk import, approval, rejection, document upload, payment checkout, OCR, and team guardrails.

Local limitation:

- The local operational E2E cannot complete image OCR because local Mistral is intentionally blank, Google Vision billing is disabled, and Tesseract timed out on the generated image fixture. This must be re-run against production after deployment, where Mistral is configured.

## Remaining Launch Actions

1. Deploy this final hardening commit to production.
2. Re-run production gates after deployment: smoke, Sentry readiness, operational readiness, RLS probe, load check, full E2E, and operational E2E.
3. Confirm the new GitHub CI run for the pushed commit is green.
4. Keep Google Vision as legacy only or remove the disabled local Google key from active QA expectations; launch should rely on Mistral.
5. Schedule a lint-debt cleanup pass: remove `@ts-nocheck`, replace broad `any` usage, and resolve remaining hook dependency warnings in high-traffic admin/dashboard pages.
6. Add a mocked OCR provider or fixture-mode OCR path for local operational E2E so the full gate can run without paid cloud OCR credentials.
7. Add accessibility/visual regression coverage for critical flows after launch: auth, dashboard shell, warranty detail, claim filing, extension request, document upload/download, team settings, and seller/admin dashboards.

