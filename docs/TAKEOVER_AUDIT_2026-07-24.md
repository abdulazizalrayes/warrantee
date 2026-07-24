# Warrantee Takeover-Grade System Audit

**Audit date:** 24 July 2026  
**Scope:** Warrantee and `warrantee.io` only  
**Repository:** `abdulazizalrayes/warrantee`  
**Production stack:** Vercel, Next.js 15, React 19, Supabase, Cloudflare, Sentry, Resend, Stripe, Mistral OCR, Twenty CRM  
**Change policy:** Read-only audit. No visual or production behavior changes were made by this audit.

## Executive Verdict

**Handover verdict: NOT READY for unrestricted real-customer B2B rollout.**

The public website, personal warranty paths, production deployment, CI, basic authentication, API token handling, agent-discovery layer, and production monitoring gates are operational. However, the current application is not safe or functionally complete for company workspaces:

1. Authenticated users can read another user's warranty documents and claim attachments directly through Supabase Storage.
2. The legacy `companies.api_key` can be returned anonymously when a company exists.
3. Company teammates cannot access company warranties because tenant membership is not part of warranty authorization.
4. Ordinary approvers cannot approve or reject warranties because the API selects a non-existent `company_id` column.
5. Claim state authorization is enforced in the UI, not at the database or privileged API boundary.
6. The live database cannot be recreated from the repository because production has 53 migration records while the repository contains only 11 migration files.
7. The email-to-warranty endpoint uses an obsolete Resend webhook contract and is not production-functional.

These are launch blockers, not polish items. Warrantee should continue to allow controlled personal use and internal QA, but must not claim enterprise tenant isolation, team collaboration, production email ingestion, live paid extensions, or independent security certification until the relevant gates below pass.

## Scorecard

| Area | Score | Assessment |
| --- | ---: | --- |
| Public website availability | 8/10 | Healthy deployment, redirects, headers, multilingual public routes, and production smoke tests |
| Personal warranty workflow | 7/10 | Core create/read/document/claim paths exist; expiry-state and recipient semantics need correction |
| Company and team workflow | 3/10 | Workspace provisioning and membership authorization are incomplete; approval path is broken |
| Authentication and sessions | 7/10 | Supabase auth, password recovery, callback validation, and profile escalation guard exist |
| Tenant isolation | 3/10 | Database row isolation is partly effective, but Storage and company policies contain critical failures |
| Application security | 4/10 | Strong API token and internal-route foundations, offset by critical data exposure and five high runtime CVEs |
| Database integrity and reproducibility | 3/10 | RLS is widespread, but drift, legacy policies, missing constraints, and user-centric ownership block scale |
| API / CLI / MCP | 8/10 | Useful discovery, docs, scoped tokens, rate limits, and tests; tenant ownership and invalid-scope behavior need work |
| OCR and document intelligence | 4/10 | Multiple providers and guardrails exist; no real accuracy benchmark, model pinning, or robust field extraction |
| File security | 3/10 | Upload validation and quarantine exist, but Storage access bypass and heuristic-only scanning are blockers |
| Billing and extensions | 4/10 | Stripe checkout/webhook foundations exist; Pro price is postponed and extension settlement is incomplete |
| Email and notifications | 4/10 | Outbound foundation and reminders exist; inbound contract is obsolete and reminder recipient logic is wrong |
| Frontend usability | 6/10 | Public mobile and RTL layout are stable; onboarding, accessibility, and company golden path are incomplete |
| Accessibility | 5/10 | Basic semantic structure exists, but labels/headings and cross-browser evidence are incomplete |
| Performance and capacity | 6/10 | Zero load failures at 43 requests/second; p95/p99 latency and large serverless bundles require work |
| Test and release engineering | 6/10 | Broad CI/E2E/security gates exist; test personas, branch protection, and deployment ordering have material gaps |
| Observability | 6/10 | Sentry, release tracking, readiness, analytics, and operational checks exist; current Sentry issue state was not accessible |
| SEO / GEO / AEO / agent readiness | 9/10 | Strong structured discovery, Markdown companions, API catalog, MCP, OpenAPI, sitemap, hreflang, and crawler layer |
| Revenue readiness | 3/10 | No paid users, no completed billing launch, no proven extension transaction, and no self-serve B2B workspace |

## Evidence and Method

The audit did not treat a page load as proof. Evidence included:

- Repository-wide route, schema, migration, workflow, integration, configuration, and test inspection.
- Production CI and security-gate verification on commit `c7be08c`.
- Authenticated disposable-user tenant probes with complete cleanup.
- Supabase RLS, Storage policy, schema, migration, index, and aggregate-count inspection.
- Desktop and 390x844 mobile checks in regular Chrome for English and Arabic routes.
- Production smoke, readiness, agent-discovery, controlled load, and E2E evidence.
- Dependency vulnerability inspection.
- Vercel deployment/runtime inspection.
- DNS email-authentication inspection.
- API, CLI, MCP, OCR, file-processing, billing, notification, analytics, and release-path review.

The audit did not open real customer records or expose personal information. Temporary audit records were removed. Aggregate production state after cleanup was:

