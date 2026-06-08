# Paperclip Agent QA Handoff

## 2026-05-23 - Stripe closed, Sentry email triage, and Google billing handoff

Status: production redeployed; Stripe checkout verified; Google Vision remains blocked by KSA reseller billing onboarding.

Context:
- This entry is Warrantee-only. Do not mix Hadhr, Fortis, Strata, Vested, JFCO, or other company work into these QA results.
- User-provided Sentry emails showed two production issues:
  - `WARRANTEE-1`: old `/api/ocr` worker module failure for image/PDF OCR.
  - `WARRANTEE-2`: browser `Connection closed.` unhandled rejection on `https://warrantee.io/en`.

Implemented:
- Replaced Vercel production Stripe env values and forced a fresh production deployment.
- Deployed production `dpl_DzRpiCkJ9Kayx4ZBBLRn2moTh1ib`, aliased to `https://warrantee.io`.
- Added a narrow browser Sentry filter for React Flight `Connection closed.` events only when the mechanism is an unhandled rejection and the stack originates from Next static chunks.
- Confirmed the OCR worker crash path is no longer reproduced for text/PDF OCR; image OCR now returns a clear provider-configuration 503 until Google Vision billing is enabled.

Verification completed:
- Stripe secret auth check returned HTTP 200.
- Targeted authenticated production payment probe returned HTTP 200, a Stripe provider response, a session ID, and a Stripe Checkout URL; its `QA-PAY-*` warranty artifacts were cleaned and verified at zero remaining rows.
- `npm run type-check` passed.
- Vercel production build completed and uploaded Sentry source maps.
- `npm run guard:loopback` passed.
- `npm run smoke:prod` passed after deployment.
- `npm run observability:sentry` passed for Vercel production.
- `npm run load:prod` passed with 2,824 requests, 0 failures, p95 355.6 ms, and p99 572 ms.
- Fresh Playwright load of `https://warrantee.io/en` returned 200 with no browser page errors or console errors.
- Vercel production error-log query for the last 30 minutes returned no error-level logs.
- `npm run readiness:operational` now fails only on Google Vision when production env is available; Vercel does not expose the sensitive Stripe secret back through env pull, but the live payment route has been verified separately.

Remaining blocker:
- Google Vision billing for project `916427933820` cannot be enabled through normal Google self-serve billing with Saudi Arabia selected. Google redirects to CNTXT reseller onboarding for KSA; the next action is CNTXT `Continue with Google`, which requires explicit approval because it shares the Google account with the reseller and likely begins billing onboarding.

Agents expected to review:
- CEO: Stripe is no longer a hard blocker; Google Vision is now a regional billing/reseller action.
- CTO: keep the Sentry filter narrow and keep the payment probe evidence with the deployment notes.
- QA Engineer: rerun full `OPERATIONAL_E2E=1 npm run test:e2e:operational` after CNTXT/Google Vision billing is enabled.
- Security Engineer: confirm no Stripe secrets are committed or echoed in handoff notes.

## 2026-05-23 - Remaining blocker refresh and readiness aggregation

Status: repo-side follow-up completed; two external provider blockers remain.

Context:
- This entry is Warrantee-only. Do not mix Hadhr, Fortis, Strata, Vested, JFCO, or other company work into these QA results.
- The previous continuity session had already deployed and verified the app against `https://warrantee.io`.
- The goal of this pass was to finish or re-check the remaining items: loopback references, Google Vision image OCR, Stripe checkout readiness, and IndexNow/Bing submission.

Implemented:
- Updated `npm run readiness:operational` so it runs every check and reports all provider failures together instead of failing fast on Google Vision.

Verification completed:
- `npm run guard:loopback` passed again; no disallowed loopback references were found.
- `npm run readiness:operational` passed production app URL, home, robots, sitemap, IndexNow key file, health, Supabase, Resend, and HubSpot checks.
- `npm run readiness:operational` still failed Google Vision with HTTP 403 because billing/API access is not enabled for project `916427933820`.
- `npm run readiness:operational` still failed Stripe with HTTP 401 `invalid API key` from the configured secret key.
- `npm run indexnow:submit` resubmitted 28 URLs successfully to both `https://api.indexnow.org/indexnow` and `https://www.bing.com/indexnow`.
- Public search sampling still shows the `https://warrantee.io/` homepage indexed; deeper submitted URLs should be sampled in Bing Webmaster Tools after processing.

