# Warrantee privacy, CORS and CSP follow-up

## Completed Release And Evidence Pointer - 2026-11-08

**COMPLETE:** all four follow-ups shipped in PR #45. [Operational status](OPERATIONAL_STATUS.md#current-release-evidence---2026-11-08) is the single evidence pointer for that dated baseline, with the final PR evidence and gate identifiers, not a latest-live-deployment claim. The pre-publication candidate records below remain historical; they are not pending production verification. The prior actual GA4 receipt is complete in PR #43 and must not be repeated. No training-policy change or postponed initiative is included. Consult the associated test/documentation follow-up release PR closeout for subsequent verification and release outcomes; this snapshot does not imply that later work remains incomplete.

## Identity And Scope

Warrantee only: `warrantee.io`, GitHub `abdulazizalrayes/warrantee`, Vercel project `prj_fZIC1oJjpaZ4E8IqLm3UJTbMxlrx`, team `team_AnOdxEeUwCwUtPdqTk5I1Dkt`. Work uses an isolated checkout; unrelated owner/iCloud edits are preserved. No migrations, credential changes, paid service, real form submission or actual Google collector event are included.

Before PR #45, main was `856fd38b917e66ef5f41def62a6ba97c1e260d43`, production `dpl_7phE2yR62vYr2Jhe2kNUfDQvDngH`. The final release closeout is linked through the current evidence pointer above. Candidate checks below retain their original local-only scope and are not a substitute for that release record.

## Validated Findings And Changes

1. Published Google code collected query/referrer values on automatic pageviews; marketing-only consent could load the GA-only GTM container. Enhanced search/history collection could override sanitized defaults. Shared deterministic context now strips query/fragment/record identifiers, retains referrer origin only, uses a non-personal telemetry title, requires strict analytics consent, and applies the Google-supported `ga-disable-*` opt-out on withdrawal. Cross-tab consent and unavailable storage fail closed. Component pageviews remain first-party; the bootstrap owns one initial Google-tag pageview and sanitized pathname-change events, not query/hash-only changes.
2. The Next Node response sender preserves configured headers over handler CORS. The exact public read-only Markdown handler now has a configured wildcard exception, after the generic restricted API rule. Private APIs stay restricted. Negotiated/direct/legacy Markdown GET and HEAD variants must have wildcard CORS and no credential allowance.
3. Style elements are restricted to same-origin stylesheets, exact reviewed admin/framework hashes, and fresh nonces on already-dynamic documents. Finalization rejects unknown inline style blocks rather than blindly authorizing them. Certificate templates receive fresh style nonces; exact header exceptions allow the handlers' policies to survive Next response delivery. Returned and thrown handler failures retain CSP; thrown errors have generic responses and category-only diagnostics. Existing style attributes remain explicitly permitted for layout compatibility. This is not a complete style-attribute migration or a claim that all XSS is prevented.
4. `vitest.config.mts` is explicitly ESM with portable path resolution, eliminating the Vite future loader compatibility notice without changing the application's package module type.

## External GA4 Configuration Verified

Regular Chrome, verified owner `abdulaziz.alrayes@gmail.com`, account Warrantee `388923325`, property Warrantee.io `530040415`, stream `14231166714`, measurement ID `G-ZQJ4LRG4GN`. Reopened the saved editor to verify settings persisted:

- Page-load measurement and scroll: ON.
- History-based page changes, site search, outbound clicks, form interactions, video engagement, file downloads: OFF.
- Published GTM `GTM-WFLBH83M` version 3 inspected as structured source: Google tag plus the existing WhatsApp event tag; no container publication performed.
- Task-owned Analytics tab closed; unrelated owner tabs preserved. No historical analytics data deleted.

These automatic collectors must stay disabled unless privacy-reviewed replacements are verified. Removing raw UTM/search/title values deliberately reduces attribution detail; approved categorical campaign codes in custom events remain available. Unknown future GTM tags are not covered automatically.

## Historical Pre-Publication Verification

