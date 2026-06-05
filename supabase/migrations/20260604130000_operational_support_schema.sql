-- Operational support schema required by the production application surface.
-- All objects are created defensively so the migration can run on databases
-- where part of the schema already exists.

create extension if not exists pgcrypto;

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number text unique not null,
  user_id uuid references auth.users(id) on delete set null,
  requester_email text,
  requester_name text,
  company text,
  subject text not null,
  description text not null,
  category text not null default 'other',
  priority text not null default 'low',
  status text not null default 'open',
  source text not null default 'contact_form',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.support_tickets
  add column if not exists requester_email text,
  add column if not exists requester_name text,
  add column if not exists company text,
  add column if not exists source text not null default 'contact_form';

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text,
  auth text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

create table if not exists public.company_members (
  id uuid primary key default gen_random_uuid(),
  company_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'viewer',
  invited_by uuid references auth.users(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, user_id)
);

alter table public.company_members
  add column if not exists invited_by uuid references auth.users(id) on delete set null,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.seller_invitations (
  id uuid primary key default gen_random_uuid(),
  token text unique not null default encode(gen_random_bytes(24), 'hex'),
  inviter_id uuid references auth.users(id) on delete set null,
  invited_by uuid references auth.users(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  warranty_id uuid,
  seller_email text,
  seller_name text,
  seller_phone text,
  company_name text,
  cr_number text,
  industry text,
  website text,
  contact_name text,
  contact_email text,
  contact_phone text,
  address text,
  city text,
  warranty_policy text,
  status text not null default 'pending',
  sent_at timestamptz,
  accepted_at timestamptz,
  expires_at timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.seller_invitations
  add column if not exists token text default encode(gen_random_bytes(24), 'hex'),
  add column if not exists inviter_id uuid references auth.users(id) on delete set null,
  add column if not exists invited_by uuid references auth.users(id) on delete set null,
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists warranty_id uuid,
  add column if not exists seller_email text,
  add column if not exists seller_name text,
  add column if not exists seller_phone text,
  add column if not exists company_name text,
  add column if not exists cr_number text,
  add column if not exists industry text,
  add column if not exists website text,
  add column if not exists contact_name text,
  add column if not exists contact_email text,
  add column if not exists contact_phone text,
  add column if not exists address text,
  add column if not exists city text,
  add column if not exists warranty_policy text,
  add column if not exists status text not null default 'pending',
  add column if not exists sent_at timestamptz,
  add column if not exists accepted_at timestamptz,
  add column if not exists expires_at timestamptz not null default (now() + interval '30 days'),
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if to_regclass('public.profiles') is not null then
    alter table public.profiles
      add column if not exists preferred_locale text not null default 'en',
      add column if not exists email_notifications boolean not null default true,
      add column if not exists push_notifications boolean not null default false;
  end if;

  if to_regclass('public.notifications') is not null then
    alter table public.notifications
      add column if not exists body text,
      add column if not exists title_ar text,
      add column if not exists body_ar text,
      add column if not exists action_url text,
      add column if not exists is_email_sent boolean not null default false;
  end if;
end $$;

create index if not exists support_tickets_user_id_idx on public.support_tickets(user_id);
create index if not exists support_tickets_status_idx on public.support_tickets(status);
create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions(user_id);
create index if not exists company_members_user_id_idx on public.company_members(user_id);
create index if not exists company_members_company_id_idx on public.company_members(company_id);
create index if not exists seller_invitations_token_idx on public.seller_invitations(token);
create unique index if not exists seller_invitations_token_key on public.seller_invitations(token);
create index if not exists seller_invitations_inviter_id_idx on public.seller_invitations(inviter_id);
create index if not exists seller_invitations_invited_by_idx on public.seller_invitations(invited_by);
create index if not exists seller_invitations_user_id_idx on public.seller_invitations(user_id);

alter table public.support_tickets enable row level security;
alter table public.support_tickets force row level security;
alter table public.push_subscriptions enable row level security;
alter table public.push_subscriptions force row level security;
alter table public.company_members enable row level security;
alter table public.company_members force row level security;
alter table public.seller_invitations enable row level security;
alter table public.seller_invitations force row level security;

revoke all on table public.support_tickets from anon;
revoke all on table public.push_subscriptions from anon;
revoke all on table public.company_members from anon;
revoke all on table public.seller_invitations from anon;

grant select, insert, update on table public.support_tickets to authenticated;
grant select, insert, update, delete on table public.push_subscriptions to authenticated;
grant select on table public.company_members to authenticated;
grant select, insert, update on table public.seller_invitations to authenticated;

drop policy if exists support_tickets_authenticated_owner_access on public.support_tickets;
drop policy if exists support_tickets_access on public.support_tickets;
create policy support_tickets_authenticated_owner_access
  on public.support_tickets
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists push_subscriptions_authenticated_owner_access on public.push_subscriptions;
drop policy if exists "Service role full access" on public.push_subscriptions;
drop policy if exists "Users can manage own subscriptions" on public.push_subscriptions;
create policy push_subscriptions_authenticated_owner_access
  on public.push_subscriptions
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists company_members_authenticated_self_read on public.company_members;
drop policy if exists "Company admins can manage members" on public.company_members;
drop policy if exists "Members can view company members" on public.company_members;
create policy company_members_authenticated_self_read
  on public.company_members
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists seller_invitations_authenticated_participant_access on public.seller_invitations;
drop policy if exists seller_invitations_authenticated_inviter_access on public.seller_invitations;
create policy seller_invitations_authenticated_participant_access
  on public.seller_invitations
  for all
  to authenticated
  using (inviter_id = auth.uid() or invited_by = auth.uid() or user_id = auth.uid())
  with check (inviter_id = auth.uid() or invited_by = auth.uid() or user_id = auth.uid());

do $$
begin
  if to_regclass('public.warranties') is not null then
    execute $function$
      create or replace function public.get_expiring_warranties(days_ahead integer default 30)
      returns setof public.warranties
      language sql
      security invoker
      set search_path = public
      as $body$
        select *
        from public.warranties
        where status = 'active'
          and end_date between current_date and (current_date + days_ahead)
        order by end_date asc;
      $body$;
    $function$;
  end if;
end $$;

notify pgrst, 'reload schema';

do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'get_expiring_warranties'
  ) then
    grant execute on function public.get_expiring_warranties(integer) to authenticated;
    grant execute on function public.get_expiring_warranties(integer) to service_role;
  end if;
end $$;
