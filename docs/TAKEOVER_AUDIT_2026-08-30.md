# Warrantee Takeover-Grade Audit

Date: 2026-08-30

Scope: Warrantee only (`warrantee.io`, `abdulazizalrayes/warrantee`, Vercel project `warrantee`, and its configured Supabase project). No other company, account, or infrastructure is included.

## Executive verdict

**Ready with known risks for free warranty operations and controlled pilots. Not yet fully revenue-operational.**

No critical production outage, unresolved Sentry issue, known dependency vulnerability, failed production security gate, tenant-isolation failure, or migration drift was found. The core application, public pages, authenticated journeys, API / CLI / MCP discovery, OCR pipeline, Twenty CRM reconciliation, and production deployment are functioning.

The principal risks are now commercial evidence and owner-postponed scope rather than a hidden backend or release-quality outage:

1. The public language selector exposes 17 choices while only English and Arabic are production-grade and indexed.
2. Real qualified traffic is effectively absent, so the onboarding funnel cannot yet be judged from statistically useful customer behavior.
3. Self-serve paid billing is intentionally postponed and fails closed; Professional access is a request flow, not live checkout.
4. Real-world OCR accuracy, independent penetration testing, and very-large-scale behavior remain unproved external evidence.

The approved Professional price is now consistent at **SAR 15 / USD 4 per month**. Commit `8d566a75563bae206e37c6ccd47a389bb85d2223` is deployed and production gates are green.

## Advanced regression re-audit update

The release contract was expanded after the initial report. The current working tree now checks all 50 sitemap pages at 320, 390, 768, 1440, and 1920 pixels, plus 38 authenticated EN/AR route-and-width combinations. It verifies one main landmark and H1, unique IDs, labelled fields, named controls, locale/direction, horizontal overflow, interactive containment, hidden cookie-switch state, console errors, and failed requests.

The deeper full-document screenshot and containment review found one additional release-blocking visual defect that the first-viewport geometry check missed. The owner approved the correction, and it is now fixed and verified:

| Status | Finding | Evidence | Proposed fix |
| --- | --- | --- | --- |
| Fixed and verified | The homepage Business pricing summary had a cyclic `height: 100%` chain below the desktop breakpoint. At 390 px, its container was 691 px tall while its content was 2,007 px tall; Business Free created a large empty gap and Professional/Enterprise spilled into the following dark CTA section. The same defect occurred at 320, 390, and 768 px in EN and AR. | The equal-height rule is now desktop-only. At 320/390/768 px, measured overflow is 0 px in EN and AR. Updated full-page screenshots are `/tmp/warrantee-visual-audit/{en,ar}-home-fixed-{390,1920}.png`. All 52 public release contracts pass across five widths. | Completed in `src/app/[locale]/page.tsx`; permanent full-document data-testid containment is enforced by `tests/e2e/release-regression.spec.ts`. |

The deeper review also completed two approved nonvisual tranches:

- Accessibility and semantics: all 52 public contract cases and all 38 authenticated EN/AR route cases pass after repairing labels, accessible names, cookie switches, headings, duplicate IDs, nested landmarks, and the closed mobile sidebar focus boundary.
- Performance: English pages no longer preload five unused Arabic font files (about 174 KiB). Under a repeatable mobile-throttled browser profile, measured LCP is about 0.9 s for EN home, 0.9 s for pricing, 2.5 s for auth, and 0.9 s for AR home. The CI build budget is 195 KiB shared, 215 KiB home, 220 KiB pricing, and 285 KiB auth; current measurements are 184.9, 197.7, 204.6, and 269.1 KiB respectively.

The complete final local browser suite records 214 passes, 92 intentional skips, and 0 failures. The skips are duplicate-project coverage and the destructive operational scenario, which remains intentionally opt-in. One repeat run correctly returned HTTP 429 after exceeding the six-import/ten-minute guardrail, then passed with a fresh isolated QA identity. Final cleanup removed that identity and 26 related records, leaving zero persistent QA users.

