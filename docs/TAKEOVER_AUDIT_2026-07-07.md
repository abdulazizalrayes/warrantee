# Warrantee Takeover Audit - 2026-07-07

Scope: Warrantee only (`warrantee.io` and this repository). This audit covered frontend, backend, API, portal/authenticated routes, database/RLS posture, integrations, CLI/MCP/agent discovery, production readiness, security, UX, mobile/RTL behavior, performance, and operational handover risks.

This audit was evidence-based. It used local repository review, automated checks, production smoke/readiness probes, production E2E workflows, Supabase/RLS probes, regular Chrome browser spot checks, and static code inspection. It was not a replacement for an independent third-party penetration test.

## Executive Verdict

Warrantee is ready for controlled production operation.

It should not yet be described as fully enterprise-handover complete until the remaining handover risks are closed:

1. Local authenticated E2E repeatability needs hardening.
2. The homepage embedded pricing CTA path loses campaign attribution and signup intent.
3. The private real-document OCR regression corpus is still missing.
4. Formal third-party penetration testing still needs external execution and signoff.
5. Performance/chunk-size work remains an optimization priority for a more polished enterprise portal.

Production itself is healthy based on the July 7 checks: CI, production smoke, operational readiness, production business E2E, production operational E2E, RLS probe, agent-readiness validation, and public/protected route tests passed.

## Evidence Run

### Repository And Build

- `npm ci` passed after repairing a corrupted local `node_modules` install.
- `npm run lint` passed.
- `npm run type-check` passed.
- `npm test` passed: 22 files, 129 tests.
- `npm audit --audit-level=high` passed: 0 vulnerabilities found.
- `npm run build` passed: 191 static pages generated.
- `npm run guard:loopback` passed.
- `npm run qa:growth-readiness` passed.
- `npm run qa:agent-readiness` passed against `https://warrantee.io`.

### Production Readiness

- `npm run smoke:prod` passed against `https://warrantee.io`.
- `npm run readiness:operational` passed against production.
- `npm run security:rls-probe` passed: anonymous reads to protected business tables were denied.
- `npm run qa:pentest-readiness` passed, meaning vendor packet readiness exists, not that a third-party pentest has been executed.
- `npm run qa:ocr-corpus` passed for the synthetic corpus.
- `npm run qa:ocr-corpus:private` failed as expected because approved private OCR fixtures are not present.

### Browser And E2E

- Public/protected/SEO Playwright suite passed: 30/30 tests.
- Production authenticated shell suite passed: 8/8 tests.
- Production business E2E passed on desktop and mobile.
- Production operational E2E passed, including bulk import, approval/rejection, document upload, payment checkout, OCR, and team guardrails.
- Regular Chrome was used for live spot checks on `/en`, `/en/pricing`, `/ar/pricing`, `/en/api-docs`, and `/en/dashboard`.
- Browser checks found no console errors or horizontal overflow on the checked public pages.
- Arabic pricing served `lang="ar-SA"` and `dir="rtl"` correctly.
- API docs clearly state "API / CLI / MCP Guide" and "Sign in to generate a key."

### CI And Production Gates

- GitHub `CI` latest inspected run passed for commit `fe74650`.
- Latest visible `Production Security Gates` run passed for commit `0ac8625`.
- Current local branch at audit time: `main`.

## Architecture Summary

- Framework: Next.js App Router with localized `/en` and `/ar` routes.
- Auth: Supabase Auth with middleware-protected app routes and server-side API authorization.
- Database: Supabase Postgres with RLS migrations covering warranties, documents, claims, extensions, profiles, team/company structures, integration tokens, usage events, subscriptions, security scan status, and retention controls.
- Core product: warranty registration, documents, OCR, claims, approvals, warranty extensions, notifications, seller/admin flows, public verification, billing, API/CLI/MCP, and asset intelligence.
- Integrations: Supabase, Stripe, Resend, HubSpot, Mistral OCR, Sentry, Vercel Analytics/Speed Insights, Google Search Console assets, IndexNow, GitHub Actions, Vercel deployment.
- Agent surfaces: `/llms.txt`, `/llms-full.txt`, `/.well-known/agent-card.json`, `/.well-known/mcp.json`, `/.well-known/mcp/server-card.json`, `/.well-known/api-catalog`, `/openapi.json`, public data files, hosted MCP, CLI package, and API docs.