- 7 authentication users and 7 profiles.
- 0 companies and 0 company memberships.
- 2 warranties, 1 claim, and 1 warranty document.
- 0 API integration tokens and 0 ingestion jobs.
- 0 users classified by the production QA-cleanliness check as QA identities.

## Architecture Map

### Application

- Next.js 15 App Router with locale-prefixed public and authenticated routes.
- React 19 client components for interactive dashboard workflows.
- Vercel Functions for application APIs, webhooks, OCR, internal jobs, discovery, and document security.
- Cloudflare in front of `warrantee.io`.

### Data and Identity

- Supabase Auth for sessions and password recovery.
- Supabase Postgres for profiles, companies, memberships, warranties, claims, extensions, notifications, ingestion, API tokens, activity, and audit data.
- Supabase Storage for warranty documents and claim attachments.
- RLS is enabled on product tables; selected critical tables use `FORCE ROW LEVEL SECURITY`.

### Integrations

- Stripe for checkout and webhooks.
- Resend for outbound email and intended inbound email.
- Mistral OCR as the primary OCR provider, local PDF extraction, optional Google Vision fallback, and Tesseract fallback.
- Twenty CRM for contacts and leads only.
- Sentry and Vercel for production observability.
- Google Tag Manager or direct GA fallback, plus server-side privacy-safe funnel events.

### Agent and Developer Access

- Authenticated API key creation with hashing, expiry, revocation, scopes, and rate limits.
- CLI and MCP clients.
- Public read-only MCP and agent discovery.
- `llms.txt`, `llms-full.txt`, OpenAPI, API catalog, agent cards, skills, structured data, and Markdown companions.

## Priority Findings

### P0-01 — Cross-user warranty document disclosure

**Severity:** Critical  
**Boundary:** Supabase Storage, privacy, tenant isolation

**Problem**

The live `warranty-documents` bucket contains permissive legacy policies that authorize any authenticated user by bucket name. PostgreSQL permissive RLS policies are combined with OR semantics, so later path-scoped policies do not cancel the broad policies.

**Verified exploit**

A disposable User B successfully listed and downloaded a file uploaded by disposable User A. All temporary records and objects were removed after the test.

**Impact**

Invoices, receipts, certificates, serial numbers, names, addresses, and purchase information can cross user and tenant boundaries. This is a reportable privacy and enterprise-security failure.

**Recommendation**

1. Remove every bucket-only authenticated SELECT/INSERT/UPDATE/DELETE policy.
2. Store objects under an immutable owner or tenant prefix.
3. Authorize each object operation against `auth.uid()` and the authoritative warranty/company relationship.
4. Prefer private buckets and controlled download APIs with short-lived signed URLs.
5. Add a production-safe adversarial Storage test covering list, download, overwrite, and delete.

**Exit gate**

User B must receive no list result and no downloadable URL for User A's object while the owner and authorized company member retain the intended access.

### P0-02 — Cross-user claim attachment disclosure

**Severity:** Critical  
**Boundary:** Supabase Storage, claims, privacy

**Problem**

The `claim-attachments` bucket has the same broad-policy defect as warranty documents.

**Verified exploit**

An unrelated disposable user listed and downloaded another disposable user's claim attachment. Cleanup completed.

**Impact**

Claim evidence can contain identity documents, damage photos, receipts, addresses, and sensitive dispute information.

**Recommendation**

Apply the same private-bucket, owner/tenant-prefix, controlled-download, and adversarial-test correction as P0-01. Claim authorization must derive from the claim's warranty and active tenant membership, not from a caller-supplied path alone.

### P0-03 — Anonymous plaintext company API key disclosure

**Severity:** Critical latent defect  
**Boundary:** Database, API authentication, company data

**Problem**

The live `companies` table includes a plaintext `api_key`, and the live policy `"Anyone can view companies"` allows anonymous reads. A temporary company row containing a marker key was anonymously readable.

**Current exposure**

There are currently zero company rows, so no live company key was present during the audit. The defect becomes exploitable as soon as the first company is created.

**Impact**

An attacker could obtain company credentials and impersonate integrations. Plaintext keys also cannot be safely handled after a database disclosure.

**Recommendation**

1. Remove the legacy `companies.api_key` column after confirming no consumer uses it.
2. Use only `api_integration_tokens` with a one-time visible secret, stored hash, prefix, scopes, owner, expiry, and revocation.
3. Replace anonymous company SELECT with explicit public-company projection if public metadata is required.
4. Add anonymous and unrelated-authenticated RLS tests before permitting company creation.

### P0-04 — Company teammates cannot access company warranties

**Severity:** Critical product defect  
**Boundary:** Authorization, RLS, company workflow

**Problem**

Warranty authorization is based on personal user IDs in `src/lib/warranty-access.ts:1-77` and corresponding live policies. It does not authorize an active member through `issuer_company_id`.

**Verified behavior**

The warranty owner saw the disposable warranty, claim, document, and extension. An active approver in the same disposable company saw zero of all four. An unrelated user also saw zero.

**Impact**

The product cannot deliver the advertised team, approver, or company workflow. Creating workarounds with global roles would introduce tenant leakage.

**Recommendation**

Adopt tenant-first authorization:

