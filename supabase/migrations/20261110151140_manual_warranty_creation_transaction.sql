-- Transactional session warranty creation. Apply to isolated Supabase first;
-- remote application remains an owner-controlled release boundary.
-- Warranty mutations remain SECURITY INVOKER / RLS-bound.
alter table public.api_idempotency_records add column if not exists response_body jsonb;
grant usage on schema private to authenticated;

-- Preserve existing permissive actor=self auditing, but reserve the whole funnel
-- namespace for service writers and private definer triggers. HTTP filtering
-- alone cannot prevent authenticated clients from forging backend milestones.
create policy reserve_backend_funnel_events
on public.activity_log as restrictive for insert to authenticated
with check (entity_type <> 'funnel_event');

-- Only this private bridge touches the service-only idempotency store. It cannot
-- mutate warranties, accept another actor, or access API-token idempotency rows.
create or replace function private.manual_warranty_idempotency(
  p_company_id uuid, p_key text, p_hash text, p_resource_id uuid default null
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  account_kind public.account_type;
  scope_path text;
  idempotency_row public.api_idempotency_records%rowtype;
  warranty public.warranties%rowtype;
begin
  if actor is null then raise exception 'UNAUTHORIZED' using errcode = '42501'; end if;
  select account_type into account_kind from public.profiles where id = actor;
  if account_kind is null then raise exception 'ACCOUNT_CONTEXT_UNAVAILABLE'; end if;
  if account_kind = 'consumer' and p_company_id is not null then
    raise exception 'PERSONAL_COMPANY_NOT_ALLOWED';
  end if;
  if account_kind = 'business' and (p_company_id is null or not exists (
    select 1 from public.company_members cm join public.companies c on c.id = cm.company_id
    where cm.user_id = actor and cm.company_id = p_company_id and cm.is_active
      and cm.role in ('creator', 'approver', 'company_admin', 'platform_admin')
      and c.company_role in ('vendor', 'both') and not coalesce(c.is_archived, false)
  )) then raise exception 'ISSUER_MEMBERSHIP_REQUIRED'; end if;
  if p_key is null then return null; end if;
  if p_key !~ '^[!-~]{8,200}$' or p_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'INVALID_IDEMPOTENCY_KEY';
  end if;
  scope_path := '/api/warranties/manual/' || coalesce(p_company_id::text, 'personal');
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    actor::text || scope_path || ':' || p_key, 0));
  select * into idempotency_row from public.api_idempotency_records
    where user_id = actor and client_id is null and method = 'POST'
      and path = scope_path and idempotency_key = p_key for update;
  if found then
    if idempotency_row.request_hash <> p_hash then raise exception 'IDEMPOTENCY_BODY_MISMATCH'; end if;
    if idempotency_row.status = 'completed' then
      -- Recheck current scope/access before exposing a durable original snapshot.
      if not exists (select 1 from public.warranties w where w.id = idempotency_row.resource_id
        and w.created_by = actor and w.issuer_company_id is not distinct from p_company_id
        and w.deleted_at is null) then raise exception 'ISSUER_MEMBERSHIP_REQUIRED'; end if;
      return idempotency_row.response_body;
    end if;
    if p_resource_id is null then raise exception 'IDEMPOTENCY_IN_PROGRESS'; end if;
  elsif p_resource_id is null then
    insert into public.api_idempotency_records
      (user_id, method, path, idempotency_key, request_hash, resource_type)
    values (actor, 'POST', scope_path, p_key, p_hash, 'manual_warranty');
    return null;
  else
    raise exception 'IDEMPOTENCY_IN_PROGRESS';
  end if;
  select * into warranty from public.warranties where id = p_resource_id
    and created_by = actor and user_id = actor and issuer_user_id = actor
    and issuer_company_id is not distinct from p_company_id;
  if not found then raise exception 'ISSUER_MEMBERSHIP_REQUIRED'; end if;
  update public.api_idempotency_records set status = 'completed',
    resource_id = warranty.id, response_status = 201,
    response_body = jsonb_build_object('data', to_jsonb(warranty), 'idempotent_replay', false),
    updated_at = now()
    where id = idempotency_row.id;
  return null;
