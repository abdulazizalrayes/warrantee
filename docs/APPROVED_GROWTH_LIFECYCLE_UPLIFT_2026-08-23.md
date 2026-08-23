# Approved Growth And Lifecycle Uplift

Date: 2026-08-23
Scope: Warrantee only
Repository: `abdulazizalrayes/warrantee`
Database: Supabase project `warrantee` (`erptubrslnfmkuouczgn`)

## Owner Decision

Approved roadmap items: `3, 4, 7, 8, 9, 10, 11, 14, 15, 16, 17, 18, 19, 20, 22, 23, 24, 26, 27, 28, 29, 30`.

Postponed for later discussion: `1, 2, 6, 12, 13, 21, 25`.

No outreach, billing activation, autonomous recall action, or unsupported reliability claim was introduced.

## Closure Register

| Item | Result | Evidence |
| --- | --- | --- |
| 3 | Tenant roles remain company-scoped through `company_members`; platform administration remains separate. | `src/lib/server/company-team.ts`, existing RLS and role tests |
| 4 | Legacy shared API bearer fallback remains retired. Tokens are generated, hashed, scoped, revocable, and now tied to first-class API clients. | `src/lib/api-v1.ts`, `src/app/api/integration-tokens/`, `src/lib/__tests__/api-v1.test.ts` |
| 7 | Email/OCR-created warranties retain the established owner/company authorization model and uncertain results remain provisional. | `src/app/api/ingest/email/route.ts`, `src/lib/warranty-access.ts` |
| 8 | The committed synthetic EN/AR/mixed/degraded/corrupt OCR corpus and ignored private corpus gate remain active. No customer-document accuracy claim is made. | `tests/fixtures/ocr-corpus`, OCR QA scripts and operational docs |
| 9 | OCR confidence and review behavior remain active; low-confidence scans create provisional review records instead of trusted warranties. | `src/app/api/ocr/route.ts`, `src/app/[locale]/dashboard/provisional/page.tsx` |
| 10 | Near-duplicate SimHash detection no longer scans every attachment. Four generated 16-bit bands have database indexes and bound candidate evaluation to 500 rows. | `src/lib/ingestion/fraud-detection.ts`, migration `20260823132449`, regression tests |
| 11 | Warranty documents continue to use bounded signed uploads, private storage, hash verification, scanning, quarantine, and authorized signed download. | `src/app/api/warranties/[id]/documents/upload-url/route.ts`, document security tests |
| 14 | Claims now expose response/resolution targets, evidence requirements, and structured decision/failure reason codes. | `src/app/api/claims/[id]/service-level/route.ts`, claim dashboard detail |
| 15 | Bulk import now has parse/column mapping, validation preview, tenant-scoped indexed duplicate handling across the full owned dataset, fail-safe invalid-date handling, atomic commit, batch attribution, and authorized rollback. | `src/lib/warranty-import.ts`, bulk-import and rollback APIs, migrations `20260823170000` and `20260823171500`, import UI/tests |
| 16 | Warranty and claim transition rules remain enforced in database/application code and are not bypassed by the uplift. | existing state-machine migrations and transition tests |
| 17 | Metadata-only append audit events now cover warranty, claim, document, extension, extension-request, and API-token mutations. Row contents are not copied. | migration `20260823131801` |
| 18 | API credentials now belong to first-class API clients with owner, optional company, environment, status, scopes, expiry, and revocation. Service-only stores are accessed through authenticated, explicitly user-scoped server routes. | token APIs, `api_clients`, generated database types, authenticated lifecycle E2E |
| 19 | API users can see privacy-safe 24-hour/30-day request and error summaries plus recent usage. | usage API and `IntegrationTokensPanel.tsx` |
| 20 | Warranty-create API idempotency is body-aware and client/user scoped; reused keys with different bodies fail closed and completed resources replay safely. | `src/lib/api-v1.ts`, `/api/v1/warranties`, tests |
| 22 | Internal extension-payment reconciliation detects impossible paid/purchased states without enabling billing or settlement. | `reconcile_internal_payment_ledger`, daily maintenance |
| 23 | Extension marketplace checkout is explicitly disabled unless the approved production flag is true; extension interest is persisted for validation. | payment-create gate, extension-interest API, `.env.local.example` |
| 24 | Warranty search input is sanitized and key searchable fields have trigram indexes. | `src/lib/validation.ts`, warranties API, migration `20260823131801` |
| 26 | Recoverable async-job storage now includes idempotency, retries, stale-lock recovery, and atomic `FOR UPDATE SKIP LOCKED` worker claiming. Existing synchronous workflows were not silently moved. | `async_jobs`, `claim_async_jobs`, daily maintenance |
| 27 | Daily activity rollups cover warranties, claims, passport views, extension requests, and API requests. Rollup identities are limited to actors active that day. | `analytics_daily_rollups`, `refresh_analytics_daily_rollups` |
| 28 | Onboarding now uses a four-step bilingual golden path, records template selection/activation, and offers optional structured feedback. | onboarding page, GA4 events, feedback API |
| 29 | Warranty detail now provides a factual evidence-labelled lifecycle timeline from stored warranty, document, claim, and lifecycle events. | lifecycle API and warranty detail page |
| 30 | Portfolio and supplier intelligence now requires minimum evidence thresholds and returns insufficient-evidence states rather than manufactured scores. | `src/lib/asset-intelligence.ts`, analytics/API and tests |

