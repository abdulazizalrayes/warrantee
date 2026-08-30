# Warrantee Takeover-Grade Audit

Date: 2026-08-30

Scope: Warrantee only (`warrantee.io`, `abdulazizalrayes/warrantee`, Vercel project `warrantee`, and its configured Supabase project). No other company, account, or infrastructure is included.

## Executive verdict

**Ready with known risks for free warranty operations and controlled pilots. Not yet fully revenue-operational.**

No critical production outage, unresolved Sentry issue, known dependency vulnerability, failed production security gate, tenant-isolation failure, or migration drift was found. The core application, public pages, authenticated journeys, API / CLI / MCP discovery, OCR pipeline, Twenty CRM reconciliation, and production deployment are functioning.

The principal risks are now quality depth and commercial readiness rather than a hidden backend outage:

1. Mobile LCP is too slow on the pages that start the funnel.
2. The release suite does not yet enforce full visual geometry, hidden states, semantics, and accessibility across the entire EN/AR surface. This is why users could find defects after an audit had passed.
3. Several public and portal controls are not programmatically labelled.
4. The public language selector exposes 17 choices while only English and Arabic are production-grade and indexed.
5. Real qualified traffic is effectively absent, so the onboarding funnel cannot yet be judged from statistically useful customer behavior.
6. Self-serve paid billing is intentionally postponed and fails closed; Professional access is a request flow, not live checkout.

The approved Professional price is now consistent at **SAR 15 / USD 4 per month**. Commit `8d566a75563bae206e37c6ccd47a389bb85d2223` is deployed and production gates are green.

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
| Public UI | 50 sitemap URLs x 4 widths = 200 checks | 0 fatal errors, bad statuses, overflows, missing image alt text, or locale/direction failures |
| Portal UI | 44 EN/AR routes x 2 widths = 88 checks | 0 fatal errors, redirects, overflows, missing image alt text, or clipping |
| Internal links | 73 unique same-origin targets | 68 x 200, 4 expected auth redirects, 1 Cloudflare email-protection pseudo-link |
| Agent Markdown | `npm run qa:agent-markdown` | All 50 canonical pages covered; Accept negotiation and sidecar rules passed; 87.38% response-size reduction |
| AI discovery | `npm run qa:agent-readiness` | 19 JSON and 6 text endpoints passed |
| OCR | `npm run qa:ocr-media`, `npm run qa:ocr-corpus` | 6/6 synthetic media checks passed; 14-entry corpus, 6 file-backed |
| CRM | `npm run crm:reconcile -- --strict` | Twenty is active; no missing/error records; 0 qualified candidates since 2026-07-14 |
| Observability | Sentry issue inventory | 0 unresolved issues |
| Capacity smoke | 2,016 production requests at concurrency 12 | 0 failures; p50 170.3 ms, p95 775.2 ms, p99 1,594.7 ms |

Detailed local artifacts from this audit are `/tmp/warrantee-full-public-ui-audit.json`, `/tmp/warrantee-authenticated-ui-audit.json`, and `/tmp/warrantee-link-audit.json`. They are ephemeral evidence, not customer data and not repository artifacts.

## Prioritized findings and proposed fixes

