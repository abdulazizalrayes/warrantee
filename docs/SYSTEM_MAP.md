# Warrantee System Map

Last updated: 2026-07-07

Scope: Warrantee / warrantee.io only.

## Stack And Runtime

- Next.js App Router application under `src/app`.
- Supabase Auth, Postgres, Storage, RLS, and server clients.
- Stripe subscription checkout and webhook handling.
- Mistral-first OCR with PDF text extraction, Google Vision fallback when configured, and Tesseract emergency fallback.
- Resend email workflows, Twenty CRM contact sync, Sentry/Vercel observability, GA4/GTM/Meta-style conversion event helpers.
- Agent discovery layer: `llms.txt`, `llms-full.txt`, `openapi.json`, `auth.md`, `.well-known` agent/MCP/API resources, and hosted `/api/mcp`.

## Public Routes

- Marketing and SEO: `/[locale]`, `/[locale]/features`, `/[locale]/pricing`, `/[locale]/about`, `/[locale]/faq`, `/[locale]/guide`, `/[locale]/blog`, `/[locale]/resources/*`, `/[locale]/comparison/*`.
- Auth and onboarding: `/[locale]/auth`, `/[locale]/seller/register`, `/[locale]/contact`.
- Public proof surfaces: `/[locale]/verify`, `/[locale]/verify/[id]`, public certificate endpoint `/api/v1/warranties/verify/[id]/certificate`.
- AI/agent discovery: `/llms.txt`, `/llms-full.txt`, `/openapi.json`, `/auth.md`, `/.well-known/agent-card.json`, `/.well-known/mcp.json`, `/.well-known/mcp/server-card.json`, `/.well-known/mcp/server-cards.json`, `/.well-known/api-catalog`, `/.well-known/agent-skills/index.json`.

## Authenticated App Routes

- Dashboard and warranty workflows: `/[locale]/dashboard`, `/[locale]/warranties`, `/[locale]/warranties/new`, `/[locale]/warranties/[id]`, claim and extension subflows.
- Team and seller operations: `/[locale]/settings`, `/[locale]/settings/team`, `/[locale]/seller`, `/[locale]/seller/invite`.
- Billing: `/[locale]/billing`.
- Admin: `/[locale]/admin` and `/[locale]/admin/login`.

## API Boundary Map

- Public verification: `src/app/api/v1/warranties/verify/route.ts`.
- Public certificate: `src/app/api/v1/warranties/verify/[id]/certificate/route.ts`.
- Authenticated API v1 warranty, claim, document, intelligence, and token workflows under `src/app/api/v1`.
- Hosted MCP: `src/app/api/mcp/route.ts`.
- Subscription checkout: `src/app/api/stripe/checkout/route.ts`.
- Stripe webhook: `src/app/api/stripe/webhook/route.ts`.
- Extension checkout: `src/app/api/payments/create/route.ts`.
- OCR: `src/app/api/ocr/route.ts`.
- Funnel events: `src/app/api/funnel/events/route.ts`.
- Integration tokens and usage: `src/app/api/integration-tokens/*`.

## Database And RLS

Primary tables observed in migrations:

- Warranty core: `warranties`, `warranty_documents`, `warranty_claims`, `warranty_extensions`, `warranty_coverage_items`.
- User/company/team: `profiles`, `companies`, `company_members`, `seller_invitations`, `party_warranties`.
- Billing: `subscriptions`, `webhook_events`, `revenue_events`.
- Ingestion/OCR: `ingestion_jobs`, `ingestion_attachments`, `provisional_warranties`, `fraud_signals`.
- Operations: `notifications`, `activity_log`, `support_tickets`, `push_subscriptions`, `api_integration_tokens`, `api_usage_events`.

RLS posture:

- Core warranty tables are RLS-enabled in `supabase/migrations/20260520142000_lock_down_warranty_rls.sql`.
- Subscriptions are owner-readable and webhook/service-role writable in `supabase/migrations/20260605175727_subscription_billing_state.sql`.
- API usage events are RLS-enabled and owner-readable in `supabase/migrations/20260610193000_api_usage_events.sql`.

## Payments And Monetization

- Subscription billing uses Stripe Checkout from `src/app/api/stripe/checkout/route.ts`.
- Webhook verifies Stripe signatures and stores idempotency in `webhook_events`.
- Extension checkout requires an approved warranty extension offer; direct fallback checkout is disabled until an approved seller/provider offer exists.
- Extension fulfillment verifies amount and currency before marking an extension purchased and renewing warranty dates.

## OCR And Document Processing

- OCR endpoint prefers Mistral when configured, uses embedded PDF text where possible, falls back to Google Vision when configured, and uses Tesseract for availability.
- Document security baseline and scanner code exists under `src/lib/server`.
- Synthetic OCR corpus exists under `tests/fixtures/ocr-corpus/synthetic`.
- Private OCR corpus remains external because it requires founder-provided real/redacted invoices and receipts.

## Agent Readiness

- Public structured resources and MCP/API discovery are implemented under `src/app/data`, `src/lib/agent-public-data.ts`, `src/lib/agent-ready.ts`, `src/lib/public-openapi.ts`, and `tools/warrantee/mcp-server.mjs`.
- Agent usage logging exists in `src/lib/server/agent-usage-logger.ts`.
- API usage logging exists in `src/lib/api-v1.ts` and `api_usage_events`.

## Current Operational State

- Latest verified production state before this update: CI and Production Security Gates passed after commit `c6fb3cc`.
- Current local working tree includes approved pricing, performance, SEO, growth-loop, and handover-doc changes that still require verification and push.
- External blockers remain: private OCR corpus collection and independent third-party pentest execution.
