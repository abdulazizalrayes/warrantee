# Meta Ads AI Connectors Playbook

Last updated: 2026-05-03

## Purpose

Meta Ads AI Connectors are relevant to Warrantee because they can let approved AI agents work with Meta ad account data through Meta-authenticated tools such as the Meta Ads MCP server or Ads CLI. This should be used to speed up campaign research, reporting, QA, and draft campaign planning without allowing unsupervised spend changes.

## Approved Warrantee Use Cases

- Analyze Facebook and Instagram campaign performance once a Warrantee Meta ad account is connected.
- Draft campaign briefs for buyers, sellers, warranty scanning, seller onboarding, and API/ERP integration audiences.
- Compare campaign performance by objective, geography, creative, landing page, audience, cost per lead, and conversion quality.
- Identify tracking gaps between Meta ads, GTM, GA4, and Warrantee conversion events.
- Prepare daily or weekly paid-growth summaries for the CEO and Marketing Manager.
- Draft budget reallocation recommendations for founder approval.
- Draft creative testing plans using approved Warrantee brand guidelines.
- Diagnose ad signal quality and suggest Conversions API or Pixel improvements.

## Not Approved Without Founder Confirmation

These actions require explicit action-time approval before execution:

- Connect or authorize a Meta ad account.
- Create, edit, pause, resume, or delete campaigns, ad sets, ads, catalogs, pixels, datasets, or audiences.
- Change budget, bid strategy, targeting, placements, conversion objective, attribution settings, or creative.
- Upload customer lists, CRM exports, emails, phone numbers, warranty data, buyer data, seller data, or any personal data to Meta.
- Grant or modify Business Manager, ad account, Page, Instagram, dataset, Pixel, or catalog permissions.
- Use campaign data in an external AI tool unless the destination and data scope are approved.

## Operating Model

1. Marketing Manager drafts campaign hypotheses and campaign briefs.
2. Analytics / Metrics agent validates the funnel metrics, GA4 key events, GTM state, and conversion quality.
3. CTO or Growth Ops verifies tracking architecture, landing page performance, and API/event reliability.
4. Security agent checks privacy, consent, data-sharing, and account permission risks.
5. CEO approves any spend, account linking, audience uploads, or live campaign changes.
6. Marketing Manager executes only after approval and records the change, budget, expected metric, and rollback plan.

## Default Guardrails

- Draft-first workflow by default.
- Read-only analysis before write access.
- No customer-list uploads until privacy/legal review is complete.
- No campaign launch without a named owner, budget cap, conversion event, target geography, landing page, creative set, and stop-loss rule.
- No AI-generated creative goes live without brand and claims review.
- No warranty/legal/commercial promises in ads unless approved by CEO or legal reviewer.
- No cross-company data may be used. Warrantee work must not use Hadhr, JFCO, Strata, Vested, Fortis, or any other company data.

## Recommended Launch Sequence

1. Confirm Warrantee has a dedicated Meta Business Manager, Facebook Page, Instagram account, Pixel/dataset, and ad account.
2. Confirm GTM and GA4 events are firing for `sign_up`, `contact_form_submit`, `seller_invite_sent`, `warranty_scan`, `warranty_created`, and future paid conversion events.
3. Connect Meta Pixel and Conversions API only after consent, privacy, and data-sharing rules are reviewed.
4. Connect Meta Ads AI Connectors in read-only mode if available for the account.
5. Run an AI-assisted audit of current account setup and tracking quality.
6. Draft two campaigns:
   - buyer acquisition: scan and protect warranties
   - seller acquisition: turn warranty records into support, retention, and extension revenue
7. CEO approves budget and launch checklist.
8. Launch with small capped spend and daily monitoring.

## Warrantee Technical Activation State

The Warrantee codebase is prepared for Meta tracking, but the real Meta values must come from the Warrantee Meta Business setup:

- `NEXT_PUBLIC_META_PIXEL_ID`: public Pixel/dataset ID used by the browser Pixel.
- `META_CAPI_ACCESS_TOKEN`: server-only token for Conversions API.
- `META_CAPI_TEST_EVENT_CODE`: optional test code used only while validating in Meta Events Manager.
- `META_GRAPH_API_VERSION`: optional Graph API version override. Defaults to `v20.0`.

Current implementation rules:

- Meta Pixel loads only when `NEXT_PUBLIC_META_PIXEL_ID` is configured.
- Meta Pixel respects Warrantee marketing-cookie consent.
- Existing Warrantee conversion events are mapped into Meta-safe events.
- `/api/meta/conversions` remains disabled until Pixel ID and CAPI token are configured.
- The CAPI endpoint currently sends event metadata only and does not upload customer lists or private warranty data.

## KPI Framework

- CAC by buyer and seller segment.
- Cost per verified signup.
- Cost per warranty scan.
- Cost per seller lead.
- Cost per qualified seller lead.
- Warranty creation rate after signup.
- Seller invite acceptance rate.
- Claim and extension intent rate.
- Landing page conversion rate.
- Meta-to-GA4 attribution consistency.
- Payback period and estimated LTV by cohort.

## Rollback Plan

- Pause campaign or ad set immediately if spend exceeds cap, CPA exceeds threshold, conversion tracking breaks, or creative generates low-quality leads.
- Revert any AI-suggested campaign changes that reduce conversion quality or violate approved positioning.
- Remove connector access if the tool performs actions outside approved scope.

## Paperclip Agent Instruction

Warrantee agents may use Meta Ads AI Connectors only as a governed paid-growth tool. The default mode is analysis and draft recommendations. Any account connection, data transfer, audience upload, budget change, campaign creation, campaign edit, or live ad action requires CEO/founder approval at action time.