- `issuer_company_id` is the authoritative tenant for seller-issued warranties.
- `company_members(company_id, user_id, role, is_active)` is the authorization relationship.
- Personal warranties retain explicit personal ownership.
- Child records inherit access through the parent warranty.
- Every API and RLS policy uses the same centralized access predicate.

Add owner, admin, approver, viewer, inactive-member, and unrelated-tenant tests for every parent and child table.

### P0-05 — Ordinary approval and rejection API is broken

**Severity:** High  
**Boundary:** Approval workflow, database contract

**Problem**

The non-platform-admin branch selects a non-existent warranty column:

- `src/app/api/warranties/[id]/approve/route.ts:79-86`
- `src/app/api/warranties/[id]/reject/route.ts:98-105`

The query includes `company_id`, while the live warranty tenant field is `issuer_company_id`.

**Impact**

Ordinary approvers receive a not-found response and cannot complete the business workflow. Platform-admin E2E coverage concealed the defect.

**Recommendation**

Remove the legacy field, derive company access through active membership, and test approval/rejection with a real non-platform company approver. Approval must be a compare-and-set transition from `pending_approval` to prevent concurrent approvals.

### P0-06 — Claim status can be changed by bypassing the UI

**Severity:** High  
**Boundary:** Authorization, state machine, audit integrity

**Problem**

`src/app/[locale]/dashboard/claims/[id]/page.tsx:134-160` writes claim status directly from the browser. The UI hides controls at line 258 unless the user appears to be an admin, but the database policy authorizes warranty parties broadly.

**Impact**

A buyer or another warranty party can call Supabase directly and bypass the visual role check, set an arbitrary status, and create misleading audit events.

**Recommendation**

1. Remove direct browser status mutation.
2. Create a privileged claim-transition API or security-definer function.
3. Validate actor role, tenant membership, current state, allowed next state, and required reason.
4. Update claim and append the immutable event atomically.
5. Split read, create, and transition policies.

### P0-07 — Live database cannot be reproduced from source

**Severity:** High  
**Boundary:** Disaster recovery, deployment, auditability

**Problem**

Production records 53 applied migrations, while the repository contains 11 migration files. Important legacy tables, columns, policies, functions, and Storage policies therefore cannot be reliably reconstructed or reviewed from source.

**Impact**

A new environment, recovery event, staging database, or ownership handover can produce a materially different security model. The current Storage and company-policy defects are examples of hidden live drift.

**Recommendation**

1. Export a schema-only production snapshot without secrets or customer data.
2. Reconcile every live object against version-controlled migrations.
3. Create a tested clean-room bootstrap.
4. Add CI schema-drift detection.
5. Require migration review and rollback notes for future database changes.

**Exit gate**

A fresh Supabase project created only from repository migrations must match the expected schema, policies, functions, indexes, buckets, and constraints.

### P0-08 — Production can deploy from an unprotected failing main branch

**Severity:** High  
**Boundary:** GitHub, Vercel, release governance

**Problem**

The GitHub main branch is unprotected. CI runs on push, but Production Security Gates run manually and daily, not as a required pre-deployment check. Vercel automatically deploys main.

**Impact**

A failing commit can be deployed before or while CI reports failure. This happened operationally even though the immediate test defect was subsequently fixed.

**Recommendation**

1. Protect main.
2. Require CI and a deployment-safe security suite before merge.
3. Deploy production from an approved commit or promoted preview.
4. Prevent direct pushes except a documented break-glass path.
5. Require migration and rollback confirmation for schema changes.

## High Findings

### P1-01 — Email-to-warranty uses an obsolete Resend contract

**Evidence**

- `src/app/api/ingest/email/route.ts:55-64` expects `resend-signature`.
- `src/app/api/ingest/email/route.ts:473-487` performs a custom hex HMAC.
- The parser expects top-level sender/body/attachment data.

Current Resend receiving uses Svix headers and webhook verification. Received-email content and attachments are retrieved through the Receiving API.

**Impact**

The advertised email-to-warranty path is not compatible with the current provider and lacks standard timestamp/replay verification.

**Recommendation**

Use the official Resend/Svix verification API, consume the nested event contract, fetch content and attachments using the message ID, enforce sender/domain authentication, preserve idempotency on the webhook event ID, quarantine attachments, and test forwarded, duplicated, spoofed, malformed, and multi-attachment emails.

### P1-02 — Team membership role is stored in the wrong place

**Evidence**

- `src/app/api/team/members/route.ts:467-471` inserts a membership without the requested role.
- `src/app/api/team/members/route.ts:479-486` writes the requested role to the global profile.
- Reactivating an existing membership only sets `is_active`.

**Impact**

The member may remain a viewer in the company while receiving a global elevated role that can be interpreted outside the intended tenant.

**Recommendation**

Store role only on the membership, update it during reactivation, remove company authorization from global profile role, and test a user who belongs to two companies with different roles.

### P1-03 — Five high-severity production dependency advisories

**Evidence**

`npm audit --omit=dev` reported five high findings affecting Next.js 15.5.18, PostCSS, sharp/libvips, fast-uri, and brace-expansion. The full audit also reported a development/transitive js-yaml issue.

