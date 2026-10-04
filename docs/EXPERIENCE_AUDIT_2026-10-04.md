# Warrantee experience and assurance audit - 4 October 2026

## Scope and verdict

Warrantee only: production https://warrantee.io, GitHub abdulazizalrayes/warrantee.
Reviewed candidate b7348a0 in an isolated checkout; preserved dirty owner checkout.
This is an audit with explicit coverage gaps, not a zero-defect certification.
No production forms submitted, customer records created/deleted, emails sent,
payments attempted, or visual redesign deployed during this audit.

## Findings and proposed fixes

| # | Priority | Evidence / issue | Proposed fix |
|---|---|---|---|
| 1 | High | Live header/footer search, missing email and dead Contact anchor remain until PR #30 is released. Candidate corrects them; CI passes. | Release verified candidate, then repeat actual live EN/AR navigation checks. |
| 2 | High | tests/e2e/helpers.ts:21 suppresses hydration console errors and generic 404 resource messages. This can conceal functional problems. | Remove broad suppressions; only allow explicitly justified benign messages, with tests. |
| 3 | High | public-routes.spec.ts uses asymmetric EN/AR lists. release-regression.spec.ts DOES cover sitemap pages, but only five public widths and two authenticated widths, not the seven required widths. These checks do not prove every control outcome. | Consolidate coverage; use all seven widths and explicit click contracts for every unique control; test anchors and destinations. |
| 4 | High | Live Professional access test initially stayed on /en/pricing; isolated repeat passed. Root cause unconfirmed. | Capture trace, distinguish pre-hydration click loss from overlay/network/test timing. Prefer real links for navigation if validated; do not hide with blanket retries. |
| 5 | Medium | src/app/api/documents/route.ts:25 limits accessible warranty IDs to 500, before searching documents. Documents outside that subset are omitted. | Query authorized documents directly with RLS-backed joins and deterministic pagination; test 501+ warranties and tenant boundaries. |
| 6 | Medium | src/app/api/claims/route.ts:28-53 fetches accessible warranty IDs and claims without explicit pagination. Large datasets depend on provider row limits and may truncate. | Add bounded cursor pagination and explicit counts; test large tenants and cross-tenant denial. |
| 7 | Medium | qa:architecture-map fails: e2e_spec_files mapped 8, actual 10 (inventory excludes release-regression). | Regenerate accurate map and include its validation in CI. |
| 8 | High assurance gap | Candidate CI: 222 E2E passed, 92 skipped. Some skips intentionally avoid duplicate desktop width matrices in mobile projects; operational tests separately require OPERATIONAL_E2E and privileged fixture access. Green CI is not all-workflow coverage. | Inventory each skipped case, distinguish intentional duplicates from missing journeys, run approved isolated operational fixtures and fail release if required cases are unexpectedly skipped. |
| 9 | Medium assurance gap | OCR corpus validates 14 synthetic entries, only 6 file-backed. This is not real provider accuracy or end-to-end storage/scan proof. | Run synthetic media through configured OCR providers in isolated environment; separately report real-document accuracy gap. |
| 10 | Medium assurance gap | Growth-readiness checks source wiring; frontend budget checks asset size, not live Core Web Vitals; security assurance explicitly excludes production and independent pentest. | Add consent-aware analytics receipt evidence, live performance measurements, and authorized tenant/RLS probes; label unavailable checks. |

## Verified this turn

- Expanded production sitemap audit: 50 pages / 350 layout checks at all seven
  widths; zero captured console/page errors, horizontal overflow, escaped controls,
  broken tested anchors or internal HEAD failures. All pages had canonical,
  description and language metadata. This is programmatic geometry evidence,
  not full visual screenshot approval or a click test of every control.
- Production smoke: PASS; public endpoints accessible, tested protected routes redirect,
  unauthenticated API/cron/send requests denied, callback rejects external redirect.
- Live existing browser suite: 42 PASS / 1 FAIL; failed Professional navigation passed
  isolated repeat. Do not classify as either permanently broken or fully resolved.
- Production agent-readiness: PASS, 21 JSON and 6 text endpoints.
- Internal security assurance: PASS, 73 focused tests, dependency audit zero known
  reported vulnerabilities, loopback guard, migration source integrity.
- Migration manifest check: 69 files, zero pending according to checked-in manifest;
  not an independent live database migration query.
- CLI packaging synchronization: PASS, four synchronized files, no lifecycle scripts.
- Frontend budgets: PASS: shared 209.5 KiB; home 233.3; pricing 241.7; auth 309.4.
- Growth source-wiring checks: PASS; not proof of analytics delivery or lead generation.
- Candidate PR #30 CI: PASS, 284 unit tests, 222 E2E passed, 92 skipped;
  disposable QA cleanup confirmed by workflow. This is CI evidence, not a live
  authenticated portal audit conducted in this turn.

## Coverage not established

Every signed-in portal button across roles/tenant states; complete claims/approval/
certificate/extension outcomes; authenticated mobile and RTL screenshots; live
database tenant-isolation probes; email delivery; Twenty durable lead receipt;
payment collection (owner-postponed); provider OCR execution; scanner clean/EICAR
execution; live GA4 receipt and Search Console indexing; load behavior; backups
and restore drill; current Sentry issue inventory. Do not infer these from smoke,
source checks, synthetic fixtures, previous audits, or green CI.

## Repeatable public audit

`node scripts/audit-public-experience.mjs` reads the live sitemap and checks all
canonical pages at 320, 390, 768, 1024, 1280, 1440, 1920 pixels. Records metadata,
unfiltered console/page errors, internal HEAD statuses, anchor validity, horizontal
overflow and control containment flags. No forms or consequential controls clicked.
Geometry flags require visual review; this script does not prove every button works.
Evidence output: /private/tmp/warrantee-public-audit-20261004.json.

## Release rule

Do not mark a whole-project audit complete until the coverage gaps above have
executed evidence or explicitly accepted owner exceptions. Keep product/visual
changes separate from audit tooling; rank confirmed findings before implementation.

## Remediation candidate

Implemented on the PR #30 branch: inner-joined authorization filters and explicit
pagination for documents/claims, six request-construction/authorization regression
tests, removal of broad hydration/404 console exclusions, seven widths for public
and authenticated release contracts, refreshed architecture inventory and CI gate,
and a fail-fast authenticated E2E configuration gate. Local unit suite: 290 passed;
build and type-check passed; lint has no errors and two pre-existing navigation warnings.
Operational E2E now checks aggregate document and claim endpoints with its existing
disposable fixture. Deployment and live results must be recorded separately.
