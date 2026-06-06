Title: Warrantee GA4/GTM Analytics Audit

Status: GA4 key events configured on April 30, 2026

Scope:
- Warrantee only.
- Do not inspect, wake, or modify Hadhr, JFCO, Strata, Vested, Fortis, or any other company workspace.
- Validate production GA4/GTM tracking, event taxonomy, and funnel reporting.

Current code status:
- GA4 measurement ID is configured through NEXT_PUBLIC_GA_MEASUREMENT_ID.
- GTM container is configured through NEXT_PUBLIC_GTM_ID.
- Consent-aware Google Tag Manager and Google Analytics components are present.
- Production deploy verified on April 30, 2026:
  - Vercel deployment: dpl_EDonpqzvb9WZDY8jDX8YLkuv1EKz
  - Production alias: https://warrantee.io
  - Live page https://warrantee.io/en returns HTTP 200.
  - Live page includes GTM-N6G95MQL.
  - Live page includes direct GA4 gtag.js for G-ZQJ4LRG4GN.
- Codex restored direct GA4 event delivery while preserving GTM:
  - GoogleAnalytics now loads when NEXT_PUBLIC_GA_MEASUREMENT_ID exists, even if GTM is also configured.
  - When GTM is present, direct GA4 config uses send_page_view: false to avoid duplicate pageview counting.
  - Business events now have a direct GA4 path and are no longer dependent only on GTM custom triggers.
- GA4 collection endpoint accepted controlled Warrantee event hits on April 30, 2026 for:
  - sign_up
  - warranty_created
  - claim_submitted
  - warranty_scan
  - extension_request
  - extension_wishlist
  - document_view
  - team_invite
  - approval_action
  - report_export_requested
  - seller_invite_sent
  - contact_form_submit
- Codex added missing funnel events for:
  - smart scan started/completed/failed
  - warranty created
  - claim submitted
  - extension request
  - extension wishlist interest
  - document opened
  - team invite sent
- Codex normalized confusing generic event names:
  - warranty creation now emits warranty_created instead of add_to_cart
  - claim submission now emits claim_submitted instead of generate_lead
  - contact form submission now emits contact_form_submit instead of generate_lead
  - seller invitation now emits seller_invite_sent instead of share

Recommended GA4 key events:
- sign_up
- warranty_created
- claim_submitted
- warranty_scan when status is completed
- extension_request
- extension_wishlist
- document_view
- team_invite
- approval_action
- report_export_requested
- purchase

Recommended funnel dashboard:
- Acquisition: session source, landing page, auth_intent, sign_up
- Activation: warranty_scan started/completed/failed, warranty_created, provisional confirmation
- Evidence: document_view, proof viewer usage, OCR/manual entry split
- Claims: claim_submitted, claim status, response latency
- Extensions: extension_request, extension_wishlist, approved provider path, purchase
- Business/team: team_invite, seller_invite_sent, approval_action, report_export_requested
- Reliability: API errors, upload/OCR failures, consent acceptance rate, page load by route

GA4 console blocker:
- Authenticated GA4 access is available under abdulaziz.alrayes@gmail.com.
- Existing GA4 account/property confirmed before changes:
  - Account: Warrantee
  - Property: Warrantee.io
  - Property URL context: a388923325p530040415
  - Measurement ID: G-ZQJ4LRG4GN
  - GTM container: GTM-N6G95MQL
- No new GA4 account, property, stream, or GTM container was created.
- GA4 Events > Key events readback now shows 15 key events:
  - approval_action
  - claim_submitted
  - close_convert_lead
  - contact_form_submit
  - document_view
  - extension_request
  - extension_wishlist
  - purchase
  - qualify_lead
  - report_export_requested
  - seller_invite_sent
  - sign_up
  - team_invite
  - warranty_created
  - warranty_scan

Google Search Console access record:
- Warrantee Search Console is under `abdulaziz.alrayes@gmail.com`.
- Property: `https://warrantee.io/`
- Console URL: `https://search.google.com/search-console?resource_id=https%3A%2F%2Fwarrantee.io%2F`
- Use this property only for Warrantee sitemap submission, URL inspection, indexing checks, and search performance review.
- 2026-06-06 readback: `/sitemap.xml` is submitted with status `Success`, last read May 31, 2026, and 28 discovered pages.
- 2026-06-06 URL Inspection: `/en`, `/ar`, `/en/pricing`, `/en/features`, and `/en/verify` are on Google and indexed.
- 2026-06-06 URL Inspection: `/en/faq` is `Crawled - currently not indexed`; `/en/api-docs` is `Discovered - currently not indexed`. Both are allowed and sitemap-discovered.
- Request Indexing for `/en/faq` and `/en/api-docs` was attempted but blocked by Google's daily `Quota Exceeded` response; retry after quota reset.
- Search Console Manual Actions and Security Issues showed no issues detected.
- Do not mark generic add_to_cart, generate_lead, or share as Warrantee conversions unless they are intentionally used elsewhere.

GA4 dashboard operating view:
- Acquisition:
  - Primary metrics: users, sessions, source/medium, landing page, auth_intent, sign_up.
  - Key questions: which channels create qualified signups, and which landing pages lead to warranty creation?
- Activation:
  - Primary metrics: warranty_scan, warranty_created, provisional confirmation rate, OCR/manual split.
  - Key questions: how many users reach a real warranty record, and where does onboarding fail?
- Evidence:
  - Primary metrics: document_view, document upload/open rate, proof viewer usage, OCR failure rate.
  - Key questions: are users storing the proof needed for claims, disputes, or court-grade evidence?
- Claims:
  - Primary metrics: claim_submitted, claim status, seller response latency, claim approval/rejection.
  - Key questions: are claims being submitted cleanly and resolved fast enough?
- Extensions:
  - Primary metrics: extension_request, extension_wishlist, approved provider path, purchase.
  - Key questions: where is demand for warranty extensions, and which sellers/products create revenue?
- Business/team:
  - Primary metrics: team_invite, seller_invite_sent, approval_action, report_export_requested.
  - Key questions: are companies inviting teams, approving work, exporting reports, and showing enterprise adoption?
- Reliability:
  - Primary metrics: API errors, upload/OCR errors, consent rate, route-level speed, page error states.
  - Key questions: are workflows stable enough for scale and sales demos?

Agent task:
- Verify whether the live production site fires GA/GTM events correctly.
- Use GA4 Realtime or DebugView where access is available.
- Map events to funnel stages:
  - Awareness
  - Activation
  - Retention
  - Revenue
  - Referral
- Recommend GA4 conversions and dashboard cards.
- Identify any remaining code or GTM container fixes.

Required output:
- Current GA/GTM health.
- Events confirmed.
- Events missing.
- Recommended conversions.
- Recommended dashboards.
- Risks or blockers.
