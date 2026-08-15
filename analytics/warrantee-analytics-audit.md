Title: Warrantee GA4/GTM Analytics Audit

Status: GA4 key events configured; Web GTM container repaired on August 15, 2026

Scope:
- Warrantee only.
- Do not inspect, wake, or modify Hadhr, JFCO, Strata, Vested, Fortis, or any other company workspace.
- Validate production GA4/GTM tracking, event taxonomy, and funnel reporting.

Current code status:
- GA4 measurement ID is configured through NEXT_PUBLIC_GA_MEASUREMENT_ID.
- GTM container is configured through NEXT_PUBLIC_GTM_ID.
- Consent-aware Google Tag Manager and Google Analytics components are present.
- Production analytics source of truth as of August 15, 2026:
  - Production alias: https://warrantee.io
  - GA4 measurement ID: G-ZQJ4LRG4GN
  - GTM Web container: warrantee.io web / GTM-WFLBH83M
  - GTM version 2, `Initial Warrantee web analytics`, is published under `abdulaziz.alrayes@gmail.com`.
  - The prior GTM-N6G95MQL value was an iOS container and is retired from Warrantee production configuration.
  - With GTM configured, the app preserves a plain data-layer event for marketing diagnostics and queues business events through the GTM-provided `gtag` command interface. Explicit app page views are not sent a second time because the Google tag provides the standard page view. Direct `gtag.js` loading remains a no-GTM fallback only.
  - Every browser and server funnel event includes `traffic_class`: human, crawler, qa, or monitoring.
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
  - GTM Web container: GTM-WFLBH83M
- No new GA4 account, property, or stream was created. A correct Warrantee Web GTM container was created because the previous configured container was an iOS container.
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
- 2026-06-07 retry: `/en/faq` and `/en/api-docs` still returned Google's daily `Quota Exceeded` response when Request Indexing was retried. `/en/faq` remains `Crawled - currently not indexed`; `/en/api-docs` remains `Discovered - currently not indexed`. No local Warrantee SEO code fix is indicated by the retry.
- 2026-06-08 retry: `/en/faq` is now on Google and indexed. `/en/api-docs` was accepted into Google's priority crawl queue, then a same-day follow-up inspection found `/en/api-docs` on Google and indexed. No Search Console Request Indexing retry remains open for these URLs.
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