Remaining blockers:
- Enable Google Cloud Vision billing/API access for project `916427933820`.
- Replace the rejected Stripe production key pair and verify checkout/webhook flow.
- Use Bing Webmaster Tools for direct inspection of sampled submitted URLs once Bing has processed the latest IndexNow request.

Agents expected to review:
- CEO: the remaining two hard blockers are account/provider actions, not repo code defects.
- CTO: keep the aggregated readiness script in the production gate so dependency failures remain visible together.
- QA Engineer: rerun operational E2E after Google Vision and Stripe are corrected.
- Metrics/Growth Agent: verify deeper URL indexing in Bing Webmaster Tools after crawl processing.

## 2026-05-22 - Operational workflow continuity, loopback guard, and remaining blockers

Status: implemented, deployed to production, and verified against `https://warrantee.io`.

Context:
- This entry is Warrantee-only. Do not mix Hadhr, Fortis, Strata, Vested, JFCO, or other company work into these QA results.
- Production deployment `dpl_9SDkzQBvKFABXrGBhhAAXca2cLTh` is live and aliased to `https://warrantee.io`.
- The continuity session audited the whole project for accidental local loopback links and added a CI guard for future regressions.

Implemented:
- Added `npm run guard:loopback` and CI enforcement for disallowed local loopback URL references outside intentional test/guard files.
- Added `npm run readiness:operational` for production dependency checks across public URLs, Supabase, Resend, HubSpot, Google Vision, and Stripe.
- Added `npm run test:e2e:operational` for destructive-but-cleaned production QA of import, approval/rejection, documents, OCR, team guardrails, and payment checkout.
- Fixed production schema compatibility in approve/reject/payment routes for missing live columns and live warranty status enum behavior.
- Fixed PDF OCR packaging on Vercel by tracing `pdfjs-dist/legacy/build/pdf.worker.mjs` into the `/api/ocr` serverless bundle.
- Hardened image OCR so a hard Google Vision billing/API configuration failure returns a clear 503 instead of falling through to a slow serverless Tesseract timeout.

Verification completed:
- `npm run guard:loopback` passed.
- `npm run type-check` passed.
- `npm run build` passed and generated 151 app routes.
- `npm test` passed with 48/48 tests earlier in this continuity gate.
- `npm run smoke:prod` passed on `https://warrantee.io`.
- `npm run observability:sentry` passed for Vercel production.
- `npm run load:prod` passed with 2,725 requests, 0 failures, 60.34 requests/sec, p95 330 ms, and p99 487.4 ms.
- `npm run security:rls-probe` completed without exposing anonymous warranty rows.
- `npm run indexnow:submit` submitted 28 public URLs successfully to IndexNow and Bing.
- `npm run test:e2e:operational` passed bulk import, approval, rejection, document upload/list/download, text OCR, PDF OCR, and team guardrails before stopping at the image OCR dependency blocker.
- Old `QA-OPS-*` production test artifacts from prior failed operational runs were cleaned; zero matching warranty rows remain.

Remaining blockers:
- Google Vision image OCR is blocked by disabled billing/API access on the configured Google Cloud project. `npm run readiness:operational` now fails clearly with a Google Vision 403 until that is fixed.
- Stripe payment checkout is blocked by an invalid configured Stripe secret key. Direct balance check returns `401 Invalid API Key`; payment checkout/webhook verification remains pending until the production Stripe key pair is replaced.

Agents expected to review:
- CEO: treat this as the current honest operational status: core workflows are much further verified, but image OCR and payment are credential/provider blockers before "fully operational" signoff.
- CTO: keep `guard:loopback`, `readiness:operational`, `smoke:prod`, `observability:sentry`, `load:prod`, `security:rls-probe`, and `test:e2e:operational` in the release gate.
- QA Engineer: rerun `npm run test:e2e:operational` after Google Vision and Stripe are fixed; it should then proceed past image OCR to payment checkout.
- Security Engineer: keep the RLS probe and team self-delete guardrail checks in every production gate.
- Metrics/Growth Agent: IndexNow submission is accepted; sample URLs in Bing Webmaster Tools after processing.

## 2026-05-22 - Sentry readiness, business workflow E2E, and production load gate