## Key Findings

### 1. Production Is Healthy, But Local Authenticated QA Is Not Fully Repeatable

Severity: High for handover, Low for current production availability.

Problem: Local authenticated E2E runs can fail before the tests start because multiple Playwright jobs build/start the app concurrently and collide in `.next/cache`. Evidence included webpack cache `ENOENT rename` and `Unexpected end of JSON input` errors.

Why it matters: A future operator should be able to reproduce the full QA suite locally without wondering whether failures are product bugs or build-cache races.

Exact areas:

- `playwright.config.ts:20` uses `fullyParallel`.
- `playwright.config.ts:23` uses multiple workers in CI/local.
- `playwright.config.ts:34-40` starts `npm run build && PORT=... npm run start` unless `E2E_BASE_URL` is set.

Recommendation: Add a documented sequential local full-QA command for authenticated suites, or adjust local Playwright projects so only one built server is used. Keep production E2E using `E2E_BASE_URL=https://warrantee.io`, which passed.

Verification target: local authenticated shell, business, and operational E2E pass in one repeatable command without `.next/cache` errors.

### 2. Payment Create Route Reads Provider Env At Module Scope

Severity: Medium.

Problem: Local operational E2E against a local built server returned `503 {"error":"Stripe not configured"}` while production readiness and production operational E2E confirmed Stripe is healthy. The payment route reads provider env values at module import time, which is brittle for Next.js runtime/server startup behavior.

Why it matters: This creates false-negative local handover failures and can make future environment changes harder to reason about.

Exact areas:

- `src/app/api/payments/create/route.ts:8-9`
- `src/app/api/payments/create/route.ts:224-226`

Recommendation: Read `STRIPE_SECRET_KEY` and `MOYASAR_SECRET_KEY` inside the request path or a small runtime getter, not at module scope. Add a targeted unit or route test proving a sourced local env is honored.

Verification target: local operational E2E payment checkout passes against a local built server with sourced env, and production readiness still passes.

### 3. Homepage Embedded Pricing CTAs Lose Attribution And Signup Intent

Severity: Medium-High for growth analytics and conversion.

Problem: The homepage hero CTAs preserve campaign/referral context, but embedded pricing and bottom CTA links use plain auth URLs. That drops UTM/ref metadata and lands users on generic auth instead of a clear signup intent.

Why it matters: Warrantee is currently trying to diagnose onboarding and conversion. Losing attribution on key CTAs makes analytics noisier and can reduce signup completion.

Exact areas:

- `src/app/[locale]/page.tsx:430-439`
- `src/app/[locale]/page.tsx:466-472`

Recommendation: Use the existing tracked/campaign-preserving link pattern and route these CTAs to signup intent, such as `/${locale}/auth?tab=signup`, while preserving current styling.

Verification target: browser click test confirms UTM/ref persists from homepage pricing CTA to auth, and no visual layout change occurs.

### 4. Private OCR Corpus Is Still Missing

Severity: High for enterprise confidence, Medium for current launch.

Problem: Synthetic OCR tests pass, but the private real-document gate intentionally fails because `tests/fixtures/ocr-corpus/private/manifest.json` is missing.

Why it matters: Synthetic OCR coverage cannot prove robustness for poor scans, real Arabic/English receipts, multi-invoice PDFs, corrupted PDFs, handwriting, seller-specific formats, and fraud attempts.

Recommendation: Collect approved, redacted private samples under the ignored private corpus folder and run `npm run qa:ocr-corpus:private` before enterprise/government claims about OCR reliability.

Verification target: private OCR corpus gate passes with approved fixtures and no private data committed.

### 5. Formal Third-Party Pentest Is Still External

Severity: High for enterprise/government handover, Medium for controlled production.

Problem: Internal security gates, RLS probes, rate-limit checks, webhook checks, and readiness scripts pass. The project also has pentest readiness docs. But an independent third-party OWASP/API/multi-tenant pentest has not been executed and signed.

Why it matters: Enterprise customers, government buyers, and regulated partners will expect external assurance.

