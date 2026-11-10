# Signup To First Warranty Reliability

## Scope And Release Boundary

Owner-approved November 10, 2026: implement the twelve findings from the signup-to-first-warranty audit. Warrantee only, from the active independent checkout. Baseline main is `93d7fe18813da598b1f40a5e036bc34ed1e39b4b`. This source document records implementation contracts, not a claim that a release or every check has passed. Exact final CI, preview, migration and deployment evidence must be recorded in the release PR closeout.

No real prospective-user account, document, communication, or question content belongs in test fixtures or retained evidence. Production account deletions previously authorized by the owner are separate from this release; do not recreate those accounts for QA.

## Approved Fixes And Acceptance

| # | Boundary | Required Evidence |
| --- | --- | --- |
| 1 | Smart Scan | Images and PDFs use the existing controlled OCR route, not browser CDN workers. Keep production CSP strict; do not activate an OCR provider or paid service. Synthetic extraction proves wiring, not real-document accuracy. |
| 2 | Request recovery | Rejected, timed-out and lost-response creation/upload calls restore controls and display bounded errors. A persisted creation replays under the same user/company/key/body instead of creating another warranty. Attachment retries reconcile existing metadata. |
| 3 | OAuth signup intent | Clear the exact callback cookie path for success, reset and terminal errors. Signed, expiring intent is bound to a flow, provider and safe destination. A failed initial durable registration may retain only that original short-lived intent for explicit authenticated retry, without extending expiry. Completed setup never regrants a revoked membership. |
| 4 | Callback redirects | Both callback entry points reject external, protocol-relative, backslash and ambiguous destinations, while preserving legitimate localized destinations. |
| 5 | Follow-up delivery | Auth waits only for bounded durable scheduling, not CRM/email providers. Existing async jobs and maintenance recover queued work; provider acceptance is not inbox delivery. No campaigns or test mail to real recipients. |
| 6 | Profile/session | Authentication and profile loading/errors are distinct, retryable and protected against stale requests and account switches. A failed profile load cannot silently bypass setup. |
| 7 | Account-type UX | Personal setup has a personal-purchase starting point. Business templates remain available to businesses. Optional contact stays optional. Checklist destinations respect live permissions. |
| 8 | Company issuance | Business manual creation resolves an active authorized issuer company and retains approval rules. Personal registration stays personal. Cross-company and viewer requests fail closed. |
| 9 | Form contract | Primary product names may be Arabic or English. Trim and validate required names, quantities, dates and optional email before advancing. Upload MIME and size rules match shared server contracts. |
| 10 | Draft recovery | Explicit opt-in, account-bound tab drafts expire within thirty minutes. Exclude seller contacts, serials, references, terms, OCR text and file contents. Discard, success, logout and account changes clear saved progress. Uncertain writes must not be silently resubmitted under a new key. |
| 11 | Measurement | Bounded journey hints distinguish step/error/skip states. Only backend transactions assert first-created/first-issued outcomes; drafts and synthetic/monitoring traffic cannot consume real activation. Private aggregate reports distinguish current retained stock, fixed-window hints, unique scopes and coverage gaps. |
| 12 | Verification | Execute fresh Personal/Business EN/AR email signup, confirmation, setup and first-save journeys against disposable real Supabase services, not seeded-complete profiles or fake successful database writes. Keep consent-denied Google collection blocked, inspect durable ownership, exercise recovery, and fail on flakes. |

## Isolated Verification Contract

