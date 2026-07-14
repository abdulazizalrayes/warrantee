-- Correct production privilege drift and make invitation delivery retryable.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

create or replace function private.is_admin(user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = user_id
      and role = 'admin'
  );
$$;

revoke all on function private.is_admin(uuid) from public, anon;
grant execute on function private.is_admin(uuid) to authenticated, service_role;

do $$
declare
  function_record record;
begin
  for function_record in
    select
      n.nspname as schema_name,
      p.proname as function_name,
      pg_get_function_identity_arguments(p.oid) as identity_arguments
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
  loop
    execute format(
      'revoke all privileges on function %I.%I(%s) from public, anon, authenticated',
      function_record.schema_name,
      function_record.function_name,
      function_record.identity_arguments
    );
  end loop;
end $$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, role)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data->>'avatar_url',
    'user'
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    updated_at = now();

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to supabase_auth_admin, service_role;

do $$
declare
  writable_columns text[] := array[
    'full_name',
    'phone',
    'avatar_url',
    'preferred_language',
    'preferred_locale',
    'email_notifications',
    'push_notifications',
    'notify_expiry',
    'notify_claims',
    'notify_newsletter',
    'onboarding_completed'
  ];
  writable_column text;
begin
  revoke all privileges on table public.profiles from anon, authenticated;
  grant select on table public.profiles to authenticated;

  foreach writable_column in array writable_columns loop
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'profiles'
        and column_name = writable_column
    ) then
      execute format(
        'grant update (%I) on table public.profiles to authenticated',
        writable_column
      );
    end if;
  end loop;
end $$;

drop policy if exists "Users can view claim attachments" on public.claim_attachments;
create policy "Users can view claim attachments"
  on public.claim_attachments
  for select
  to authenticated
  using (
    claim_id in (
      select wc.id
      from public.warranty_claims wc
      where wc.filed_by = (select auth.uid())
        or wc.assigned_to = (select auth.uid())
        or wc.warranty_id in (
          select w.id
          from public.warranties w
          where w.created_by = (select auth.uid())
             or w.recipient_user_id = (select auth.uid())
        )
    )
    or private.is_admin((select auth.uid()))
  );

drop policy if exists "Users can view claim events" on public.claim_events;
create policy "Users can view claim events"
  on public.claim_events
  for select
  to authenticated
  using (
    claim_id in (
      select wc.id
      from public.warranty_claims wc
      where wc.filed_by = (select auth.uid())
        or wc.assigned_to = (select auth.uid())
        or wc.warranty_id in (
          select w.id
          from public.warranties w
          where w.created_by = (select auth.uid())
             or w.recipient_user_id = (select auth.uid())
        )
    )
    or private.is_admin((select auth.uid()))
  );

alter table public.seller_invitations
  add column if not exists delivery_attempts integer not null default 0,
  add column if not exists last_delivery_attempt_at timestamptz,
  add column if not exists delivery_error text,
  add column if not exists resend_email_id text,
  add column if not exists delivery_locale text not null default 'en';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'seller_invitations_delivery_locale_check'
      and conrelid = 'public.seller_invitations'::regclass
  ) then
    alter table public.seller_invitations
      add constraint seller_invitations_delivery_locale_check
      check (delivery_locale in ('en', 'ar'));
  end if;
end $$;

create index if not exists seller_invitations_delivery_retry_idx
  on public.seller_invitations (status, last_delivery_attempt_at)
  where status in ('pending', 'pending_delivery');

notify pgrst, 'reload schema';
