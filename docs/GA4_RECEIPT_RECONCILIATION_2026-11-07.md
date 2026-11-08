# Warrantee GA4 Receipt Reconciliation - 2026-11-07

## Latest Release Reconciliation - 2026-11-08

**PRE-DEPLOYMENT VERIFICATION CHECKPOINT AS OF 2026-11-08.** Recorded prior release: PR #42 merged to main `961e911663286d28d4af85df9a106a129c3ed667`, production deployment `dpl_8fonqoJLZrqqiqKaD8ek6kgbsQUY`. CI `42465567801`, CodeQL `42465568079`, and Production Security Gate `42465831058` all passed. Coverage: 354 unit tests, 236 E2E passes, and 92 intentional skips (not executed coverage). Release checks record 50 sitemap pages, 240 hashes, 56 EN/AR views, Sentry unresolved issues 0, and persistent QA records 0.

Durable prior-release evidence: [PR #42 release record](https://github.com/abdulazizalrayes/warrantee/pull/42#issuecomment-6719739042). The final GA4 outcome after the next code deployment will be linked in that release PR's closeout once its PR number is assigned; a documentation-only redeployment is not required to record it.

The November 7 source-path transport/reporting receipt below remains valid historical evidence, but is not receipt from the deployed bundle. At this checkpoint, one controlled consented QA event's actual transport and correct-property GA4 reporting receipt have not yet been verified after the next code deployment. The release PR closeout must record the timestamp, event, property, and QA classification before claiming that verification. This dated checkpoint does not assert the status of a later deployment. No customer demand, activation, key-event, or payment claim follows from controlled QA traffic.

All owner postponements in `docs/BACKLOG.md` remain unchanged, including backup/restore task 5, tasks 6-10, billing/payment activation, ClamAV deployment, independent paid pentest, public npm publication, Vercel Pro, and other explicitly postponed historical scope.

## Custom-Payload Privacy Contract - 2026-11-08

- `src/lib/analytics-payload.ts` defines event-specific fields and registered value vocabularies. The browser filters before dataLayer, direct gtag events, and server beacons; the funnel API validates independently with the same contract.
- Custom payloads omit document/warranty IDs, team domains, raw OCR errors, free-text subjects, unregistered fields, and arbitrary nested values. Existing purchase-item metadata is reconstructed from approved fields; this does not activate billing or payments.
- Event destinations and first-party funnel paths omit queries, fragments, and record IDs. Referrers retain HTTP(S) origins only. Direct gtag events receive internally computed sanitized page-location/referrer overrides; callers cannot supply their own routing destination or classification.
- Only registered campaign codes are retained in custom analytics. New campaign or event values require a privacy-reviewed contract update. Existing link attribution/navigation remains unchanged; this is not a global URL rewrite.
- Server classification uses the request user agent transiently without storing its raw value. Existing first-party authenticated actor linkage, authorization, origin checks, rate limits, and database response behavior are preserved.
- Automatic GTM pageview/enhanced-measurement collection and GTM-forwarded WhatsApp tag URL context were not reconfigured or comprehensively verified here. Helper filtering does not prove all Google collection is free of personal data. No GTM container publication or account setting change is included.
- QA receipt verification must click an actual deployed pricing CTA, not replace or transpile its analytics module. Permit at most one correctly routed, QA-labelled custom request to Google; locally fulfill other collector requests and all application writes. Confirm HTTP transport separately from correct-property Realtime receipt. Do not create a signup, lead, payment, or message to manufacture the event.

## Historical Source-Path Verification - 2026-11-07

## Status And Identity

**Historical PASS: routing and correct-property GA4 source-path receipt.** Release verification was pending at this checkpoint; PR #42 now supersedes that release-pending status. The next code deployment's receipt is covered by the dated checkpoint above and its subsequent release PR closeout. No GTM publication, real form submission, or message was performed in this historical test. The controlled source-path test alone is not proof that the production bundle contains the correction.

- Governing source: `CLAUDE.md`. Warrantee account `abdulaziz.alrayes@gmail.com`; GA4 measurement ID `G-ZQJ4LRG4GN`; web container `GTM-WFLBH83M`.
- Parent verified regular-Chrome GA4 account `Warrantee` / `388923325`, property `Warrantee.io` / `530040415`. Oct 10-Nov 6, All Users without filters: 33 events, 7 users; only session_start 10, page_view 9, first_visit 7, user_engagement 6, scroll 1. No custom event rows. This historical report is not evidence that the local patch reached production.
- Parent verified Vercel project `prj_fZIC1oJjpaZ4E8IqLm3UJTbMxlrx`, team `team_AnOdxEeUwCwUtPdqTk5I1Dkt`, and presence of `NEXT_PUBLIC_GA_MEASUREMENT_ID` in all environments. GitHub's corresponding secret is absent. No CI secret, hardcoded fallback, or Vercel setting was added. This worker did not inspect credential values or use the ignored development environment for network proof.

## Cause And Minimal Change

`src/lib/ga4-events.ts` pushes context to dataLayer in GTM mode and emits a gtag command for custom events other than GTM-forwarded `whatsapp_click`. `page_view` remains GTM-owned. `src/components/GoogleTagManager.tsx` creates the gtag queue and loads GTM after consent; it does not execute a gtag config command that populates the default routing group. Thus a queued custom event alone does not establish a destination or transport.

The patch adds `send_to: NEXT_PUBLIC_GA_MEASUREMENT_ID` only to the existing direct custom-event command in GTM mode, when configured. It does not add a config command, pageview, script, provider, GTM trigger, measurement-ID fallback, or change the direct-GA-only path. Destination is applied after caller metadata so the configured destination cannot be overridden by metadata. Context and server funnel payloads do not acquire `send_to`.

Google documents explicit event routing and the config-dependent default group in [Group and route data](https://developers.google.com/tag-platform/gtagjs/routing). This supports the routing mechanism, not a claim of observed GA4 reporting receipt.

## Local Verification

- PASS: focused Vitest run for `ga4-events.test.ts`, `gtm-consent.test.ts`, and `growth-analytics.test.ts`: 3 files, 16 tests.
- PASS: `npx tsc --noEmit --incremental false` and focused ESLint on the changed source/tests. Parent separately reports full 302-test pass, type-check pass, and lint with two pre-existing warnings; those are parent results, not a second full-suite run by this worker.
- Tests cover exactly one direct QA pricing CTA command with explicit configured destination, exact non-private fixture fields, QA classification in both transports, no destination leakage into dataLayer/server metadata, no invented destination without configuration, unchanged direct-GA routing, GTM-only WhatsApp, and no duplicate direct pageview.
- Bootstrap tests execute the actual rendered GTM inline script in an isolated VM: missing/malformed/denied consent does not load GTM; consent grant loads it once; repeated updates do not reload it; withdrawal queues analytics denial. No bootstrap source change. Marketing-only consent and actual post-withdrawal Google network behavior are not established by these tests; existing behavior is preserved.
- Privacy limit: the routing patch adds only a public measurement destination; the pricing fixture contains no names, contact details, account/document IDs, or free text. This is not an exhaustive PII audit of all existing event helper metadata (for example legacy subject/warranty-ID helpers).

## Network Proof Method And Boundary

Installed Chrome is launched by Playwright in an isolated disposable context; the bundled Playwright browser was unavailable. No regular user browser/tab or parent GA4 tab is used. No server or shared `.next` build is started.

All Warrantee URL requests are locally fulfilled, including the synthetic HTML path `/__local_qa_routing_only` and funnel endpoint. Only published `www.googletagmanager.com` scripts may load; other destinations are blocked. Google collect requests are intercepted before transmission. The actual TypeScript analytics module is transpiled in memory and executed with synthetic QA classification and explicit public environment IDs. No production environment file or private data is loaded.

Initial short-window comparison was inconclusive. A longer explicit-routing run captured the custom collect request with `tid=G-ZQJ4LRG4GN`, `en=funnel_cta_click`, `ep.traffic_class=qa`, and only the controlled CTA fields. Aborting requests caused identical-sequence transport retries, so that run alone does not prove once-only dispatch. A further comparison uses local synthetic 204 responses to suppress transport retries; final counts are recorded below when observed. Synthetic 204 is not Google acceptance or GA4 receipt.

### Final Synthetic-204 Comparison - PASS

Two isolated contexts each loaded the published GTM script, waited 15 seconds, invoked one controlled pricing CTA through the actual in-memory-transpiled analytics module, and observed requests for a further 15 seconds. Collection was locally fulfilled, not transmitted to Google.

| # | Variant | page_view Requests | scroll Requests | funnel_cta_click Requests |
| --- | --- | --- | --- | --- |
| 1 | GTM without explicit destination (pre-patch behavior) | 1 | 1 | 0 |
| 2 | GTM with configured send_to | 1 | 1 | 1 |

The single custom request had `tid=G-ZQJ4LRG4GN`, `en=funnel_cta_click`, `ep.traffic_class=qa`, sequence `_s=3`. No extra pageview or custom event was observed in this window. Contexts/browser were closed. This establishes local routing/dispatch, not Google acceptance, reporting, or universal deduplication across untested GTM changes.

Parent reports the production build passed with 254 routes and pre-existing metadataBase warnings; this worker did not run a competing build or modify those warnings. The parent's subsequent local Markdown gate could not complete: local `/api/health` reported missing Supabase URL because the generated ignored development environment contained OIDC only. **LOCAL ENV GAP**, not a production failure. Parent stopped the local server cleanly, with no port 3110 listener remaining. No production secrets were loaded; configured CI must run the gate separately.

### Authorized Actual Collector Check

After explicit owner authorization, an isolated Chrome context loaded the real `https://warrantee.io/en/pricing` with analytics consent granted and marketing denied, using a Warrantee-QA user agent. The actual modified analytics module and actual traffic-classification module were transpiled in memory; no code was deployed. One controlled CTA helper was invoked without clicking signup, submitting a form, or sending a message.

Only the first custom collect request matching the exact measurement ID, `funnel_cta_click`, and `traffic_class=qa` could leave for a Google Analytics collector. Other collect requests received local synthetic 204 responses; non-GET/HEAD requests (including server funnel POSTs) were locally fulfilled. This deliberately tests the new source path against Google's collector without creating application records or customer conversions.

- Actual transmission: `2026-11-07T16:08:15.309Z` (19:08:15 Riyadh), host `www.google-analytics.com`, `tid=G-ZQJ4LRG4GN`, `en=funnel_cta_click`, `ep.traffic_class=qa`.
- Actual Google response: HTTP 204 at `2026-11-07T16:08:15.956Z`.
- Final observation: exactly 1 allowed actual custom collect request and 1 HTTP 204 response. Disposable browser/context closed; no task-owned tabs remain.
- Google 204 is collector transport evidence, **not GA4 reporting/UI receipt**. Parent is independently checking the correct property's Realtime view. Production deployment still has not changed.

## Historical Parent Receipt And Current Remaining Verification

The parent independently observed GA4 Realtime in regular Chrome, authenticated
as the authorized owner, on property `530040415`: baseline zero events became
exactly one `funnel_cta_click` after the controlled 16:08:15 UTC transmission.
The event parameter drill-down confirmed `traffic_class=qa`, count 1.
No key event was recorded. This confirms reporting receipt for the controlled
test, not customer demand or a deployed-bundle verification.

1. Confirm final local routing comparison and preserve consent/dedup boundaries.
2. Normal reviewed release gates are now recorded for PR #42 in the latest release section above; this documentation task authorizes no commit or deploy.
3. After an authorized release, observe one controlled consented QA CTA transport and correct-property GA4 receipt, including timestamp/event/QA classification. Standard pageviews and gtag/dataLayer queues are insufficient.
4. Keep task 1 pending until receipt is observed. Do not use synthetic traffic as activation, demand, qualified leads, or payment evidence.