Status: implemented, deployed to production, and verified against `https://warrantee.io`.

Context:
- This entry is Warrantee-only. Do not mix Hadhr, Fortis, Strata, Vested, JFCO, or other company work into these QA results.
- Production deployment `dpl_4qt4vZWQnFUKRuQFEFpbktwqHD1h` is live and aliased to `https://warrantee.io`.
- CRM/social/WhatsApp remain postponed unless the founder explicitly reopens them.

Launch gate added:
- Sentry runtime DSN is present in production through `NEXT_PUBLIC_SENTRY_DSN` and `SENTRY_DSN`.
- Sentry release-upload readiness is now checked through `npm run observability:sentry`.
- Sentry release upload is now configured in Vercel production through `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and `SENTRY_PROJECT`.
- Controlled production load testing is now checked through `npm run load:prod`.
- Deeper authenticated buyer/business workflow testing is now checked through `npm run test:e2e:business`.

Issues found and fixed during the gate:
- `/api/claims` selected a non-existent `warranties.brand` column, causing claim-listing failures after claim creation.
- The extension workflow depended on browser-side warranty loading instead of the server API, which could leave the extension submit path disabled even when the authenticated API worked.

Verification completed:
- `npm test` passed with 48/48 tests.
- `npm run type-check` passed.
- `npm run build` passed and generated 151 app routes.
- Sentry production readiness passed: runtime DSNs present, release-upload env present, and no missing production release-upload variables.
- Production build uploaded Sentry artifact bundles/source maps for org `abdulazizalrayes`, project `warrantee`, release `d0c2235ac8f088d525b5c4717a876383e1d54786`.
- `npm run smoke:prod` passed after deployment.
- Production business workflow E2E passed against `https://warrantee.io`: sign-in, warranty detail, real draft claim creation, extension request, notifications API, team API, and self-delete guardrail.
- Production load check passed: 3,011 requests in 45.1 seconds, 66.72 requests/sec, 0 failures, p95 303.4 ms, p99 508.4 ms.
- Vercel production error-log query for the last 30 minutes returned no error-level logs and no 500 logs.
- Sentry token was added only as a private Vercel production environment variable and must never be copied into the repo or Paperclip notes.

Agents expected to review:
- CEO: treat this as the current Warrantee launch gate evidence and mark the Sentry release-token blocker closed for production.
- CTO: keep `npm run smoke:prod`, `npm run test:e2e:business`, `npm run load:prod`, and `npm run observability:sentry` mandatory before aggressive scale.
- QA Engineer: expand `tests/e2e/business-workflows.spec.ts` for more seller/admin edge cases before large-volume onboarding.
- Security Engineer: keep the self-delete guardrail and protected API 401 checks in the release gate.
- Metrics/Growth Agent: confirm production analytics and Sentry events are reviewed after real user traffic starts.

## 2026-05-22 - Production authenticated QA signoff and deployment

Status: implemented, deployed to production, and verified after deployment.

Context:
- This entry is Warrantee-only. Do not mix Hadhr, Fortis, Strata, Vested, JFCO, or other company work into these QA results.
- A prior QA run was contaminated by an unrelated local server on port 3000. Warrantee E2E now uses an isolated local port and does not reuse stale servers.
- The production deployment is `dpl_Bssi5c9JLRFUgtTpTNsxhWm4HW8B`, aliased to `https://warrantee.io`.

Issue fixed:
- Password login could succeed without redirecting to the requested dashboard route.
- Claim and extension forms had visible labels that were not programmatically connected to form controls, weakening accessibility, Apple-style usability, and reliable automated QA.
- The authenticated E2E suite did not previously cover the full signed-in buyer/seller/admin route shell plus warranty detail, claim, and extension paths on both desktop and mobile.

Agents expected to review:
- CEO: treat this as a launch-readiness signoff checkpoint and keep CRM/social/WhatsApp postponed unless reopened by the founder.
- CTO: keep the isolated Playwright configuration and production smoke gate mandatory before future deployments.
- QA Engineer: own failures in `tests/e2e/authenticated-shell.spec.ts` and `tests/e2e/authenticated-core-flows.spec.ts`.
- Frontend Engineer / UX: preserve explicit labels, keyboard access, dashboard shell consistency, and polished empty/error states.
- Security Engineer: keep protected pages redirecting unauthenticated users and keep API routes returning 401 where required.
- Metrics/Growth Agent: confirm `GTM-N6G95MQL` remains present on the live page and that analytics events are reviewed after traffic.

