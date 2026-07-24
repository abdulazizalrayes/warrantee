create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_account_type public.account_type;
  requested_company_name text;
  created_company_id uuid;
begin
  requested_account_type :=
    case
      when new.raw_user_meta_data->>'account_type' = 'business'
        then 'business'::public.account_type
      else 'consumer'::public.account_type
    end;
  requested_company_name :=
    left(nullif(btrim(new.raw_user_meta_data->>'company_name'), ''), 200);

  insert into public.profiles (
    id,
    email,
    full_name,
    avatar_url,
    role,
    account_type,
    company
  )
  values (
    new.id,
    new.email,
    coalesce(
      nullif(btrim(new.raw_user_meta_data->>'full_name'), ''),
      nullif(btrim(new.raw_user_meta_data->>'name'), ''),
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data->>'avatar_url',
    'user',
    requested_account_type,
    requested_company_name
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    account_type = excluded.account_type,
    company = coalesce(excluded.company, public.profiles.company),
    updated_at = now();

  if requested_account_type = 'business'::public.account_type
     and requested_company_name is not null then
    select id
    into created_company_id
    from public.companies
    where created_by = new.id
      and name = requested_company_name
    order by created_at
    limit 1;

    if created_company_id is null then
      insert into public.companies (
        name,
        company_role,
        email,
        created_by
      )
      values (
        requested_company_name,
        'both'::public.company_role,
        new.email,
        new.id
      )
      returning id into created_company_id;
    end if;

    insert into public.company_members (
      company_id,
      user_id,
      role,
      is_active,
      invited_by
    )
    values (
      created_company_id,
      new.id,
      'company_admin'::public.user_role,
      true,
      new.id
    )
    on conflict (company_id, user_id) do update set
      role = 'company_admin'::public.user_role,
      is_active = true,
      updated_at = now();
  end if;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to supabase_auth_admin, service_role;
