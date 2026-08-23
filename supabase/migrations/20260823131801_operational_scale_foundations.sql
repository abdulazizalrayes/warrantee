-- Operational scale foundations: client identities, idempotency, search,
-- append-only audit evidence, recoverable jobs, rollups, and ledger checks.

create extension if not exists pg_trgm;

create table if not exists public.api_clients (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 120),
  environment text not null default 'live' check (environment in ('test','live')),
  status text not null default 'active' check (status in ('active','suspended','revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists api_clients_owner_created_idx on public.api_clients (owner_user_id, created_at desc);
create index if not exists api_clients_company_status_idx on public.api_clients (company_id, status) where company_id is not null;

alter table public.api_integration_tokens
  add column if not exists client_id uuid references public.api_clients(id) on delete cascade,
  add column if not exists company_id uuid references public.companies(id) on delete cascade;
create index if not exists api_integration_tokens_client_idx on public.api_integration_tokens (client_id) where client_id is not null;

alter table public.api_usage_events
  add column if not exists client_id uuid references public.api_clients(id) on delete set null,
  add column if not exists company_id uuid references public.companies(id) on delete set null;
create index if not exists api_usage_events_client_created_idx on public.api_usage_events (client_id, created_at desc) where client_id is not null;
create index if not exists api_usage_events_company_created_idx on public.api_usage_events (company_id, created_at desc) where company_id is not null;
create index if not exists api_usage_events_rollup_day_idx on public.api_usage_events (created_at, user_id, company_id);

create table if not exists public.api_idempotency_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references public.api_clients(id) on delete cascade,
  method text not null,
  path text not null,
  idempotency_key text not null check (char_length(idempotency_key) between 8 and 200),
  request_hash text not null check (char_length(request_hash) = 64),
  status text not null default 'processing' check (status in ('processing','completed','failed')),
  response_status integer check (response_status is null or response_status between 100 and 599),
  resource_type text,
  resource_id uuid,
  expires_at timestamptz not null default (now() + interval '24 hours'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists api_idempotency_scope_key_idx
  on public.api_idempotency_records (
    user_id,
    coalesce(client_id, '00000000-0000-0000-0000-000000000000'::uuid),
    method,
    path,
    idempotency_key
  );
create index if not exists api_idempotency_expiry_idx on public.api_idempotency_records (expires_at);

create index if not exists warranties_product_name_trgm_idx
  on public.warranties using gin (lower(coalesce(product_name, '')) gin_trgm_ops)
  where deleted_at is null;
create index if not exists warranties_product_name_ar_trgm_idx
  on public.warranties using gin (lower(coalesce(product_name_ar, '')) gin_trgm_ops)
  where deleted_at is null;
create index if not exists warranties_serial_trgm_idx
  on public.warranties using gin (lower(coalesce(serial_number, '')) gin_trgm_ops)
  where deleted_at is null;
create index if not exists warranties_reference_trgm_idx
  on public.warranties using gin (lower(coalesce(reference_number, '')) gin_trgm_ops)
  where deleted_at is null;
create index if not exists warranties_seller_name_trgm_idx
  on public.warranties using gin (lower(coalesce(seller_name, '')) gin_trgm_ops)
  where deleted_at is null;
create index if not exists warranties_sku_trgm_idx
  on public.warranties using gin (lower(coalesce(sku, '')) gin_trgm_ops)
  where deleted_at is null;
create index if not exists warranties_rollup_day_idx
  on public.warranties (created_at, issuer_company_id, user_id, created_by, issuer_user_id)
  where deleted_at is null;
create index if not exists warranty_claims_rollup_day_idx
  on public.warranty_claims (created_at, warranty_id)
  where deleted_at is null;
create index if not exists warranty_passport_events_rollup_day_idx
  on public.warranty_passport_events (event_day, event_type, warranty_id);
create index if not exists warranty_extension_requests_rollup_day_idx
  on public.warranty_extension_requests (created_at, warranty_id);

create table if not exists public.platform_audit_events (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  table_name text not null,
  record_id uuid,
  action text not null check (action in ('insert','update','delete')),
  occurred_at timestamptz not null default now()
);
create index if not exists platform_audit_record_idx on public.platform_audit_events (table_name, record_id, occurred_at desc);
create index if not exists platform_audit_company_idx on public.platform_audit_events (company_id, occurred_at desc) where company_id is not null;
create index if not exists platform_audit_actor_idx on public.platform_audit_events (actor_id, occurred_at desc) where actor_id is not null;

create or replace function private.record_platform_audit_event()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  row_data jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  resolved_company_id uuid;
  resolved_actor_id uuid;
begin
  resolved_company_id := coalesce(
    nullif(row_data->>'company_id', '')::uuid,
    nullif(row_data->>'issuer_company_id', '')::uuid,
    nullif(row_data->>'recipient_company_id', '')::uuid
  );
  resolved_actor_id := nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;

  insert into public.platform_audit_events (actor_id, company_id, table_name, record_id, action)
  values (
    resolved_actor_id,
    resolved_company_id,
    tg_table_name,
    nullif(row_data->>'id', '')::uuid,
    lower(tg_op)
  );
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

do $$
declare
  table_to_audit text;
begin
  foreach table_to_audit in array array[
    'warranties',
    'warranty_claims',
    'warranty_documents',
    'warranty_extensions',
    'warranty_extension_requests',
    'api_integration_tokens'
  ] loop
    execute format('drop trigger if exists platform_audit_event_trigger on public.%I', table_to_audit);
    execute format(
      'create trigger platform_audit_event_trigger after insert or update or delete on public.%I for each row execute function private.record_platform_audit_event()',
      table_to_audit
    );
  end loop;
end;
$$;

create table if not exists public.async_jobs (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users(id) on delete set null,
  company_id uuid references public.companies(id) on delete cascade,
  job_type text not null,
  entity_type text,
  entity_id uuid,
  idempotency_key text,
  status text not null default 'queued' check (status in ('queued','processing','completed','retry','failed','cancelled')),
  priority smallint not null default 100 check (priority between 1 and 1000),
  attempts integer not null default 0 check (attempts >= 0),
  max_attempts integer not null default 5 check (max_attempts between 1 and 20),
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  result jsonb,
  last_error_code text,
  last_error_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);
create unique index if not exists async_jobs_idempotency_idx
  on public.async_jobs (job_type, idempotency_key)
  where idempotency_key is not null and status not in ('failed','cancelled');
create index if not exists async_jobs_claim_idx on public.async_jobs (status, priority, available_at, created_at)
  where status in ('queued','retry');

create or replace function public.recover_stale_async_jobs()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  recovered integer;
begin
  update public.async_jobs
  set status = case when attempts >= max_attempts then 'failed' else 'retry' end,
      available_at = case when attempts >= max_attempts then available_at else now() + interval '5 minutes' end,
      locked_at = null,
      locked_by = null,
      last_error_code = 'stale_worker_lock',
      last_error_at = now(),
      updated_at = now()
  where status = 'processing' and locked_at < now() - interval '15 minutes';
  get diagnostics recovered = row_count;
  return recovered;
end;
$$;

create or replace function public.claim_async_jobs(p_worker text, p_limit integer default 10)
returns setof public.async_jobs
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if nullif(btrim(p_worker), '') is null then
    raise exception 'worker identifier is required';
  end if;

  return query
  with candidates as (
    select j.id
    from public.async_jobs j
    where j.status in ('queued', 'retry')
      and j.available_at <= now()
      and j.attempts < j.max_attempts
    order by j.priority asc, j.available_at asc, j.created_at asc
    for update skip locked
    limit least(greatest(p_limit, 1), 100)
  )
  update public.async_jobs j
  set status = 'processing',
      attempts = j.attempts + 1,
      locked_at = now(),
      locked_by = left(btrim(p_worker), 200),
      updated_at = now()
  from candidates c
  where j.id = c.id
  returning j.*;
end;
$$;

create table if not exists public.analytics_daily_rollups (
  id bigint generated always as identity primary key,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  company_scope_key uuid generated always as (coalesce(company_id, '00000000-0000-0000-0000-000000000000'::uuid)) stored,
  day date not null,
  warranties_created integer not null default 0,
  claims_created integer not null default 0,
  passport_views integer not null default 0,
  extension_requests integer not null default 0,
  api_requests integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_user_id, company_scope_key, day)
);
create index if not exists analytics_daily_rollups_company_day_idx on public.analytics_daily_rollups (company_id, day desc) where company_id is not null;
create index if not exists analytics_daily_rollups_owner_day_idx on public.analytics_daily_rollups (owner_user_id, day desc);

create or replace function public.refresh_analytics_daily_rollups(p_day date default (current_date - 1))
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  affected integer;
begin
  with identities as (
    select coalesce(w.user_id, w.created_by, w.issuer_user_id) as owner_user_id, w.issuer_company_id as company_id
    from public.warranties w
    where w.deleted_at is null
      and coalesce(w.user_id, w.created_by, w.issuer_user_id) is not null
      and w.created_at >= p_day
      and w.created_at < p_day + 1
    union
    select coalesce(w.user_id, w.created_by, w.issuer_user_id), w.issuer_company_id
    from public.warranty_claims c
    join public.warranties w on w.id = c.warranty_id
    where c.deleted_at is null
      and w.deleted_at is null
      and coalesce(w.user_id, w.created_by, w.issuer_user_id) is not null
      and c.created_at >= p_day
      and c.created_at < p_day + 1
    union
    select coalesce(w.user_id, w.created_by, w.issuer_user_id), w.issuer_company_id
    from public.warranty_passport_events p
    join public.warranties w on w.id = p.warranty_id
    where w.deleted_at is null
      and coalesce(w.user_id, w.created_by, w.issuer_user_id) is not null
      and p.event_day = p_day
    union
    select coalesce(w.user_id, w.created_by, w.issuer_user_id), w.issuer_company_id
    from public.warranty_extension_requests e
    join public.warranties w on w.id = e.warranty_id
    where w.deleted_at is null
      and coalesce(w.user_id, w.created_by, w.issuer_user_id) is not null
      and e.created_at >= p_day
      and e.created_at < p_day + 1
    union
    select a.user_id, a.company_id
    from public.api_usage_events a
    where a.created_at >= p_day
      and a.created_at < p_day + 1
  ), calculated as (
    select
      i.owner_user_id,
      i.company_id,
      p_day as day,
      (select count(*)::integer from public.warranties w where w.deleted_at is null and coalesce(w.user_id, w.created_by, w.issuer_user_id) = i.owner_user_id and w.issuer_company_id is not distinct from i.company_id and w.created_at >= p_day and w.created_at < p_day + 1) as warranties_created,
      (select count(*)::integer from public.warranty_claims c join public.warranties w on w.id = c.warranty_id where c.deleted_at is null and coalesce(w.user_id, w.created_by, w.issuer_user_id) = i.owner_user_id and w.issuer_company_id is not distinct from i.company_id and c.created_at >= p_day and c.created_at < p_day + 1) as claims_created,
      (select count(*)::integer from public.warranty_passport_events p join public.warranties w on w.id = p.warranty_id where p.event_type = 'view' and coalesce(w.user_id, w.created_by, w.issuer_user_id) = i.owner_user_id and w.issuer_company_id is not distinct from i.company_id and p.event_day = p_day) as passport_views,
      (select count(*)::integer from public.warranty_extension_requests e join public.warranties w on w.id = e.warranty_id where coalesce(w.user_id, w.created_by, w.issuer_user_id) = i.owner_user_id and w.issuer_company_id is not distinct from i.company_id and e.created_at >= p_day and e.created_at < p_day + 1) as extension_requests,
      (select count(*)::integer from public.api_usage_events a where a.user_id = i.owner_user_id and a.company_id is not distinct from i.company_id and a.created_at >= p_day and a.created_at < p_day + 1) as api_requests
    from identities i
  )
  insert into public.analytics_daily_rollups (
    owner_user_id, company_id, day, warranties_created, claims_created,
    passport_views, extension_requests, api_requests, updated_at
  )
  select owner_user_id, company_id, day, warranties_created, claims_created,
    passport_views, extension_requests, api_requests, now()
  from calculated
  on conflict (owner_user_id, company_scope_key, day) do update set
    warranties_created = excluded.warranties_created,
    claims_created = excluded.claims_created,
    passport_views = excluded.passport_views,
    extension_requests = excluded.extension_requests,
    api_requests = excluded.api_requests,
    updated_at = now();
  get diagnostics affected = row_count;
  return affected;
end;
$$;

create table if not exists public.payment_reconciliation_findings (
  id uuid primary key default gen_random_uuid(),
  extension_id uuid references public.warranty_extensions(id) on delete cascade,
  finding_type text not null check (finding_type in ('purchase_without_paid_status','paid_without_provider_reference','amount_mismatch','currency_mismatch')),
  status text not null default 'open' check (status in ('open','resolved','ignored')),
  evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence) = 'object'),
  first_detected_at timestamptz not null default now(),
  last_detected_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (extension_id, finding_type)
);
create index if not exists payment_reconciliation_open_idx on public.payment_reconciliation_findings (status, last_detected_at desc);