Verification completed:
- `npm run type-check` passed.
- `npm test` passed with 48/48 tests.
- `npm run build` passed and generated 151 app routes.
- Local authenticated Playwright suite passed with 36/36 tests across desktop and mobile.
- `npm run smoke:prod` passed after deployment.
- Production authenticated Playwright suite passed with 36/36 tests against `https://warrantee.io`.
- `npm run security:rls-probe` passed without exposing anonymous data rows.
- Vercel error-log query for the recent deployment window returned no error logs.
- Live page source includes `GTM-N6G95MQL`.
- `robots.txt` returns 200 with expected security headers.

Non-blocking follow-up:
- Vercel build warns that Sentry release uploads are skipped because a Sentry auth token is not configured. This affects observability release metadata, not core app functionality.

## 2026-05-14 - Warrantee official LinkedIn page recorded

Status: recorded locally and synced to Paperclip as `WAR-136`.

Context:
- Official Warrantee LinkedIn page: https://www.linkedin.com/company/warrantee-io
- This entry is Warrantee-only. Do not mix Hadhr, Fortis, Strata, Vested, JFCO, or other company social pages into Warrantee docs, agents, analytics, or launch tasks.

Agents expected to review:
- CEO: confirm LinkedIn is the official Warrantee company page.
- Metrics/Growth Agent: use this URL for Warrantee-only social attribution and future LinkedIn growth tasks.
- Marketing/Sales Agent: reference this page only for Warrantee brand activity.
- QA/CTO: keep `docs/SOCIAL_CHANNELS.md` as the source of truth for recorded Warrantee channels.

Production expectation:
- Other social channels remain postponed unless explicitly reopened for Warrantee.

## 2026-05-12 - IndexNow and Bing submission governance

Status: implemented in code, pending deployment and post-deploy submission confirmation.

Google Search Console continuity:
- Warrantee Search Console access is under `abdulaziz.alrayes@gmail.com`.
- Warrantee property: `https://warrantee.io/`.
- Console URL: `https://search.google.com/search-console?resource_id=https%3A%2F%2Fwarrantee.io%2F`.
- Future Warrantee indexing checks should use this property only, separate from any non-Warrantee Paperclip, Hadhr, or mailbox records.
- 2026-06-06 Search Console readback: `/sitemap.xml` is submitted with status `Success`, last read May 31, 2026, and 28 discovered pages.
- 2026-06-06 URL Inspection found `/en`, `/ar`, `/en/pricing`, `/en/features`, and `/en/verify` indexed; `/en/faq` is `Crawled - currently not indexed`; `/en/api-docs` is `Discovered - currently not indexed`.
- Request Indexing for `/en/faq` and `/en/api-docs` was attempted but blocked by Google's daily `Quota Exceeded` response; retry after quota reset.
- 2026-06-07 retry: Request Indexing for `/en/faq` and `/en/api-docs` still returned Google's daily `Quota Exceeded` response. `/en/faq` remains `Crawled - currently not indexed`; `/en/api-docs` remains `Discovered - currently not indexed`. Retry again after the next quota reset.
- 2026-06-08 retry: `/en/faq` is now on Google and indexed. `/en/api-docs` remains `Discovered - currently not indexed`, but Request Indexing succeeded and Google added it to a priority crawl queue. Recheck `/en/api-docs` after Google processes the queue.
- Google Rich Results Test passed for `/en`, `/ar`, and `/en/pricing`; live SEO crawl verified canonical URLs, reciprocal `hreflang`, and parseable JSON-LD on priority public URLs.

Context:
- Warrantee had a valid sitemap and robots file, but no working root IndexNow key file or repeatable Bing/IndexNow submission command.
- `/indexnow.txt` redirected through the localized app shell, which is not acceptable for key-file verification.

Agents expected to review:
- SEO/metrics agent: verify the root IndexNow key file remains accessible after every production deployment.
- CTO/QA agent: keep `npm run smoke:prod` green because it now checks the IndexNow key file.
- Growth/analytics agent: run or request `npm run indexnow:submit` after public landing, SEO, docs, API-docs, or agent-readiness changes.
- Security agent: confirm no authenticated dashboard, private warranty, document, or API URLs are submitted for indexing.

