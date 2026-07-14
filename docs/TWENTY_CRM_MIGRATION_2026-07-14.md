# Twenty CRM Migration

Date: 2026-07-14
Scope: Warrantee only.

## Decision

HubSpot is cancelled for Warrantee. Warrantee should use Twenty CRM for lead/contact capture going forward.

## Current Implementation

- Runtime CRM code lives in `src/lib/crm.ts`.
- The active provider is Twenty CRM.
- Contact forms, signup callbacks, and seller invitations call the CRM adapter.
- If `TWENTY_API_KEY` is missing, CRM sync is disabled without blocking user signup, contact form submission, support ticket creation, seller invitation, or lead email delivery.
- Production readiness reports the CRM check as:
  - `ok` when Twenty is configured and reachable.
  - `disabled` when `TWENTY_API_KEY` is not configured.

## Required Twenty Setup

Create an API key in Twenty:

1. Open Twenty CRM.
2. Go to Settings -> API & Webhooks.
3. Create an API key for Warrantee.
4. Store it as `TWENTY_API_KEY` in Vercel Production and GitHub Actions secrets.
5. Optional: set `TWENTY_API_BASE_URL` if using a self-hosted Twenty instance. Leave unset for Twenty Cloud.

Twenty official API model:

- Cloud base URL: `https://api.twenty.com`
- REST API path: `/rest/`
- Authentication: `Authorization: Bearer YOUR_API_KEY`
- Workspace schemas are generated from the Twenty workspace data model, so fields may need adjustment if the Warrantee workspace customizes People/Companies.

Source: https://docs.twenty.com/developers/extend/api

## Safety Rules

- Do not re-enable HubSpot unless explicitly requested.
- Do not store CRM secrets in source code.
- CRM sync must remain non-blocking. A CRM outage must not block real users or leads.
- Contact form and seller application submissions must continue to create internal Warrantee support/funnel records even when CRM is disabled.

## Verification

Run:

```bash
npm run test -- src/lib/__tests__/operational-hardening.test.ts
npm run readiness:operational
```

After `TWENTY_API_KEY` is configured, `readiness:operational` should show the CRM check as `ok` with provider `twenty`.