end;
$$;
revoke all on function private.manual_warranty_idempotency(uuid, text, text, uuid) from public, anon;
grant execute on function private.manual_warranty_idempotency(uuid, text, text, uuid) to authenticated;

-- Preserve the existing quota policy, but bill/count the explicitly bound issuer
-- rather than an unrelated first membership when the user has several companies.
create or replace function public.enforce_warranty_plan_quota()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  actor_user_id uuid := coalesce(new.created_by, new.user_id, new.issuer_user_id, new.recipient_user_id, auth.uid());
  billing_user_id uuid;
  actor_company_id uuid := new.issuer_company_id;
  actor_account_type public.account_type;
  active_plan_id text := 'free';
  allowed_warranties integer;
  used_warranties bigint;
begin
  if actor_user_id is null then return new; end if;
  select account_type into actor_account_type from public.profiles where id = actor_user_id;
  if actor_account_type = 'business' and actor_company_id is null then
    select cm.company_id into actor_company_id from public.company_members cm
      where cm.user_id = actor_user_id and cm.is_active
      order by case cm.role when 'company_admin' then 0 when 'creator' then 1 else 2 end, cm.created_at
      limit 1;
  end if;
  if actor_company_id is not null and new.issuer_company_id is null then new.issuer_company_id := actor_company_id; end if;
  billing_user_id := actor_user_id;
  if actor_company_id is not null then
    select coalesce(c.created_by, actor_user_id) into billing_user_id from public.companies c where c.id = actor_company_id;
  end if;
  select case when s.status in ('active', 'trialing') then s.plan_id else 'free' end,
    case when s.status in ('active', 'trialing') then s.warranty_limit when actor_company_id is not null then 100 else 10 end
    into active_plan_id, allowed_warranties from public.subscriptions s where s.user_id = billing_user_id;
  if not found then
    active_plan_id := 'free';
    allowed_warranties := case when actor_company_id is not null then 100 else 10 end;
  end if;
  if active_plan_id = 'enterprise' or allowed_warranties is null then return new; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    'warranty-quota:' || coalesce(actor_company_id::text, billing_user_id::text), 0));
  if actor_company_id is not null then
    select count(*) into used_warranties from public.warranties w
      where w.deleted_at is null and (w.issuer_company_id = actor_company_id or (
        w.issuer_company_id is null and w.created_by in (
          select cm.user_id from public.company_members cm where cm.company_id = actor_company_id and cm.is_active)));
  else
    select count(*) into used_warranties from public.warranties w where w.deleted_at is null
      and (w.created_by = billing_user_id or w.user_id = billing_user_id or w.issuer_user_id = billing_user_id);
  end if;
  if used_warranties >= allowed_warranties then
    raise exception using errcode = 'P0001', message = 'warranty_limit_reached',
      detail = format('plan=%s limit=%s', active_plan_id, allowed_warranties);
  end if;
  return new;
end;
$$;

-- All insert/status writers share this account lock, not just the HTTP RPC.
-- Runs before quota/compatibility triggers, serializing their count as well.
create or replace function private.lock_warranty_creation_account()
returns trigger language plpgsql security invoker set search_path = ''
as $$
declare
  scope_id uuid := new.issuer_company_id;
  actor uuid := coalesce(new.created_by, new.user_id, new.issuer_user_id);
begin
  if scope_id is null and exists(select 1 from public.profiles where id = actor and account_type = 'business') then
    select cm.company_id into scope_id from public.company_members cm where cm.user_id = actor and cm.is_active
      order by case cm.role when 'company_admin' then 0 when 'creator' then 1 else 2 end, cm.created_at limit 1;
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    'warranty-activation:' || coalesce(scope_id::text, actor::text), 0));
  return new;
end;
$$;
revoke all on function private.lock_warranty_creation_account() from public, anon, authenticated;
create trigger aa_lock_warranty_creation_account
before insert or update of status on public.warranties
for each row execute function private.lock_warranty_creation_account();

-- RLS controls row access, not approval authority. This final BEFORE trigger
-- runs after quota/compatibility triggers have resolved the issuer company.
-- It only validates NEW; it never writes a warranty with definer privileges.
create or replace function private.enforce_company_warranty_approval()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  approver uuid := new.approved_by;
  platform_role text;
  needs_approval boolean;
  proof_changed boolean := false;