## Why earlier audits missed visible defects

The earlier checks were useful but incomplete. They proved route reachability, basic workflow behavior, and absence of generic horizontal overflow. They did not prove every component remained visually correct.

| Gap | What the old check proved | What it did not prove | Required replacement |
| --- | --- | --- | --- |
| Route coverage | 21 public routes and 5 Arabic routes loaded | All 50 canonical EN/AR sitemap pages | Sitemap-driven route inventory on every release |
| Responsive coverage | A small set of mobile/desktop widths | 320, 390, 768, 1280/1440, and 1920 behavior on every route | Width matrix with geometry assertions |
| Visual quality | No page-wide horizontal scrollbar | Text/card/button containment, clipping, overlap, uneven alignment, or excessive whitespace | Element-level bounding-box assertions and screenshot baselines |
| Interaction states | Default page state | Cookie customization, menus, dialogs, validation, errors, uploads, empty states, and loading states | Explicit state-opening test stories |
| Accessibility | Selected happy-path controls | Duplicate IDs, unnamed icon buttons, unassociated labels, heading hierarchy, and hidden controls | Automated semantic scan plus keyboard/manual review |
| Portal coverage | Authenticated flows completed | Consistent page structure and labels across the full authenticated route inventory | Authenticated EN/AR semantic and responsive sweep |
| Human review | Changed pages were spot-checked | Full-surface design coherence and copy contradictions | Mandatory pre-release visual review checklist |

The new release standard should treat a page load as only the first test, never the definition of success.

## Evidence summary

| Area | Evidence | Result |
| --- | --- | --- |
| Repository architecture | `npm run qa:architecture-map` | 62 components, 68 dependencies, 13 flows, 49 tables, 129 source references; passed |
| Source release | Commit `8d566a7`; Vercel deployment `dpl_EQveNFpAQDGMSckMbkLAa38TTpwk` | Deployed to `warrantee.io` |
| CI | GitHub run `33309332002` | Passed; 124 E2E tests passed, 2 skipped |
| Production security | GitHub run `33309670363` | Passed all jobs, including smoke, RLS, authenticated operational E2E, load, Sentry inventory, and QA cleanup |
| Dependencies | `npm audit --omit=dev --json` | 0 known vulnerabilities across 781 dependencies |
| Security assurance | `npm run qa:security-assurance` | Passed; 66 migrations, 0 pending; 70 focused security tests passed |
| Public UI | 52 EN/AR release contracts; 50 sitemap URLs x 5 widths | 0 fatal errors, bad statuses, container overflows, clipped controls, unnamed controls, unlabelled fields, duplicate IDs, or locale/direction failures |
| Portal UI | 38 authenticated EN/AR route-and-width contracts plus desktop/mobile workflow suites | 0 fatal errors, redirects, container overflows, clipped controls, missing landmarks/headings, or closed-sidebar focus leakage |
| Internal links | 73 unique same-origin targets | 68 x 200, 4 expected auth redirects, 1 Cloudflare email-protection pseudo-link |
| Agent Markdown | `npm run qa:agent-markdown:local` | All 50 canonical pages covered; Accept negotiation and sidecar rules passed; 87.01% response-size reduction in the final local build |
| AI discovery | `npm run qa:agent-readiness` | 19 JSON and 6 text endpoints passed |
| OCR | `npm run qa:ocr-media`, `npm run qa:ocr-corpus` | 6/6 synthetic media checks passed; 14-entry corpus, 6 file-backed |
| CRM | `npm run crm:reconcile -- --strict` | Twenty is active; no missing/error records; 0 qualified candidates since 2026-07-14 |
| Observability | Sentry issue inventory | 0 unresolved issues |
| Capacity smoke | 2,016 production requests at concurrency 12 | 0 failures; p50 170.3 ms, p95 775.2 ms, p99 1,594.7 ms |

