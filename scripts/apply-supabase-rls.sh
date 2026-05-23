#!/usr/bin/env bash
set -euo pipefail

SQL_FILE="${1:-sql/2026-05-20-lock-down-warranty-rls.sql}"

if [[ ! -f "$SQL_FILE" ]]; then
  echo "SQL file not found: $SQL_FILE" >&2
  exit 1
fi

if [[ -n "${SUPABASE_DB_URL:-}" ]]; then
  supabase db query --db-url "$SUPABASE_DB_URL" --file "$SQL_FILE"
elif [[ -n "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  supabase link --project-ref erptubrslnfmkuouczgn --yes
  supabase db query --linked --file "$SQL_FILE"
else
  cat >&2 <<'EOF'
Missing Supabase database access.

Set one of:
- SUPABASE_DB_URL: direct database connection string
- SUPABASE_ACCESS_TOKEN: Supabase management access token

Then rerun:
  scripts/apply-supabase-rls.sh
EOF
  exit 1
fi

npm run security:rls-probe
