-- Prevent authenticated browser clients from modifying authorization-bearing
-- profile columns such as role, company_id, and company_domain. Server routes
-- that legitimately change access use the service role key and bypass RLS.

do $$
declare
  writable_columns text[] := array[
    'full_name',
    'phone',
    'company_name',
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
  if to_regclass('public.profiles') is null then
    return;
  end if;

  revoke update on table public.profiles from authenticated;

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
