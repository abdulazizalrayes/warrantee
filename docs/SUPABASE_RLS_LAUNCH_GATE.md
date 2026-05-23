# Supabase RLS Launch Gate

Status: launch-blocking until `npm run security:rls-probe` returns cleanly against production.

## Current Finding

The production anonymous Supabase probe detected that `public.warranties` returns at least one row through the anon key. That means database-side RLS is not fully protecting warranty records yet.

## Required Fix

Apply:

```text
sql/2026-05-20-lock-down-warranty-rls.sql
```

The same SQL is also copied as a Supabase migration:

```text
supabase/migrations/20260520142000_lock_down_warranty_rls.sql
```

If a direct database URL or Supabase access token is available locally, use:

```bash
npm run security:apply-rls
```

## Verification

After applying the SQL in the Supabase SQL editor or through an authenticated Supabase CLI session, run:

```bash
npm run security:rls-probe
npm run smoke:prod
```

Expected result:

- `security:rls-probe` exits with `0`.
- All sensitive tables return `0` rows or an authorization/schema error to anonymous clients.
- `smoke:prod` exits with `0`.

## CI Guardrail

`.github/workflows/production-security.yml` runs the production smoke test and RLS probe manually and daily. It is intentionally separate from the normal CI workflow so pull requests are not blocked by live environment state, while production exposure remains visible.
