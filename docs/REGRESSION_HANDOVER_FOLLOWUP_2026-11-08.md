# Warrantee Regression And Handover Follow-Up - 2026-11-08

## Baseline And Scope

Warrantee only: `warrantee.io` / `abdulazizalrayes/warrantee`. The released baseline is main `9e17ce3559c7b38f997062e72ec4c9893758817c`, deployment `dpl_6ZUZ6BAG9nd7jEAb3YJWrTGud5bi`. [Operational status](OPERATIONAL_STATUS.md#current-release-evidence---2026-11-08) is the dated baseline evidence pointer; [PR #45 final record](https://github.com/abdulazizalrayes/warrantee/pull/45#issuecomment-6721932651) records its completed four follow-ups. These identifiers describe the baseline, not deployment of this follow-up.

Approved scope is documentation reconciliation and focused consent/privacy, browser-regression, and certificate-failure reliability work. No page copy, CSS, visual design, or intended UI behavior change is included. No training/content-use policy change, database migration, credential change, paid resource, or external activation is included. [The associated release PR](https://github.com/abdulazizalrayes/warrantee/pulls?q=is%3Apr+head%3Acodex%2Fregression-handover-followup) is the final outcome/evidence record; this source checkpoint does not predict its later status.

## Findings And Changes

1. **Handover documentation:** backlog, status, CSP, GA4, and takeover records now distinguish completed PR #45 work and the earlier completed deployed GA4 receipt from historical candidate/pending instructions. Historical evidence and all postponements are retained. Architecture runtime metadata was reconciled with the package lockfile and its HTML regenerated; this is not a new provider inventory.
2. **Browser consent regressions:** expanded checks cover real cross-tab storage events, private-route masks, consent withdrawal/regain, and blocked storage reads/writes. Routine Google verification intercepts collection rather than transmitting real events. The earlier actual GA4 receipt remains complete and must not be repeated.
3. **Blocked storage getter:** a bounded check against the production baseline returned pricing HTTP 200 but rendered zero pricing cards and one error boundary; the ordinary case rendered one pricing card. The blocked `window.localStorage` getter therefore exposed a real rendering failure, not a successful page merely because HTTP returned 200. Guarded reads in `CookieConsent.tsx` address this failure without copy/CSS changes. The observation recorded no Google events/tag loads and zero application writes.
4. **Failed consent persistence:** failure to save a withdrawal after a prior grant must revoke collection rather than leave the previous stored grant effective. A document-local denial latch and synchronous consent notification revoke already-loaded tags; only a successful explicit preference save clears the latch. Stored grants are checked for writability before use. VM tests cover both GA and GTM, including custom-event persistence failure and no-duplicate recovery. Document-local denial cannot persist across documents if all storage is unavailable. Cross-tab tests cover real storage events, not authenticated private-page rendering.
5. **Certificate generation failure:** the generation catch path is covered for a generic error response with `no-store` and sanitized/category-only diagnostics, without exposing exception messages, request content, credentials, or warranty/customer data. This does not establish successful generation from a real customer record.

## Recorded Local Evidence Checkpoint

The following are recorded local results as of this checkpoint, not final release evidence:

- **PASS:** 540 tests across 63 files, zero skips, including failed-withdrawal and loaded-bootstrap revocation unit cases. Unit/VM evidence is not a substitute for served-browser verification.
- **PASS:** 26 certificate handler/security/layout tests, including three unconditional Chromium, Firefox, and WebKit cases; 36 positive and 36 negative browser controls, zero skips.
- **PASS:** 56 paired normal-state visual views; maximum changed-pixel ratio 0 in the latest completed comparison. Normal-state comparison does not by itself prove all blocked-storage states render correctly.
- **PASS:** semantic HTML comparison unchanged across all 50 canonical pages.
- **PASS:** lint, type-check, dependency audit (zero vulnerabilities), architecture inventory, migration integrity, loopback guard, frontend budgets, all-three-engine CSP controls, and the Vercel preview dry build. Packaging verifies 1,023 unchanged HTML files, 315 routing rules, and a private-only CSP map.
- Offline certificate and visual checks made zero actual external requests. The analytics gate permits allowlisted Google tag-script reads but intercepts every collector and application write. Intercepted/synthetic responses are not provider acceptance, GA4 reporting receipt, organic traffic, or customer activation.

The first expanded served-browser run passed seven cases; the failed-withdrawal test then tried an English-only button label after Arabic navigation and stopped before completing its actions. The selector now accepts the actual English or Arabic label; no assertion was removed. Final eight-case served-bundle verification and release verification were still running at this source checkpoint. Consult the associated release PR closeout for final results, exact source/deployment identifiers, and subsequent verification. Do not infer either completion or continuing incompleteness of later work from this dated snapshot; no follow-up release is asserted here.

## Repeatable Checks

Run `npm ci` and `npx playwright install --with-deps chromium firefox webkit` before `npm test`. Then run `npm run lint`, `npm run type-check`, `npm run qa:certificates`, `npm run build`, `npm run qa:csp-build`, and `npm run qa:frontend-budget`. `vercel build --target=preview --yes` followed by `npm run qa:csp-package` checks packaging without deployment.

Against the actual served candidate, run `npm run qa:analytics-privacy -- https://candidate.example` (not `--candidate-bootstrap`), `AGENT_MARKDOWN_BASE_URL=https://candidate.example npm run qa:agent-markdown`, and `HTML_CANDIDATE_URL=https://candidate.example npm run qa:html-preservation`. Use existing authenticated preview access only; never disable deployment protection. A successful release also needs CI, all CodeQL languages, exact production alias/source proof, the production security workflow, and preserved `search=yes, ai-input=yes, ai-train=no`. No real Google receipt is needed.

## Safety And Verification Boundaries

- Use only synthetic browser inputs and scoped fixtures. Preserve account, tenant, company, and private-record isolation; do not inspect or export customer data to produce proof.
- Do not send another actual Google event, submit a form, create a lead/account/payment, send communications, or change GA4/GTM settings for routine regression. Existing privacy-enhancing collector settings remain unchanged.
- Keep the real CSP enforced. Browser stabilization must not inject unauthorized styles or bypass policy; positive and negative controls distinguish functional rendering from enforcement.
- Verify guarded reads, failed initial writes, failed withdrawal after a prior grant, cross-tab changes, private-path masking, and consent regain explicitly. Neither an HTTP 200 nor the earlier unit count proves these cases.
- Certificate error checks establish bounded failure behavior, headers, and diagnostics only, not complete real-document recovery, delivery, or customer lifecycle evidence.

## Rollback And Postponements

The recorded pre-follow-up rollback baseline is main `9e17ce3559c7b38f997062e72ec4c9893758817c` / deployment `dpl_6ZUZ6BAG9nd7jEAb3YJWrTGud5bi`. Revalidate identity and approval before restoring the whole deployment; do not roll back only the CSP map or reset a shared/dirty checkout. Source rollback belongs in a reviewed PR. No database rollback, credential reset, or reversal of privacy-enhancing GA4 settings is required by this scope.

All existing postponements remain: database backup/restore and credential searches; OCR corpus/provider activation; billing/payments; ClamAV deployment; paid independent pentest; public npm publication; Vercel Pro/paid hosting; physical/accessibility and field-performance audits; manual SEO rechecks; growth/outreach pilots; shared CRM/mailbox restrictions; Paperclip and other-company work. Historical scope-reduction and entity-profile postponements also remain in force. Local synthetic checks and this report do not resume or close any postponed item.