- Use standard Ubuntu runners in this public GitHub repository. No paid managed database, cloud sandbox, larger runner, cache expansion or long-lived uploaded artifacts is required.
- Provision a new loopback-only Supabase stack with a per-run marker, local SMTP capture and no production link. Guard the host, ports and marker before every mutation.
- Reconstruct only reviewed journey prerequisites from checked-in schema types and canonical migration definitions. This is a focused integration fixture, not a production backup, a restore test, or proof that every production schema object is reproducible.
- Build a disposable application snapshot with local keys only. Exclude local environment files, Vercel state, production integration credentials and user data. Block external network destinations in test application and browser processes.
- The isolated CSP allowance requires explicit opt-in, exact loopback app/data origins and absence of Vercel hosting. Normal production CSP is unchanged. Tests must not use `bypassCSP` or disable tenant authorization.
- Keep logs and summaries category/count based. Never publish keys, cookies, sessions, raw confirmation URLs, database rows, traces, or provider payloads. Screenshots, if used, contain synthetic records only.
- External Google/Apple provider handshakes are separate from local email/Auth verification. Callback, provider-intent, failure and redirect contracts use controlled synthetic cases; do not mislabel them as a real Google/Apple account signup.
- Business OAuth setup uses service-only durable registration and atomic completion. The authenticated error page offers explicit setup retry without obtaining another OAuth code; pending state resumes only for that user. Before registration succeeds, recovery is limited to the original signed intent's lifetime. No arbitrary existing-account conversion is permitted.
- Dispose only the stack and temporary snapshot created by the test run. Do not delete or reset any pre-existing service, volume, company data or retained legacy checkout.

## Required Gates

```sh
npm run type-check
npm run lint
npm test -- --maxWorkers=1
npm audit --audit-level=moderate
npm run qa:growth-readiness
npm run guard:loopback
npm run qa:migrations
npm run qa:architecture-map
node scripts/run-isolated-signup-journey.mjs --check
```

The actual isolated service run requires Docker and the pinned CLI. Run it on the isolated CI runner when the local machine lacks Docker; a bootstrap source check is not an executed journey.

## Local Evidence Before Hosted Execution

- Type-check and lint passed; lint retains one pre-existing admin effect-dependency warning.
- The complete local unit run passed 875 tests. Another 62 guarded database cases were intentionally skipped outside the disposable stack; these are not database passes.
- Twelve explicitly synthetic EN/AR browser tests passed, including 154 state/width screenshot views across all seven required widths. They cover rejected saves, stable retry, profile failure/retry, opt-in draft privacy, controlled Smart Scan transport, attachment-only recovery and geometry. Mocked UI tests do not prove authentication, persistence, extraction accuracy or real user demand.
- Public semantic HTML hashes matched all 50 canonical sitemap pages against production. Production-build CSP checks, six cross-browser CSP isolation cases, frontend byte budgets, Markdown/discovery checks and the internal security-assurance suite passed.
- Full dependency audit reported zero vulnerabilities. A first local build was stopped after upstream font fetches stalled on the Mac's IPv4 path; an IPv6-first process-only retry built successfully without changing network settings, fonts or production code.
- The independent patch review found additional approval-transition, OAuth replay/recovery, normalized redirect, attachment replay and admin-feed privacy gaps. Source fixes and targeted regressions were added. Real database and hosted release evidence remain mandatory before any deployment claim.
- The first two hosted database runs failed (29/62 passed), including authenticated creation with SQLSTATE `42501`; no rollout followed. Read-only production catalog inspection confirmed the same `STABLE` same-table lookup in the warranty read policy. The pending migration now evaluates the identical owner/member conditions directly on the candidate row, avoiding the inserted-row snapshot problem without widening tenant access. A direct INSERT/RETURNING plus outsider-denial regression raises the required real database count to 63. See PostgreSQL's [policy checks for RETURNING](https://www.postgresql.org/docs/17/sql-createpolicy.html) and [function snapshots](https://www.postgresql.org/docs/17/xfunc-volatility.html). This correction still requires its successful isolated run.
- On source `77a404a`, the actual isolated database gate passed all 63 cases with zero skips. Its subsequent build gate caught an overly broad snapshot exclusion that omitted the public `.well-known` source routes. The snapshot now permits only those exact public discovery directories while continuing to reject private dotfiles/configuration. An additional local build of that network-isolated, credential-free snapshot passed with all 20 real font assets. Fresh browser and full legacy execution still require the next hosted run; neither a passing DB gate nor a Ready preview proves their completion.

