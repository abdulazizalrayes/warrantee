-- Growth, claim-transparency, and evidence-gated lifecycle foundations.

alter table public.warranties
  add column if not exists manufacturer text,
  add column if not exists model_number text,
  add column if not exists asset_category_code text,
  add column if not exists taxonomy_version text not null default '2026-08';

alter table public.warranty_claims
  add column if not exists target_response_at timestamptz,
  add column if not exists target_resolution_at timestamptz,
  add column if not exists decision_reason_code text,
  add column if not exists failure_mode_code text,
  add column if not exists evidence_requirements jsonb not null default '[]'::jsonb;

alter table public.warranty_claims
  drop constraint if exists warranty_claims_evidence_requirements_array_check;
alter table public.warranty_claims
  add constraint warranty_claims_evidence_requirements_array_check
  check (jsonb_typeof(evidence_requirements) = 'array');

create index if not exists warranties_asset_taxonomy_idx
  on public.warranties (asset_category_code, manufacturer, model_number)
  where deleted_at is null;
create index if not exists warranty_claims_service_targets_idx
  on public.warranty_claims (target_response_at, target_resolution_at)
  where deleted_at is null and status not in ('resolved', 'closed', 'rejected');
create index if not exists warranty_claims_failure_mode_idx
  on public.warranty_claims (failure_mode_code, created_at desc)
  where deleted_at is null;

create table if not exists public.warranty_policy_templates (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 120),
  name_ar text check (name_ar is null or char_length(name_ar) <= 120),
  category text,
  duration_months integer not null default 12 check (duration_months between 1 and 240),
  coverage_type text,
  terms text,
  terms_ar text,
  suggested_fields jsonb not null default '[]'::jsonb check (jsonb_typeof(suggested_fields) = 'array'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.asset_lifecycle_events (
  id uuid primary key default gen_random_uuid(),
  warranty_id uuid not null references public.warranties(id) on delete restrict,
  company_id uuid references public.companies(id) on delete restrict,
  claim_id uuid references public.warranty_claims(id) on delete set null,
  actor_id uuid references public.profiles(id) on delete set null,
  event_type text not null check (event_type in (
    'registered','issued','activated','document_added','claim_filed','claim_decided',
    'service_requested','inspected','repaired','replaced','transferred','extended',
    'recall_matched','recall_actioned','retired'
  )),
  occurred_at timestamptz not null default now(),
  evidence_type text not null default 'system' check (evidence_type in ('system','document','user_assertion','issuer_assertion','verified_external')),
  provenance text not null default 'warrantee',
  confidence numeric(5,4) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);
create index if not exists asset_lifecycle_events_warranty_timeline_idx on public.asset_lifecycle_events (warranty_id, occurred_at desc);
create index if not exists asset_lifecycle_events_company_type_idx on public.asset_lifecycle_events (company_id, event_type, occurred_at desc);
create unique index if not exists asset_lifecycle_events_idempotency_idx
  on public.asset_lifecycle_events (warranty_id, event_type, provenance, (metadata->>'idempotency_key'))
  where metadata ? 'idempotency_key';

create table if not exists public.recall_notices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete restrict,
  created_by uuid references public.profiles(id) on delete set null,
  manufacturer text not null,
  model_number text,
  serial_prefix text,
  title text not null,
  title_ar text,
  severity text not null check (severity in ('low','medium','high','critical')),
  source_url text,
  source_reference text not null,
  source_verified_at timestamptz,
  affected_countries text[] not null default '{}',
  recommended_action text not null,
  recommended_action_ar text,
  status text not null default 'draft' check (status in ('draft','verified','active','closed')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_reference)
);
alter table public.recall_notices
  drop constraint if exists recall_notices_verified_source_required;
alter table public.recall_notices
  add constraint recall_notices_verified_source_required check (
    status not in ('verified','active')
    or (source_url is not null and source_verified_at is not null)
  );