Detailed local artifacts from this audit are `/tmp/warrantee-full-public-ui-audit.json`, `/tmp/warrantee-authenticated-ui-audit.json`, and `/tmp/warrantee-link-audit.json`. They are ephemeral evidence, not customer data and not repository artifacts.

## Prioritized findings and proposed fixes

| # | Priority | Finding and evidence | User/business impact | Proposed fix | Approval |
| ---: | --- | --- | --- | --- | --- |
| 1 | Resolved | **Conversion-page LCP and bundle budgets.** English home/pricing/auth now measure about 0.9/0.9/2.5 s in the repeatable mobile-throttled local profile. | The conversion path is inside the current lab target. | Unused Arabic font preloads were removed from English routes; CI now enforces shared/home/pricing/auth budgets of 195/215/220/285 KiB. | Implemented and verified. |
| 2 | Resolved | **Full release geometry contract.** The old suite covered only a subset of routes and generic overflow. | Prevents the class of pricing overlap that reached external reviewers. | Sitemap-driven EN/AR checks now cover 320/390/768/1440/1920, full-document test containers, clipped/outside controls, semantics, hidden consent state, and authenticated portal routes. | Implemented and verified. |
| 3 | Resolved | **Public form associations.** Contact and support labels were not programmatically tied to fields. | Restores reliable screen-reader and voice-control identification. | Added stable IDs/names, `htmlFor`, autocomplete, and automated visible-field label checks without restyling. | Implemented and verified. |
| 4 | Resolved | **Portal form associations.** Warranty, onboarding, transfer, team, settings, seller, and admin controls repeated the same problem. | Improves keyboard and assistive operation across core workflows. | Associated the existing labels and controls and added route-wide regression checks. | Implemented and verified. |
| 5 | Resolved | **Icon-control names and mobile navigation state.** Copy, menu, remove, and close actions lacked complete names; the closed sidebar remained focusable off canvas. | Prevents ambiguous actions and keyboard focus escaping into invisible navigation. | Added localized/state-aware names plus mobile-only `inert` and `aria-hidden`; mobile tests open the menu before asserting navigation. | Implemented and verified. |
| 6 | Resolved | **Cookie switch semantics.** Customization controls did not expose their state. | Consent state is now understandable to assistive technology. | Added localized switch names, `role="switch"`, `aria-checked`, readable necessary status, and EN/AR hidden-state tests. | Implemented and verified. |
| 7 | Resolved | **Duplicate ID and nested main landmarks.** | Restores a unique skip-link target and valid page landmark structure. | Removed nested page mains while preserving styles; all public release contracts require one main and unique IDs. | Implemented and verified. |
| 8 | Resolved | **Portal heading hierarchy.** Routes had missing or duplicate H1s. | Improves page context for readers and automated comprehension. | Enforced one meaningful H1 per audited route without changing visible typography. | Implemented and verified. |
| 9 | Medium | **The public selector offers 17 languages but only EN/AR are indexed and production-grade.** `src/lib/locales.ts:3-23`; all choices render in `src/components/LanguageToggle.tsx:44-68`; beta routes fall back to English content. | Users may select a language and receive English, undermining trust and creating a product-claim contradiction. | Recommended: expose only EN/AR publicly until each beta locale reaches a translation/RTL/accessibility threshold. Keep beta route infrastructure private or explicitly labelled as English fallback. | Product/visual approval required. |
| 10 | Medium | **Mobile contrast misses on trust surfaces.** Lighthouse flags the home sample badge/status/eyebrow and demo-passport labels around 3.96-4.31:1. | Reduced readability where the product is asking users to trust a warranty record. | Darken only the affected text tokens to at least 4.5:1 and add contrast checks. Do not redesign the sections. | Visual approval required. |
| 11 | Medium | **Homepage signup link text is only “Start”.** Lighthouse reports a non-descriptive-link failure. | Ambiguous for screen-reader users and weaker CTA clarity. | Change visible copy to “Start free” / an equivalent Arabic action, or preserve visible text and add an accessible name. | Visible wording needs approval; accessible-only name does not. |
| 12 | High commercial | **There is no meaningful real acquisition volume.** Current privacy-safe production evidence shows 7 profiles, 3 classified non-internal, 0 new real profiles since 2026-08-01, 0 companies, 0 real warranties, 0 seller invitations, 0 API usage, and 0 qualified Twenty candidates. A sampled 1,000 funnel events contained 966 QA/automation events and only 34 human-classified events; strict filtering left 3 real page views and no real CTA. | The company cannot learn conversion, activation, retention, pricing acceptance, or language demand from current traffic. | Run one tagged manual pilot at a time: 20-50 qualified Saudi/GCC sellers, then 20-50 warranty-operating SMBs. Review after 48 hours and 7 days using the existing funnel and Twenty reconciliation. Do not redesign from synthetic traffic. | Owner approval required before outreach/sending. |
| 13 | Medium | **Operational source-of-truth documents are fragmented.** `docs/SYSTEM_MAP.md` and `docs/AUDIT_REPORT.md` predate major changes; `docs/OPERATIONAL_STATUS.md` has a current top section but long historical contradictions. | Future agents/operators can act on stale pricing, deployment, or integration assumptions. | Make this report plus a concise current status/index authoritative; archive historical snapshots by date rather than mixing them with current instructions. | No visual approval required. |
| 14 | Medium | **Real-world OCR quality is not proved.** Synthetic EN/AR/mixed/poor-scan/PDF/corrupt-file tests pass, but no approved customer/vendor document corpus exists. | OCR may fail on thermal receipts, skew, stamps, handwriting, low light, and diverse invoices despite synthetic success. | Collect a consented, redacted corpus after pilot onboarding; score field-level precision/recall and manual-correction time. Retain synthetic regression checks now. | External evidence required; no code change yet. |
| 15 | Medium | **Self-serve Professional billing is intentionally unavailable.** The app correctly fails closed without a live Stripe price and routes to access request. | The core free/pilot product works, but the company cannot collect recurring self-serve revenue. | Keep fail-closed behavior. When resumed, create approved SAR/USD price handling, VAT/invoice policy, webhook reconciliation, cancellation/refund flows, and a controlled rollout. | Postponed by owner. |
| 16 | Medium assurance | **No independent third-party pentest has been completed.** Internal OWASP/tenant/security suites are strong and passing. | Internal assurance cannot provide independent certification to enterprise buyers. | Continue internal scans pre-user. Commission an external pentest when enterprise procurement or material real-user data justifies it. | Postponed; external spend required. |
| 17 | Medium scale | **100M-row readiness is designed, not demonstrated.** There are 49 tables, 45 RLS-enabled migrations, about 225 policies, 147 indexes, and recent composite/search indexes. Current controlled load is low-volume. | Query plans, storage, retention, and operational cost may change materially at very large scale. | At real growth thresholds, add query-plan baselines, partition/archival policy, rollup validation, queue saturation tests, and warehouse/read-replica strategy. | No immediate action before usage. |
| 18 | Low/medium | **Patch/minor dependency drift exists.** Examples: Next 15.5.21 to 15.5.24, Sentry 10.58 to 10.72, Supabase 2.110.8 to 2.112.4, Stripe 22.1.1 to 22.6, Playwright 1.60 to 1.62.1. Major upgrades are also available. | Missed fixes over time; uncontrolled upgrades can create regressions. | Run one controlled patch/minor maintenance branch with the full release gate. Defer Next 16, TypeScript 7, ESLint 10, Tesseract 7 and other majors to dedicated migrations. | No visual approval for patch/minor; still review deployment. |
| 19 | Low | **CSP still permits inline scripts/styles.** Other headers are strong: HSTS, X-Frame-Options DENY, nosniff, restricted permissions policy, and scoped API CORS. | `unsafe-inline` weakens defense in depth if a script injection is found. | Inventory inline dependencies, introduce nonces/hashes incrementally, and enforce report-only before blocking. | Nonvisual, staged hardening. |
| 20 | Low | **Cloudflare email obfuscation creates a no-JS pseudo-link.** Static link audit sees `/cdn-cgi/l/email-protection` as a 404, while normal browser JS decodes it. | Email link can be less reliable for no-JS/assistive/static clients; not a normal-browser outage. | Either leave as spam protection and exempt it in the link checker, or disable obfuscation for the explicit business email after weighing spam risk. | Owner decision. |
| 21 | Low/process | **The local checkout contains many untracked iCloud duplicates ending in ` 2`.** They include workflows, config, CLI, routes, and Vercel files. | Accidental staging can duplicate sensitive or deployment-critical files and confuse future audits. | Move the repository out of an iCloud-synchronized path or exclude it from syncing; remove duplicates only after a separate reviewed inventory. Never bulk-delete from this audit. | Owner approval required for cleanup/move. |
| 22 | External | **Google indexing is not fully settled.** Requests were submitted on 2026-08-30 for selected canonical pages; sitemap, canonical, hreflang, robots, structured data, and Markdown discovery currently validate. | Search visibility remains below potential until Google recrawls and decides to index. | Monitor Search Console coverage and canonical selection; do not repeatedly resubmit or change technically healthy pages without URL-specific evidence. | External asynchronous outcome. |