Recorded local pre-publication checks: 491 unit tests across 62 files, typecheck, zero-warning lint, zero dependency vulnerabilities, architecture inventory, frontend budgets, production build and final CSP map (1,025 immutable HTML routes) passed. All 50 Markdown companions passed generation, negotiation, public CORS/HEAD/no-credentials, canonical, HTML-tree and noindex checks; all 50 semantic HTML trees matched production. Public release-contract run: 52 passed, 38 authenticated cases intentionally skipped (CI must verify protected journeys). Separately, 22 header/footer/select/CSP browser checks passed; the first release-contract attempt correctly rejected the test's injected CSS before its non-policy-weakening stabilization fix. Six Chromium/Firefox/WebKit script/style isolation checks passed. The 56 paired EN/AR screenshots across seven widths had no page errors/style violations/horizontal overflow, maximum changed-pixel ratio `0.000000175`.

Actual-served local privacy gate (no source override): all four consent modes passed, eight Google collector requests intercepted, zero actual collector transmissions/application writes. Source concerns independently reviewed; SPA/cross-tab fixes and generic certificate failure handling resolved the identified gaps. Vite configuration commit `b624064`, headers/CSP commit `94ab228`, analytics privacy commit `f7fa6f9`. These local records do not replace preview/main CI/production verification.

- Tests exercise actual published Google scripts with all collector traffic locally fulfilled, all application writes blocked, synthetic markers only, and privacy-safe result summaries. Synthetic HTTP 204 means interception, not Google acceptance/reporting receipt. The earlier deployed QA receipt is independently recorded in [PR #43](https://github.com/abdulazizalrayes/warrantee/pull/43#issuecomment-6720187401); do not repeat it.
- Local candidate checks: full unit suite, typecheck, lint, dependency audit, final build, CSP artifact/package integrity, three-engine script/style isolation tests, Markdown generation/50-page coverage, 50 semantic HTML comparisons, responsive geometry and screenshots. Intentional authenticated skips are not executed coverage; configured CI remains required.
- CSP tests must not inject unapproved test CSS into production policies. Layout stabilization uses reduced motion and the Web Animations API, preserving the real production CSP.
- Framework-generated empty OPTIONS/405 responses on certificate endpoints are outside the handler-owned CSP guarantee; they contain no certificate HTML. Successful real-customer certificate rendering is not inferred from synthetic template/transport tests.
- Provider-injected style behavior and every possible browser extension remain separate boundaries. Existing Node typeless-module/metadataBase build notices are not the fixed Vite configuration warning and must not be represented as new regressions or silently fixed through broad rewrites.

## Rollback And Postponements

Repeat the privacy gate with `npm run qa:analytics-privacy -- https://warrantee.io` (installed Chrome), or add `--chromium` for the Playwright browser installed in CI. Default mode verifies the served bootstrap. `--candidate-bootstrap` is explicitly an experimental source override and cannot establish deployment proof. The gate summarizes only approved event names and booleans/counts, never raw URLs, client identifiers, bodies, cookies, or private content.

The historical pre-PR #45 rollback target was `dpl_7phE2yR62vYr2Jhe2kNUfDQvDngH`. Revalidate an approved exact target before any future rollback, then run smoke/Markdown/CSP checks; this identifier is not current rollback authority. Revert source through a reviewed PR, not a reset of the dirty owner checkout. Keep the privacy-enhancing GA4 settings OFF during rollback; reverting them is not needed for functionality. No database rollback or secret reset is required.

All previous postponements remain: backup/restore and credential searches, OCR corpus/provider activation, billing/payments, ClamAV deployment, paid independent pentest, public npm publication, Vercel Pro, physical/accessibility/field-performance audits, SEO recheck, growth/outreach pilots, shared CRM/mailbox restrictions, other companies and Paperclip. Read-only local/synthetic checks do not close these items.

## Primary References

- [Google collection opt-out](https://developers.google.com/tag-platform/security/guides/privacy)
- [gtag parameter precedence](https://developers.google.com/tag-platform/gtagjs/reference)
- [Enhanced measurement](https://support.google.com/analytics/answer/9216061?hl=en)
- [Next.js CSP](https://nextjs.org/docs/app/guides/content-security-policy)
