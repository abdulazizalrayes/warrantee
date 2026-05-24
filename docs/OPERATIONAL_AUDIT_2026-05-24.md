# Warrantee Operational Audit - 2026-05-24

## Scope

This pass covered the launch-critical Warrantee surface end to end:

- Public marketing pages, protected redirects, authenticated dashboard shells, mobile and desktop browser flows.
- Warranty import, approval/rejection, document upload/download/delete, OCR, payment checkout, and team guardrails.
- API security on document storage, email ingestion, public warranty verification, OCR providers, Hotjar, and production CI.
- Production configuration reality for Stripe, Mistral OCR, Google Vision, Supabase, and loopback reference hygiene.
- Build, type, lint, unit, dependency audit, E2E, and operational E2E evidence.

## Corrections Applied

- Added launch hardening for abuse-prone endpoints:
  - consistent client IP extraction through Cloudflare/proxy headers
  - tighter endpoint-specific rate limits for OCR, bulk import, payments, certificates, public lookup, contact, and webhooks
  - cross-origin rejection on browser-only contact and Meta conversion endpoints
  - Stripe webhook fail-closed behavior when its signing secret is absent
  - readiness probing for unsigned Stripe webhook rejection
- Added `Content-Security-Policy-Report-Only` with conservative base/object/frame directives and allowlists for active production integrations.
- Added operational readiness checks for security headers and Stripe webhook signature enforcement.
- Added production operational E2E to `.github/workflows/production-security.yml`, including Playwright Chromium install and required QA password env.
- Confirmed loopback hygiene with `npm run guard:loopback`; no disallowed local-loopback links remain in production-facing files.
- Hardened inbound email attachment handling:
  - sanitized attachment filenames before storage/log/DB usage
  - validated decoded attachment bytes instead of trusting declared size
  - lowercased content types
  - escaped no-attachment email subjects
  - added unit coverage for filename sanitization
- Hardened manual warranty documents:
  - sanitized upload names and source context
  - cleaned uploaded storage objects if metadata insert fails
  - added authenticated `DELETE /api/documents/[id]`
  - moved browser deletion away from direct Supabase storage/table writes
  - made the dropzone keyboard-accessible
  - extended operational E2E to upload, download, delete, and verify removal
- Hardened document URL normalization so arbitrary external absolute URLs cannot be treated as internal storage paths.
- Hardened public warranty verification by replacing raw `.or(...)` query construction with validated exact/prefix query builder calls.
- Hardened Hotjar so the script only injects when `NEXT_PUBLIC_HOTJAR_ID` is numeric.
- Fixed the Sentry OCR worker issue by resolving the `tesseract.js` Node worker explicitly and including the Tesseract worker/core files in Next serverless tracing.
- Added PDF standard font data to OCR tracing and `pdfjs` config, removing the non-fatal font warning during local operational runs.
- Made OCR provider behavior launch-resilient:
  - Mistral is used only when a real `MISTRAL_API_KEY` value exists
  - Google Vision can still be tried as fallback
  - hosted provider failures fall back to in-house Tesseract for availability
  - OCR provider logs now emit sanitized status summaries, not full upstream payloads
- Adjusted operational OCR assertions to avoid false failures from expected OCR ambiguity such as `O` vs `0`.
- Updated operational docs to remove the contradiction that Stripe/Mistral were ready while current Vercel Production values are empty.

## Verification Evidence

Local verification against the fixed code:

- `npm run type-check`: passed.
- `npm test -- --passWithNoTests`: passed, 9 files / 52 tests.
- `npm run lint`: passed with 0 errors and 257 existing warnings.
- `npm audit --omit=dev`: passed, 0 vulnerabilities.
- `npm run guard:loopback`: passed, no disallowed loopback references.
- `git diff --check`: passed.
- `NEXT_TELEMETRY_DISABLED=1 npm run build`: passed, 151 app routes generated.
- Built-server browser E2E against the local QA server: passed, 88 passed / 2 intentionally skipped.
- Built-server operational E2E with `OPERATIONAL_E2E=1`: import, approval, rejection, document upload/download/delete, OCR, and team guardrails reached successfully; local checkout stops at `503 Stripe not configured` because the local env file does not contain the server Stripe secret.
- May 24 production deployment: Ready and aliased to `https://warrantee.io`.
- `npm run smoke:prod`: passed against `https://warrantee.io`.
- `npm run security:rls-probe`: passed, no anonymous warranty/document/claim rows exposed.
- `npm run readiness:operational`: passed, including production API OCR and Stripe checks.
- `E2E_BASE_URL=https://warrantee.io OPERATIONAL_E2E=1 npm run test:e2e:operational`: passed, including bulk import, approval, rejection, document upload/download/delete, OCR, Stripe Checkout, and team guardrails.

## Current Production Configuration Findings

The May 24 local env and Vercel env-pull snapshot shows:

- `STRIPE_SECRET_KEY`: present by name but empty locally; local checkout tests therefore return `503 Stripe not configured`.
- `MISTRAL_API_KEY`: present by name but empty locally; the preferred hosted OCR path should be confirmed before scale.
- `GOOGLE_CLOUD_VISION_API_KEY`: present, but Google Vision returns billing-disabled 403 from the configured Cloud project.
- The deployed production API passes readiness and operational Stripe/OCR workflows, so the local env-pull snapshot should not be treated as the production source of truth.

No secret values were written into this audit.

## Launch Decision

Code readiness is improved and the core app surface is passing local build, unit, lint, dependency, loopback, browser, production smoke, production readiness, production RLS, and production operational E2E gates. The new hardening gate raises one stricter launch condition: the production Stripe webhook endpoint must reject unsigned probes with signature validation, not return a missing-secret configuration error.

Warrantee is ready for controlled production operation only when the current production deployment passes the updated readiness gate, including `security-headers` and `stripe-webhook`.

Before scaling OCR volume, complete this follow-up sequence:

1. Confirm a real `MISTRAL_API_KEY` is installed in Vercel Production and GitHub Actions for scalable hosted OCR.
2. Unblock Google Vision billing or remove it from active provider expectations.
3. Confirm `STRIPE_WEBHOOK_SECRET` is installed in Vercel Production for `https://warrantee.io/api/stripe/webhook`.
4. Run the production smoke, readiness, RLS, and operational E2E gates after every provider/env change.

## Remaining Non-Blocking Improvements

- Reduce lint debt by removing old `@ts-nocheck` usage and broad `any` types in admin/dashboard/API files.
- Add real OCR sample benchmarks from Saudi/Arabic/English receipts before replacing hosted OCR with RapidOCR/PaddleOCR.
- Keep Google Vision disabled as an active dependency until billing is unblocked or remove the key from production expectations.
- Add visual regression/a11y snapshots for the most valuable signed-in flows.