begin
  if tg_op = 'UPDATE' then
    -- Removing the company cannot turn an issued company warranty into a
    -- personal warranty and bypass the approval boundary in a later request.
    if old.issuer_company_id is not null and new.issuer_company_id is distinct from old.issuer_company_id then
      raise exception 'WARRANTY_ISSUER_IMMUTABLE' using errcode = '42501';
    end if;
    proof_changed := new.approved_by is distinct from old.approved_by
      or new.approved_at is distinct from old.approved_at;
  end if;
  if new.issuer_company_id is null then return new; end if;
  if tg_op = 'INSERT' then
    -- API v1, imports and email ingestion historically request/default active
    -- without an approval decision. Preserve creation, not unapproved issuance.
    -- Explicit partial/forged proof is never discarded or silently accepted.
    if new.approved_by is null and new.approved_at is null
      and new.status not in ('draft', 'pending_approval', 'cancelled') then
      new.status := 'pending_approval';
      return new;
    end if;
    needs_approval := new.status not in ('draft', 'pending_approval', 'cancelled')
      or new.approved_by is not null or new.approved_at is not null;
  else
    needs_approval := proof_changed
      or (new.status not in ('draft', 'pending_approval', 'cancelled')
        and (old.status in ('draft', 'pending_approval') or old.issuer_company_id is null))
      or (new.status is distinct from old.status and new.status in ('active', 'renewed')
        and (old.approved_by is null or old.approved_at is null));
  end if;
  -- Historical issued rows remain editable; normal claim/expiry transitions
  -- retain their original proof and do not create a new approval decision.
  if not needs_approval then return new; end if;
  if approver is null or new.approved_at is null then
    raise exception 'WARRANTY_APPROVAL_REQUIRED' using errcode = '42501';
  end if;
  -- The existing HTTP approval handler uses a service client after getUser.
  -- Session clients can only attest their own approval, never impersonate it.
  if actor is distinct from approver and not (
    actor is null and coalesce(auth.jwt()->>'role', '') = 'service_role'
  ) then raise exception 'WARRANTY_APPROVAL_FORBIDDEN' using errcode = '42501'; end if;
  -- SHARE locks serialize demotion/revocation/archive with this decision.
  select p.role into platform_role from public.profiles p where p.id = approver for share;
  if not found then raise exception 'WARRANTY_APPROVAL_FORBIDDEN' using errcode = '42501'; end if;
  perform 1 from public.companies c where c.id = new.issuer_company_id
    and not coalesce(c.is_archived, false) for share;
  if not found then raise exception 'WARRANTY_APPROVAL_FORBIDDEN' using errcode = '42501'; end if;
  if platform_role not in ('admin', 'super_admin', 'platform_admin') or platform_role is null then
    perform 1 from public.company_members cm where cm.user_id = approver
      and cm.company_id = new.issuer_company_id and cm.is_active
      and cm.role in ('approver', 'company_admin', 'platform_admin') for share;
    if not found then raise exception 'WARRANTY_APPROVAL_FORBIDDEN' using errcode = '42501'; end if;
  end if;
  return new;
end;
$$;
revoke all on function private.enforce_company_warranty_approval() from public, anon, authenticated;
create trigger zz_enforce_company_warranty_approval
before insert or update on public.warranties
for each row execute function private.enforce_company_warranty_approval();

create unique index if not exists warranty_activation_milestone_once_idx
on public.activity_log (entity_id, (metadata->>'milestone'))
where entity_type = 'funnel_event' and action = 'activation_milestone'
  and metadata->>'source' = 'server_warranty_creation';

-- A private trigger can read complete account history and append minimized audit
-- events; it never mutates warranty data or widens its caller's RLS privileges.
create or replace function private.record_manual_warranty_success()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  scope_id uuid := coalesce(new.issuer_company_id, new.created_by, new.user_id, new.issuer_user_id);
  account_kind text := case when new.issuer_company_id is null then 'consumer' else 'business' end;
  traffic text;
  milestone text;
  prior_status text;
