# Warrantee Search And QA Hardening - 2026-11-09

## Scope And Baseline Checkpoint

Warrantee only. The approved November 9 items 1-5 cover the five work areas below; they do not reopen historical task lists or postponed initiatives. Active checkout: `/Users/abdulazizalrayes/Developer/warrantee`, branch `codex/search-qa-workspace-hardening`, starting main `0243310ecbe92a513462b6ae0225a76f16f170bd`.

This document defines the approved behavior and verification boundaries. Workspace setup item 5 has the verified local evidence recorded below; that does not establish completion of the other items or a release. Final counts, exact source/deployment identifiers, and outcome belong in the associated release PR closeout. No release of this follow-up is established by this dated checkpoint.

## Approved Work And Acceptance Boundaries

| # | Work Area | Required Behavior And Evidence |
| --- | --- | --- |
| 1 | Latest-request-only document search | Only the latest active search may update results, loading, or error state. Older successes and failures must not overwrite a newer query, cleared search, or changed context. Verify deliberately reordered responses, stale errors, clearing, and cancellation/unmount handling with synthetic data; cancellation alone is not proof that stale commits are impossible. Preserve current authorization, tenant boundaries, UI copy, and presentation. |
| 2 | Fail CI on flakes | A failed initial attempt followed by a passing retry remains a flake and must fail the relevant CI gate. Keep useful bounded retries for diagnosis without weakening assertions or reporting a retried pass as an unqualified clean run. Test the configured runner/reporting contract, including true failures and intentional skips; skips are not executed coverage. |
| 3 | Deterministic populated fixtures beyond team screens | Expand representative populated-state regression coverage beyond team screens using synthetic, deterministic fixtures. Include relevant loading/empty/error and locale/responsive boundaries without real customer records, outbound side effects, production seeding, or invented business outcomes. Record exact covered surfaces rather than implying whole-product coverage. |
| 4 | Sanitized CI evidence | Retain only reviewed evidence needed to explain failures: registered test identifiers, bounded categories/counts, statuses, and sanitized geometry. Do not upload authentication tokens, session/cookie/storage state, authorization headers, environment values, raw Playwright traces, private request/response payloads, or private page contents. Review attachments, screenshots, logs, reports, and failure diagnostics together; naming an artifact sanitized does not prove its contents safe. |
| 5 | Permanent workspace hardening | Verified non-symlink independent Developer clone at the recorded origin/main baseline; original code edits/duplicates preserved. Original AGENTS handoff pointer appended and ignored 64-entry metadata-only inventory generated. Final original-prefix, HEAD, status, and all 63 other metadata checks passed. See [workspace setup](LOCAL_WORKSPACE_SETUP_2026-11-09.md) for approved ignored-config provenance. |

## Verification And Privacy Contract

- Use focused unit and browser checks scaled to the changed behavior, then the normal configured release gates. No unrun suite, unexecuted fixture, preview, deployment, or production journey is marked PASS by this report.
- Keep EN/AR, real CSP, authentication/tenant isolation, and existing user-visible behavior intact. Stabilize finite animations through approved test mechanisms; do not inject unauthorized CSS, suppress console/security failures, or relax geometry to hide a defect.
- Keep fixture state deterministic and isolated. Do not create records in production or read another company's data to make tests realistic. State fixture-only, interception-only, access-gap, and untested boundaries explicitly.
- Source `CLAUDE.md` for the canonical GA4 identity and current analytics contract. The prior deployed receipt is complete; do not repeat real Google collection. Routine analytics checks intercept collectors and block application writes. Synthetic acceptance is not Google reporting receipt or organic demand.
- Preserve the original workspace without reading its raw diffs or secrets into CI evidence. The generated ignored inventory is metadata-only, not approval to copy or publish its contents. Existing `.env.local` and `.vercel/project.json` were carried only from the verified prior company-locked clean checkout; the preview environment pull verified the same project. This approved minimum ignored configuration must never enter tracked source/docs and grants no credential-search, rotation, or reset authority.

## Rollback And Release Boundary

The supplied rollback baseline is main `0243310ecbe92a513462b6ae0225a76f16f170bd` / Vercel `dpl_9GeaMJ1y3BtdshFUeAgDhg55zvWL`. Revalidate exact identity and authority before any rollback; restore a whole approved deployment rather than mixing CSP artifacts or resetting the owner's checkout. Source reversal belongs in a reviewed PR. The associated release PR closeout is the authoritative record for subsequent deployment and production verification; this source checkpoint does not pre-claim those results.

## Implemented Verification Controls

