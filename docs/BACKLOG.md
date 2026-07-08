# Warrantee Approved Backlog

Last updated: 2026-07-07

Scope: Warrantee / warrantee.io only.

## Must Fix Before Handover

| Priority | Item | Why | Status |
| --- | --- | --- | --- |
| P0 | Replace `$1/month` pricing story with credible SAR launch pricing | Pricing is the trust and revenue surface. `$1` made the product look unfinished. | Applied locally; needs verification and live Stripe price alignment. |
| P0 | Remove contradictory "first month free" trial | Copy and checkout behavior contradicted a serious B2B plan. | Applied locally by removing checkout trial. |
| P0 | Confirm live Stripe setup | Billing is not operational until env, price, webhook, and production checkout are aligned. | Pending external/live confirmation. |
| P0 | Complete Phase 0-2 takeover docs | Handover requires system map, audit report, and backlog. | Added locally. |
| P0 | Run QA suite after changes | Do not treat a page load as proof. | Pending after this patch set. |

## Should Fix Soon

| Priority | Item | Why | Status |
| --- | --- | --- | --- |
| P1 | Private OCR corpus | Real OCR quality requires real/redacted invoices and receipts. | External founder action; checklist exists. |
| P1 | Third-party pentest | Independent assurance is needed before enterprise/security claims. | External vendor action; packet exists. |
| P1 | Analytics-backed language promotion | Beta locales should not be treated as fully production-grade without evidence. | EN/AR indexed; beta locales remain noindexed/fallback. |
| P1 | First activation golden path | With zero onboarded companies, reduce friction to first warranty/certificate/passport in one session. | Tracking exists; UX improvements should be measured. |
| P1 | First extension partner playbook | Extension revenue cannot start without seller/provider offers. | Code exists; playbook and first partner execution pending. |

## Strategic Improvements

| Priority | Item | Why | Status |
| --- | --- | --- | --- |
| P2 | Warranty extension marketplace operations | Higher ceiling than subscription alone, but needs underwriting/eligibility/reconciliation. | Future. |
| P2 | Asset reliability intelligence | Long-term moat comes from warranty/claim/extension data, not reminders alone. | Future. |
| P2 | Arabic SEO content depth | Saudi/GCC growth depends on Arabic category capture. | Future content roadmap. |
| P2 | Case study/design partner | Proof beats broad feature claims. | No pilot customer yet. |

## Postponed / Optional

- Product scope reduction item #7 was explicitly ignored/postponed by the founder.
- Vercel Pro-only hardening remains postponed unless the founder approves plan changes.
- Entity-profile expansion beyond already recorded LinkedIn/Crunchbase state remains postponed unless requested.

## 7-Day Plan

1. Verify this patch set: type-check, lint, unit tests, build, public/SEO E2E.
2. Confirm Stripe live product/price is `SAR 149/month` and update Vercel env without exposing secrets.
3. Run production readiness and security gates after deploy.
4. Validate pricing rich results and page metadata.
5. Prepare first seller/provider extension offer test using an internal account.

## 30-Day Plan

1. Launch one narrow activation path: signup -> issue first warranty -> generate certificate -> open QR passport.
2. Collect real private OCR corpus and run regression.
3. Execute third-party pentest scope.
4. Run founder-led outreach to first 10 seller/issuer prospects.
5. Measure onboarding funnel: CTA click, signup, first warranty, certificate, QR scan.

## 90-Day Plan

1. Convert first paying Professional customer.
2. Run first real seller/provider extension offer.
3. Publish Arabic/English content around warranty management, product passports, and extensions.
4. Promote any beta language only if analytics and content review justify it.
5. Build asset intelligence reporting only after real warranty/claim data exists.
