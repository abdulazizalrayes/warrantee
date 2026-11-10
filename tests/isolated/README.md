# Isolated Signup Journey Gate

## Entry Points

```sh
node scripts/run-isolated-signup-journey.mjs --check
node --test tests/isolated/contracts.test.mjs
WARRANTEE_ISOLATED_E2E=1 node scripts/run-isolated-signup-journey.mjs --run
```

Prerequisites: installed repository dependencies, Node 24, Docker, Chromium and
Supabase CLI 2.84.2. CI uses exact `npx supabase@2.84.2`, standard public-repository
Ubuntu compute, no repository secrets, no persistent caches or artifacts. The Mac
without Docker cannot establish the real journey result. Static checks are not an
E2E pass and deployment remains gated on a successful actual Ubuntu run.

The runner initializes a fresh temporary Supabase directory, never links a remote
project, starts real GoTrue/Postgres/PostgREST/storage/Mailpit and bootstraps only
the selected contracts. It builds a temporary source snapshot without dotfiles,
ignored configuration, or inherited provider credentials. Shared `node_modules`
are read-only inputs; the shared checkout's build output is untouched. No npm
install is run in the shared checkout by the runner.

Runtime contract (ephemeral keys are obtained only from local CLI status):

- `WARRANTEE_ISOLATED_E2E=1`, no `VERCEL` or `VERCEL_ENV`.
- `NEXT_PUBLIC_APP_URL` and `E2E_BASE_URL`: `http://127.0.0.1:3100`.
- `NEXT_PUBLIC_SUPABASE_URL`: `http://127.0.0.1:54321`.
- `ISOLATED_MAIL_URL`: `http://127.0.0.1:54324`.
- Local-only anon/service keys and a unique `ISOLATED_RUN_ID` checked against a
  service-only bootstrap marker before every helper's mutation phase.
- Strict parent-owned opt-in CSP must admit the exact local backend. No bypass.
- Google IDs, OAuth provider credentials, CRM, Resend, Stripe, private OCR,
  scanner and remote Redis credentials are absent. No external integration or
  scheduled worker is enabled. Callback follow-up attempts can record local
  retries when provider credentials are absent, but cannot send externally.

To reuse the guarded backend and real Next server with an existing command:

```sh
WARRANTEE_ISOLATED_E2E=1 node scripts/run-isolated-signup-journey.mjs --run -- node path/to/local-only-check.mjs
```

The child runs in the source snapshot with the same guarded environment and an
outbound-network preload. It never inherits production QA credentials. Only
the custom-command path creates a fresh marker-guarded local legacy identity
and supplies ephemeral `E2E_USER_EMAIL`/`E2E_USER_PASSWORD` to that child. Its local
profile is onboarding-complete and `super_admin` for existing admin UI fixtures;
the default signup gate does not seed this identity or bypass signup. The helper
can also wrap a command as `node tests/isolated/legacy-identity.mjs -- command`.
A custom command must explicitly enforce the backend marker too. Missing
fixtures must fail, not skip. This reuse
entry is infrastructure, not a claim that every existing suite is supported.

The legacy CI owner supplies `legacy-base.sql` / `legacy-bootstrap.mjs`. Only the
custom-command lane applies this additive canonical expansion, after verifying
the focused marker and before creating its legacy identity. CI invokes
`env E2E_SUITE=isolated-regression ISOLATED_MIN_CASES=246` before Playwright.
Both reporter and runner require at least 246 passed active cases with no
failures, skips, flakes or global errors; a zero exit with no recognized safe
summary is not success. The dedicated signup lane requires all ten journeys.
Legacy expansion has static source validation; runtime completeness still
requires the actual Ubuntu run.

## Real Fonts Without Runtime Egress

`DocumentShell.tsx` uses next/font's IBM Plex Sans Arabic weights 300-700,
Arabic subset, swap display and no preload. The runner validates that exact
source contract, then prefetches its current Google Fonts CSS and real WOFF2
dependencies before launching any network-isolated process. Only the generated
exact Google Fonts CSS URL and IBM-family `fonts.gstatic.com` WOFF2 paths are
accepted; redirects, other families/formats, oversized assets and non-WOFF2 bytes
fail closed. SHA-256 and byte-for-byte local reads verify the temporary files.