## Journey status

| Journey | Current state | Residual risk |
| --- | --- | --- |
| Visitor to EN/AR homepage/pricing/auth | Functional and responsive; exact pricing is consistent; release geometry and performance budgets pass | No meaningful real-user cohort |
| Personal signup/login/reset | Auth workflow and production E2E pass; local mobile-throttled auth LCP is about 2.5 s | No meaningful real-user cohort |
| Business onboarding | Flow is reachable and production E2E passes | 0 real companies; no market evidence of activation quality |
| Create/import/bulk/transfer warranty | Authenticated routes, form semantics, rate limits, and operational tests pass | Scale behavior needs real usage |
| Certificate and public QR passport | Functional; privacy/security gates pass | Contrast tokens and real buyer-loop evidence |
| Claims/approval/extensions | Core flows covered and operational tests pass | No real end-user history; extension purchase is not live billing |
| OCR/document scan | Synthetic corpus and corrupt-file behavior pass | No real-world corpus evidence |
| API / CLI / MCP | Discovery, auth guidance, tokens, rate limits, and agent validation pass | 0 real API usage; npm publication intentionally postponed |
| Twenty CRM | Contact/lead reconciliation passes | 0 qualified external candidates; no campaign evidence |
| Paid Professional | Access-request flow is honest and operational | No self-serve checkout/revenue collection by owner decision |

