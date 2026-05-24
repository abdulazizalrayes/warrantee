# Warrantee Operational Audit - 2026-05-24

## Scope

This pass covered the launch-critical Warrantee surface end to end:

- Public marketing pages, protected redirects, authenticated dashboard shells, mobile and desktop browser flows.
- Warranty import, approval/rejection, document upload/download/delete, OCR, payment checkout, and team guardrails.
- API security on document storage, email ingestion, public warranty verification, OCR providers, Hotjar, and production CI.
- Production configuration reality for Stripe, Mistral OCR, Google Vision, Supabase, and loopback reference hygiene.
- Build, type, lint, unit, dependency audit, E2E, and operational E2E evidence.

## Corrections Applied

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
- Built-server operational E2E with `OPERATIONAL_E2E=1`: import, approval, rejection, document upload/download/delete, OCR, and team guardrails reached successfully; the run stops at checkout with `503 Stripe not configured`.

## Current Production Configuration Findings

The May 24 Vercel Production env pull shows:

- `STRIPE_SECRET_KEY`: present by name but empty. This blocks Stripe Checkout and is the only current hard launch blocker found by the operational E2E.
- `MISTRAL_API_KEY`: present by name but empty. This prevents the preferred hosted OCR path from running.
- `GOOGLE_CLOUD_VISION_API_KEY`: present, but Google Vision returns billing-disabled 403 from the configured Cloud project.
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, Supabase public/admin keys, and Google Vision key are present by value.

No secret values were written into this audit.

## Launch Decision

Code readiness is improved and the core app surface is passing local build, unit, lint, dependency, loopback, and browser gates. Warrantee should not yet be called fully operational because Stripe Checkout cannot complete until a real `STRIPE_SECRET_KEY` is installed in Vercel Production and GitHub Actions.

The exact final launch sequence is:

1. Install a real `STRIPE_SECRET_KEY` in Vercel Production and GitHub Actions.
2. Install a real `MISTRAL_API_KEY` in Vercel Production and GitHub Actions for scalable hosted OCR.
3. Redeploy production.
4. Run `npm run smoke:prod`, `npm run readiness:operational`, `npm run security:rls-probe`, and `OPERATIONAL_E2E=1 E2E_BASE_URL=https://warrantee.io npm run test:e2e:operational`.
5. Call Warrantee fully operational only after the production operational E2E returns a Stripe Checkout URL and the readiness script passes.

## Remaining Non-Blocking Improvements

- Reduce lint debt by removing old `@ts-nocheck` usage and broad `any` types in admin/dashboard/API files.
- Add real OCR sample benchmarks from Saudi/Arabic/English receipts before replacing hosted OCR with RapidOCR/PaddleOCR.
- Keep Google Vision disabled as an active dependency until billing is unblocked or remove the key from production expectations.
- Add visual regression/a11y snapshots for the most valuable signed-in flows after the launch blocker is closed.
