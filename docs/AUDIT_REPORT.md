# Warrantee Takeover Audit Report

Last updated: 2026-07-07

Scope: Warrantee / warrantee.io only.

## Executive Summary

Warrantee is technically beyond a simple landing page: it has authenticated warranty workflows, Supabase RLS, public verification, certificates, OCR ingestion, Stripe/Moyasar extension checkout paths, API/CLI/MCP readiness, Search/LLM discovery files, and operational QA scripts.

The major takeover risks are commercial and operational readiness, not basic scaffolding:

1. Pricing was undermining trust with `$1/month`, a free-month trial, USD for a Saudi-first product, and extension commission shown as a feature.
2. Subscription billing exists in code, but production go-live still depends on a matching live Stripe price, webhook secret, and final billing readiness check.
3. Extension checkout is guarded and implemented, but the extension revenue loop is not live because there are no real users, no real seller/provider offers, and no real paid extension purchases.
4. OCR quality cannot be truthfully certified until a private real-world corpus is collected and tested.
5. Third-party pentest cannot be truthfully claimed until an external vendor executes the prepared scope.
6. Language expansion is technically supported as beta fallback routes, but only English and Arabic should be treated as indexed/production-grade until analytics proves demand.

## Scores

| Area | Score | Evidence |
| --- | ---: | --- |
| Architecture | 8/10 | Next.js App Router, Supabase, RLS, Stripe, OCR, API/CLI/MCP, agent discovery. |
| Security posture | 7/10 | RLS and scoped API/token patterns exist; third-party pentest remains external. |
| Billing readiness | 5/10 | Checkout/webhook code exists; live Stripe price/webhook alignment still needs production confirmation. |
| Extension revenue readiness | 6/10 | Approved-offer checkout and webhook amount/currency verification exist; real seller offers/users absent. |
| OCR readiness | 6/10 | Synthetic corpus and multi-provider OCR exist; private real corpus still missing. |
| SEO/GEO/AEO readiness | 8/10 | Sitemap, robots, schema, llms, OpenAPI, MCP, agent-card, content pages exist. |
| Language readiness | 6/10 | EN/AR indexed; beta locales noindexed/fallback. Analytics evidence needed before promoting. |
| Activation UX | 7/10 | Signup/onboarding/funnel tracking exists; golden path still needs measured real-user friction reduction. |
| Operational handover | 7/10 | Docs and QA scripts exist; this report/system map/backlog complete Phase 0-2 baseline. |

## Top Findings

### 1. Pricing trust issue

Problem: Public pricing, schema, FAQ, tests, and plan definitions carried `$1/month`, "first month free", USD, and history limits. This made the product look unfinished and created contradictions around record retention.

Fix applied locally: Changed public pricing story to a Saudi-first Professional launch offer at `SAR 149/month`, removed the 30-day Stripe trial from checkout, retained Free plan records wording, and separated extension transaction fees from plan benefits.

Verification required: Type-check, lint, unit tests, build, pricing E2E, and live Stripe price alignment before deployment.

### 2. Billing not fully operational

Problem: Billing code exists, but real subscription collection depends on live `STRIPE_PRO_PRICE_ID`, `STRIPE_SECRET_KEY`, and `STRIPE_WEBHOOK_SECRET` matching the new SAR price and webhook endpoint.

Recommendation: Before rollout, create/confirm the live Stripe recurring price for SAR 149/month, update Vercel production env, confirm webhook events, and run subscription checkout in production with a real test account where permitted.

### 3. Extension loop not commercially live

Problem: Code prevents unsafe direct extension checkout unless an approved seller/provider offer exists. That is correct, but it means extension revenue will not happen until sellers/providers create offers.

Recommendation: Keep the guarded flow. Add operational playbook for first seller/provider extension offer and track: extension offer shown, checkout started, purchased, webhook fulfilled.

### 4. Private OCR corpus missing

Problem: Synthetic OCR tests cannot represent messy real invoices, forwarded emails, poor scans, Arabic/English mix, and fraud scenarios.

Recommendation: Collect a founder-approved private corpus outside git, run the existing OCR regression workflow, and record only aggregate results.

### 5. Third-party pentest missing

Problem: Internal review and hardening are not a substitute for independent assurance.

Recommendation: Execute the prepared pentest scope with an external vendor; do not market "independently pentested" until report and remediation are complete.

### 6. Language expansion needs evidence

Problem: Many beta locales are routed, but the product only has full indexed content confidence for EN/AR.

Recommendation: Keep beta locales noindexed/fallback until analytics shows real demand and content is professionally reviewed.

### 7. Activation golden path needs sharper measurement

Problem: North star is companies issuing at least one warranty weekly, but there are zero companies activated today.

Recommendation: Optimize signup -> first warranty -> first certificate -> first QR passport in one session. Keep tracking for signup, first warranty, certificate generated, QR scanned, claim filed, extension events.

### 8. Growth loop needed stronger trust branding

Problem: Public passports/certificates are the cheapest distribution surface. They must signal Warrantee without feeling spammy.

Fix applied locally: Public passport and certificate outputs now use understated "Powered by Warrantee.io" wording.

## Security Notes

- Public verification intentionally exposes limited, verification-safe fields.
- API/CLI/MCP docs state authenticated token access for private operations.
- Stripe webhooks verify signatures and use idempotency.
- Extension payment fulfillment verifies paid amount and currency.
- Supabase service role remains server-side only in inspected paths.
- External pentest remains required for takeover assurance.

## Go / No-Go

Current verdict: Ready with known risks after local verification passes, but not ready to claim fully commercial billing or independent security assurance until Stripe live configuration, private OCR corpus, and third-party pentest are completed.
