# Lifecycle Assurance Follow-Up - 2026-11-11

Warrantee only. Owner approved the five follow-ups below. No public visual or
copy changes, production test identities or records, new paid resources,
provider activation, production schema change, or postponed work are included.
The verified starting release is [PR #48](https://github.com/abdulazizalrayes/warrantee/pull/48#issuecomment-6777327913),
main `ed9d990a7531816aeb3acc351444faab6c4e5f60`, Vercel `dpl_B55SndBhyKbTHLHteBGBoAWjHgu1`.

1. Admin loading uses a stable callback, separates data refresh from auth, and
   aborts or ignores superseded requests. Keep existing copy and layout. Focused
   tests exercise the role gate, refresh, failure recovery, and stale responses.
2. Disposable runner startup and cleanup have bounded subprocess deadlines and
   fixed diagnostic categories. Negative tests fail a deliberately stalled
   preflight and confirm raw subprocess output stays private. The previous
   startup failure's exact cause remains unknown; no retry or assertion was added
   to make a failed application test green.
3. Extend the actual fresh-user test through Business approval, certificate,
   public QR destination verification and a persisted claim. Use only the guarded
   disposable services; preserve existing creation and retry checks.
4. Reconcile the passive ZAP inventory as recorded below. Fix only reproduced
   app-owned defects; no exploitable issue was reproduced in the checked cases.
5. Put PR #48 at the top of the operational status and backlog, keeping dated
   checkpoints and every existing owner postponement.

## Passive ZAP Disposition

[Issue #14](https://github.com/abdulazizalrayes/warrantee/issues/14) remains open
as the weekly scanner's rolling inventory, not an open vulnerability ticket.
November 11 checks used read-only public requests and source review. No form
submission, active scan, private records, or provider configuration changes.

| Classification | Evidence And Disposition |
| --- | --- |
| Resolved or historical | The [November 9 scanner update](https://github.com/abdulazizalrayes/warrantee/issues/14#issuecomment-6739525552) marked both inline CSP alerts resolved. Sampled public HTML has script hashes, no script `unsafe-inline`/`unsafe-eval`, and blocks script attributes. Sampled EN/AR contact/support forms specify `POST`; recognized contact intents select fixed copy. The anonymous new-warranty route redirects to same-origin sign-in with no private body. |
| Intentional or informational | Script and style elements have separate restrictions; inline style attributes and the legacy fallback are retained for compatibility. Sampled public CORS is credential-free; MCP returns `no-store`. COOP/COEP were absent on sampled responses, but no isolation requirement or related defect was demonstrated. Cache, Base64 and Fetch Metadata scanner observations do not establish disclosure. |
| Provider-owned or attributed | Missing headers on `/cdn-cgi/` are [Cloudflare-managed observations](https://developers.cloudflare.com/fundamentals/reference/cdn-cgi-endpoint/#exclude-from-security-scanners). Two opaque JavaScript responses lacked some headers. Their content and response markers are consistent with Vercel [Speed Insights](https://vercel.com/docs/speed-insights/troubleshooting#requests-are-not-getting-called) and [Web Analytics](https://vercel.com/docs/analytics/troubleshooting); exact provider configuration was not inspected. These gaps do not reproduce a Warrantee exploit. |
| Not covered by this triage | Authenticated browser/tenant coverage, live POST/CSRF execution, alternate cache variants and independent penetration testing were not exercised by these passive checks. Isolated CI is a separate evidence source. |

Do not remove provider scripts, change headers or resume the postponed pentest
merely to clear the inventory. Track any newly reproduced defect separately.

## Release Gate

Require passing exact-candidate CI, isolated lifecycle execution, CodeQL,
protected preview and public semantic HTML preservation before production.
Read-only live checks and exact deployment identity are separate from the
isolated data-write proof. Record final results and rollback in the release PR
closeout. This document does not assert completion of a pending deployment.