Before production, also require the production build, strict CSP artifact validation, public HTML/Markdown preservation checks, applicable seven-width EN/AR screenshots and geometry, fresh journey tests, hosted-preview checks and CodeQL. Do not waive a failed gate or call a retry-pass a clean run. Apply any additive database prerequisite only after isolated verification and before promoting code that requires it.

## CodeQL Static Triage

Review of the exact SARIF paths at `275b768`, against the authentication/tenant boundaries in `.github/SECURITY.md`, classified these four new alerts as `not_actionable` with high static confidence. This verdict is static evidence, not a claim of runtime provider verification. No CodeQL rules or security controls were disabled. Each alert has its own false-positive explanation in GitHub; all other findings remain independent.

| Alert | Claimed Boundary | Counterevidence |
| --- | --- | --- |
| 32, insufficient password hash | `oauth-flow-intent.ts:22` | HMAC-SHA256 authenticates an allowlisted metadata object with a server-only high-entropy key. `FlowIntent` and `buildOAuthSignupIntent` contain no password. The reader verifies the MAC before parsing, then expiry, flow and destination. Supabase Auth owns password storage. This is not a password digest. |
| 33, user-controlled bypass | Localized callback `route.ts:21` | Presence of `code` selects an attempted PKCE exchange, not authorization. Only successful Supabase exchange reaches a sanitized same-origin success redirect. Missing/failed exchange ends at the error route; deleting an intent cookie grants nothing. |
| 34, user-controlled bypass | Auth page `page.tsx:288` | An error parameter controls link visibility only. The fixed same-origin retry target independently validates `getUser` and owner-bound signed/durable setup. No user ID or permission comes from displaying this link. |
| 35, user-controlled bypass | Root callback `route.ts:48` | Exchange failure exits. Both successful exchange and explicit retry must pass the unconditional server-side `getUser` check before owner-bound setup RPCs. Missing code without retry is rejected. The query flag cannot choose another account or bypass authentication. |

The positive controls above defeat each supplied claim; there is no ranked confirmed or unresolved triage queue for these four alerts. Fresh isolated journeys and the complete hosted checks are still required separately. Browser diagnostics now retain only registered source coordinates and fixed failure categories, never confirmation links, credentials or raw exception wording.

## Hosted Checkpoint Before Final Candidate