**Recommendation**

Upgrade Next.js to at least the fixed compatible 15.5 release, refresh locked transitive dependencies, rebuild native `sharp`, and rerun type-check, lint, unit, full E2E, production build, image/OCR paths, and smoke/security gates. Do not use a forced major upgrade without a controlled compatibility pass.

### P1-04 — Company onboarding is not self-service

**Problem**

The current onboarding collects personal preferences. Seller application is lead intake, not company provisioning. Warranty creation defaults to personal ownership and does not establish an issuer tenant.

**Impact**

A B2B prospect cannot create a workspace, issue a company warranty, invite an approver, or complete the promised golden path without operator intervention.

**Recommendation**

After the tenant security foundation is corrected, add one transactional bootstrap that creates a company, owner membership, default settings, and first-warranty context. Keep the initial flow narrow: workspace name, first warranty, certificate, and shareable passport.

### P1-05 — Extension and payment workflow is incomplete

**Problem**

Moyasar payment creation references `/api/payments/moyasar/callback`, but that route is absent. Stripe extension checkout exists, while paid Professional billing remains intentionally postponed. There is no proven production extension purchase and settlement.

**Impact**

The product cannot honestly claim instant extension purchasing or collect the extension revenue loop end to end.

**Recommendation**

Choose one provider for the first production transaction, remove or feature-flag the incomplete provider path, use atomic webhook idempotency and compare-and-set purchase state, reconcile commission/refund/dispute events, and run one controlled real transaction before advertising the feature.

### P1-06 — Webhook idempotency is not atomic

**Problem**

Stripe signature verification exists, but event handling follows a check-then-act sequence. Concurrent duplicate deliveries can both pass the initial check.

**Recommendation**

Claim the event in a unique database row within a transaction before performing business mutations. Use idempotency keys and compare-and-set conditions on purchase/subscription state. Test concurrent duplicate delivery.

### P1-07 — Document scanner overstates malware assurance

**Problem**

`src/lib/server/document-security-baseline.ts` validates extension, MIME, magic bytes, size, hash, and a small set of risky PDF tokens. It is not antivirus, sandboxing, archive inspection, polyglot detection, or signature-based malware scanning.

**Impact**

A file can be labelled `clean` without comprehensive malware inspection.

**Recommendation**

Rename the current result to `baseline_passed`, add a real malware engine or managed scanner before high-risk enterprise use, keep files quarantined until verdict, and document residual limitations accurately.

### P1-08 — Internal document scanner can fetch any HTTPS URL

**Evidence**

`src/app/api/internal/document-security-scan/route.ts:16-24` validates only HTTPS. Lines 41-42 follow redirects.

**Impact**

If the internal bearer token is compromised or misused, the endpoint becomes a constrained SSRF fetcher.

**Recommendation**

Allowlist the exact Supabase Storage hostname, bucket path, and signed-URL shape. Resolve and reject private/link-local IPs, disallow cross-host redirects, cap time and bytes while streaming, and log only non-sensitive metadata.

### P1-09 — OCR is not validated against real documents

**Problem**

The private corpus contains 12 text fixtures, including items named as scans and PDFs. `qa:ocr-corpus` checks structure and metadata but does not call OCR, compare extracted fields, or calculate accuracy.

**Impact**

Passing the check provides no evidence that invoices, receipts, poor scans, Arabic documents, or corrupted PDFs work.

**Recommendation**

Create a private, consented, de-identified corpus of real images and PDFs. Record expected fields, run each supported provider, and report exact match, normalized match, field precision/recall, date/currency accuracy, failure rate, latency, and cost. Define minimum launch thresholds and human-review thresholds.

### P1-10 — OCR model and extraction are not reproducible or robust

**Problem**

The Mistral default `mistral-ocr-latest` is mutable. Field extraction relies on regex and position assumptions. The first detected dates can become start/end dates, confidence uses fixed additive weights, Hijri/ambiguous dates are not resolved, multiple invoices are not segmented, and PDFs are capped at five pages.

**Recommendation**

Pin a tested model version, store provider/model/prompt/parser versions per extraction, separate OCR from structured extraction, add locale-aware date/currency parsing, support multi-document segmentation, calibrate confidence, and require human review below field-specific thresholds.

### P1-11 — OCR and document processors need explicit data-governance controls

**Problem**

Customer document content can be sent to Mistral or Google without a per-workspace provider/data-residency control visible in the product model.

**Recommendation**

Document subprocessors and retention terms, obtain the required consent, offer provider/region controls for enterprise customers, minimize document retention, and record which processor handled each job. Do not promise Saudi or GCC residency without verified infrastructure.

## Medium Findings

### P2-01 — Invalid API scopes silently become full access

**Evidence**

`src/lib/api-v1.ts:80-86` returns every API scope when input is absent, invalid, or empty.

**Impact**

A malformed least-privilege token request can become a full-scope token.

**Recommendation**

Reject invalid scopes. Require an explicit scope list and apply the smallest documented UI default. Add tests for missing, empty, mixed-validity, duplicate, and unknown values.

### P2-02 — Public verification exposes more data than required

**Evidence**

