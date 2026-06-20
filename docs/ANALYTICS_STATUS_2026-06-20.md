# Warrantee Analytics Status - 2026-06-20

Scope: Warrantee only (`warrantee.io`).

## Current Instrumentation

- Vercel Web Analytics is installed through `@vercel/analytics`.
- Vercel Speed Insights is installed through `@vercel/speed-insights`.
- GA4 is wired through `NEXT_PUBLIC_GA_MEASUREMENT_ID` when configured.
- GTM is supported through `NEXT_PUBLIC_GTM_ID` when configured.
- Hotjar is supported through `NEXT_PUBLIC_HOTJAR_ID` when configured.
- Client-side business events are centralized in `src/lib/ga4-events.ts`.
- Server-side agent-readiness events are logged as `agent_readiness_event`.

## Agent-Readiness Events

The production agent-readiness layer logs these privacy-safe event types:

- `crawler_visit`
- `llms_read`
- `llms_full_read`
- `openapi_read`
- `auth_doc_read`
- `public_data_read`
- `mcp_tool_call`
- `mcp_resource_read`
- `inquiry_preparation`

The logger does not record IP addresses, request bodies, passwords, API keys, payment data, or private warranty records.

## Immediate Production Findings

Checked after commit `708d893` deployed:

- Latest GitHub CI passed.
- Latest Production Security Gates passed.
- Production smoke passed.
- Operational readiness passed.
- Production error-log scan for the last hour returned no error logs.
- Recent production logs show successful `200` responses for agent-readiness assets such as `/llms-full.txt` and `/data/agent-routing.json`.

## Current Analytics Limitation

There is not enough real post-deploy agent/crawler traffic yet to infer demand, conversion, or SEO impact. The current visible activity is mostly validation and smoke-test traffic.

## Recommended Review Cadence

For the next 24-48 hours:

- Check GitHub CI and Production Security Gates.
- Check Vercel production logs for `agent_readiness_event`.
- Check Vercel Analytics and Speed Insights dashboards for route-level activity.
- Check GA4 for page views, sign-up intent, seller onboarding, contact, pricing, and API / CLI / MCP guide engagement.
- Treat crawler hits as discovery signals, not buyer intent, until paired with search/referral/session data.

## Useful Vercel CLI Checks

```bash
vercel logs --environment production --level error --since 1h --no-follow --limit 50
vercel logs --environment production --since 1h --no-follow --no-branch --limit 100 --json
```

Search JSON output for:

- `agent_readiness_event`
- `/llms.txt`
- `/llms-full.txt`
- `/openapi.json`
- `/auth.md`
- `/data/`
- `/api/mcp`

