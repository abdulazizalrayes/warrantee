# Warrantee Recovery Readiness - 2026-11-07

## Scope and Outcome

Read-only discovery for Supabase project `erptubrslnfmkuouczgn` only, in shared
checkout `/private/tmp/warrantee-crawlers-20261107`, branch
`codex/operational-assurance-1-5`. No production rows queried/exported, restore,
schema change, deletion, paid resource, credential change, communication, commit,
or deployment. Existing unrelated worker changes must be preserved.

**PASS: provider backup records accessible. UNTESTED: recoverability.**
Provider completion is not a verified restore, independent backup, or RPO/RTO proof.

## Verified Provider Evidence

Observed around `2026-11-07T16:00:11Z` via existing authenticated Supabase CLI
2.84.2, using only `backups list --project-ref erptubrslnfmkuouczgn --output json`.
CLI help was inspected first. Credentials were neither printed nor extracted;
the CLI's saved authentication worked although no token environment variable or
standard token file was present. Exact credential storage mechanism was not inspected.

The connected Supabase project lookup independently returned name `warrantee`,
region `eu-west-1`, status `ACTIVE_HEALTHY`, database version `17.6.1.084`, engine 17.
Backup metadata: `pitr_enabled=false`, `walg_enabled=true`, no populated
`physical_backup_data` fields. All eight records below have `status=COMPLETED`
and `is_physical_backup=true`.

| # | Provider inserted_at (UTC) |
| --- | --- |
| 1 | 2026-11-07T04:36:33.101Z |
| 2 | 2026-11-06T04:35:27.461Z |
| 3 | 2026-11-05T04:35:20.530Z |
| 4 | 2026-11-04T04:35:18.939Z |
| 5 | 2026-11-03T04:35:23.590Z |
| 6 | 2026-11-02T04:35:18.603Z |
| 7 | 2026-11-01T04:36:37.439Z |
| 8 | 2026-10-31T04:35:19.345Z |

Newest record age was about 11.4 hours. `inserted_at` is a provider record timestamp,
not an independently verified snapshot/completion time. Daily cadence is observed,
not a verified configured schedule or retention commitment. PITR is explicitly off;
do not enable it or a paid restore/new project under this discovery authority.

## Existing Configuration and Gaps

- Read `CLAUDE.md`, architecture identity/constraints, encrypted-backup-restore
  skill and evidence checklist, and Supabase skill.
- Repository searches found no recovery/backup-named artifacts and no backup
  configuration references in `.github` or `supabase`. Existing workflows are
  CI, CLI release, passive DAST, and production security; migrations and the
  production migration manifest are source/reconciliation aids, not backups.
- `docs/TAKEOVER_AUDIT_2026-07-24.md` identifies backup/PITR/restore objectives
  and drill as unresolved assurance work (lines 779 and 894). References to
  restoring migration sources in the remediation document do not prove data recovery.
- UNTESTED: configured schedule/retention, backup size/checksum, encryption/key
  custody, independent/off-provider copy, failure alerts, first-run/staleness
  monitoring, storage-object content recovery, auth/config recovery, regional
  recovery, application restore checks, and achieved RPO/RTO. No such proof was
  returned by this metadata operation. Do not infer absence of backups from these gaps.
- ACCESS GAP: connector exposes no backup-list operation; existing CLI resolves
  metadata access. Browser inventory exposed no available browser surface; no tabs opened.
- Owner-checkout environment metadata inspection blocked on filesystem access
  and was interrupted without returning file content. No secrets were copied.

## Local Tooling

`postgres`, `psql`, `pg_dump`, `pg_restore`, `initdb`, and `docker` were absent
from PATH. Standard Homebrew libpq/Postgres 17, Postgres.app latest, and Docker.app
binary locations were also absent. Supabase CLI 2.84.2 and `/usr/bin/openssl`
exist; `age` and `gpg` are absent on PATH. This is a bounded discovery, not a
full-disk inventory. Nothing installed, upgraded, downloaded, or started.

The changelog advertises CLI v3 behavior changes; keep this v2 operation
version-qualified and re-read help after any separately approved upgrade.
OpenSSL presence alone does not establish approved authenticated encryption.

## Repeatable Check and Tests

Run from this checkout:

```sh
node scripts/recovery-backup-metadata.mjs
node --test scripts/recovery-backup-metadata.test.mjs
```

The checker has a fixed project and read-only CLI command, rejects arguments,
uses a 20-second timeout/1 MiB response bound, suppresses raw errors, emits only
allowlisted metadata, and does not write artifacts or accept connection strings.
Tests use in-memory synthetic records only; they test filtering/validation and
age calculation, not encryption, database restore, or production backup integrity.

## Parent-Coordinated Next Steps

1. Record owner-selected RPO/RTO, retention, data scope, key custodian, schedule,
   alert recipient, and restore frequency. Read existing provider backup schedule
   and retention through a documented read-only endpoint or authenticated dashboard.
2. Parent must identify an existing approved Warrantee-only encrypted local
   location before any real export. No approved data destination was established
   here. Proposed path ONLY, not created or approved:
   `/Users/abdulazizalrayes/Library/Application Support/Warrantee/recovery/2026-11-07/`.
   Confirm dedicated ownership/permissions, encrypted storage, no cloud sync,
   sufficient disk, key separation, and retention before use. Never put real rows
   in this shared `/private/tmp` checkout, repository, logs, or external provider.
3. Provision free local PostgreSQL 17 tooling only through the parent's coordinated
   installation decision. Use a dedicated cluster beneath the approved destination,
   local Unix socket only, no network listener, no application/provider credentials,
   disabled outbound integrations/jobs, and no production connection inherited.
4. Select a provider-supported recovery/export method. Physical backup records
   are not assumed downloadable or pg_restore-compatible. A fresh pg_dump would
   prove that new logical export only, not restore of these provider artifacts.
   No automatic production restore or new paid Supabase project/branch is authorized.
5. Once source and target are approved, measure snapshot age, checksum/decryption,
   archive validity, migration/schema parity, aggregate counts and invariants,
   RLS/tenant boundaries, and representative offline application reads. Treat
   Storage file contents separately; database metadata alone does not recover them.
   Capture timings and sanitized evidence. Retain drill data until explicit cleanup approval.

## Official References

- https://supabase.com/docs/guides/platform/backups
- https://supabase.com/docs/reference/api/v1-list-all-backups
- https://supabase.com/changelog.md
- https://supabase.com/changelog/supabase-cli-v3

References describe provider behavior, not evidence that this project's restore works.