create table if not exists public.recall_matches (
  id uuid primary key default gen_random_uuid(),
  recall_id uuid not null references public.recall_notices(id) on delete cascade,
  warranty_id uuid not null references public.warranties(id) on delete cascade,
  match_basis text not null,
  confidence numeric(5,4) not null check (confidence >= 0 and confidence <= 1),
  status text not null default 'candidate' check (status in ('candidate','confirmed','dismissed','actioned')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (recall_id, warranty_id)
);
create index if not exists recall_matches_warranty_idx on public.recall_matches (warranty_id, status, created_at desc);

create or replace function public.match_verified_recall(p_recall_id uuid)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  notice public.recall_notices%rowtype;
  matched integer;
begin
  select * into notice from public.recall_notices where id = p_recall_id;
  if notice.id is null or notice.status not in ('verified','active') or notice.source_verified_at is null then
    raise exception 'verified_recall_required';
  end if;

  insert into public.recall_matches (recall_id, warranty_id, match_basis, confidence)
  select
    notice.id,
    w.id,
    case
      when notice.serial_prefix is not null and w.serial_number ilike notice.serial_prefix || '%' then 'manufacturer_model_serial_prefix'
      else 'manufacturer_model'
    end,
    case
      when notice.serial_prefix is not null and w.serial_number ilike notice.serial_prefix || '%' then 1.0
      else 0.9
    end
  from public.warranties w
  where w.deleted_at is null
    and lower(coalesce(w.manufacturer, '')) = lower(notice.manufacturer)
    and (notice.model_number is null or lower(coalesce(w.model_number, '')) = lower(notice.model_number))
    and (notice.serial_prefix is null or w.serial_number ilike notice.serial_prefix || '%')
  on conflict (recall_id, warranty_id) do nothing;
  get diagnostics matched = row_count;
  return matched;
end;
$$;

create table if not exists public.warranty_extension_requests (
  id uuid primary key default gen_random_uuid(),
  warranty_id uuid not null references public.warranties(id) on delete restrict,
  requester_id uuid not null references public.profiles(id) on delete restrict,
  requested_months integer check (requested_months between 1 and 120),
  status text not null default 'requested' check (status in ('requested','reviewing','quoted','declined','accepted','expired','cancelled')),
  quoted_price numeric(12,2) check (quoted_price is null or quoted_price >= 0),
  currency text check (currency is null or char_length(currency) = 3),
  proposed_end_date date,
  quote_terms text,
  quote_expires_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists extension_requests_open_per_requester_idx
  on public.warranty_extension_requests (warranty_id, requester_id)
  where status in ('requested','reviewing','quoted');

create table if not exists public.warranty_passport_events (
  id uuid primary key default gen_random_uuid(),
  warranty_id uuid not null references public.warranties(id) on delete cascade,
  event_type text not null check (event_type in ('view','powered_by_click','claim_intent','extension_intent','issuer_invite_intent')),
  event_day date not null default current_date,
  locale text not null default 'en' check (locale in ('en','ar')),
  traffic_class text not null default 'unknown',
  source text,
  created_at timestamptz not null default now()
);
create index if not exists warranty_passport_events_owner_metrics_idx on public.warranty_passport_events (warranty_id, event_day desc, event_type);

create table if not exists public.customer_feedback_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  stage text not null check (stage in ('landing','signup','onboarding','first_warranty','import','claim','extension','cancellation')),
  reason_code text not null,
  comment text check (comment is null or char_length(comment) <= 1000),
  locale text not null default 'en' check (locale in ('en','ar')),
  traffic_class text not null default 'unknown',
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

alter table public.warranty_policy_templates enable row level security;
alter table public.warranty_policy_templates force row level security;
alter table public.asset_lifecycle_events enable row level security;
alter table public.asset_lifecycle_events force row level security;
alter table public.recall_notices enable row level security;
alter table public.recall_notices force row level security;
alter table public.recall_matches enable row level security;
alter table public.recall_matches force row level security;
alter table public.warranty_extension_requests enable row level security;
alter table public.warranty_extension_requests force row level security;
alter table public.warranty_passport_events enable row level security;
alter table public.warranty_passport_events force row level security;
alter table public.customer_feedback_events enable row level security;
alter table public.customer_feedback_events force row level security;

revoke all on table public.warranty_policy_templates, public.asset_lifecycle_events,
  public.recall_notices, public.recall_matches, public.warranty_extension_requests,
  public.warranty_passport_events, public.customer_feedback_events from public, anon;

grant select, insert, update, delete on public.warranty_policy_templates to authenticated;
grant select, insert on public.asset_lifecycle_events to authenticated;
grant select, insert, update on public.recall_notices to authenticated;
grant select on public.recall_matches to authenticated;
grant select, insert on public.warranty_extension_requests to authenticated;
grant select on public.warranty_passport_events to authenticated;
grant select on public.customer_feedback_events to authenticated;

create policy warranty_policy_templates_read on public.warranty_policy_templates for select to authenticated
  using (owner_user_id = (select auth.uid()) or private.is_active_company_member(company_id) or private.current_user_is_platform_admin());
create policy warranty_policy_templates_insert on public.warranty_policy_templates for insert to authenticated
  with check (owner_user_id = (select auth.uid()) and (company_id is null or private.current_user_has_company_role(company_id, array['creator','company_admin','platform_admin']::public.user_role[])));
create policy warranty_policy_templates_update on public.warranty_policy_templates for update to authenticated
  using (owner_user_id = (select auth.uid()) or private.current_user_has_company_role(company_id, array['company_admin','platform_admin']::public.user_role[]) or private.current_user_is_platform_admin())
  with check (owner_user_id = (select auth.uid()) or private.current_user_has_company_role(company_id, array['company_admin','platform_admin']::public.user_role[]) or private.current_user_is_platform_admin());
create policy warranty_policy_templates_delete on public.warranty_policy_templates for delete to authenticated
  using (owner_user_id = (select auth.uid()) or private.current_user_has_company_role(company_id, array['company_admin','platform_admin']::public.user_role[]) or private.current_user_is_platform_admin());

create policy asset_lifecycle_events_read on public.asset_lifecycle_events for select to authenticated using (private.can_view_warranty(warranty_id));
create policy asset_lifecycle_events_insert on public.asset_lifecycle_events for insert to authenticated
  with check (actor_id = (select auth.uid()) and private.can_mutate_warranty(warranty_id));

create policy recall_notices_read on public.recall_notices for select to authenticated
  using ((status in ('verified','active') and source_verified_at is not null) or private.is_active_company_member(company_id) or private.current_user_is_platform_admin());
create policy recall_notices_insert on public.recall_notices for insert to authenticated
  with check (created_by = (select auth.uid()) and (private.current_user_has_company_role(company_id, array['company_admin','platform_admin']::public.user_role[]) or private.current_user_is_platform_admin()));
create policy recall_notices_update on public.recall_notices for update to authenticated
  using (private.current_user_has_company_role(company_id, array['company_admin','platform_admin']::public.user_role[]) or private.current_user_is_platform_admin())
  with check (private.current_user_has_company_role(company_id, array['company_admin','platform_admin']::public.user_role[]) or private.current_user_is_platform_admin());

create policy recall_matches_read on public.recall_matches for select to authenticated using (private.can_view_warranty(warranty_id));

create policy extension_requests_read on public.warranty_extension_requests for select to authenticated
  using (requester_id = (select auth.uid()) or private.can_mutate_warranty(warranty_id) or private.current_user_is_platform_admin());
create policy extension_requests_insert on public.warranty_extension_requests for insert to authenticated
  with check (requester_id = (select auth.uid()) and private.can_view_warranty(warranty_id));

create policy warranty_passport_events_read on public.warranty_passport_events for select to authenticated using (private.can_mutate_warranty(warranty_id));
create policy customer_feedback_events_read on public.customer_feedback_events for select to authenticated
  using (actor_id = (select auth.uid()) or private.current_user_is_platform_admin());

grant all on public.warranty_policy_templates, public.asset_lifecycle_events, public.recall_notices,
  public.recall_matches, public.warranty_extension_requests, public.warranty_passport_events,
  public.customer_feedback_events to service_role;

revoke all on function public.match_verified_recall(uuid) from public, anon, authenticated;
grant execute on function public.match_verified_recall(uuid) to service_role;