## Security and data posture

- Tenant and anonymous RLS production probes pass.
- API v1 routes authorize through scoped token/user helpers and filter ownership; a superficial route scan can misclassify this because the guard is centralized.
- Integration tokens are revocable and are not customer usernames or passwords.
- Internal OCR/document scanning requires bearer authorization and validates signed Supabase URL origin/path boundaries.
- OAuth intent creation is same-origin guarded.
- Production contains no persistent QA user after the audit; cleanup and `verify-clean` passed.
- No unresolved Sentry issue or known npm production vulnerability was found.
- Independent assurance and real adversarial customer traffic remain future evidence, not current proof.

## SEO, GEO, AEO, and agent readiness

- 50 canonical EN/AR sitemap pages have valid companions and headers.
- Sitemap, canonical, hreflang, robots, llms files, agent cards, OpenAPI, MCP discovery, structured data, and content negotiation pass current validators.
- Agent Markdown responses reduce average response size by 87.01% and preserve canonical URLs/language.
- `ai-train=no` remains the approved Content-Signal policy.
- Demo and auth Lighthouse SEO scores are intentionally lower because those pages are `noindex`; this is not an indexing defect.
- Current limitation is authority and demand, not missing discovery plumbing. Indexing cannot manufacture qualified traffic.

## Performance interpretation