- On `e30b7e2`, [CI 42872416694](https://github.com/abdulazizalrayes/warrantee/actions/runs/42872416694) passed all three required lanes: type/lint/unit/build and privacy checks; 14 synthetic recovery cases; and all 246 active legacy browser cases on real local services, with zero failures, skips, flakes or global errors. The local full unit checkpoint passed 888 cases; 63 database-only cases remain correctly skipped outside their guarded stack, and separately pass inside it.
- The 14 mocked recovery cases cover 168 state/width views across the seven required widths. The additional EN/AR Business-setup error views were visually inspected. These prove UI recovery/geometry, not authentication or persistence; the real local-service signup lane remains independent.
- Framework routing configuration had intercepted `/auth/callback` with a general locale redirect before the root handler could run. Root callbacks now stay on their registered path; regression tests evaluate the actual configured route matchers. Existing exact `/auth` and unrelated locale redirects remain supported.
- Session refresh/deletion cookies and the SDK's private/no-cache headers now survive redirects. Seven targeted cases verify signed-in/signed-out, admin/approver denial, continuation and deletion paths without changing the authorization decision. Cookie navigation uses the SDK-compatible Lax behavior while retaining Secure; same-origin mutation controls remain in force. See [Supabase's SSR cookie and cache requirements](https://supabase.com/docs/guides/auth/server-side/creating-a-client) and [SameSite guidance](https://supabase.com/docs/guides/auth/server-side/advanced-guide).
- A separate test-environment failure was traced to the installed framework normalizing the isolated IP hostname to an alias during redirect construction. Cookie storage and the browser network allowlist then disagreed. A strict existing isolated-origin guard now preserves the configured test origin only for the disposable stack, rejects hosted/test mixing, and leaves production/preview origins unchanged. Experimental client continuation code was removed once that cause was established; it is not part of the final product implementation.
- The credential-free isolated public build of `e30b7e2` passed all 50 generated/negotiated Markdown companions and 21 JSON plus six text discovery endpoints, using 20 verified real font assets. Its owned server and temporary snapshot were removed. This does not establish database or external-provider outcomes.
- The real fresh-signup run on that checkpoint passed six complete scenarios before a later scenario timed out; it is not a passing ten-case run. Diagnostics retain only registered stages, source coordinates, bounded HTTP statuses and fixed boolean categories. Failed HTTP interception now settles the browser request instead of leaving it pending.
- Telemetry previously shared the general IP API bucket. Its separate `funnel-events` namespace preserves the same 300/minute cap while preventing instrumentation from consuming warranty-action allowance. Memory-only regressions exhaust each bucket independently and verify the other still enforces its own unchanged cap. No production limiter or service is disabled for testing.

## Final-Candidate Local Evidence

- After the checkpoint, the real-service run reached six successful journeys and located a separate Arabic skipped-onboarding timeout at the skip action. Its visible label ended with the wrong Arabic character. The product label, not the correct test locator, was repaired; four EN/AR Personal/Business render regressions passed. This timeout was not evidence that the independent telemetry namespace caused the failure.
- The complete local unit suite now passes 894 cases across 84 files. The 63 database-only cases remain correctly skipped locally and must separately pass in the disposable real-service runner. Type-check passed; lint passed with the same one pre-existing admin dependency warning.
- All 18 explicitly synthetic browser recovery cases passed with zero failures, skips, flakes or global errors. The original fourteen cases were retained unchanged. Four added onboarding cases cover Personal/Business step zero and step one in EN/AR, adding 56 screenshot views to the prior 168, for 224 state/width views. All 56 new views were inspected across eight montages with no clipping or control collision found. Tests attempted no private mutations, used 20 real font assets, and cleaned up their own processes and snapshot. Mocked layout evidence is not real authentication, persistence or verified user demand.
- The internal security-assurance gate passed 75 targeted cases; the full dependency audit reported zero vulnerabilities. The fourteen isolated-harness contracts, migration integrity, architecture map, growth-readiness behavioral checks and four-file CLI synchronization check passed. No package publication, external pentest, production test accounts or communications were performed.

The exact final-candidate fresh signup and full CI results remain release-blocking. No production migration or deployment is implied by the checkpoints above. The canonical pending migration hash is `cefb03de662a9ba04d05979a6a5e16c978e38dc66a02466913fc76834daa1ea3`; its production application and deployment identifiers must be recorded only after the required gates pass.

The subsequent final-commit run rejected ambiguous recovery-alert locators: Next's accessibility route announcer also has the alert role. The fixtures now require the operation-specific setup/creation error instead of an arbitrary alert. Excluding that announcer from signup checks also exposed missing alert semantics on the visible login/signup error boxes. Both boxes now announce errors with `role="alert"`, without changing visual classes or copy. The older green flow remains persistence evidence, not proof that its generic signup-alert assertion observed the intended error. A new clean complete journey run is required; failed runs are not waived as flakes.

## Rollback

Revalidate the company/project and exact current deployment before any rollback. The previously verified baseline was main `93d7fe18813da598b1f40a5e036bc34ed1e39b4b` and Vercel deployment `dpl_3znhhs1dFKDEFxbz5zuPhSdoDqUm`; do not assume an old alias remains current. Promote a complete known-good deployment rather than mixing CSP/build artifacts. Additive database objects can remain when rolling application code back; do not drop audit evidence, idempotency outcomes, jobs or customer data as rollback cleanup. Document any required forward correction separately.

## Preserved Postponements

Database backup/restore and credential searches/resets; billing/payments; private OCR corpus and deferred provider activation; ClamAV deployment; paid independent pentest; public npm publication; Vercel Pro/paid hosting; physical accessibility and field-performance audits; manual SEO rechecks; growth/outreach pilots; shared CRM/mailbox restrictions; Paperclip and other-company work remain postponed. Preserve all existing training/content-use policies, including `ai-train=no`.