Recommendation: Execute the prepared pentest scope with an independent vendor, then track and fix validated findings before claiming enterprise-grade security assurance.

Verification target: signed report, remediation record, and passing retest.

### 6. Performance Needs A Focused Portal Chunk Pass

Severity: Medium.

Problem: The build passes, but reported sizes are not tiny:

- First Load JS shared by all: 189 kB.
- Admin route first-load JS: around 282 kB.
- Several dashboard/settings/pricing routes: around 270-276 kB.
- Middleware: 182 kB.
- Build warnings reported large serialized webpack strings.

Why it matters: Buyers often experience SaaS quality through perceived speed. Bigger chunks and middleware can also increase future maintenance cost.

Recommendation: Lazy-load admin/dashboard-only components, review large dependency imports, keep marketing pages light, and avoid dragging portal/admin code into public surfaces.

Verification target: reduced first-load JS on public pages and admin/dashboard routes without changing UX.

### 7. Edge Runtime Warning Should Be Cleaned Up

Severity: Low-Medium.

Problem: Build emits a Supabase warning about using `@supabase/supabase-js` in an Edge Runtime path and notes that Edge runtime disables static generation for affected pages.

Why it matters: It is not breaking production, but warning noise makes future incidents harder to triage and can hide meaningful runtime/config issues.

Recommendation: Identify the Edge import path and ensure Edge code only imports Edge-safe helpers, or explicitly move the route to Node runtime when needed.

Verification target: build warning removed or documented as intentional with route-specific reason.

### 8. Local Env Loading Is Easy To Misuse

Severity: Medium for handover.

Problem: `npm run qa:e2e-env` initially failed until `.env.production.local` and `.env.local` were explicitly sourced in the shell.

Why it matters: Handover operators can misinterpret a missing shell env as a broken product.

Recommendation: Add a documented local QA command that loads ignored env files safely, or update the E2E env check script to load local env through the same env loader used by Next/Vercel workflows.

Verification target: local QA credential check passes from a documented command without exposing secrets.

## Security Review

### Passing Evidence

- `npm audit --audit-level=high` found 0 vulnerabilities.
- `npm run security:rls-probe` passed: anonymous access denied to protected tables.
- Production readiness confirms Redis-backed rate limiting is configured and required in production.
- Protected API endpoints reject unauthenticated requests in production smoke.
- Stripe webhook rejects unsigned requests.
- API v1 uses scoped tokens, hashed token storage, metering, and bearer/x-api-key auth patterns.
- Public API/CLI/MCP docs do not ask integrators for usernames/passwords.
- Security headers and CSP are enforced in production readiness.
- Loopback guard passed.

### Security Risks To Keep Watching

1. Public verification lookup must remain tightly rate-limited to reduce enumeration risk.
2. `getClientIp` trusts standard forwarded headers; acceptable behind Vercel/trusted proxy, but abuse-sensitive code should continue to prefer platform-provided request metadata where possible.
3. Admin/role logic should continue avoiding `user_metadata` for authorization decisions. Current inspected use of `user_metadata` is display-oriented, not auth-oriented.
4. JSON-LD and controlled script injection points should stay limited to generated metadata and vetted analytics snippets.
5. External pentest remains the main missing assurance layer.

## Database And Multi-Tenancy Review

### Passing Evidence

- RLS probe denied anonymous access to profiles, warranties, warranty documents, warranty claims, extensions, notifications, seller invitations, and provisional warranties.
- Migrations include operational hardening for integration tokens, subscription state, API usage, document security status, token scopes, and data retention.
- Production readiness verifies Supabase connectivity and protected retention endpoint behavior.

### Remaining Risks

1. Enterprise/government rollout will eventually need stronger explicit workspace/organization controls, invite acceptance, auditability, and retention/legal-hold posture.
2. At 100k-1M warranties, query shape and indexes need ongoing profiling around dashboards, claims, documents, public verification, and analytics.
3. At 100M assets, the current architecture will need partitioning/archival strategy, search/indexing strategy, async workflows, and intelligence aggregation pipelines.

## Product And UX Review

### Passing Evidence