Production expectation:
- Public sitemap URLs should be submitted after deployment, then sampled in Bing Webmaster Tools once Bing processes them.

## 2026-05-12 - Automated production QA gate and monitoring baseline

Status: implemented in code, pending Paperclip cloud-agent review/signoff.

Issue:
- Manual QA alone was not enough to prevent route-shell regressions, broken buttons, Search Console regressions, or protected page surprises.
- Warrantee needs an automated gate that catches buyer, seller, admin, warranty, claim, extension, documents, notifications, team, SEO, and agent-readiness regressions before rollout.

Agents expected to review:
- CEO: confirm this is now a mandatory Warrantee launch-readiness gate.
- CTO: verify Playwright, CI, production smoke checks, and monitoring are wired correctly.
- QA Engineer: own failed E2E cases and expand signed-in regression coverage.
- Frontend Engineer / UX: verify the tested pages maintain consistent navigation, empty states, and Apple-style polish.
- Security Engineer: verify protected routes redirect safely and no private app route is exposed.
- Metrics/Growth Agent: verify Vercel Analytics, Speed Insights, GA4/GTM, and Sentry signals are actionable.

Implementation decision:
- Add Playwright E2E coverage for public routes, protected redirects, SEO endpoints, agent-readiness endpoints, and optional authenticated dashboard-shell checks.
- Add CI browser installation and an E2E smoke gate after the production build step.
- Add Vercel Web Analytics and Speed Insights at the root app layout.
- Harden Sentry configuration with environment, release, surface, and product tags.
- Add structured health-check logs and a production smoke script.

QA checklist:
- `npm run test:e2e` passes locally or in CI.
- `npm run smoke:prod` passes after each production deployment.
- Optional authenticated shell tests run when `E2E_USER_EMAIL` and `E2E_USER_PASSWORD` are configured.
- CI fails if public pages, protected redirects, SEO files, or agent readiness endpoints regress.
- Vercel Analytics and Speed Insights appear in the Vercel dashboard after production traffic.

Files added:
- `playwright.config.ts`
- `tests/e2e/*`
- `scripts/production-smoke.mjs`
- `docs/PRODUCTION_QA_MONITORING.md`
- `src/lib/monitoring.ts`

Production expectation:
- No future Warrantee rollout should be considered complete until the automated gate passes and post-deploy smoke checks are clean.

## 2026-04-22 - Signup intent must not silently redirect to dashboard

Status: fixed in code, pending Paperclip control-plane sync when API/session access is available.

Issue:
- A logged-in user clicking Sign Up from the main Warrantee website was immediately redirected to the dashboard.
- This made the marketing-site signup CTA look broken and made QA confusing because the user never saw the signup intent.

Agents expected to review:
- CEO: confirm this was recorded as a Warrantee-only product quality issue, not mixed with other companies.
- CTO: verify auth/session routing is intentional and does not weaken protected-route security.
- Frontend Engineer / UX: verify desktop and mobile navigation make Sign Up behavior clear.
- QA Engineer: test logged-out signup, logged-in signup intent, login redirect, and protected dashboard redirect.
- Security Engineer: confirm no protected pages became public and no auth callback behavior changed.

Implementation decision:
- Keep existing session protection.
- Allow explicit `?tab=signup` auth intent to render the signup tab even when a user is already signed in.
- Show a clear signed-in notice with two choices: go to dashboard or sign out to create a new account.
- Do not silently redirect explicit signup intent to dashboard.

QA checklist:
- Logged-out user clicking Sign Up lands on `/en/auth?tab=signup`.
- Logged-in user clicking Sign Up lands on `/en/auth?tab=signup` and sees the signed-in notice.
- Logged-in user clicking Login still goes to dashboard.
- Protected pages still redirect unauthenticated users to `/en/auth?redirect=...`.
- Auth callback routes are unchanged.

Production expectation:
- This issue must remain visible to Paperclip agents as a QA/process failure requiring agent-led regression coverage before future rollout.

## 2026-04-22 - Notification bell and company team administration

Status: fixed in code, agent-reviewed, and deployed to production.