begin
  if new.source <> 'manual' or new.source is null or scope_id is null then return new; end if;
  if tg_op = 'UPDATE' then prior_status := old.status::text; end if;
  if tg_op = 'INSERT' then
    traffic := nullif(current_setting('warrantee.creation_traffic_class', true), '');
  else
    select metadata->>'traffic_class' into traffic from public.activity_log
      where entity_id = new.id and entity_type = 'funnel_event' and action = 'warranty_created'
        and metadata->>'source' in ('manual', 'manual_draft', 'manual_with_documents')
      order by created_at limit 1;
  end if;
  -- Uninstrumented legacy/direct writes count conservatively as prior history;
  -- do not relabel them synthetic or invent a verified-human classification.
  if traffic is null then return new; end if;
  if traffic not in ('human', 'qa', 'crawler', 'monitoring') then traffic := 'monitoring'; end if;
  if tg_op = 'INSERT' then
    insert into public.activity_log(actor_id, entity_type, entity_id, action, new_state)
    values (coalesce(auth.uid(), new.created_by), 'warranty', new.id, 'created',
      jsonb_build_object('status', new.status));
    insert into public.activity_log(actor_id, entity_type, entity_id, action, metadata)
    values (coalesce(auth.uid(), new.created_by), 'funnel_event', new.id, 'warranty_created',
      jsonb_build_object('source', case when new.status = 'draft' then 'manual_draft' else 'manual' end,
        'status', new.status, 'account_type', account_kind, 'traffic_class', traffic));
  end if;
  -- Synthetic/crawler/monitoring records neither emit nor consume activation.
  if traffic <> 'human' or new.status = 'draft' then return new; end if;
  for milestone in select unnest(case
    when new.issuer_company_id is not null and new.status = 'active' and new.approved_at is not null
      and (auth.uid() = new.approved_by or (auth.uid() is null and auth.jwt()->>'role' = 'service_role'))
      and (exists (select 1 from public.company_members cm where cm.user_id = new.approved_by
        and cm.company_id = new.issuer_company_id and cm.is_active
        and cm.role in ('approver', 'company_admin', 'platform_admin'))
        or exists (select 1 from public.profiles p where p.id = new.approved_by
          and p.role in ('admin', 'super_admin', 'platform_admin')))
      then array['first_warranty_created', 'first_warranty_issued']
    else array['first_warranty_created'] end)
  loop
    if milestone = 'first_warranty_created' and prior_status is not null and prior_status <> 'draft' then continue; end if;
    if milestone = 'first_warranty_issued' and prior_status = 'active' then continue; end if;
    if not exists (
      select 1 from public.warranties w
      where w.id <> new.id and w.status <> 'draft'
        and (case when new.issuer_company_id is not null then w.issuer_company_id = new.issuer_company_id
          else w.issuer_company_id is null and coalesce(w.created_by, w.user_id, w.issuer_user_id) = scope_id end)
        and (milestone = 'first_warranty_created' or w.approved_at is not null)
        and not exists (select 1 from public.activity_log qa where qa.entity_id = w.id
          and qa.entity_type = 'funnel_event' and qa.action = 'warranty_created'
          and qa.metadata->>'traffic_class' in ('qa', 'crawler', 'monitoring'))
    ) then
      insert into public.activity_log(actor_id, entity_type, entity_id, action, metadata)
      values (coalesce(auth.uid(), new.created_by), 'funnel_event', scope_id, 'activation_milestone',
        jsonb_build_object('source', 'server_warranty_creation', 'milestone', milestone,
          'account_type', account_kind, 'traffic_class', traffic))
      on conflict do nothing;
    end if;
  end loop;
  return new;
end;
$$;
revoke all on function private.record_manual_warranty_success() from public, anon, authenticated;
create trigger record_manual_warranty_success
after insert or update of status on public.warranties
for each row execute function private.record_manual_warranty_success();

create or replace function public.create_manual_warranty(
  p_warranty jsonb, p_idempotency_key text default null, p_traffic_class text default 'monitoring'
) returns jsonb
language plpgsql security invoker set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  account_kind public.account_type;
  company uuid := (p_warranty->>'issuer_company_id')::uuid;
  request_hash text := encode(sha256(convert_to(p_warranty::text, 'UTF8')), 'hex');
  replay jsonb;
  warranty public.warranties%rowtype;
  requested_status text := coalesce(p_warranty->>'status', 'active');
  field text;
  value jsonb;
  max_length integer;
