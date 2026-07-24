# Warrantee Takeover Audit Remediation

**Prepared:** 24 July 2026
**Scope:** Warrantee and `warrantee.io` only
**Source audit:** `docs/TAKEOVER_AUDIT_2026-07-24.md`
**Change policy:** No visual redesign. Existing product patterns and public experience are preserved.

## Candidate Verdict

The takeover audit's validated internal launch blockers have been remediated in the release candidate. The production database migrations are applied and the candidate application has passed local build, unit, security, and authenticated browser gates.

The final handover verdict becomes **Ready with known external risks** only after this candidate is committed, deployed, and the production custom domain, GitHub CI, Production Security Gates, and live application behavior pass.

## Remediated Findings

### Tenant and file isolation

- Removed the legacy plaintext `companies.api_key` column and excluded it from the company statistics view.
- Replaced broad tenant-table policies with operation-specific company and personal ownership policies.
- Forced RLS on the eight critical tenant tables.
- Removed anonymous tenant-table grants.
- Replaced broad authenticated Storage policies with owner-prefix and authoritative warranty/company access checks.
- Kept warranty documents and claim attachments private, with bounded upload sizes and safe MIME allowlists.
- Added company-first access predicates so active company members can access the correct company records without granting access to unrelated tenants.

### Authentication and team authorization

- Added atomic self-service business onboarding that creates the company and administrator membership with the profile.
- Made company membership roles authoritative for company workspaces.
- Prevented ordinary profile updates from changing global role or account type.
- Repaired approval and rejection authorization and added compare-and-set status transitions.
- Made password reset validate the server session before changing the password.

### Claims, billing, and extensions

- Added a server-only atomic claim transition RPC with an explicit transition graph, row locking, authorization, event history, and audit logging.
- Added lease-based Stripe webhook idempotency and explicit claim, complete, and fail phases.
- Added atomic extension fulfillment that verifies purchaser, amount, currency, dates, and row state.
- Added refund and dispute handling state.
- Added database constraints for quantities, prices, currency, commissions, file sizes, and extension purchasers.
- Pro plan checkout remains intentionally unavailable until the owner completes the postponed live Stripe price decision.

### API, CLI, MCP, and public verification

- Made empty or invalid API scopes fail closed.
- Kept integration tokens hashed, scoped, rate limited, revocable, and tenant bound.
- Limited public verification to issued warranty states and masked serial data.
- Removed private certificate URLs from public verification output.
- Kept document API, CLI, and MCP operations metadata-only; private storage paths are not returned.
- Retained explicit confirmation for destructive CLI/MCP operations.

### Email ingestion, OCR, files, and retention

- Upgraded Resend and migrated inbound webhook and attachment handling to the supported SDK contract.
- Enforced trusted temporary HTTPS attachment URLs, redirect blocking, timeouts, and response-size limits.
- Avoided persisting raw base64 attachment payloads.
- Pinned Mistral OCR to `mistral-ocr-4-0` and added pipeline/parser version telemetry.
- Tightened internal scanner origin validation and upload/download authorization.
- Added bounded data retention for raw ingestion/OCR data, API usage, and processed webhook events.
- Updated the privacy notice in English and Arabic for OCR processing, assisted extraction, cross-border processing, and retention.

### Security headers, analytics, and dependencies

- Removed Hotjar and Meta Pixel code and the Meta conversions endpoint.
- Removed Hotjar origins from CSP and limited `unsafe-eval` to development builds.
- Removed unverified geolocation and social metadata.
- Upgraded Next.js, Supabase clients, Resend, PostCSS, and matching lint configuration.
- `npm audit` reports zero known vulnerabilities.

### Database reproducibility and release gates

- Restored all production migration sources from the live Supabase migration ledger.
- Added a SHA-256 production migration manifest and repeatable migration-integrity check.
- Regenerated TypeScript database types from the live schema.
- Added migration integrity to CI.
- Repaired local E2E environment loading so ignored production and QA files can remain separated.
- Preserved an ephemeral QA lifecycle: ensure, test, recursively clean, and verify zero persistent QA users.

## Verification Evidence

### Database

- 58 local migration files match the production migration ledger.
- Zero unapplied local migrations.
- Zero remaining `companies.api_key` columns.
- Eight critical tenant tables use forced RLS.
- Eight private Storage policies are present for the two protected buckets.
- Six atomic workflow/billing RPCs are present.
- The business onboarding auth trigger is present.
- Supabase security advisors reported no critical, high, or medium findings.
- `api_integration_tokens` intentionally has RLS with no authenticated/anonymous policy because only service-authorized application routes access it.

### Security probes

- Anonymous requests could not read profiles, warranties, documents, claims, extensions, notifications, invitations, or provisional warranties.
- Anonymous requests could not execute privileged administration RPCs.
- Private Storage root listing returned no objects.
- An authenticated QA identity could not change its `role` or `account_type`.
- The QA identity and its generated graph were removed after testing.
- Post-cleanup verification reported zero persistent QA users.

### Application gates

- Type-check passed.
- Production build passed and generated 245 static paths.
- Unit test suite passed: 26 files, 159 tests.
- CLI/MCP focused suite passed: 10 tests.
- Public/protected/SEO/agent browser suite passed: 31 tests.
- Authenticated shell suite passed: 8 tests.
- Authenticated business workflow suite passed.
- Operational production workflow passed bulk import, approval, rejection, document upload, payment boundary, OCR, and team guardrails.
- Agent readiness, growth readiness, loopback guard, migration integrity, and package dry-run passed.
- `npm audit` passed with zero findings.

## Known External Risks

These cannot be honestly closed by repository work:

1. **Stripe Pro price:** postponed by owner. A live SAR 149/month price and `STRIPE_PRO_PRICE_ID` are required before paid Pro checkout can launch. When resumed, the endpoint must also subscribe to refund and dispute events.
2. **Independent penetration test:** the application is prepared for a third-party assessment, but the developer cannot substitute for an independent tester.
3. **Private OCR benchmark corpus:** real invoices, receipts, poor scans, handwriting, multilingual documents, and corrupted files must be supplied under an approved privacy process. Synthetic files are not evidence of production accuracy.
4. **Real-user analytics:** activation, retention, language demand, and conversion conclusions require genuine non-QA traffic.
5. **CLI distribution:** the CLI/MCP package builds and tests successfully but is not yet published to npm. Publishing should use a reviewed release, immutable version, provenance, and rollback/deprecation process.

## Production Exit Gate

Before changing the verdict:

1. Commit and push the candidate.
2. Confirm GitHub CI and Production Security Gates pass for the exact commit.
3. Confirm Vercel serves the exact commit on `https://warrantee.io`.
4. Run production smoke, operational readiness, agent-readiness, API/CLI/MCP discovery, and protected-route checks.
5. Confirm the live CSP no longer includes Hotjar and does not include `unsafe-eval`.
6. Check for new Warrantee-only Sentry, GitHub, or production failure signals.

## Rollback

- Application: promote the last known-good Vercel deployment if the custom-domain verification or production gates fail.
- Database: do not attempt a destructive down migration. Apply a reviewed forward remediation because the hardening migrations remove insecure grants and plaintext credentials.
- Integrations: disable the affected route or feature flag before weakening authorization or data integrity.
