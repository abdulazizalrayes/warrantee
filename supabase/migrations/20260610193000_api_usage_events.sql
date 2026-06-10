-- API usage metering for Warrantee public API clients.
-- Service-role routes insert these rows after auth/rate-limit checks so usage,
-- errors, and abuse can be attributed without exposing token secrets.

create table if not exists public.api_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token_id uuid null references public.api_integration_tokens(id) on delete set null,
  credential_kind text not null check (credential_kind in ('user', 'api_key')),
  method text not null,
  path text not null,
  status_code integer not null check (status_code between 100 and 599),
  scope text null,
  ip_hash text null,
  user_agent text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists api_usage_events_user_created_idx
  on public.api_usage_events (user_id, created_at desc);

create index if not exists api_usage_events_token_created_idx
  on public.api_usage_events (token_id, created_at desc)
  where token_id is not null;

create index if not exists api_usage_events_path_created_idx
  on public.api_usage_events (path, created_at desc);

alter table public.api_usage_events enable row level security;

revoke all on table public.api_usage_events from anon;
revoke all on table public.api_usage_events from authenticated;

grant select on table public.api_usage_events to authenticated;
grant select, insert, update, delete on table public.api_usage_events to service_role;

drop policy if exists "Users can read their own API usage events" on public.api_usage_events;
create policy "Users can read their own API usage events"
  on public.api_usage_events
  for select
  to authenticated
  using (user_id = auth.uid());
