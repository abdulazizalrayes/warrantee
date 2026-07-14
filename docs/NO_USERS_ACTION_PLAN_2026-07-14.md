# No Users Action Plan

Date: 2026-07-14
Scope: Warrantee only.

## Diagnosis

This is currently a go-to-market and activation problem, not a production-health problem.

Latest observed production signals:

- Production health and readiness checks are passing.
- CI and Production Security Gates are passing.
- The site receives funnel activity and auth-page visits.
- No new users, profiles, companies, seller invitations, CRM contacts, or API usage have appeared since the baseline.

The current bottleneck is before signup. People reach the site/auth surface, but they do not convert into account creation or seller applications.

## Primary Hypothesis

Visitors do not yet have enough urgency, trust, or a narrow use-case promise to create an account.

Warrantee is broad: B2C warranty reminders, B2B seller portal, claims, certificates, QR passport, API / CLI / MCP, extensions, and asset intelligence. That breadth is strategically useful later, but it makes the first decision harder for a new visitor.

## Recommended Solution

Run a controlled founder-led acquisition sprint with one narrow offer:

> "We will convert your current spreadsheet/invoices into a branded warranty portal and QR verification flow in one day."

Target one beachhead first:

- Saudi/GCC equipment dealers, appliance/electronics sellers, contractors handing over warranties, and maintenance/service providers.

Do not wait for passive SEO traffic. Use direct outreach and track every link with the existing UTM campaign generator.

## 7-Day Execution

1. Build a list of 50 real companies.
   - Include name, website, owner/operations contact, likely warranty pain, and current warranty proof method.

2. Send direct outreach using the tracked seller link:
   - `npm run campaign:links`
   - Use the seller application and pricing links with `manual_outreach` campaign parameters.

3. Offer a done-for-you onboarding path:
   - "Send us 10 warranty records or one sample invoice. We will set up your first branded warranty records and QR verification demo."

4. Use one measurable conversion target:
   - 5 replies.
   - 2 live calls.
   - 1 pilot company issuing at least one real warranty.

5. Review funnel events after 48 hours and 7 days:
   - If tagged page views are low: the issue is targeting/outreach/deliverability.
   - If page views exist but CTA clicks are low: the offer is unclear.
   - If CTA clicks exist but signup/application is zero: the signup/application flow has friction or trust issues.

## Product Adjustment Without Visual Changes

Before changing page visuals, measure:

- Which `/auth` tab users land on.
- Whether they are in login or signup mode.
- Whether signup submit is attempted.
- Whether Supabase rejects the submission.

If signup attempts remain zero after a controlled campaign, the next approved product move should be a non-visual or minimally visual "book setup help / pilot onboarding" route that captures leads without asking users to understand the whole platform first.

## What Not To Do Yet

- Do not broaden to more languages until real demand exists.
- Do not add more features to fix acquisition.
- Do not run paid ads before the first manual pilot proves the message.
- Do not rely on SEO alone for first users.

## Owner Checklist

- CRM: Twenty CRM.
- Source of truth for lead capture until Twenty is configured: internal support tickets plus server-side funnel events.
- Review cadence: 48 hours after each outreach batch, then 7 days.