The backend and edge path are healthy at current load: 2,016 requests completed with zero failures and p95 below 800 ms. The earlier mobile LCP regression was not reproduced after removing unused cross-language font preloads: the repeatable local mobile-throttled profile now measures roughly 0.9 s on EN home, 0.9 s on EN pricing, 2.5 s on auth, and 0.9 s on AR home. Field p75 data still requires real traffic.

Performance acceptance targets for the next tranche:

- Public home/pricing mobile LCP: <= 2.5 s at p75 lab target, with a field-data plan once traffic exists.
- Auth mobile LCP: <= 3.0 s.
- No increase in CLS (currently 0 on audited pages).
- Reduce shared public first-load JavaScript and track route budgets in CI.
- Maintain zero failed requests in the controlled production smoke test.

## Recommended implementation order

### Tranche A: nonvisual quality repairs - complete

Findings 3-8 are repaired and protected by semantic contracts.

### Tranche B: release-quality system - complete

Finding 2 is implemented across all five public breakpoints and the authenticated EN/AR portal matrix. The homepage pricing regression is fixed and now has a permanent containment assertion.

### Tranche C: performance - complete for the current target

Finding 1 is inside the current lab targets and protected by route-specific CI bundle budgets. Further provider splitting should be evidence-led rather than speculative.

### Tranche D: visually approved trust corrections

After screenshots are stable, request owner approval for findings 9-11: public language scope, contrast-token changes, and CTA naming. Present before/after captures before deployment.

### Tranche E: commercial evidence

After the technical tranche is green, run the controlled qualified outreach in finding 12. The next product decision should follow real tagged behavior, not QA or crawler traffic.

## Upgraded mandatory release gate

No future visual or user-journey change should deploy unless all of the following pass:

1. Type-check, lint, unit/integration tests, build, dependency audit, migration integrity, and secret/loopback checks.
2. Production-like EN/AR journey tests for visitor, personal user, business issuer, approver, buyer/passport, and admin.
3. Every sitemap URL at 320, 390, 768, 1440, and 1920 pixels.
4. Every relevant portal route at mobile and desktop widths.
5. Screenshot-diff review for changed components and shared layouts.
6. Geometry assertions for clipped text, overlap, card/button containment, fixed/sticky elements, and horizontal overflow.
7. Hidden-state stories for menus, cookie settings, dialogs, validation, error, empty, loading, upload, and disabled states.
8. Accessibility assertions for one main landmark, unique IDs, one meaningful H1, associated form labels, named controls, keyboard focus, and contrast.
9. Live link, metadata, canonical, hreflang, sitemap, structured-data, agent-discovery, and Markdown negotiation checks.
10. Production smoke, authenticated operational E2E, RLS probe, Sentry inventory, controlled load, and verified QA cleanup after deployment.

Any unexplained screenshot change, overlap, clipping, console error, failed label/name contract, or production gate failure is a release blocker.

## Known external/postponed items

- Stripe self-serve billing and live price setup: postponed by owner.
- Independent third-party pentest: postponed until justified by users/procurement.
- Real-world OCR corpus: requires approved, redacted real documents.
- Real onboarding/language analytics: requires qualified human traffic.
- npm publication of the CLI: postponed; local/source CLI and MCP functionality remain testable.
- Google indexing decisions: external and asynchronous.

## Remaining decisions

Tranches A-C are complete locally. Tranche D remains visual/product work that requires a before/after preview and explicit approval. Tranche E should begin only when the owner approves the specific outreach audience/message; real sends remain approval-gated.
