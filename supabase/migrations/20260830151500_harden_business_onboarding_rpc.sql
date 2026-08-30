-- Keep OAuth business onboarding atomic without exposing a SECURITY DEFINER
-- function to normal authenticated API clients.

drop function if exists public.complete_business_onboarding(text);

create or replace function public.complete_business_onboarding(
  p_user_id uuid,
  p_company_name text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_company_name text;
  current_user_email text;
  company_uuid uuid;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception using errcode = '42501', message = 'service_role_required';
  end if;

  normalized_company_name := left(nullif(btrim(p_company_name), ''), 200);
  if normalized_company_name is null then
    raise exception using errcode = '22023', message = 'company_name_required';
  end if;

  select email
  into current_user_email
  from public.profiles
  where id = p_user_id;

  if current_user_email is null then
    raise exception using errcode = '22023', message = 'profile_not_found';
  end if;

  update public.profiles
  set account_type = 'business'::public.account_type,
      company = normalized_company_name,
      updated_at = now()
  where id = p_user_id;

  select id
  into company_uuid
  from public.companies
  where created_by = p_user_id
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
      p_user_id
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
    p_user_id,
    'company_admin'::public.user_role,
    true,
    p_user_id
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
  values (p_user_id, 'free', 'active', 100, 1)
  on conflict (user_id) do update set
    warranty_limit = case
      when public.subscriptions.plan_id = 'free' then 100
      else public.subscriptions.warranty_limit
    end,
    updated_at = now();

  return company_uuid;
end;
$$;

revoke all on function public.complete_business_onboarding(uuid, text) from public, anon, authenticated;
grant execute on function public.complete_business_onboarding(uuid, text) to service_role;

notify pgrst, 'reload schema';
