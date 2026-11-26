# Public Certificate Issuance Boundary

Warrantee only. Follow-up to PR #55 at baseline
`0613a9bfbd90ab5c4f8eb9d7f610498ccf5675e2` in the existing Vercel project.
No customer records, communications, credentials, providers, migrations, visual
markup, pricing, analytics settings or postponed work are changed.

Two synthetic regressions reproduced an inherited gap: the public certificate
and public JSON lookup both returned 200 for a cancelled, never-approved
warranty. Rejection shares the cancelled status with previously issued records.
The initial two assertions failed (200 instead of 404); after the fix they pass.

Both public lookup paths now apply the shared issuance rule, including a
database predicate before each UUID/reference/serial lookup limit. Never-issued
cancellations are excluded before rendering or disclosure; valid issued,
claimed, expired, renewed and approval-backed cancelled records retain access.
Historical cancelled records without approval evidence fail closed, without
changing or deleting them. Rate limits, query bounds, CSP and serial masking
remain unchanged. Approval timestamps are internal only: the JSON response uses
an explicit projection of the same eleven previously public fields.

Independent review found the public certificate UUID pattern also omitted part
of the fourth group. A query-matching fixture reproduced the resulting 404 for
a valid UUID; the pattern now matches the existing public JSON lookup pattern.
Explicit UUID/reference/serial branch assertions prevent silent fallback from
masquerading as UUID coverage.

Require complete certificate rendering/privacy tests, full unit/type/lint,
isolated real database/signup and legacy browser gates, CodeQL, preview and
production read-only checks before completion. A partial test-name-filter run
is reproduction evidence only, not a complete passing suite. A later matrix
initially lacked the selected created_at fixture field; it was added without
weakening the public-field assertion. Record exact commits, CI and deployment
receipts in the follow-up release PR.

No authenticated customer request or synthetic production record is authorized.
Production OCR/browser proof still awaits a natural scheduled Security Gates
run; do not dispatch or rerun it. Arabic OCR issue #53 and all postponements
remain separate. Public content policy remains
`search=yes, ai-input=yes, ai-train=no`.

Rollback is a reviewed source revert or prior Ready deployment
`dpl_DeuNcmucdGjreHMN9TZrMJReJDKb`; there is no database rollback. Returning to
that baseline restores this known public eligibility gap.