## Production Database Evidence

- Applied migrations: `20260823131754`, `20260823131801`, `20260823132007`, `20260823132449`, `20260823170000`, and `20260823171500`.
- `supabase db push --linked --dry-run` reports the remote database is up to date.
- Migration integrity reports 64 files and zero pending production migrations.
- Post-change Supabase advisors report no security warning introduced by this rollout, no missing RLS policy notice on the new service-only stores, no public `pg_trgm` extension warning, and no missing foreign-key index from the new schema.
- Database TypeScript types were regenerated from the linked production project.

## Release Candidate Verification

- Type-check, lint, 203 unit tests, and the 249-page production build pass in an isolated local QA copy.
- Authenticated desktop and mobile E2E proves claim filing, extension request, duplicate/invalid import preview, atomic import commit, hostile-origin rollback rejection, authorized batch rollback, notification/team boundaries, API-client creation, one-time token display, API authentication, usage metering, revocation, and rejection of the revoked token.
- The disposable production-backed QA identity and generated records were removed; `qa:user:verify-clean` reports zero persistent QA users.
- The private redacted OCR parser corpus passes 12 fixtures after adding sentence-separated English, Arabic, and degraded OCR field regressions. Synthetic OCR media coverage passes all six generated media cases.
- The current Supabase security advisor returns zero findings. Performance advisor output is informational unused-index telemetry expected before real workload; no newly created scale index was removed without production evidence.
- Bulk import commit and rollback now require a trusted same-origin request, impossible calendar dates fail preview validation, public passport telemetry only accepts publicly verifiable warranty statuses, and API-client ownership lookup fails closed on database errors.

## Verification Required For Release

- Type-check, lint, full unit suite, production build.
- Architecture map, loopback, migration, security-assurance, growth-readiness, and agent-readiness gates.
- Desktop/mobile and EN/AR browser checks for onboarding, import, claim service levels, warranty lifecycle, and public passport.
- Main CI, Production Security Gates, production smoke, and operational readiness after deployment.

## Rollback

1. Roll application traffic back to the last known-good Vercel deployment.
2. Keep additive database columns/tables in place; do not drop them during an incident because they are backward-compatible and may contain new records.
3. Keep `WARRANTY_EXTENSION_MARKETPLACE_ENABLED=false` unless the owner separately approves settlement activation.
4. If a new route misbehaves, disable the application path in code and redeploy. Do not delete lifecycle, audit, feedback, import-batch, or idempotency evidence.

## Honest Remaining Boundaries

- Postponed roadmap items `1, 2, 6, 12, 13, 21, 25` remain out of scope by owner decision.
- The async queue is a safe worker substrate; existing OCR/email workflows were not migrated to workers in this release.
- Recall matching only creates evidence-backed candidates from verified source records. It does not notify users or take autonomous action.
- Extension interest collection is live-capable, but payment/marketplace settlement remains deliberately disabled.
- Synthetic/private OCR tests are regression evidence, not a real-customer accuracy benchmark.
