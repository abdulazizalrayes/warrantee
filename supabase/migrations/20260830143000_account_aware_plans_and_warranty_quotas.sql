-- Keep Personal, Business, and paid-plan entitlements consistent across every
-- warranty creation path, including browser, API, bulk import, and ingestion.

alter table public.subscriptions
  alter column warranty_limit drop not null,
  alter column team_limit drop not null;

create or replace function public.create_default_subscription()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  free_warranty_limit integer;
begin
  free_warranty_limit :=
    case
      when new.account_type = 'business'::public.account_type then 100
      else 10
    end;

  insert into public.subscriptions (
    user_id,
    plan_id,
    status,
    warranty_limit,
    team_limit
  )
  values (new.id, 'free', 'active', free_warranty_limit, 1)
  on conflict (user_id) do update set
    warranty_limit = case
      when public.subscriptions.plan_id = 'free' then excluded.warranty_limit
      else public.subscriptions.warranty_limit
    end,
    updated_at = now();

  return new;
end;
$$;

revoke all on function public.create_default_subscription() from public, anon, authenticated;
grant execute on function public.create_default_subscription() to service_role;

update public.subscriptions s
set
  warranty_limit = case
    when p.account_type = 'business'::public.account_type then 100
    else 10
  end,
  team_limit = 1,
  updated_at = now()
from public.profiles p
where p.id = s.user_id
  and s.plan_id = 'free';

update public.subscriptions
set warranty_limit = 1000,
    team_limit = 3,
    updated_at = now()
where plan_id = 'pro';