`src/app/api/v1/warranties/verify/route.ts:6-7` exposes serial number, seller name, certificate URL, timestamps, and other fields. Lookup accepts UUID, reference, or serial.

**Impact**

Serials and direct certificate URLs can disclose or facilitate correlation beyond the minimum authenticity proof.

**Recommendation**

Define a public proof contract, remove direct object URLs, route certificates through a controlled endpoint, redact or mask serials unless explicitly required, and present active/expired/revoked state consistently.

### P2-03 — Expiry reminders target the creator before the buyer

**Evidence**

`src/lib/server/expiry-reminders.ts:27-29` prefers `created_by`, then `user_id`, before `recipient_user_id` and `buyer_id`.

**Impact**

For seller-issued warranties, the reminder can go to the operator who created the record instead of the customer whose coverage expires.

**Recommendation**

Define separate recipient roles: buyer reminder, issuer operational notification, and account owner summary. Test seller-issued, buyer-owned, transferred, missing-email, opted-out, and multilingual cases.

### P2-04 — Stored warranty status does not automatically expire

**Problem**

The public passport computes effective expiry, but no verified process transitions the stored warranty status when the end date passes.

**Impact**

Dashboards and APIs can report `active` after expiry while the passport reports expired.

**Recommendation**

Use one canonical derived-status function or a reliable scheduled transition with an audit event. Apply it consistently to dashboard queries, API responses, certificates, claims, and verification.

### P2-05 — Weak production Content Security Policy

**Evidence**

`next.config.ts:10-15` includes `unsafe-inline` and `unsafe-eval` and permits third-party analytics domains.

**Impact**

The policy offers reduced protection against script injection.

**Recommendation**

Adopt nonce- or hash-based scripts, remove unused third parties, separate development allowances, and report CSP violations before enforcement.

### P2-06 — Unused tracking expands privacy and security surface

**Problem**

The locale layout can load GTM, GA fallback, Meta Pixel, and Hotjar. Analytics routing avoids GA/GTM double counting, but pre-revenue trackers create consent, policy, performance, and supply-chain obligations.

**Recommendation**

Retain only tools actively used for decisions. Remove Meta Pixel and Hotjar until a documented experiment requires them. Verify consent gating and deletion/retention obligations.

### P2-07 — Hard-coded location and social metadata require factual verification

**Problem**

The locale layout includes hard-coded Riyadh coordinates and a Twitter creator identity.

**Impact**

Unverified entity data can damage search trust and conflate the brand.

**Recommendation**

Verify ownership and physical location. Remove coordinates and social identities that cannot be proven. Never invent a registered office, certification, or social account for schema completeness.

### P2-08 — Missing database constraints on financial and attachment state

**Problem**

Extension price, commission, currency, purchase-state, and date relationships lack sufficient database checks. Claim attachment metadata lacks integrity checks for size/type/hash/security state.

**Recommendation**

Add additive constraints after profiling existing data. Use integer minor units for money, controlled currency codes, valid commission range, immutable purchase facts, valid dates, positive file size, and valid scan-state transitions.

### P2-09 — Tenant-first composite indexes are missing

**Problem**

The schema is user-centric and lacks the composite access indexes required by the intended company model, such as `(issuer_company_id, status, created_at desc)`.

**Recommendation**

After the tenant model is settled, add indexes from measured query plans. Do not remove existing indexes merely because pre-revenue usage marks them unused.

### P2-10 — Event tables need retention and partition strategy

**Problem**

Activity, API usage, ingestion, notification, and audit events will grow faster than warranty records. The current database already contains substantial synthetic activity relative to two remaining warranties.

**Recommendation**

Define immutable audit retention separately from operational telemetry, archive or aggregate old operational events, and partition high-volume append-only tables by time and tenant before 100 million assets.

### P2-11 — Controlled load latency needs improvement

**Evidence**

The production check completed 2,009 requests at approximately 43.28 requests/second with zero failures. Latency was approximately p50 164.5 ms, p95 1,063.9 ms, p99 1,630.7 ms, maximum 2,671.2 ms.

**Recommendation**

Trace the slowest route groups, separate cold-start from warm latency, reduce serverless bundle duplication, cache public discovery and verification safely, optimize tenant indexes, and add authenticated write/load scenarios.

### P2-12 — Serverless bundles are unnecessarily large

**Evidence**

The main Vercel function output was approximately 7.65 MB, agent Markdown routes approximately 5.37 MB each, and OCR approximately 31.45 MB.

**Recommendation**

Serve generated public companions as static assets where possible, avoid bundling the same corpus into multiple functions, and isolate OCR dependencies. Re-measure cold starts and deployment size.

### P2-13 — Accessibility labels and headings are incomplete

**Verified behavior**

The Arabic signup page exposed inputs without programmatic labels. Several authenticated index pages lacked a clear `h1` in the mobile DOM.

**Recommendation**

Connect every label with `htmlFor`/`id`, add accessible names to icon controls, establish one page-level heading, test keyboard/focus/error announcements, and run automated plus manual EN/AR accessibility checks.

### P2-14 — Password reset lacks an explicit invalid-session recovery state

**Positive evidence**