- Public pages checked in Chrome had no console errors or horizontal overflow.
- Arabic pricing served correct RTL metadata.
- API docs clearly position API / CLI / MCP.
- Protected routes redirect unauthenticated users in automated tests.
- Authenticated production shell routes passed for dashboard, warranties, claims, extensions, documents, notifications, settings, team, and seller.

### Main UX Risks

1. Homepage embedded pricing CTAs do not preserve campaign attribution or signup intent.
2. Onboarding movement depends on real traffic quality; current technical tracking is stronger than proof of market conversion.
3. The product is technically broad; continued copy discipline is needed so buyers understand "warranty reminders as acquisition, asset intelligence as product."

## Integration Review

### Passing Evidence

- Stripe configured in production readiness.
- Stripe Checkout passed in production operational E2E.
- Stripe webhook rejects unsigned requests.
- Mistral OCR is active production provider.
- Resend, HubSpot, document security scanner, Supabase, and retention checks passed in operational readiness.
- Agent-readiness validation passed for JSON/text endpoints.
- Public MCP/OpenAPI/agent files are reachable and aligned.

### Remaining Risks

1. Local payment route env handling should be fixed to avoid false-negative local tests.
2. Private OCR corpus remains missing.
3. Sentry/Gmail monitoring should continue through scheduled watch or manual review after releases.
4. Real external traffic and campaign attribution need continued measurement after distribution starts.

## SEO / GEO / AEO / Agent Readiness

### Passing Evidence

- `npm run qa:agent-readiness` passed against production.
- Public discovery files and API/CLI/MCP docs are available.
- `npm run qa:growth-readiness` passed.
- Chrome confirmed API docs message: agents/integrators generate scoped keys after sign-in, not shared passwords.

### Remaining Risks

1. Search Console notices can lag reality; continue checking exact affected URLs before code changes.
2. Content depth and language expansion are strategic growth work, not pure technical readiness.
3. Agent/crawler analytics should be reviewed after enough real visits accumulate.

## Performance Review

Production smoke/readiness passed, but the build output shows clear optimization opportunities. The biggest near-term win is to keep public marketing pages lean and defer portal/admin/dashboard functionality until it is actually needed by signed-in users.

Recommended checks for the next performance pass:

- Bundle analyzer for public vs portal chunks.
- Lighthouse/WebPageTest/Core Web Vitals on `/en`, `/en/pricing`, `/en/api-docs`, `/en/auth`, and authenticated dashboard.
- Review middleware size and imports.
- Split admin-only dependencies.
- Confirm no agent/SEO data payloads are inflating public page JS.

## Handover Priority List

### Must Fix Before Enterprise Handover

1. Add a repeatable local authenticated full-QA command or make local authenticated E2E sequential.
2. Move payment provider env reads out of module scope and verify local payment E2E.
3. Complete private OCR corpus with approved redacted samples.
4. Execute third-party pentest and remediate validated findings.

### Should Fix Soon

1. Preserve campaign/referral parameters and signup intent on homepage embedded pricing/bottom CTAs.
2. Add documented env-loading path for local QA checks.
3. Clean up Edge runtime/Supabase build warning.
4. Run a focused bundle/performance optimization pass.
5. Continue monitoring onboarding funnel, HubSpot contacts, seller applications, API usage, and signup events.

### Strategic Improvements

1. Strengthen enterprise workspace model for larger organizations.
2. Add recall, lifecycle, vendor reliability, and underwriting-ready data models/API surfaces over time.
3. Build deeper EN/AR and selected-language content for warranty management, asset lifecycle intelligence, and "why not spreadsheets/AI-built tools."
4. Add alerting policies for OCR, payments, email ingestion, warranty creation/import, and Sentry issue spikes once plan/tooling allows.

## Go / No-Go

Go for controlled production operation.

No-go for claiming complete enterprise-grade operational handover until:

- local full authenticated QA is repeatable,
- private OCR corpus passes,
- third-party pentest is complete,
- and the local payment env false-negative is fixed.

## Next Recommended Implementation Batch

1. Fix homepage CTA attribution/sign-up intent.
2. Fix payment route runtime env reads.
3. Add a local full-QA sequential command/documentation.
4. Run lint, type-check, unit tests, public/protected/SEO E2E, local payment E2E, production smoke, and production readiness.
5. Commit and push only after checks pass.
