# Personal Warranty Completion

## Approved Scope And Identity

- Company: Warrantee, https://warrantee.io.
- Source: abdulazizalrayes/warrantee, active independent Developer checkout.
- Hosting: existing Vercel project prj_fZIC1oJjpaZ4E8IqLm3UJTbMxlrx, team team_AnOdxEeUwCwUtPdqTk5I1Dkt.
- Owner approved four fixes: validation telemetry, scan/delivery observability, simpler personal form, consistent quantity limits.
- No communications, existing-account changes, production test accounts, new provider activation, paid services, migrations, or postponed work.
- Baseline: 91db36f93526a6eed8bede4bc965ab850f46c569; production dpl_Ba7PK2HJTLmHtw2m6W6pgPPzzEL1.

## Behavior

1. Failed Next validation records only the allowlisted field code, step, outcome, locale, and account type. No typed value, error text, product name, filename, document bytes, or user identity is placed in metadata.
2. Scan rejection and started/completed/failed outcomes are first-party events. Scan events require an authenticated session. Collector retries preserve one event UUID and use the existing server deduplication; bounded fetch delivery observes HTTP acknowledgement instead of treating a queued beacon as persistence proof. Delivery remains best-effort and is not an abandonment/session-replay guarantee.
3. Personal users see the product name first and dates next. Existing additional product fields and purchase/terms fields remain available in keyboard-accessible native disclosures. Invalid hidden fields automatically open the corresponding disclosure. Business fields remain available without collapsed disclosures. Existing optional attachments, review-before-save, explicit tab-only draft consent, and recovery behavior are retained.
4. Client and manual creation API enforce whole quantities 1 through 1000000, matching the existing database transaction. No schema migration is needed.

## Verification Contract

- Unit tests: telemetry privacy, authenticated access, acknowledgement/retry/deduplication, quantity boundaries, manual creation authorization.
- Real isolated stack: disposable Supabase Auth, local SMTP confirmation, onboarding, personal first warranty, durable ownership, failed validation and rejected-scan persistence, replay/attachment recovery, and cross-user denial in English and Arabic.
- Synthetic UI: form/recovery/scan regressions and screenshots/geometry at 320, 390, 768, 1024, 1280, 1440, and 1920 pixels in English and Arabic. This lane is not durable backend proof.
- Full source/type/lint/security/build, legacy regression, agent-discovery, and analytics-privacy gates before production promotion.
- Real Google/Apple provider handshakes and real OCR quality are not asserted by an isolated local email signup test. The existing external-provider and private-corpus postponements remain unchanged.

## Privacy-Safe Checks

Read activity_log only for the authorized company context. Group funnel events by action and bounded metadata.stage, metadata.step, metadata.field, metadata.reason, metadata.account_type, and metadata.traffic_class. Keep synthetic/QA activity separate from prospective-customer activity. A form_opened event does not prove typing or a Next attempt; absent telemetry never proves user intent.

## Release Evidence

Pending: candidate commit, CI/isolated run URLs, screenshot review, production deployment, and live no-write checks will be recorded after completion. Production deployment is blocked until required candidate checks pass.

## Rollback

Use the existing Vercel rollback procedure to restore deployment dpl_Ba7PK2HJTLmHtw2m6W6pgPPzzEL1, then verify warrantee.io and protected redirects. Alternatively revert this scoped source change through a reviewed PR. No data rollback or credential change is required. Do not invoke production QA workflows manually or create production records for verification.