Forgot-password, reset-password, and safe callback routing exist.

**Problem**

Expired or invalid recovery sessions fall into generic failure behavior.

**Recommendation**

Show a dedicated expired-link state with a direct action to request a new email, while preserving generic wording that does not reveal account existence.

### P2-15 — Enterprise contact routing is inconsistent

**Problem**

Pricing routes Enterprise prospects to contact, while at least one public enterprise CTA routes to signup.

**Recommendation**

Choose one intent-based route: self-serve tiers to signup and enterprise procurement/security needs to a qualified contact path. Preserve campaign attribution through Twenty CRM.

### P2-16 — Claims index uses a client-only redirect spinner

**Problem**

The localized claims index redirects after client rendering.

**Impact**

Users see an avoidable loading state, navigation is slower, and no-JavaScript behavior is weaker.

**Recommendation**

Use a server redirect for static route aliases.

### P2-17 — Browser and language E2E coverage is too narrow

**Problem**

The test suite primarily uses Chromium/mobile Chrome and English. There is no equivalent authenticated Arabic journey or WebKit/Safari and Firefox project coverage.

**Recommendation**

Add a compact release matrix: Chromium desktop, mobile Chrome, WebKit mobile/desktop for critical paths, Firefox smoke, and authenticated Arabic RTL golden paths.

### P2-18 — E2E personas hide authorization defects

**Problem**

Operational E2E uses a platform/admin QA account. This bypassed the ordinary approver path and did not exercise real company-member authorization.

**Recommendation**

Create deterministic disposable owner, approver, viewer, buyer, inactive member, and unrelated-tenant personas. Assert both successful access and denied direct database/API access. Always clean them.

### P2-19 — Local operational readiness is not self-contained

**Problem**

The local readiness command requires disposable QA credentials to already exist. GitHub creates them first, but the local command does not.

**Recommendation**

Provide one safe wrapper that creates a uniquely marked QA identity, runs the suite, cleans all artifacts in `finally`, and verifies cleanliness. Keep destructive scope restricted to cryptographically or structurally marked QA data.

### P2-20 — External penetration test is still outstanding

**Problem**

The repository's pentest-readiness command validates a packet and prerequisites. It is not an independent penetration test.

**Recommendation**

Complete a scoped third-party test after P0 tenant and Storage fixes, covering auth, RLS, Storage, API keys, webhooks, file/OCR, MCP/API, admin boundaries, and abuse controls. Retest remediations.

### P2-21 — Sentry active-issue state was not independently verified

**Problem**

Production release integration and previous notifications exist, but the configured Gmail connector required reauthentication during this audit. No conclusion should be inferred from an empty connector result.

**Recommendation**

Restore authorized Warrantee-only alert access or use the Sentry API with a least-privilege token. Add active unresolved issue count and last-event time to the operational handover.

### P2-22 — Email authentication is monitoring-only at the root

**Evidence**

DKIM and sending-subdomain SPF/MX records exist. Root DMARC is `p=none`.

**Recommendation**

Review aggregate DMARC reports, align sending domains, then progress carefully to `quarantine` and `reject`. Do not enforce before legitimate senders are confirmed.

### P2-23 — Expiry copy advertises an unavailable extension path

**Problem**

Reminder messaging encourages users to review extension options while no production extension purchase has been proven.

**Recommendation**

Use factual reminder copy until extension purchasing passes a controlled real transaction.

### P2-24 — Edge build contains a Supabase Node-API compatibility warning

**Evidence**

The clean production build completed, but Next.js warned that `@supabase/supabase-js` references `process.version`, which is not supported in the Edge Runtime. The trace originates from the `@supabase/ssr` export graph used by `src/middleware.ts:1` and the middleware auth client at lines 202-230.

**Current impact**

The production middleware and authenticated routes passed current smoke and E2E checks, so this is not a confirmed active outage. It remains a runtime-upgrade and dead-code-elimination risk, particularly because a separate Edge/Node API mismatch previously reached Sentry.

**Recommendation**

Upgrade to compatible patched Supabase packages, confirm the edge bundle no longer imports browser-only exports, and add an authenticated production middleware check to the release gate. Treat any recurrence in Sentry as a release blocker.

## Journey Audit