begin
  if actor is null then raise exception 'UNAUTHORIZED' using errcode = '42501'; end if;
  if p_warranty is null or jsonb_typeof(p_warranty) <> 'object' or octet_length(p_warranty::text) > 65536 then
    raise exception 'INVALID_CREATION_INPUT';
  end if;
  for field, value in select * from jsonb_each(p_warranty) loop
    if field not in ('reference_number', 'product_name', 'product_name_ar', 'sku', 'quantity',
      'start_date', 'end_date', 'description', 'serial_number', 'category', 'seller_name', 'seller_email',
      'po_reference', 'invoice_reference', 'terms_and_conditions', 'custom_clauses', 'language',
      'purchase_price', 'coverage_type', 'issuer_company_id', 'status') then
      raise exception 'INVALID_CREATION_INPUT';
    end if;
    if field in ('quantity', 'purchase_price') then
      if value <> 'null'::jsonb and jsonb_typeof(value) <> 'number' then raise exception 'INVALID_CREATION_INPUT'; end if;
    elsif value <> 'null'::jsonb then
      if jsonb_typeof(value) <> 'string' then raise exception 'INVALID_CREATION_INPUT'; end if;
      max_length := case
        when field in ('description', 'terms_and_conditions', 'custom_clauses') then 5000
        when field in ('product_name', 'product_name_ar', 'seller_name', 'seller_email', 'po_reference', 'invoice_reference') then 200
        when field in ('sku', 'serial_number') then 100
        when field = 'reference_number' then 60
        when field = 'issuer_company_id' then 36
        when field in ('start_date', 'end_date') then 10
        when field = 'language' then 2 else 50 end;
      if char_length(p_warranty->>field) > max_length then raise exception 'INVALID_CREATION_INPUT'; end if;
    end if;
  end loop;
  if coalesce(char_length(btrim(p_warranty->>'product_name')), 0) = 0
    or coalesce(p_warranty->>'start_date', '') !~ '^\d{4}-\d{2}-\d{2}$'
    or coalesce(p_warranty->>'end_date', '') !~ '^\d{4}-\d{2}-\d{2}$'
    or (p_warranty->>'end_date')::date <= (p_warranty->>'start_date')::date
    or (p_warranty ? 'quantity' and p_warranty->'quantity' <> 'null'::jsonb
      and ((p_warranty->>'quantity')::numeric not between 1 and 1000000
        or trunc((p_warranty->>'quantity')::numeric) <> (p_warranty->>'quantity')::numeric))
    or (p_warranty ? 'purchase_price' and p_warranty->'purchase_price' <> 'null'::jsonb
      and (p_warranty->>'purchase_price')::numeric not between 0 and 999999999999)
    or (p_warranty ? 'language' and coalesce(p_warranty->>'language', '') not in ('en', 'ar')) then
    raise exception 'INVALID_CREATION_INPUT';
  end if;
  if requested_status not in ('draft', 'active', 'pending_approval') then
    raise exception 'INVALID_CREATION_STATUS';
  end if;
  select account_type into account_kind from public.profiles where id = actor;
  -- This validates stored account/company state even for requests without a key.
  replay := private.manual_warranty_idempotency(company, p_idempotency_key, request_hash);
  if replay is not null then return jsonb_set(replay, '{idempotent_replay}', 'true'); end if;
  -- Classification is a bounded, spoofable observation, NOT verified-human
  -- identity/authorization. HTTP derives it from transient UA; direct RPC callers
  -- can provide the same hint. Aggregate consumers must retain this distinction.
  if p_traffic_class not in ('human', 'qa', 'crawler', 'monitoring') or p_traffic_class is null then
    p_traffic_class := 'monitoring';
  end if;
  perform set_config('warrantee.creation_traffic_class', p_traffic_class, true);
  insert into public.warranties (
    reference_number, product_name, product_name_ar, sku, quantity, start_date, end_date,
    description, serial_number, category, seller_name, seller_email, po_reference,
    invoice_reference, terms_and_conditions, custom_clauses, language, purchase_price,
    source, coverage_type, user_id, created_by, issuer_user_id, issuer_company_id, status
  ) values (
    coalesce(nullif(p_warranty->>'reference_number', ''), 'WR-' || gen_random_uuid()::text),
    p_warranty->>'product_name', p_warranty->>'product_name_ar', p_warranty->>'sku',
    coalesce((p_warranty->>'quantity')::integer, 1), (p_warranty->>'start_date')::date, (p_warranty->>'end_date')::date,
    p_warranty->>'description', p_warranty->>'serial_number', p_warranty->>'category',
    p_warranty->>'seller_name', p_warranty->>'seller_email', p_warranty->>'po_reference',
    p_warranty->>'invoice_reference', p_warranty->>'terms_and_conditions', p_warranty->'custom_clauses',
    coalesce(p_warranty->>'language', 'en'), (p_warranty->>'purchase_price')::numeric,
    'manual', coalesce(p_warranty->>'coverage_type', 'standard'), actor, actor, actor, company,
    (case when requested_status = 'draft' then 'draft'
      when account_kind = 'business' then 'pending_approval' else requested_status end)::public.warranty_status
  ) returning * into warranty;
  perform private.manual_warranty_idempotency(company, p_idempotency_key, request_hash, warranty.id);
  return jsonb_build_object('data', to_jsonb(warranty), 'idempotent_replay', false);