Next's test-only `NEXT_FONT_GOOGLE_MOCKED_RESPONSES` hook maps that CSS URL to
equivalent CSS using absolute paths to those real bytes. Next's own loader reads
and emits the actual font files. No production source, font choice, glyph data,
weight, CSS declaration or HTML is replaced. No fake URL-string font buffers are
used. The temporary response map/font files are deleted with the run; they are
not persistent caches. Upstream font acquisition is a build prerequisite, not
an external provider test or analytics request. Runtime remains loopback-only.
Arabic browser cases require the actual brand-font face to load successfully.

## Coverage And Evidence

Ten cases cover personal/business, EN/AR, completed/skipped onboarding, and two
local PNG attachments. Signup uses the actual email/password form, real GoTrue
SMTP captured by Mailpit, and its confirmation link in the same PKCE browser.
No admin-confirmation fallback, injected session, fake-success response, or
mocked database is used. Tests check actual profile/subscription/company rows,
failed onboarding persistence, invalid API input, lost-response retry with the
same ID/key/body, mismatch conflicts, RLS tenant isolation and profile privilege
denial, forged activation denial, authoritative RPC audit/milestone rows and
local stored attachment bytes in `pending_scan` state.

Before the build, the runner also executes the parent-owned
`src/lib/__tests__/warranty-creation-db.test.ts` (minimum 49, including five
real attachment-finalization cases) and
`src/lib/__tests__/oauth-signup-setup-db.test.ts` (minimum 13) against the real DB.
Every registered file must meet its own minimum with no skipped/todo tests; empty/malformed success
reports fail closed. These cover concurrency, rollback, durable snapshots,
membership revocation, forged telemetry, approval transitions and direct RPC
payload validation, plus local durable OAuth setup registration/replay/revocation.
Only aggregate JSON counts and at most twelve failed assertion coordinates
(registered source file and 1-based assertion index, no titles/errors/rows) are
forwarded to CI output. External OAuth remains
untested even when the local provider-metadata fixtures pass.

Completed cases intentionally use an ordinary browser UA to exercise the
human-classified trigger branch. They remain **synthetic isolated fixtures**,
never real demand or verified-human evidence. Skipped cases use a QA UA and
must not emit authoritative activation milestones. Both consent granted and
denied are exercised while Google is disabled and all external browser/runtime
requests are blocked. First-party funnel writes stay local. These tests do not
claim the disabled Google collector handshake was exercised; production
analytics-bootstrap privacy contracts remain the parent's separate coverage.

The external Google/Apple OAuth provider handshake is **NOT TESTED**; it requires
external credentials/services. Parent-owned callback/unit tests cover its local
contracts. Billing, private OCR/provider activation, scanning, pentest and all
postponed work remain excluded. Enqueued welcome/CRM jobs are not processed.

Retries, skips, empty runs and flaky outcomes fail the dedicated gate. Logs show
only bounded numeric case counters, source lines, registered diagnostic step,
SQLSTATE, and compile source coordinates/codes. No raw SQL, confirmation links,
session tokens, emails, HTTP logs, browser traces or artifacts are persisted.
Cleanup stops only this random local project with `--no-backup` and removes its
temporary source/configuration on success, failure or handled interruption.

## Schema Boundary

`base.sql` is a focused reconstructed prerequisite fixture, NOT a production
schema clone, full migration replay, backup, restore or disaster-recovery test.
Its column names/enums are validated against checked-in generated database types.
`bootstrap.mjs` loads exact bounded SQL sections without rewriting policy or
function bodies, plus the full new transactional warranty migration. Latest
critical function replacements are checked to prevent stale definitions.

Canonical sections supply profile/auth triggers, subscriptions, account plans,
onboarding, tenant helpers and policies, owner-prefixed storage, profile grants,
state transitions, document security, service-only idempotency/job tables, and
the new RLS-bound warranty transaction/activation triggers. Historical billing
and provider implementations are not replayed. Empty claims/notifications exist
only to support the initial authenticated shell; no claims workflow is implied.

**Full existing CI is NOT supported by the focused fixture alone.** Existing business
and operational suites also require canonical claims/events/attachments,
extensions, imports/rollback, API token/usage/audit tables and RPCs, scan/OCR and
payment behavior. Empty operations tables or permissive replacement policies
would not preserve those tests. The separate legacy expansion supplies canonical
contracts for its custom lane, with runtime results explicitly unverified until
they pass on Ubuntu. Never seed production as a fallback, silently
skip protected/security checks, or call this signup gate their replacement.
