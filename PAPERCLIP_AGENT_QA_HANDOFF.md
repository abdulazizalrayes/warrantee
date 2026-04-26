# Paperclip Agent QA Handoff

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
