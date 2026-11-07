# Warrantee Aggregate Activation Verification - 2026-11-07

## Identity and Method

Read-only aggregate SQL against verified Supabase project
`erptubrslnfmkuouczgn` (`warrantee`, ACTIVE_HEALTHY). No names, addresses,
customer documents, or individual records were returned. No accounts, messages,
or warranties were created or modified.

Classification matches `scripts/reconcile-twenty-leads.mjs`: exclude internal
domains, owner-name addresses, QA/test/e2e/demo/codex/synthetic/monitoring prefixes,
and admin/super_admin/support roles. These heuristics identify candidates, not
owner-verified customers; unmarked test accounts may still exist.

## Results

| # | Measure | Since July 14 reconciliation window | Older candidates |
| --- | --- | --- | --- |
| 1 | Candidate profiles | 4 | 3 |
| 2 | Confirmed authentication accounts | 4 | 3 |
| 3 | Onboarding-complete profile flag | 3 | 1 |
| 4 | Business account profiles | 1 | 0 |
| 5 | Accounts signed in in the last seven days | 0 | 0 |

Across both cohorts: one company created by a candidate; zero undeleted
warranties linked through `issuer_user_id` or `created_by`; zero corresponding
certificate URLs; zero weekly issuing companies under this attribution.
This reconciles the latest security gate's four CRM signup candidates: it uses
the July 14 start date, whereas all-time matching profiles total seven.

## Interpretation and Limits

Signup is not the same as activation. The measured gap is after account creation
and before first warranty creation. An onboarding flag is not evidence of a
generated certificate, a successful real buyer journey, retention, or payment.
Historical owner/QA warranties must not be presented as customer adoption.

An additional aggregate query checked active candidate company memberships and
company creators, issuer/recipient company IDs, and legacy `user_id`, `buyer_id`,
`seller_id`, and `recipient_user_id` links. It also returned zero undeleted
warranties and zero certificates. Deleted records were intentionally excluded.
North Star requires a real-company cohort and an agreed issuance status/time
definition, not just a created-row count. No qualified-demand conclusion can be
drawn from these counts alone.

Next practical step: validate the first-warranty golden path and custom-event
receipt, then observe genuine candidate progression. Outreach and new product or
visual changes are not authorized by this measurement task.
