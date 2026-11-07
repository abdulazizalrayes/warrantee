# Warrantee Approved Backlog

Last updated: 2026-11-07

Scope: Warrantee / warrantee.io only.

## Current Status / Superseded Records - 2026-11-07

`CLAUDE.md` governs project operations. This current reconciliation supersedes the historical priorities, prices, release snapshots, and time-based plans below; those entries remain intact as dated records, not permission to resume postponed work.

### Current Evidence Baseline

- Parent-verified prior-turn release evidence: production main `fcab224afe0054e7c63a4912720ddd75c3ae2082`, Vercel `dpl_87EqrvHVVkA7GGteQBTLiA1LmT3d`, PR #39. CI `42387386000` passed with 296 unit tests, 224 browser tests, and 92 intentional skips; intentional skips are not executed coverage.
- Parent-verified prior-turn assurance evidence: Production Security Gate `42387613197` passed; Sentry unresolved issues 0, persistent QA records 0, and full `npm audit` vulnerabilities 0. These are the supplied release/check snapshots, not new live checks performed by this documentation worker or proof that the ongoing tasks below are complete.
- Current source verified in `src/lib/plan-config.ts`: Personal Free 10 warranties; Business Free 100; Professional 1,000 warranties, 3 users, SAR 15 / USD 4 monthly including display labels. Prior SAR 14.90 wording is historical; later owner-approved currency unification/rounding may supersede it. Do not label this a confirmed pricing defect. Any unresolved historical approval requires ledger verification. No repricing was done here.
- Billing and payment activation remain postponed. Displayed pricing is not proof of a live checkout, subscription, or paid entitlement.
- Twenty is connected for contacts/leads; this is not full warranty-data synchronization or proof of complete warranty lifecycle coverage.
- Aggregate activation report: four candidate profiles since July 14, three older candidates; zero recent-seven-day sign-ins, zero undeleted attributed warranties/certificates across both cohorts. Candidate heuristics are not owner-verified customer identities; onboarding flags are not activation. See `docs/ACTIVATION_VERIFICATION_2026-11-07.md`.
- Security triage found no currently exploitable defect validated in the assigned alert families; real CSP/edge header hardening observations remain. This is not an independent pentest or exhaustive assurance. See `docs/SECURITY_SCAN_TRIAGE_2026-11-07.md`.
- Recovery discovery verified eight completed provider physical-backup metadata records; PITR is off. Restore, independent backup, integrity, and achieved RPO/RTO remain unproven. See `docs/RECOVERY_READINESS_2026-11-07.md`.

### Owner-Approved Tasks 1-5

| # | Task | Status | Completion Boundary |
| --- | --- | --- | --- |
| 1 | Analytics receipt | SOURCE PATH VERIFIED; RELEASE PENDING | Exactly one controlled QA event reached the correct GA4 Realtime property; verify the released bundle separately. |
| 2 | Aggregate activation | VERIFIED WITH CLASSIFICATION LIMITS | Four current-window candidates, three onboarding flags, zero attributed warranties or recent sign-ins; not seven verified customers. |
| 3 | Documentation reconciliation | UPDATED | Current notices supersede conflicting historical schedules without deleting history. |
| 4 | ZAP triage | TRIAGED | No current exploitable assigned defect validated; CSP/provider-header hardening and untested boundaries remain documented. |
| 5 | Backup/recovery | METADATA VERIFIED; RESTORE UNTESTED | Eight completed provider backups; no isolated restore proof, independent-copy proof, or measured RPO/RTO. |

### Current Postponements

- Tasks 6 OCR, 7 physical/accessibility, 8 field performance, 9 SEO recheck, and 10 growth pilot are postponed for now. Their numbering refers to the current owner task list, not historical lists below.
- Prior postponements remain in force: billing/payments/payment activation, ClamAV deployment, independent paid pentest, public npm publication, and Vercel Pro.
- Historical Stripe alignment, paid activation, OCR corpus, pentest, outreach, and growth schedules below do not override these decisions. Resume only on explicit owner approval.
- This documentation task makes no visual or source-code changes and authorizes no commit, push, deployment, private-data access, or external activation.

## Historical Backlog - 2026-07-07 (Superseded Where Conflicting)

### Must Fix Before Handover

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
