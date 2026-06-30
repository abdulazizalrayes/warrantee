# Warrantee Onboarding Funnel Analytics

Date: 2026-06-23
Scope: Warrantee only (`warrantee.io`).

## Current Baseline

The June 23 aggregate production check showed:

- Supabase auth users: 15 total, 0 new users in the last 30 days.
- Profiles: 15 total, 0 new profiles in the last 30 days.
- Companies: 2 total, 0 new companies in the last 30 days.
- HubSpot contacts: 4 total, 0 new contacts in the last 30 days.
- Seller invitations: 0 total.
- API usage events: 0 total.

This indicates a commercial funnel issue, not a known production-health issue. Production smoke, readiness, and agent-readiness checks were passing around the same period.

## Implemented Tracking

The homepage primary CTA now links directly to signup:

- From: `/{locale}/auth`
- To: `/{locale}/auth?tab=signup`

This prevents new visitors from landing on the default login tab after clicking the primary start CTA.

The following funnel events are emitted through the existing GA4 / GTM / Meta event layer and mirrored into a privacy-safe server-side `activity_log` record with `entity_type = funnel_event`:

| Event | Where it fires | Purpose |
| --- | --- | --- |
| `funnel_cta_click` | Homepage hero, product-passport CTAs, pricing plan CTAs, seller submit attempt | Measures intent before navigation or form submission. |
| `signup_submit` | Auth signup form submit attempt | Measures signup intent even if Supabase rejects or email confirmation blocks completion. |
| `sign_up` | Successful signup request accepted by Supabase | Measures completed account creation request. |
| `contact_form_submit` | Contact form accepted by `/api/contact` | Measures lead submission. |
| `seller_application_submit` | Seller application accepted | Measures seller onboarding conversion. |
| `onboarding_completed` | First-run onboarding completed | Measures movement from account creation to activated profile setup. |

Server-side funnel events also preserve privacy-safe campaign attribution when present:

- `utm_source`
- `utm_medium`
- `utm_campaign`
- `utm_content`
- `utm_term`
- `ref`

Do not place names, emails, phone numbers, commercial registration numbers, or private customer details in UTM values.

## How To Read The Funnel

Use this order when diagnosing onboarding:

1. `page_view` for homepage, pricing, auth, contact, seller registration.
2. `funnel_cta_click` with `cta=hero_start`, `pricing_plan_cta`, `seller_start`, or `hero_demo`.
3. `signup_submit`.
4. `sign_up`.
5. Backend confirmation:
   - Supabase auth user count increased.
   - `profiles` count increased.
   - HubSpot contacts increased for contact/seller leads.
   - `seller_invitations` or seller application records increased where applicable.

If page views are low, the issue is acquisition/distribution.

If page views exist but `funnel_cta_click` is low, the issue is offer clarity, CTA placement, trust, or audience fit.

If `funnel_cta_click` exists but `signup_submit` is low, the issue is auth-page friction or visitor intent mismatch.

If `signup_submit` exists but `sign_up` is low, inspect Supabase auth errors, password validation, provider setup, email confirmation, and browser console errors.

If `sign_up` exists but users do not create warranties, inspect first-run onboarding, empty states, sample data, and dashboard guidance.

## Campaign URL Discipline

Use explicit campaign links for every outreach push so funnel events can be attributed later:

- Seller application: `https://warrantee.io/en/seller/register?utm_source=manual_outreach&utm_medium=direct&utm_campaign=seller_pilot_july_2026`
- Pricing: `https://warrantee.io/en/pricing?utm_source=manual_outreach&utm_medium=direct&utm_campaign=business_pilot_july_2026`
- API / CLI / MCP: `https://warrantee.io/en/api-docs?utm_source=partner_outreach&utm_medium=direct&utm_campaign=integration_pilot_july_2026`

For Arabic outreach, use the matching `/ar/...` path with the same UTM naming. Keep campaign names lowercase, short, and stable for the full test window.

## Server-Side Funnel Visibility

Server-side funnel events are written to `activity_log` instead of a new table so the current RLS/admin tooling remains simple. The log intentionally excludes names, email addresses, message bodies, phone numbers, and raw IP addresses.

Admin users can review these events from the Admin `Funnel` tab. The tab shows counts by event and recent privacy-safe event rows. Contact form submissions are also logged from `/api/contact` after validation so demo and business inquiries are counted even if browser analytics is blocked.

## Safe Follow-Up Candidates

- Review the Admin `Funnel` tab after each campaign or launch push.
- Compare events by `utm_source`, `utm_medium`, and `utm_campaign` before judging conversion quality.
- Compare `signup_submit`, `sign_up`, and `onboarding_completed` to find auth or first-run friction.
- Compare `contact_form_submit` and `seller_application_submit` against HubSpot/support-ticket creation.