- Document search aborts its superseded request and separately guards every result/error/loading write against cancellation. Eleven actual-page unit cases cover both locales, reordered responses, delayed JSON, stale failures, cleared search, auth loading/exit, unmount, and localized accessible document-link names. The extra accessible name fixes a validated populated-state defect without changing visible text or layout.
- Populated EN/AR document and warranty listings use two deterministic synthetic rows before the seven-width semantic/geometry matrix. Existing populated team coverage remains intact. Additional browser cases exercise search cancellation and empty/failed listings. These read-only intercepted fixtures do not prove database authorization, persistence, or OCR accuracy; existing operational gates remain separate.
- `CI=1` keeps two diagnostic retries but enables `failOnFlakyTests`. A real spawned retry-pass control must exit 1. Separate real collection and global-setup failure controls verify the fixed run-status/global-error signal without retaining raw error text.
- CI disables raw Playwright screenshots, traces, videos, and HTML/GitHub reporters. The safe reporter keeps only allowlisted static file/project/route identifiers, bounded line numbers, numeric audits, counts, run status, and a capped global-error count. Unknown/dynamic identifiers become `unknown`; query strings and raw payloads are not retained.
- Only the public release describe may capture an eligible anonymous, exact-URL, unscrolled main-region screenshot. Cookies, persistent/session storage, IndexedDB, frames, authenticated configuration, query strings, private routes, origin uncertainty, and navigation races prevent capture. Controls/media are masked. A failed eligibility check intentionally leaves numeric-only diagnostics; this is not screenshot coverage for every public or private failure.
- Artifacts are limited to one 128 KiB JSON summary and at most eight 512 KiB PNGs, with one-day retention and failure-only upload. Validation rejects unknown fields/files, symlinks, oversized content, extra PNG metadata/trailing bytes, and invalid PNG structure. Structural checks do not anonymize pixels; the trusted capture boundary is required. `actions/upload-artifact` v7.0.2 is pinned to official commit `cf430e030ddbb5b0abf93d22962f4752f3646cd9`.

### Repeatable Commands

```sh
npm run type-check
npm run lint
npm test -- --maxWorkers=1
npm audit --audit-level=moderate
npm run guard:loopback
npm run qa:migrations
npm run qa:architecture-map
npm run build
npm run qa:frontend-budget
npm run qa:security-headers
```

Use the normal CI workflow for the complete authenticated matrix and disposable-QA cleanup. Do not create persistent production fixtures or attach raw private diagnostics to a PR. Use the existing protected-preview and production gates; record exact final outcomes and intentional skips in the release closeout rather than treating a build or a passing retry as a complete release.

### Pre-Publish Local Evidence

- Full unit suite: 561 passed across 65 files; typecheck, lint, dependency audit (zero vulnerabilities), migration/architecture/loopback/CLI guards passed.
- Served public release matrix: 54 passed, zero failed/flaky/skipped, including all 50 canonical sitemap pages. Six CSP browser tests passed across Chromium, Firefox, and WebKit. Certificate handlers: 26 passed.
- All 50 Markdown companions passed negotiation, HEAD, language, alternate/canonical, direct-sidecar and noindex checks. All 50 public semantic HTML trees matched the released production baseline.
- Public visual freeze: 56 paired EN/AR views at seven widths, maximum changed-pixel ratio 0. Eight served analytics/privacy modes passed with zero actual collector transmissions or application writes.
- Exact project-locked Vercel preview build completed locally; CSP package audit passed for 1,023 HTML files and 315 routing rules. No provider configuration or secret bindings were changed.
- These are local pre-publish results, not proof of protected-preview, authenticated CI, CodeQL, deployment, or production-security completion. Those outcomes belong in the release PR closeout; intentional skips must remain explicit.

### First Hosted Checkpoint

PR #47 preview `dpl_BEjPbYzDbShkMjTPEHsEJ8z87HHP` at source `50a0d44c93ea426154fcc71a7a051dc45be04feb` passed the protected hosted audit: 50 public pages/Markdown companions, 240 authorized inline-script hashes, 50 unchanged semantic HTML trees, fresh dynamic nonces, three public bootstraps, no exposed private CSP map, and 56 EN/AR browser views with zero browser errors/overflow. Negotiation, HEAD, languages, canonical/alternate headers and sidecar noindex checks all passed. Final-head and production checks remain required after this documentation checkpoint.

The first managed CodeQL run `42567965225` passed Actions and JavaScript analysis, but Python initialization failed while downloading GitHub's CodeQL bundle with HTTP 504, before analysis. No code finding was reported; open alert inventory was zero. GitHub rejected retry of this managed dynamic workflow. This evidence checkpoint triggers a fresh scan; it does not waive the failed gate or declare Python analysis complete. Final run identifiers and outcomes belong in the PR closeout.

## Preserved Postponements

Database backup/restore and credential searches; private OCR corpus, OCR/provider activation and deferred legacy Vision review; billing/payments; ClamAV deployment; paid independent pentest; public npm publication; Vercel Pro/paid hosting; physical/accessibility and field-performance audits; manual SEO rechecks; growth/outreach pilots; shared CRM/mailbox restrictions; Paperclip and other-company work remain postponed. Preserve historical scope-reduction and entity-profile postponements. No training/content-use policy change is included. Local tests and this five-item scope do not resume or close any postponed item.