end;
$$;
revoke all on function public.create_manual_warranty(jsonb, text, text) from public, anon;
grant execute on function public.create_manual_warranty(jsonb, text, text) to authenticated;

-- Durable OAuth intent is service-owned and permanent across terminal states;
-- a newer callback must not replace the original company or revive a grant.
create unique index if not exists oauth_signup_setup_owner_once_idx
on public.async_jobs (owner_user_id) where job_type = 'oauth_signup_setup';

create or replace function public.register_oauth_signup_setup(
  p_user_id uuid, p_company_name text, p_provider text, p_flow_id uuid, p_issued_at timestamptz
) returns text language plpgsql security definer set search_path = ''
as $$
declare
  existing_job public.async_jobs%rowtype;
  normalized_name text := nullif(btrim(p_company_name), '');
begin
  if coalesce(auth.jwt()->>'role', '') <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;
  if p_user_id is null or normalized_name is null or char_length(normalized_name) > 200
    or p_provider is null or p_provider not in ('google', 'apple') or p_flow_id is null
    or p_issued_at is null or p_issued_at > statement_timestamp()
    or p_issued_at < statement_timestamp() - interval '10 minutes' then
    raise exception 'INVALID_OAUTH_SIGNUP_SETUP' using errcode = '22023';
  end if;
  if not exists (select 1 from auth.users u where u.id = p_user_id
    and u.created_at >= p_issued_at and u.created_at <= statement_timestamp()
    and u.raw_app_meta_data->>'provider' = p_provider) then
    raise exception 'INVALID_OAUTH_SIGNUP_SETUP' using errcode = '22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('oauth-signup-setup:' || p_user_id::text, 0));
  select * into existing_job from public.async_jobs
    where job_type = 'oauth_signup_setup' and owner_user_id = p_user_id for update;
  if found then return existing_job.status; end if;
  insert into public.async_jobs(job_type, owner_user_id, idempotency_key, payload)
  values ('oauth_signup_setup', p_user_id, 'oauth_signup_setup:' || p_user_id::text,
    jsonb_build_object('company_name', normalized_name, 'provider', p_provider, 'flow_id', p_flow_id));
  return 'queued';