Issue:
- Dashboard notification bell looked focusable/clickable but behaved like a broken navigation control.
- Company team administration existed at `/settings/team`, but it was not visible enough from Settings for company admins.

Agents expected to review:
- Frontend Engineer / UX: verify the bell behaves as an Apple-style lightweight popover with an empty state and secondary links.
- QA Engineer: test notification bell open/close, View all, Notification settings, keyboard focus, mobile layout, and no-session redirect behavior.
- CTO: verify `/settings/team` remains protected and only accessible to authenticated company users.
- Security Engineer: verify team-member admin continues enforcing same-domain rules and roles: superadmin, manager, viewer.
- CEO: confirm the task is recorded as Warrantee-only and does not mix with any other company project.

Implementation decision:
- Replace the top-bar notification link with an in-place popover for quick status.
- Keep `/notifications` as the full notification center.
- Add a visible Company Team section in Settings linking to `/settings/team`.
- Preserve the existing same-domain team-member enforcement and role model.

QA checklist:
- Bell opens a popover instead of doing nothing.
- Empty notification state is clear and polished.
- View all opens notification center.
- Notification settings link routes users to Settings.
- Settings shows Company Team as a visible section.
- `/settings/team` still redirects logged-out users to auth.

Agent audit results:
- Auth/notification reviewer found a production blocker where Supabase cookie refresh responses could lose middleware security headers. Fixed by centralizing security header application and reapplying it after `NextResponse.next({ request })` is recreated.
- Auth/notification reviewer found notification load failures were indistinguishable from an empty inbox. Fixed by adding an explicit notification-load error state in the header popover.
- Auth/notification reviewer found OAuth failures were not surfaced to the user. Fixed Google/Apple handlers to return and display provider errors.
- Team admin reviewer found the team roster endpoint exposed company members to any authenticated user in the company. Fixed by requiring team-management permission for `GET /api/team/members`.
- Team admin reviewer found non-admin users could open the team page and see a disabled management shell. Fixed with an explicit superadmin-required state.

Production verification:
- Vercel production deployment `dpl_Gr7juoLkboHEgQvE2DeUHw7hxpUm` passed compile, lint/type validation, and generated 142 pages.
- `https://warrantee.io/en/auth?tab=signup` returns 200 and renders the signup form.
- `https://warrantee.io/api/team/members` returns 401 when unauthenticated.
- `https://warrantee.io/api/health` returns `status: ok` with database status `ok`.
- Browser snapshot confirmed signup form fields and Google/Apple auth buttons render on production.

Remaining access-gated verification:
- Authenticated notification popover with real user data still needs a live logged-in browser session.
- Authenticated team add/update/remove still needs a live superadmin session and a same-domain test account.
- Live Paperclip issue/comment sync remains blocked until the Paperclip control plane is accessible from an authenticated session.

CRM note:
- CRM/HubSpot remains intentionally postponed by founder instruction and must not be treated as a launch blocker for the current operational fixes.

## 2026-04-22 - Team invite button and global sidebar placement

Status: fixed in code, deployed to production, and verified in the live Chrome session.

Issue:
- `/en/settings/team` showed an Invite Member button that looked usable even when the backend denied team-management access.
- The global dashboard sidebar made Settings look visually separated and misplaced at the lower-left of the page instead of part of one coherent navigation stack.
- The team API depended on optional company schema fields, which caused access to fail or behave inconsistently when the real company boundary should be the approved business email domain.

Agents expected to review:
- CEO: confirm this is recorded as Warrantee-only governance work and that CRM remains postponed.
- CTO: verify the team API uses a stable same-domain access boundary and does not expose cross-company members.
- Frontend Engineer / UX: verify Settings is now in the same navigation cluster across dashboard pages and the layout follows the calmer Apple-style surface.
- QA Engineer: verify Invite Member opens the form, same-domain messaging appears, and role controls remain restricted to superadmin/manager/viewer.
- Security Engineer: verify invites and role changes remain same-domain-only and preserve the “at least one superadmin” guard.

Implementation decision:
- Use the authenticated user's business email domain as the team boundary instead of fragile `company_id/company_domain` profile fields.
- Keep Warrantee founder/team bootstrap scoped to `warrantee.io` and configured founder emails.
- Render the Invite Member control only when the team page is loaded and the requester can manage the team.
- Convert the dashboard sidebar into a light, sticky, equal-spaced navigation rail so Settings is consistently positioned with the rest of the app navigation.