create or replace function public.reconcile_internal_payment_ledger()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  affected integer := 0;
  step_count integer;
begin
  insert into public.payment_reconciliation_findings (extension_id, finding_type, evidence, last_detected_at)
  select id, 'purchase_without_paid_status', jsonb_build_object('is_purchased', is_purchased, 'payment_status', payment_status), now()
  from public.warranty_extensions
  where is_purchased = true and payment_status <> 'paid'
  on conflict (extension_id, finding_type) do update set status = 'open', evidence = excluded.evidence, last_detected_at = now(), resolved_at = null;
  get diagnostics step_count = row_count;
  affected := affected + step_count;

  insert into public.payment_reconciliation_findings (extension_id, finding_type, evidence, last_detected_at)
  select id, 'paid_without_provider_reference', jsonb_build_object('payment_status', payment_status), now()
  from public.warranty_extensions
  where payment_status = 'paid' and stripe_checkout_session_id is null and stripe_payment_intent_id is null
  on conflict (extension_id, finding_type) do update set status = 'open', evidence = excluded.evidence, last_detected_at = now(), resolved_at = null;
  get diagnostics step_count = row_count;
  affected := affected + step_count;

  update public.payment_reconciliation_findings f
  set status = 'resolved', resolved_at = now(), last_detected_at = now()
  where f.status = 'open' and (
    (f.finding_type = 'purchase_without_paid_status' and not exists (select 1 from public.warranty_extensions e where e.id = f.extension_id and e.is_purchased = true and e.payment_status <> 'paid'))
    or
    (f.finding_type = 'paid_without_provider_reference' and not exists (select 1 from public.warranty_extensions e where e.id = f.extension_id and e.payment_status = 'paid' and e.stripe_checkout_session_id is null and e.stripe_payment_intent_id is null))
  );
  return affected;