end;
$$;
revoke all on function public.register_oauth_signup_setup(uuid, text, text, uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.register_oauth_signup_setup(uuid, text, text, uuid, timestamptz) to service_role;

create or replace function public.resume_oauth_signup_setup(p_user_id uuid)
returns text language plpgsql security invoker set search_path = ''
as $$
declare
  job public.async_jobs%rowtype;
  account_kind public.account_type;
  outcome text;
begin
  if coalesce(auth.jwt()->>'role', '') <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;
  if p_user_id is null then raise exception 'INVALID_OAUTH_SIGNUP_SETUP' using errcode = '22023'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('oauth-signup-setup:' || p_user_id::text, 0));
  select * into job from public.async_jobs
    where job_type = 'oauth_signup_setup' and owner_user_id = p_user_id for update;
  if not found then return 'absent'; end if;
  if job.status = 'completed' then
    return case when job.result->>'outcome' = 'skipped' then 'skipped' else 'already_completed' end;
  end if;
  if job.status not in ('queued', 'retry') then return 'skipped'; end if;
  select p.account_type into account_kind from public.profiles p where p.id = p_user_id for update;
  if not found then raise exception 'profile_not_found' using errcode = '22023'; end if;
  -- A business account or ANY prior membership is not a fresh signup. Do not
  -- repair/reactivate revoked memberships, even if the account was downgraded.
  if account_kind = 'business' or exists (select 1 from public.company_members cm where cm.user_id = p_user_id)
    or exists (select 1 from public.companies c where c.created_by = p_user_id) then
    outcome := 'skipped';
  else
    perform public.complete_business_onboarding(p_user_id, job.payload->>'company_name');
    outcome := 'completed';
  end if;
  -- Any exception, including this write, rolls back onboarding and leaves the
  -- durable pending job available for a later callback without its old cookie.
  -- Remain user-bound: async_jobs.company_id has ON DELETE CASCADE, which must
  -- never erase this replay marker when an onboarded company is deleted.
  update public.async_jobs set status = 'completed', company_id = null,
    result = jsonb_build_object('outcome', outcome), completed_at = now(), updated_at = now(),
    locked_at = null, locked_by = null, last_error_code = null
    where id = job.id;
  return outcome;
end;
$$;
revoke all on function public.resume_oauth_signup_setup(uuid) from public, anon, authenticated;
grant execute on function public.resume_oauth_signup_setup(uuid) to service_role;

-- Metadata retry identity is (warranty, storage path), not the HTTP attempt.
-- No unique index/backfill over historical documents is required. Callers retain
-- their normal table/Storage RLS and cannot choose a different uploader.
create or replace function public.finalize_warranty_document(p_document jsonb)
returns jsonb language plpgsql security invoker set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  warranty uuid;
  path text := p_document->>'storage_path';
  document public.warranty_documents%rowtype;
  field text;
  value jsonb;
  source_context text := coalesce(p_document->'evidence_metadata'->>'source_context', 'manual_upload');
