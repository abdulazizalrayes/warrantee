# Warrantee funnel scan reconciliation - 1 October 2026

Scope: abdulazizalrayes/warrantee, warrantee.io, Supabase erptubrslnfmkuouczgn.

## Evidence (aggregate only)

- ZAP run 36407654870 scanned production on September 28 from 10:06:22 to 10:13:02 UTC.
- All 21 signup-submit events occurred from 10:08:42 to 10:12:49 UTC, inside that window. No new auth accounts have persisted since September 26.
- Four contact events occurred from 10:08:36 to 10:08:38 UTC: two browser events labeled human and two server events without classification.
- Two support tickets were created during the scan. The contact API writes support_tickets, not contact_submissions. Counting only contact_submissions incorrectly suggested no stored inquiries.
- The scan enabled browser crawling with -j, and did not disable the traditional spider's default form processing or set a QA user agent.
- Temporal correlation strongly suggests synthetic activity, but is not per-request proof. Do not count this burst as confirmed real demand or delete/reclassify records based only on timestamps.

## Narrow prevention

Remove browser crawling from the production passive scan, disable form processing and POST forms, and set the existing Warrantee-QA user agent. Add traffic classification to server contact events. No website appearance, customer form behavior, authentication, or historical records changed.

Tradeoff: this production scan no longer exercises browser-only routes. Browser-based security testing belongs in an isolated environment with controlled fixtures and disabled communications. A passive scanner's analysis can be passive while its browser still submits forms.

## Verification and remaining evidence

Regression tests check scan flags, QA classification, and contact telemetry wiring. These source tests do not prove a live ZAP run's behavior. Before declaring production fixed, review CI, merge the change, then verify the next scheduled scan's request behavior and aggregate events. No scan against production was triggered for this investigation.

GA4, Twenty lead delivery, auth failure reasons, and request-level historical scan attribution remain unverified. Contact-event counts can include browser and server representations of the same submission; they are not unique leads. Do not publish a conversion rate from these counts.

Rollback: revert the remediation commit, noting that doing so restores the unsafe scan settings. Prefer correcting the scan rather than restoring form crawling.

Sources: https://github.com/abdulazizalrayes/warrantee/actions/runs/36407654870 ; https://www.zaproxy.org/docs/desktop/addons/spider/ ; https://www.zaproxy.org/docs/desktop/addons/selenium/ .
