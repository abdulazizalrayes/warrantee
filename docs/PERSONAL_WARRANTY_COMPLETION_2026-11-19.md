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

- Complete: [PR #51](https://github.com/abdulazizalrayes/warrantee/pull/51) merged as `d9e8337a9e6db3c82002993ceb266c9c75b726d6`; the merge tree matched tested candidate `7df0e5df49c11ab918f5dc89e3cf81bd6ac0ca64`. Pre-release [CI](https://github.com/abdulazizalrayes/warrantee/actions/runs/44479645424) and [real isolated signup](https://github.com/abdulazizalrayes/warrantee/actions/runs/44479645320) passed. The initial CI package-download timeout and its unchanged-job retry remain documented in the PR; a retry-pass does not erase the first infrastructure failure.
- Reviewed 252 synthetic screenshots across all seven required widths in English and Arabic, including optional fields open/closed and validation recovery. Synthetic views do not prove backend persistence; the real disposable Auth/Postgres suite supplies that separate proof.
- [PR #52](https://github.com/abdulazizalrayes/warrantee/pull/52) changed CI installation only, not this application behavior. Its merged main `6c99592c1584639ae328eb2850f9d996facd3c0c` is Ready in deployment `dpl_FXb8ypmHnQ3eXh1gNHb6339DrrBY`, serving `warrantee.io`. All required exact-candidate checks passed before either release.
- Post-merge [CI](https://github.com/abdulazizalrayes/warrantee/actions/runs/44507643848), [signup](https://github.com/abdulazizalrayes/warrantee/actions/runs/44507643762) and [CodeQL](https://github.com/abdulazizalrayes/warrantee/actions/runs/44507643485) completed successfully: 10 real isolated journeys, 63 actual database contracts, 246 legacy browser cases and 28 synthetic UI cases, with zero browser failures/skips/flakes. Disposable stack cleanup completed.
- Final live verification passed 16 no-write checks and deterministic Markdown checks for all 50 canonical sitemap pages. No real prospective-user account or record was modified, and no communication was sent. External OAuth handshakes and private OCR accuracy remain outside this proof.
- The next scheduled Production Security Gates result is separate, not implied by isolated CI. Follow [the current operational status](OPERATIONAL_STATUS.md#current-verified-release) and verify the actual E2E and QA cleanup steps without manual workflow dispatch or rerun.

## Rollback

Use the existing Vercel rollback procedure to restore deployment dpl_Ba7PK2HJTLmHtw2m6W6pgPPzzEL1, then verify warrantee.io and protected redirects. Alternatively revert this scoped source change through a reviewed PR. No data rollback or credential change is required. Do not invoke production QA workflows manually or create production records for verification.