| # | Priority | Finding and evidence | User/business impact | Proposed fix | Approval |
| ---: | --- | --- | --- | --- | --- |
| 1 | High | **Mobile LCP is poor on conversion pages.** Lighthouse mobile: home 6.9 s, pricing 6.8 s, auth 7.9 s. Shared first-load JS is about 189 kB; unused JS is about 61-111 KiB. `src/app/[locale]/layout.tsx:96-104` mounts global client services and `src/components/RouteProviders.tsx:1-70` makes route-provider selection client-side. | Slow first impression, lower mobile conversion, and weaker search experience. | Split public and authenticated layouts/providers; keep auth context off public routes at the server boundary; delay nonessential consent/analytics UI; inspect bundle and fonts; add LCP budgets to CI. | Nonvisual implementation, but verify screenshots. |
| 2 | High | **Release QA lacks a full visual contract.** Previous suite covered only a subset of routes/Arabic pages and generic overflow. | Layout defects can reach users even while CI is green. | Add sitemap-driven EN/AR screenshots at 320/390/768/1440/1920; assert card/button/text containment; open hidden states; compare baselines; fail deployment on new overlap, clipping, overflow, console errors, or unexplained visual diffs. | Baselines need one owner approval; test code is nonvisual. |
| 3 | Medium | **Public forms have visible but unassociated labels.** Contact at `src/app/[locale]/contact/page.tsx:240-297`; Support at `src/app/[locale]/support/page.tsx:122-163`. | Screen-reader and voice-control users cannot reliably identify fields; weaker form usability. | Add stable `id`/`name`, matching `htmlFor`, autocomplete attributes, and field-specific error associations without changing layout. | No visual approval required. |
| 4 | Medium | **Portal forms repeat the same label association problem.** Examples include warranty creation at `src/app/[locale]/warranties/new/page.tsx:353-443`, onboarding, transfer, team invite, settings, seller invite, and admin ingestion filters. | Accessibility debt on core operational workflows; poorer keyboard/assistive use. | Create a narrow form-control contract, then associate each existing label and control without restyling. Add a test that fails when a visible label lacks a programmatic control. | No visual approval required. |
| 5 | Medium | **Icon-only controls lack accessible names.** API copy buttons at `src/app/[locale]/api-docs/page.tsx:242` and `:378`; dashboard mobile menu at `src/app/[locale]/dashboard/layout.tsx:188`; attachment remove at `src/app/[locale]/warranties/new/page.tsx:480`; bulk-message close at `src/app/[locale]/warranties/bulk/page.tsx:192`. | Actions are announced as unnamed buttons; users can trigger the wrong control. | Add localized `aria-label`/title and state-aware names such as Open menu/Close menu and Copy/Copied. Add an unnamed-button release assertion. | No visual approval required. |
| 6 | Medium | **Cookie customization controls do not expose switch semantics.** `src/components/CookieConsent.tsx:119-148`. | Consent state is not clear to assistive technology; necessary status is only visual. | Add `role="switch"`, localized accessible names, `aria-checked`, and readable necessary-cookie status. Test both EN/AR hidden detail states. | No visual approval required. |
| 7 | Medium | **About pages contain duplicate `main-content` IDs and nested main landmarks.** Layout `src/app/[locale]/layout.tsx:99`; page `src/app/[locale]/about/page.tsx:112`. | Skip-link destination is ambiguous and document landmarks are invalid. | Replace the page-level nested `main` with a `div`, preserving styles and content. Add duplicate-ID and single-main assertions. | No visual approval required. |
| 8 | Medium | **Portal heading hierarchy is inconsistent.** Many portal routes have no H1; onboarding and reports can expose two H1s. | Page context is weak for screen readers and automated comprehension; inconsistent browser-reader navigation. | Define one page-title H1 per route; demote repeated brand/step headings to H2/div as appropriate. Preserve visible typography through classes. | No visual approval required if visual styles remain identical. |
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
| Visitor to EN/AR homepage/pricing/auth | Functional and responsive; exact pricing is consistent | Mobile LCP and small accessibility issues |
| Personal signup/login/reset | Auth workflow and production E2E pass | No meaningful real-user cohort; auth LCP 7.9 s |
| Business onboarding | Flow is reachable and production E2E passes | 0 real companies; no market evidence of activation quality |
| Create/import/bulk/transfer warranty | Authenticated routes and operational tests pass | Form semantics need repair; scale behavior needs real usage |
| Certificate and public QR passport | Functional; mobile passport LCP 3.7 s; privacy/security gates pass | Contrast tokens and real buyer-loop evidence |
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
- Agent Markdown responses reduce average response size by 87.38% and preserve canonical URLs/language.
- `ai-train=no` remains the approved Content-Signal policy.
- Demo and auth Lighthouse SEO scores are intentionally lower because those pages are `noindex`; this is not an indexing defect.
- Current limitation is authority and demand, not missing discovery plumbing. Indexing cannot manufacture qualified traffic.

## Performance interpretation

The backend and edge path are healthy at current load: 2,016 requests completed with zero failures and p95 below 800 ms. The customer-visible weakness is first render on mobile, especially large text LCP. The evidence points to rendering/client JavaScript and provider boundaries more than raw API availability.

Performance acceptance targets for the next tranche:

- Public home/pricing mobile LCP: <= 2.5 s at p75 lab target, with a field-data plan once traffic exists.
- Auth mobile LCP: <= 3.0 s.
- No increase in CLS (currently 0 on audited pages).
- Reduce shared public first-load JavaScript and track route budgets in CI.
- Maintain zero failed requests in the controlled production smoke test.

## Recommended implementation order

### Tranche A: nonvisual quality repairs

Fix findings 3-8 and 7 specifically: labels, accessible names, switch semantics, duplicate landmark/ID, and heading hierarchy. Add automated semantic contracts at the same time. These changes can preserve the exact appearance.

### Tranche B: release-quality system

Implement finding 2 before the next visual change: sitemap-driven screenshots, all five breakpoints, EN/AR, hidden states, geometry assertions, and reviewed baselines. This directly addresses the reason external users found defects after a passing audit.

### Tranche C: performance

Implement finding 1 in a focused branch. Split public and authenticated provider boundaries, measure bundle/LCP after each small change, and reject any functional or visual regression.

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

## Decision requested

Recommended approval is to execute **Tranche A, then Tranche B, then Tranche C**. Tranche D should be shown with before/after screenshots for explicit visual approval. Tranche E should begin only when the owner approves the specific outreach audience/message; real sends remain approval-gated.