create or replace function public.complete_business_onboarding(p_company_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_company_name text;
  current_user_email text;
  company_uuid uuid;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  normalized_company_name := left(nullif(btrim(p_company_name), ''), 200);
  if normalized_company_name is null then
    raise exception using errcode = '22023', message = 'company_name_required';
  end if;

  select email
  into current_user_email
  from public.profiles
  where id = current_user_id;

  update public.profiles
  set account_type = 'business'::public.account_type,
      company = normalized_company_name,
      updated_at = now()
  where id = current_user_id;

  select id
  into company_uuid
  from public.companies
  where created_by = current_user_id
    and name = normalized_company_name
  order by created_at
  limit 1;

  if company_uuid is null then
    insert into public.companies (
      name,
      company_role,
      email,
      created_by
    )
    values (
      normalized_company_name,
      'both'::public.company_role,
      current_user_email,
      current_user_id
    )
    returning id into company_uuid;
  end if;

  insert into public.company_members (
    company_id,
    user_id,
    role,
    is_active,
    invited_by
  )
  values (
    company_uuid,
    current_user_id,
    'company_admin'::public.user_role,
    true,
    current_user_id
  )
  on conflict (company_id, user_id) do update set
    role = 'company_admin'::public.user_role,
    is_active = true,
    updated_at = now();

  insert into public.subscriptions (
    user_id,
    plan_id,
    status,
    warranty_limit,
    team_limit
  )
  values (current_user_id, 'free', 'active', 100, 1)
  on conflict (user_id) do update set
    warranty_limit = case
      when public.subscriptions.plan_id = 'free' then 100
      else public.subscriptions.warranty_limit
    end,
    updated_at = now();

  return company_uuid;
end;
$$;

revoke all on function public.complete_business_onboarding(text) from public, anon;
grant execute on function public.complete_business_onboarding(text) to authenticated, service_role;

create or replace function public.upsert_subscription(
  p_user_id uuid,
  p_plan_id text,
  p_status text,
  p_stripe_customer_id text default null,
  p_stripe_subscription_id text default null,
  p_current_period_start timestamptz default null,
  p_current_period_end timestamptz default null,
  p_trial_start timestamptz default null,
  p_trial_end timestamptz default null,
  p_cancel_at_period_end boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  sub_id uuid;
  plan_warranty_limit integer;
  plan_team_limit integer;
  user_account_type public.account_type;
begin
  select account_type
  into user_account_type
  from public.profiles
  where id = p_user_id;

  case p_plan_id
    when 'free' then
      plan_warranty_limit := case when user_account_type = 'business'::public.account_type then 100 else 10 end;
      plan_team_limit := 1;
    when 'pro' then
      plan_warranty_limit := 1000;
      plan_team_limit := 3;
    when 'enterprise' then
      plan_warranty_limit := null;
      plan_team_limit := null;
    else
      raise exception using errcode = '22023', message = 'invalid_plan_id';
  end case;

  insert into public.subscriptions (
    id,
    user_id,
    plan_id,
    status,
    stripe_customer_id,
    stripe_subscription_id,
    current_period_start,
    current_period_end,
    trial_start,
    trial_end,
    cancel_at_period_end,
    warranty_limit,
    team_limit,
    updated_at
  )
  values (
    gen_random_uuid(),
    p_user_id,
    p_plan_id,
    p_status,
    p_stripe_customer_id,
    p_stripe_subscription_id,
    p_current_period_start,
    p_current_period_end,
    p_trial_start,
    p_trial_end,
    p_cancel_at_period_end,
    plan_warranty_limit,
    plan_team_limit,
    now()
  )
  on conflict (user_id) do update set
    plan_id = excluded.plan_id,
    status = excluded.status,
    stripe_customer_id = coalesce(excluded.stripe_customer_id, public.subscriptions.stripe_customer_id),
    stripe_subscription_id = coalesce(excluded.stripe_subscription_id, public.subscriptions.stripe_subscription_id),
    current_period_start = coalesce(excluded.current_period_start, public.subscriptions.current_period_start),
    current_period_end = coalesce(excluded.current_period_end, public.subscriptions.current_period_end),
    trial_start = coalesce(excluded.trial_start, public.subscriptions.trial_start),
    trial_end = coalesce(excluded.trial_end, public.subscriptions.trial_end),
    cancel_at_period_end = excluded.cancel_at_period_end,
    warranty_limit = excluded.warranty_limit,
    team_limit = excluded.team_limit,
    updated_at = now()
  returning id into sub_id;

  return sub_id;
end;
$$;

revoke all on function public.upsert_subscription(uuid, text, text, text, text, timestamptz, timestamptz, timestamptz, timestamptz, boolean) from public, anon, authenticated;
grant execute on function public.upsert_subscription(uuid, text, text, text, text, timestamptz, timestamptz, timestamptz, timestamptz, boolean) to service_role;

create or replace function public.enforce_warranty_plan_quota()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_user_id uuid;
  billing_user_id uuid;
  actor_company_id uuid;
  actor_account_type public.account_type;
  active_plan_id text := 'free';
  allowed_warranties integer;
  used_warranties bigint;
  quota_scope text;
begin
  actor_user_id := coalesce(
    new.created_by,
    new.user_id,
    new.issuer_user_id,
    new.recipient_user_id,
    auth.uid()
  );

  if actor_user_id is null then
    return new;
  end if;

  select account_type
  into actor_account_type
  from public.profiles
  where id = actor_user_id;

  if actor_account_type = 'business'::public.account_type then
    select cm.company_id
    into actor_company_id
    from public.company_members cm
    where cm.user_id = actor_user_id
      and cm.is_active = true
    order by
      case cm.role
        when 'company_admin'::public.user_role then 0
        when 'creator'::public.user_role then 1
        else 2
      end,
      cm.created_at
    limit 1;
  end if;

  if actor_company_id is not null and new.issuer_company_id is null then
    new.issuer_company_id := actor_company_id;
  end if;

  billing_user_id := actor_user_id;
  if actor_company_id is not null then
    select coalesce(c.created_by, actor_user_id)
    into billing_user_id
    from public.companies c
    where c.id = actor_company_id;
  end if;

  select
    case when s.status in ('active', 'trialing') then s.plan_id else 'free' end,
    case
      when s.status in ('active', 'trialing') then s.warranty_limit
      when actor_company_id is not null then 100
      else 10
    end
  into active_plan_id, allowed_warranties
  from public.subscriptions s
  where s.user_id = billing_user_id;

  if not found then
    active_plan_id := 'free';
    allowed_warranties := case when actor_company_id is not null then 100 else 10 end;
  end if;

  if active_plan_id = 'enterprise' or allowed_warranties is null then
    return new;
  end if;

  quota_scope := coalesce(actor_company_id::text, billing_user_id::text);
  perform pg_advisory_xact_lock(hashtextextended('warranty-quota:' || quota_scope, 0));

  if actor_company_id is not null then
    select count(*)
    into used_warranties
    from public.warranties w
    where w.deleted_at is null
      and (
        w.issuer_company_id = actor_company_id
        or w.created_by in (
          select cm.user_id
          from public.company_members cm
          where cm.company_id = actor_company_id
            and cm.is_active = true
        )
      );
  else
    select count(*)
    into used_warranties
    from public.warranties w
    where w.deleted_at is null
      and (
        w.created_by = billing_user_id
        or w.user_id = billing_user_id
        or w.issuer_user_id = billing_user_id
      );
  end if;

  if used_warranties >= allowed_warranties then
    raise exception using
      errcode = 'P0001',
      message = 'warranty_limit_reached',
      detail = format('plan=%s limit=%s', active_plan_id, allowed_warranties);
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_warranty_plan_quota() from public, anon, authenticated;
grant execute on function public.enforce_warranty_plan_quota() to service_role;

drop trigger if exists enforce_warranty_plan_quota_before_insert on public.warranties;
create trigger enforce_warranty_plan_quota_before_insert
  before insert on public.warranties
  for each row
  execute function public.enforce_warranty_plan_quota();

notify pgrst, 'reload schema';
