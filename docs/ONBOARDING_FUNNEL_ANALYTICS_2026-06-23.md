# Warrantee Onboarding Funnel Analytics

Date: 2026-06-23
Scope: Warrantee only (`warrantee.io`).

## Current Baseline

The June 23 aggregate production check showed:

- Supabase auth users: 15 total, 0 new users in the last 30 days.
- Profiles: 15 total, 0 new profiles in the last 30 days.
- Companies: 2 total, 0 new companies in the last 30 days.
- CRM contacts: HubSpot is cancelled. Twenty CRM is the intended CRM provider; live Twenty contact counts depend on `TWENTY_API_KEY` being configured.
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

Auth funnel events also preserve these privacy-safe diagnostics so `/auth` traffic can be separated into login, signup, account type, and auth mode without storing names, emails, phone numbers, or message bodies:

- `tab`
- `auth_mode`
- `account_type`
- `has_company_name`

Do not place names, emails, phone numbers, commercial registration numbers, or private customer details in UTM values.

Internal marketing CTAs preserve these campaign parameters when routing visitors into signup, contact, pricing, and seller onboarding. This is intentional: a visitor who lands on a tagged pricing or homepage URL should still be attributable when they reach `/auth`, `/contact`, or `/seller/register`.

## How To Read The Funnel

Use this order when diagnosing onboarding:

1. `page_view` for homepage, pricing, auth, contact, seller registration.
2. `funnel_cta_click` with `cta=hero_start`, `pricing_plan_cta`, `seller_start`, or `hero_demo`.
3. `signup_submit`.
4. `sign_up`.
5. Backend confirmation:
   - Supabase auth user count increased.
   - `profiles` count increased.
   - CRM contacts or internal support tickets increased for contact/seller leads.
   - `seller_invitations` or seller application records increased where applicable.

If page views are low, the issue is acquisition/distribution.

If page views exist but `funnel_cta_click` is low, the issue is offer clarity, CTA placement, trust, or audience fit.

If `funnel_cta_click` exists but `signup_submit` is low, the issue is auth-page friction or visitor intent mismatch.

If `signup_submit` exists but `sign_up` is low, inspect Supabase auth errors, password validation, provider setup, email confirmation, and browser console errors.

If `sign_up` exists but users do not create warranties, inspect first-run onboarding, empty states, sample data, and dashboard guidance.

If `/auth` page views and `auth_intent` events exist but `signup_submit` is zero, compare `tab`, `auth_mode`, and `account_type` before changing the page. Heavy `login` activity means existing QA/admin usage or protected-route redirects; heavy `signup` views without submit means the signup form, offer clarity, or trust threshold needs improvement.

## Campaign URL Discipline

Use explicit campaign links for every outreach push so funnel events can be attributed later:

- Seller application: `https://warrantee.io/en/seller/register?utm_source=manual_outreach&utm_medium=direct&utm_campaign=seller_pilot_july_2026`
- Pricing: `https://warrantee.io/en/pricing?utm_source=manual_outreach&utm_medium=direct&utm_campaign=business_pilot_july_2026`
- API / CLI / MCP: `https://warrantee.io/en/api-docs?utm_source=partner_outreach&utm_medium=direct&utm_campaign=integration_pilot_july_2026`

For Arabic outreach, use the matching `/ar/...` path with the same UTM naming. Keep campaign names lowercase, short, and stable for the full test window.

Generate the current approved links with:

```bash
npm run campaign:links
npm run campaign:links -- --format=json
```

The generator is the source of truth for the first controlled test links. If a campaign name, source, medium, or destination changes, update the generator and this document together, then run `npm run qa:growth-readiness`.

## Controlled Acquisition Test

Run one small campaign at a time so attribution stays readable.

Recommended first test:

1. Send the seller application link to 20-50 qualified Saudi/GCC sellers with a direct, manual note.
2. Send the pricing link to 20-50 SMB operators who currently manage warranties in spreadsheets.
3. Send the API / CLI / MCP link only to technically qualified ERP, ecommerce, or support-system contacts.

Read the result after 48 hours and again after 7 days:

- If tagged `page_view` is low, the issue is outreach volume, targeting, channel, or deliverability.
- If tagged `page_view` exists but `funnel_cta_click` is zero, the issue is landing-page offer clarity or CTA motivation.
- If `funnel_cta_click` exists but `signup_submit` / `contact_form_submit` / `seller_application_submit` is zero, the issue is form/auth friction or intent mismatch.
- If form submissions occur but CRM/Supabase records do not increase, treat it as a backend integration incident.

## Server-Side Funnel Visibility

Server-side funnel events are written to `activity_log` instead of a new table so the current RLS/admin tooling remains simple. The log intentionally excludes names, email addresses, message bodies, phone numbers, and raw IP addresses.

Admin users can review these events from the Admin `Funnel` tab. The tab shows counts by event and recent privacy-safe event rows. Contact form submissions are also logged from `/api/contact` after validation so demo and business inquiries are counted even if browser analytics is blocked.

## Safe Follow-Up Candidates

- Review the Admin `Funnel` tab after each campaign or launch push.
- Compare events by `utm_source`, `utm_medium`, and `utm_campaign` before judging conversion quality.
- Compare `signup_submit`, `sign_up`, and `onboarding_completed` to find auth or first-run friction.
- Compare `contact_form_submit` and `seller_application_submit` against Twenty CRM/support-ticket creation.