| Journey | Status | Finding | Required gate |
| --- | --- | --- | --- |
| Landing to signup | Operational | Public routes and locale behavior load; acquisition has not produced real onboarding | Track qualified source to completed activation |
| Login/session | Operational | Auth boundary and redirects work | Add cross-browser session tests |
| Forgot/reset password | Mostly operational | Invalid/expired recovery needs a dedicated state | Full email-link-recovery E2E |
| Personal onboarding | Operational but shallow | Preferences only; no guided first-warranty activation | Same-session first warranty and certificate |
| Company onboarding | Not operational | No self-serve company/workspace bootstrap | Tenant security first, then atomic workspace creation |
| Manual warranty creation | Operational for personal path | Company issuance context is not established | Owner/company/buyer matrix |
| Bulk import | Exists | Requires deeper validation and tenant tests | Duplicate, partial failure, locale, and rollback tests |
| Document upload | Blocked for launch | Validation/quarantine exist; Storage RLS leaks objects | P0-01 and malware assurance gate |
| OCR scan | Technically available, not quality-proven | No real corpus metrics; model/extraction drift | Real multilingual benchmark |
| Approval/rejection | Broken for ordinary approver | Non-existent column and missing membership authorization | Non-platform approver E2E |
| Claim creation | Exists | Direct client transitions permit role bypass | Privileged state machine |
| Claim evidence | Blocked for launch | Cross-user Storage disclosure | P0-02 |
| Extension purchase | Not production-proven | Provider path inconsistency and no real transaction | One chosen provider and reconciliation test |
| Subscription upgrade | Postponed | Stripe Pro price not finalized | Owner decision and real controlled purchase |
| Seller/team onboarding | Not operational | Lead intake exists; team role and access model are broken | Tenant/member refactor |
| Public verification | Operational with privacy review | Fast mobile path; excessive proof fields and state inconsistency | Reduced proof contract |
| Certificate | Exists | Must be verified after tenant/public exposure changes | EN/AR PDF and QR permanence regression |
| API key generation | Operational for personal access | Invalid scopes expand; ownership is not tenant-based | Explicit scopes and tenant token owner |
| CLI | Operational foundation | Inherits API ownership model | Company-scoped integration tests |
| MCP | Strong discovery/foundation | Private calls inherit API ownership model | Company-scoped auth and tool tests |
| Admin ingestion | Not operational with current Resend | Obsolete webhook contract | Current Resend event E2E |
| Notifications | Partly operational | Recipient and expired-state semantics are wrong | Buyer/issuer matrix |
| CRM lead sync | Operational for contacts/leads | Warranty/claim/document/payment sync intentionally absent | Keep data minimization boundary documented |

## Database and Scale Assessment

### 100,000 warranties

The current service can likely support this order of magnitude after P0 policy repair, with correct tenant composite indexes, cursor pagination, async document/OCR processing, and query-plan monitoring. User-centric OR predicates will already create avoidable overhead.

### 1 million warranties

Required changes:

- Tenant-first ownership and composite indexes.
- Asynchronous OCR, email ingestion, PDF generation, and bulk imports.
- Queue retries, dead-letter handling, and idempotency.
- Cursor pagination and bounded exports.
- Operational event retention and aggregation.
- Read replicas or workload isolation based on measured load.
- Search strategy for reference, serial, seller, and product fields.

### 100 million warranties/assets

The current architecture is not ready for this scale. Required evolution includes:

- Partitioned asset/event tables using tenant and time strategy.
- Explicit regional/data-residency model.
- Durable queue/event architecture with replay and idempotency.
- Separate operational database, analytics warehouse, and search index.
- Materialized/read-model projections for dashboards and reliability intelligence.
- Archive/object-lifecycle policies.
- Tenant quotas, noisy-neighbor controls, and enterprise observability.
- Tested backup, PITR, regional recovery, and restore objectives.

Do not introduce this complexity pre-revenue. First fix correctness and tenant isolation, then scale against measured customer usage.

## OCR and Machine-Learning Readiness

### Current strengths

- Mistral-first OCR with local PDF extraction and optional provider fallback.
- Authenticated endpoint, request limits, size/text caps, timeouts, and telemetry.
- Baseline document validation and quarantine flow.
- Extraction review is conceptually supported rather than blindly committing every result.

### Current gaps

- No real document accuracy benchmark.
- Mutable provider model.
- Regex-heavy field extraction.
- No calibrated per-field confidence.
- Weak multi-document and multi-page handling.
- Limited Arabic/Hijri/date/currency semantics.
- No provider drift alert.
- No explicit enterprise processor/residency controls.
- Serverless Tesseract fallback can create CPU, memory, and timeout pressure.
- No durable asynchronous job orchestration for large batches.

### Launch recommendation

Treat OCR as an assisted draft, not an autonomous source of truth. A user must confirm identity, dates, serial, seller, and coverage before issuance until the private corpus meets approved field-level thresholds.

## Security Threat Summary

### Critical assets

- Warranty documents and claim evidence.
- Buyer identity/contact data.
- Company integration tokens.
- Warranty/claim/extension state.
- Certificates and public verification.
- OCR-extracted purchase and product data.
- Admin and service-role credentials.

### Principal attack paths

1. Authenticated cross-user Storage access.
2. Anonymous company/API-key read.
3. UI-only authorization bypass.
4. Cross-tenant role confusion.
5. Forged/replayed inbound email.
6. File/parser and signed-URL abuse.
7. Public identifier enumeration and overexposure.
8. Dependency exploitation.
9. Webhook duplicate race.
10. Direct-to-production failing commit.

### Existing effective controls

- RLS is enabled broadly and unrelated product-row probes were denied.
- Profile self-update guard prevented role/account-type escalation.
- API token secrets are hashed and support scope, expiry, revocation, and rate limits.
- Internal routes require bearer authentication.
- Stripe webhook signature validation exists.
- No committed secrets were found.
- Loopback/localhost production-link guard passed.
- Production rate limiting fails closed when Redis is required.
- Security headers and controlled load gates are present.

## UX, Mobile, RTL, and Brand Findings