Production verification:
- Vercel production deployment `dpl_8xDBuuzinQLFRZMYruCvTCkmnVQd` passed build, lint/type validation, and generated 143 pages.
- Live `/en/settings/team` rendered members instead of the previous superadmin-required blocker in the active authenticated browser session.
- Clicking `+ Invite Member` opened the invite form.
- The invite form displayed the same-domain rule for the active session.
- Sidebar nav positions were verified as one continuous stack from Dashboard through Settings, with Settings no longer visually dropped to the bottom.

Known context:
- The currently active browser session during verification was an `eijarat.com` account, so the team list correctly showed `eijarat.com` teammates. A `warrantee.io` session will show the `warrantee.io` workspace boundary.
- Paperclip sync was completed after the control plane became reachable through the authenticated browser session.

Paperclip sync:
- Created CEO-owned Warrantee issue [WAR-121](/WAR/issues/WAR-121): CEO sync for production fixes from the external Codex session.
- Created [WAR-125](/WAR/issues/WAR-125): CTO review of team domain boundary and deployment signoff.
- Created [WAR-123](/WAR/issues/WAR-123): Frontend review of sidebar/settings placement and invite form UX.
- Created [WAR-124](/WAR/issues/WAR-124): Security review of same-domain team invites and role guardrails.
- Created [WAR-122](/WAR/issues/WAR-122): CPO QA coordination because QA Engineer is currently in error state.

## 2026-04-25 - Contact/support ticket persistence launch blocker

Status: fixed in code, deployed to production, and verified through a live production contact submission.

Issue:
- The contact/support form returned success, sent email, and created/updated the HubSpot contact, but `ticket` was `null`.
- Production `support_tickets` had stricter constraints than the route assumed:
  - `description` is required.
  - `category` must be one of the production-approved values such as `technical`, `billing`, or `other`.
  - `priority` rejects `normal`; verified accepted values include `low` and `medium`.

Agents expected to review:
- CEO: confirm this is recorded as a Warrantee launch-blocker closure, not a CRM expansion task.
- CTO: verify the production route now normalizes form intent into valid ticket category and priority values.
- Customer Support: verify support tickets are visible in the admin/support surface and triage workflow.
- QA Engineer / CPO fallback: retest contact form, support page, seller application contact, email delivery, HubSpot contact sync, and admin support visibility.
- Security Engineer: confirm the route still rate-limits public submissions and does not expose service-role details.

Implementation decision:
- Keep the original contact kind in ticket metadata for reporting.
- Normalize ticket category before insert:
  - Billing/payment intents -> `billing`
  - Technical/support/bug/issue intents -> `technical`
  - Everything else -> `other`
- Normalize ticket priority before insert:
  - Seller/enterprise/partnership intents -> `medium`
  - Other contact/support intents -> `low`
- Preserve the rich insert path when production has richer support columns, with a basic fallback insert if those optional columns are unavailable.

Production verification:
- GitHub commit `8db1864430fe743135668fedeaac15dffe9a0f51` updated `src/app/api/contact/route.ts` on `main`.
- Vercel production deployment `dpl_Gp1xnAxnYnaWqLMGGhUCzirN1BmR` is ready and aliased to `https://warrantee.io`.
- Live POST to `https://warrantee.io/api/contact` returned HTTP 201 with:
  - `ticket.ticket_number`: `SUP-MOE7D6G2`
  - `hubspot.enabled`: `true`
  - `emailed`: `true`
- Temporary database probe rows used to discover constraints were deleted immediately after validation.

Remaining access-gated verification:
- Completed data-path verification on 2026-04-26:
  - Production health returned `status: ok` and database `status: ok`.
  - Production admin page code reads `support_tickets` directly and renders `ticket_number`, category, priority, SLA, status, assignee, and created date in the Support tab.
  - Production `support_tickets` ordered by `created_at desc` returns ticket `SUP-MOE7D6G2` as the latest record with requester `hello@warrantee.io`, category `technical`, priority `low`, and status `open`.
- Visual admin screenshot remains access-gated only because the controllable browser was not logged into Warrantee admin and the active Chrome window was controlled by Claude on another site. Functionally, the admin support table data path is closed.