begin
  if actor is null then raise exception 'UNAUTHORIZED' using errcode = '42501'; end if;
  if p_document is null or jsonb_typeof(p_document) <> 'object' or octet_length(p_document::text) > 16384 then
    raise exception 'INVALID_DOCUMENT_INPUT' using errcode = '22023';
  end if;
  for field, value in select * from jsonb_each(p_document) loop
    if field not in ('warranty_id', 'file_name', 'file_type', 'file_size', 'file_url', 'storage_path',
      'file_hash', 'uploaded_by', 'uploaded_at', 'document_kind', 'provenance_status',
      'security_status', 'security_metadata', 'evidence_metadata') then
      raise exception 'INVALID_DOCUMENT_INPUT' using errcode = '22023';
    end if;
    if field in ('evidence_metadata', 'security_metadata') then
      if jsonb_typeof(value) <> 'object' then raise exception 'INVALID_DOCUMENT_INPUT' using errcode = '22023'; end if;
    elsif field = 'file_size' then
      if jsonb_typeof(value) <> 'number' then raise exception 'INVALID_DOCUMENT_INPUT' using errcode = '22023'; end if;
    elsif jsonb_typeof(value) <> 'string' then
      raise exception 'INVALID_DOCUMENT_INPUT' using errcode = '22023';
    end if;
  end loop;
  if coalesce(p_document->>'warranty_id', '') !~* '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$'
    or coalesce(char_length(p_document->>'file_name'), 0) not between 1 and 255
    or coalesce(p_document->>'file_type', '') not in ('application/pdf', 'image/jpeg', 'image/jpg', 'image/png',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    or not (p_document ? 'file_size') or (p_document->>'file_size')::numeric not between 1 and 20971520
    or trunc((p_document->>'file_size')::numeric) <> (p_document->>'file_size')::numeric
    or coalesce(p_document->>'file_hash', '') !~ '^[a-f0-9]{64}$'
    or coalesce(p_document->>'document_kind', '') not in ('original_proof', 'certificate', 'claim_support', 'reference', 'other')
    or (p_document ? 'security_status' and p_document->>'security_status' <> 'pending_scan')
    or (p_document ? 'provenance_status' and p_document->>'provenance_status' <> 'recorded')
    or (p_document ? 'security_metadata' and p_document->'security_metadata' <> '{"scanner":"not_configured","state":"queued"}'::jsonb)
    or source_context !~ '^[a-z0-9_.-]{1,80}$' then
    raise exception 'INVALID_DOCUMENT_INPUT' using errcode = '22023';
  end if;
  warranty := (p_document->>'warranty_id')::uuid;
  if p_document ? 'uploaded_by' and p_document->>'uploaded_by' <> actor::text then
    raise exception 'DOCUMENT_UPLOADER_FORBIDDEN' using errcode = '42501';
  end if;
  if path is null or path not like actor::text || '/' || warranty::text || '/%'
    or path like '%..%' or position(chr(92) in path) > 0
    or substring(path from char_length(actor::text || '/' || warranty::text || '/') + 1) !~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,254}$'
    or (p_document ? 'file_url' and p_document->>'file_url' <> path) then
    raise exception 'INVALID_STORAGE_PATH' using errcode = '22023';
  end if;
  perform 1 from public.warranties w where w.id = warranty and w.deleted_at is null;
  if not found then raise exception 'DOCUMENT_WARRANTY_FORBIDDEN' using errcode = '42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('warranty-document:' || warranty::text || ':' || path, 0));
  select * into document from public.warranty_documents d
    where d.warranty_id = warranty and d.storage_path = path order by d.created_at, d.id limit 1;
  if found then
    if document.uploaded_by is distinct from actor or document.file_hash is distinct from p_document->>'file_hash'
      or document.file_name is distinct from p_document->>'file_name'
      or document.file_type is distinct from p_document->>'file_type'
      or document.file_size is distinct from (p_document->>'file_size')::bigint
      or document.document_kind is distinct from p_document->>'document_kind' then
      raise exception 'DOCUMENT_BODY_MISMATCH' using errcode = '23505';
    end if;
    return jsonb_build_object('data', to_jsonb(document), 'idempotent_replay', true);
  end if;
  if not exists (select 1 from storage.objects o where o.bucket_id = 'warranty-documents' and o.name = path) then
    raise exception 'STORAGE_OBJECT_NOT_FOUND' using errcode = '22023';
  end if;
  insert into public.warranty_documents(warranty_id, file_name, file_type, file_size, file_url, storage_path,
    file_hash, uploaded_by, uploaded_at, document_kind, provenance_status, security_status, security_metadata, evidence_metadata)
  values (warranty, p_document->>'file_name', p_document->>'file_type', (p_document->>'file_size')::bigint,
    path, path, p_document->>'file_hash', actor, now(), p_document->>'document_kind', 'recorded', 'pending_scan',
    '{"scanner":"not_configured","state":"queued"}'::jsonb,
    jsonb_build_object('source_context', source_context, 'original_file_name', p_document->>'file_name',
      'content_type', p_document->>'file_type', 'bytes', (p_document->>'file_size')::bigint))
  returning * into document;
  insert into public.activity_log(actor_id, entity_type, entity_id, action, metadata)
  values (actor, 'document', document.id, 'document_uploaded',
    jsonb_build_object('warranty_id', warranty, 'document_id', document.id, 'file_name', document.file_name,
      'file_type', document.file_type, 'file_size', document.file_size, 'file_hash', document.file_hash,
      'storage_path', path, 'uploaded_by', actor, 'uploaded_at', document.uploaded_at,
      'document_kind', document.document_kind, 'provenance_status', 'recorded', 'security_status', 'pending_scan',
      'source_context', source_context, 'schema_mode', 'rich'));
  return jsonb_build_object('data', to_jsonb(document), 'idempotent_replay', false);
end;
$$;
revoke all on function public.finalize_warranty_document(jsonb) from public, anon;
grant execute on function public.finalize_warranty_document(jsonb) to authenticated;

notify pgrst, 'reload schema';