No visual changes were made.

Verified public EN/AR pages at desktop and 390x844 mobile did not show horizontal overflow or broken images. Arabic direction and language metadata were correct. The remaining issues are functional and semantic:

- Arabic authentication form labels need proper programmatic association.
- Authenticated index pages need consistent page-level headings.
- Company onboarding lacks a coherent first-session story.
- Team and approval promises exceed current capability.
- Enterprise CTA routing is inconsistent.
- The public verification result should communicate actual active/expired/revoked state.
- Error and empty states need role-specific recovery actions.
- Claims alias routing should be server-side.

The correct first-session golden path is:

1. Create personal or company workspace.
2. Create one warranty.
3. Confirm OCR fields if a document was used.
4. Generate the certificate.
5. Open the QR passport.
6. Send/share it.

Everything else should be progressively disclosed after activation.

## Infrastructure and Operational State

### Passed

- Latest GitHub CI passed type-check, lint, unit tests, production build, agent gate, and 100 E2E tests; 2 tests were skipped.
- Latest Production Security Gates passed smoke, RLS probe, readiness, operational E2E, load, and QA cleanup.
- Vercel production deployment is `READY`.
- Production smoke and agent-readiness checks passed.
- 17 JSON and 6 text agent-discovery endpoints passed their production check.
- Controlled load produced zero request failures.
- `api.warrantee.io` is intentionally absent; the canonical API remains under `warrantee.io/api`.
- Production QA-cleanliness check found no persistent QA identity after cleanup.

### Not proven

- Independent penetration test.
- Successful real paid Professional purchase.
- Successful real warranty extension purchase, refund, and dispute.
- Current Resend inbound email.
- Real OCR accuracy and cost.
- Current unresolved Sentry issue count.
- Clean-room database restoration.
- Backup/PITR restore drill.
- Safari/WebKit and Firefox authenticated journeys.
- Enterprise tenant isolation after the required redesign.

## Release Plan

### Tranche 1 — Stop data exposure and unsafe releases

1. Remove broad Storage policies and add adversarial object tests.
2. Remove plaintext company API key and replace anonymous company policy.
3. Protect main and require checks before production deployment.
4. Upgrade vulnerable production dependencies.

### Tranche 2 — Repair company authorization

1. Define personal versus company ownership.
2. Implement tenant-first membership roles.
3. Rewrite warranty and child-table RLS from one shared access model.
4. Fix approval/rejection.
5. Move claim transitions behind a privileged atomic state machine.
6. Add multi-persona, multi-tenant E2E and direct database probes.

### Tranche 3 — Restore reproducibility and integration correctness

1. Reconcile all production migrations and create a clean-room bootstrap.
2. Replace inbound email with the current Resend contract.
3. Correct expiry recipient/state semantics.
4. Harden document scanner fetch and clarify scanner assurance.
5. Make API scope handling fail closed.

### Tranche 4 — Prove quality and revenue workflows

1. Build and run the real OCR corpus.
2. Select and prove one extension payment provider.
3. Finalize paid billing only when the owner resumes it.
4. Add company self-service onboarding.
5. Complete independent pentest and remediation retest.
6. Re-run full browser, performance, accessibility, RTL, and production gates.

## Required Handover Gates

Warrantee can move from **NOT READY** to **READY WITH KNOWN RISKS** only when:

- Both Storage cross-user probes are denied.
- Anonymous and unrelated users cannot read private company data or credentials.
- Same-company authorized roles can access only intended company records.
- Ordinary approver and claim state-machine tests pass.
- Production schema is reproducible from source.
- Main is protected and production deployment is gated.
- High production dependency advisories are resolved or formally accepted.
- Inbound email is either fixed and tested or removed from public claims.
- OCR is clearly marked assisted until benchmark thresholds pass.
- The independent pentest is completed after the tenant/security repair.

## Go / No-Go

### Go

- Public marketing and educational pages.
- Public agent/AI discovery.
- Controlled personal warranty use with non-sensitive documents.
- Internal QA using disposable, verified-clean identities.
- API/CLI/MCP demonstrations that do not imply company tenant collaboration.

### No-go

- Uploading real sensitive customer documents before Storage policies are fixed.
- Creating live companies while anonymous company policy and plaintext `api_key` remain.
- Selling team collaboration or approval workflows as operational.
- Allowing buyers or issuers to rely on current claim transition authorization.
- Advertising email-to-warranty as live.
- Advertising instant warranty-extension purchasing.
- Claiming independent penetration-test, full antivirus, enterprise isolation, or regional data-residency assurance.

## Final Recommendation

Do not add more product surface yet. The best path is to reduce risk and make the existing promise true:

1. Protect documents.
2. establish one tenant model,
3. make one company workflow work for real people,
4. make the database reproducible,
5. prove the assisted OCR and payment paths,
6. then resume acquisition.

The strongest parts of Warrantee are its public technical foundation, agent readiness, API ergonomics, multilingual structure, and broad automated checks. The weakest parts are exactly where enterprise buyers will look first: tenant authorization, private files, database governance, release gating, and proof that business workflows work for ordinary non-admin users. Correcting those boundaries will create more value than adding another feature.