end;
$$;

alter table public.api_clients enable row level security;
alter table public.api_clients force row level security;
alter table public.api_idempotency_records enable row level security;
alter table public.api_idempotency_records force row level security;
alter table public.platform_audit_events enable row level security;
alter table public.platform_audit_events force row level security;
alter table public.async_jobs enable row level security;
alter table public.async_jobs force row level security;
alter table public.analytics_daily_rollups enable row level security;
alter table public.analytics_daily_rollups force row level security;
alter table public.payment_reconciliation_findings enable row level security;
alter table public.payment_reconciliation_findings force row level security;

revoke all on public.api_clients, public.api_idempotency_records, public.platform_audit_events,
  public.async_jobs, public.analytics_daily_rollups, public.payment_reconciliation_findings from public, anon;
revoke all on public.api_clients, public.api_idempotency_records, public.platform_audit_events,
  public.async_jobs, public.payment_reconciliation_findings from authenticated;
grant select on public.analytics_daily_rollups to authenticated;

create policy analytics_daily_rollups_read on public.analytics_daily_rollups for select to authenticated
  using (owner_user_id = (select auth.uid()) or private.is_active_company_member(company_id) or private.current_user_is_platform_admin());

grant all on public.api_clients, public.api_idempotency_records, public.platform_audit_events,
  public.async_jobs, public.analytics_daily_rollups, public.payment_reconciliation_findings to service_role;

revoke all on function public.recover_stale_async_jobs() from public, anon, authenticated;
revoke all on function public.claim_async_jobs(text, integer) from public, anon, authenticated;
revoke all on function public.refresh_analytics_daily_rollups(date) from public, anon, authenticated;
revoke all on function public.reconcile_internal_payment_ledger() from public, anon, authenticated;
grant execute on function public.recover_stale_async_jobs() to service_role;
grant execute on function public.claim_async_jobs(text, integer) to service_role;
grant execute on function public.refresh_analytics_daily_rollups(date) to service_role;
grant execute on function public.reconcile_internal_payment_ledger() to service_role;

notify pgrst, 'reload schema';
