# OCR rate-limit recovery

Scope: Warrantee only. No UI, billing, credentials, paid provider, or scanner changes.

## Evidence

- Production Security Gates runs 35704991581 (September 22) and 35837522690
  (September 23) failed operational readiness: Mistral returned HTTP 429 and
  `/api/ocr` returned HTTP 503. Operational E2E and load checks were skipped.
- Vercel project `warrantee`, `prj_fZIC1oJjpaZ4E8IqLm3UJTbMxlrx`, has Mistral
  configuration names present in Production, but no PaddleOCR or Google Vision
  credential names. No secret values were required for this investigation.
- Explicit Mistral preference previously stopped on any error if no hosted
  fallback was configured, even though local Tesseract/PDF recovery already exists.

## Change

Classify HTTP 429 as `MistralOCRRateLimitError`. Allow only this error to reach
the existing local fallback when Mistral is explicitly selected and no other
hosted provider is configured. Apply the same behavior to browser uploads and
email ingestion, for images and scanned PDFs. Embedded-text PDFs remain local.
Keep authentication/configuration errors explicit, existing abuse controls,
security validation, fallback telemetry, and failure responses unchanged.
No immediate retries amplify provider throttling. Do not retain the provider's
raw error body in the new rate-limit error.

## Local verification

- 276 tests passed, including 12 new regression tests.
- TypeScript and ESLint on changed files passed.
- Production build passed (without production secrets; existing metadataBase
  warnings appeared with local configuration).
- Six synthetic OCR media checks passed: English, poor scan, Arabic, mixed
  invoice, embedded-text multipage PDF, and corrupt PDF rejection.
- Synthetic results are not proof of accuracy on real customer documents.

Commands: `npm test -- --maxWorkers=2`, `npm run type-check`,
`npm run qa:ocr-media`, `npm run build`.

## Release gate and remaining risk

Require CI before merge, then confirm the deployed commit and run Production
Security Gates. Local checks do not prove serverless worker packaging or runtime
latency. Do not call production OCR recovered before the live check passes.
Mistral's actual account quota/reset remains unverified; do not increase spending
or change its limits without owner approval. Local fallback may be slower or less
accurate and must retain user review of extracted fields.

Rollback: revert the OCR recovery commit and redeploy through the existing Git
workflow. Prior main was f0ee6e1a371b490fba3df6d0905edb13abc160ee; reverting restores
the previous behavior, including its known 503 on Mistral rate limiting.

## Live follow-up and cold-start correction

PR #25 passed CI (214 browser tests passed, 92 skipped), merged as
0ec688de9c3003233f7d82677c103b9e069c30ab, and deployed as
dpl_44wjxyhHimebcCyXe3JtokFerBX5. Public smoke and health passed.
Production Security Gates 35970013508 still failed: the local OCR path exceeded
its 45-second timeout after the Mistral rate-limit warning. QA cleanup passed.
This was not a completed production recovery.

The follow-up bundles pinned English/Arabic Tesseract language packages, stages
only their approved models into a request-owned temporary directory, disables
model caching, and removes that directory after processing. Tesseract is kept as
a server external package to preserve its native Node worker loading. There is
no language-model CDN download on the request path. Both OCR and email-ingestion
function traces explicitly include the model files.

Readiness error reporting now keeps only a bounded first line: Playwright timeout
errors can otherwise append sensitive authenticated request headers. Do not
copy raw failed-run logs into reports. The disposable QA identity used by the
failed run was deleted and cleanup verified.

Follow-up local checks: 279 tests passed, including real packaged-model OCR tests;
type-check and changed-file lint passed. English receipt content was legible.
The existing Arabic synthetic image produced its expected identifier but garbled
Arabic text; identifier regression success is NOT Arabic accuracy validation.
Provider quota and real-document/Arabic accuracy remain separate limitations.
