-- Per-user API integration tokens for server-to-server customer integrations.
-- Tokens are shown once by the application, then only a SHA-256 hash is stored.

create extension if not exists pgcrypto;

create table if not exists public.api_integration_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  token_prefix text not null,
  token_hash text not null unique,
  scopes text[] not null default array['warranties:read', 'warranties:write']::text[],
  rate_limit_per_minute integer not null default 100,
  last_used_at timestamptz,
  expires_at timestamptz not null default (now() + interval '365 days'),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint api_integration_tokens_name_len check (char_length(name) between 2 and 120),
  constraint api_integration_tokens_prefix_len check (char_length(token_prefix) between 8 and 32),
  constraint api_integration_tokens_hash_len check (char_length(token_hash) = 64),
  constraint api_integration_tokens_rate_limit_range check (rate_limit_per_minute between 1 and 300),
  constraint api_integration_tokens_scopes_allowed check (
    scopes <@ array['warranties:read', 'warranties:write']::text[]
    and cardinality(scopes) > 0
  )
);

create index if not exists api_integration_tokens_user_id_idx
  on public.api_integration_tokens(user_id);

create index if not exists api_integration_tokens_active_prefix_idx
  on public.api_integration_tokens(token_prefix)
  where revoked_at is null;

create unique index if not exists api_integration_tokens_active_prefix_unique_idx
  on public.api_integration_tokens(token_prefix)
  where revoked_at is null;

create index if not exists api_integration_tokens_expires_at_idx
  on public.api_integration_tokens(expires_at)
  where revoked_at is null;

alter table public.api_integration_tokens enable row level security;
alter table public.api_integration_tokens force row level security;

revoke all on table public.api_integration_tokens from anon;
revoke all on table public.api_integration_tokens from authenticated;

-- The Next.js server manages this table with the service role so token hashes
-- are never exposed through Supabase Data API grants. No authenticated policies
-- are created on purpose; if table grants are broadened later, RLS still denies
-- direct Data API access.
drop policy if exists api_integration_tokens_owner_metadata_read on public.api_integration_tokens;

notify pgrst, 'reload schema';
