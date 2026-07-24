-- Tenant and private-file isolation.
--
-- This migration intentionally keeps browser storage access owner-prefixed.
-- Cross-user company access is mediated by application routes that first
-- authorize the related warranty/claim and then issue a short-lived URL.

create schema if not exists private;

create or replace function private.current_user_is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('admin', 'super_admin', 'platform_admin')
  );
$$;

create or replace function private.is_active_company_member(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_company_id is not null
    and exists (
      select 1
      from public.company_members cm
      where cm.company_id = p_company_id
        and cm.user_id = (select auth.uid())
        and cm.is_active = true
    );
$$;

create or replace function private.current_user_has_company_role(
  p_company_id uuid,
  p_roles public.user_role[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_company_id is not null
    and exists (
      select 1
      from public.company_members cm
      where cm.company_id = p_company_id
        and cm.user_id = (select auth.uid())
        and cm.is_active = true
        and cm.role = any(p_roles)
    );
$$;

create or replace function private.can_view_warranty(p_warranty_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.current_user_is_platform_admin()
    or exists (
      select 1
      from public.warranties w
      where w.id = p_warranty_id
        and (
          (select auth.uid()) in (
            w.user_id,
            w.created_by,
            w.recipient_user_id,
            w.buyer_id,
            w.seller_id,
            w.issuer_user_id
          )
          or private.is_active_company_member(w.issuer_company_id)
          or private.is_active_company_member(w.recipient_company_id)
        )
    );
$$;

create or replace function private.can_mutate_warranty(p_warranty_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.current_user_is_platform_admin()
    or exists (
      select 1
      from public.warranties w
      where w.id = p_warranty_id
        and (
          (select auth.uid()) in (
            w.user_id,
            w.created_by,
            w.seller_id,
            w.issuer_user_id
          )
          or private.current_user_has_company_role(
            w.issuer_company_id,
            array[
              'creator',
              'approver',
              'company_admin',
              'platform_admin'
            ]::public.user_role[]
          )
        )
    );
$$;

revoke all on function private.current_user_is_platform_admin() from public, anon;
revoke all on function private.is_active_company_member(uuid) from public, anon;
revoke all on function private.current_user_has_company_role(uuid, public.user_role[]) from public, anon;
revoke all on function private.can_view_warranty(uuid) from public, anon;
revoke all on function private.can_mutate_warranty(uuid) from public, anon;

grant execute on function private.current_user_is_platform_admin() to authenticated, service_role;
grant execute on function private.is_active_company_member(uuid) to authenticated, service_role;
grant execute on function private.current_user_has_company_role(uuid, public.user_role[]) to authenticated, service_role;
grant execute on function private.can_view_warranty(uuid) to authenticated, service_role;
grant execute on function private.can_mutate_warranty(uuid) to authenticated, service_role;

-- The legacy companies.api_key column stored an unhashed credential beside
-- company metadata. The supported integration-token table stores only hashes.
drop view if exists public.v_company_stats;
alter table public.companies drop column if exists api_key;

create view public.v_company_stats
with (security_invoker = true)
as
select
  count(*) as total,
  count(*) filter (where c.company_role = 'vendor'::public.company_role) as vendors,
  count(*) filter (where c.company_role = 'client'::public.company_role) as clients,
  count(*) filter (where c.company_role = 'both'::public.company_role) as both_roles,
  count(*) filter (where c.is_verified = true) as verified,
  count(*) filter (where c.is_verified = false) as unverified,
  count(*) filter (where c.is_archived = true) as archived_companies,
  count(*) filter (where c.country = 'SA') as saudi,
  count(*) filter (
    where exists (
      select 1
      from public.api_integration_tokens token
      where token.user_id = c.created_by
        and token.revoked_at is null
        and (token.expires_at is null or token.expires_at > now())
    )
  ) as api_enabled
from public.companies c;

revoke all on table public.v_company_stats from public, anon, authenticated;
grant select on table public.v_company_stats to service_role;

alter table public.companies enable row level security;
alter table public.companies force row level security;
alter table public.company_members enable row level security;
alter table public.company_members force row level security;
alter table public.warranties enable row level security;
alter table public.warranties force row level security;
alter table public.warranty_claims enable row level security;
alter table public.warranty_claims force row level security;
alter table public.claim_events enable row level security;
alter table public.claim_events force row level security;
alter table public.claim_attachments enable row level security;
alter table public.claim_attachments force row level security;
alter table public.warranty_documents enable row level security;
alter table public.warranty_documents force row level security;
alter table public.warranty_extensions enable row level security;
alter table public.warranty_extensions force row level security;

revoke all on table public.companies from anon;
revoke all on table public.company_members from anon;
revoke all on table public.warranties from anon;
revoke all on table public.warranty_claims from anon;
revoke all on table public.claim_events from anon;
revoke all on table public.claim_attachments from anon;
revoke all on table public.warranty_documents from anon;
revoke all on table public.warranty_extensions from anon;

grant select, insert, update, delete on table public.companies to authenticated;
grant select on table public.company_members to authenticated;
grant select, insert, update, delete on table public.warranties to authenticated;
grant select, insert, delete on table public.warranty_claims to authenticated;
grant select, insert on table public.claim_events to authenticated;
grant select, insert, delete on table public.claim_attachments to authenticated;
grant select, insert, update, delete on table public.warranty_documents to authenticated;
grant select, insert on table public.warranty_extensions to authenticated;

drop policy if exists "Anyone can view companies" on public.companies;
drop policy if exists "Authenticated users can create companies" on public.companies;
drop policy if exists "Company admins can update" on public.companies;
drop policy if exists companies_authenticated_read on public.companies;
drop policy if exists companies_authenticated_insert on public.companies;
drop policy if exists companies_authenticated_update on public.companies;
drop policy if exists companies_authenticated_delete on public.companies;

create policy companies_authenticated_read
  on public.companies
  for select
  to authenticated
  using (
    created_by = (select auth.uid())
    or private.is_active_company_member(id)
    or private.current_user_is_platform_admin()
  );

create policy companies_authenticated_insert
  on public.companies
  for insert
  to authenticated
  with check (created_by = (select auth.uid()));

create policy companies_authenticated_update
  on public.companies
  for update
  to authenticated
  using (
    created_by = (select auth.uid())
    or private.current_user_has_company_role(
      id,
      array['company_admin', 'platform_admin']::public.user_role[]
    )
    or private.current_user_is_platform_admin()
  )
  with check (
    created_by = (select auth.uid())
    or private.current_user_has_company_role(
      id,
      array['company_admin', 'platform_admin']::public.user_role[]
    )
    or private.current_user_is_platform_admin()
  );

create policy companies_authenticated_delete
  on public.companies
  for delete
  to authenticated
  using (
    created_by = (select auth.uid())
    or private.current_user_has_company_role(
      id,
      array['company_admin', 'platform_admin']::public.user_role[]
    )
    or private.current_user_is_platform_admin()
  );

drop policy if exists company_members_authenticated_self_read on public.company_members;
drop policy if exists company_members_authenticated_company_read on public.company_members;

create policy company_members_authenticated_company_read
  on public.company_members
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or private.current_user_has_company_role(
      company_id,
      array['company_admin', 'platform_admin']::public.user_role[]
    )
    or private.current_user_is_platform_admin()
  );

drop policy if exists warranties_authenticated_read on public.warranties;
drop policy if exists warranties_authenticated_insert on public.warranties;
drop policy if exists warranties_authenticated_update on public.warranties;
drop policy if exists warranties_authenticated_delete on public.warranties;

create policy warranties_authenticated_read
  on public.warranties
  for select
  to authenticated
  using (private.can_view_warranty(id));

create policy warranties_authenticated_insert
  on public.warranties
  for insert
  to authenticated
  with check (
    private.current_user_is_platform_admin()
    or (
      issuer_company_id is null
      and (select auth.uid()) in (user_id, created_by, issuer_user_id)
    )
    or (
      issuer_company_id is not null
      and (select auth.uid()) in (user_id, created_by, issuer_user_id)
      and private.current_user_has_company_role(
        issuer_company_id,
        array[
          'creator',
          'approver',
          'company_admin',
          'platform_admin'
        ]::public.user_role[]
      )
    )
  );

create policy warranties_authenticated_update
  on public.warranties
  for update
  to authenticated
  using (private.can_mutate_warranty(id))
  with check (
    private.current_user_is_platform_admin()
    or (
      issuer_company_id is null
      and (select auth.uid()) in (user_id, created_by, seller_id, issuer_user_id)
    )
    or (
      issuer_company_id is not null
      and private.current_user_has_company_role(
        issuer_company_id,
        array[
          'creator',
          'approver',
          'company_admin',
          'platform_admin'
        ]::public.user_role[]
      )
    )
  );

create policy warranties_authenticated_delete
  on public.warranties
  for delete
  to authenticated
  using (
    private.current_user_is_platform_admin()
    or (
      issuer_company_id is null
      and (select auth.uid()) in (user_id, created_by, seller_id, issuer_user_id)
    )
    or private.current_user_has_company_role(
      issuer_company_id,
      array['company_admin', 'platform_admin']::public.user_role[]
    )
  );

drop policy if exists warranty_claims_authenticated_access on public.warranty_claims;
drop policy if exists warranty_claims_authenticated_read on public.warranty_claims;
drop policy if exists warranty_claims_authenticated_insert on public.warranty_claims;
drop policy if exists warranty_claims_authenticated_delete on public.warranty_claims;

create policy warranty_claims_authenticated_read
  on public.warranty_claims
  for select
  to authenticated
  using (
    filed_by = (select auth.uid())
    or assigned_to = (select auth.uid())
    or private.can_view_warranty(warranty_id)
  );

create policy warranty_claims_authenticated_insert
  on public.warranty_claims
  for insert
  to authenticated
  with check (
    filed_by = (select auth.uid())
    and private.can_view_warranty(warranty_id)
  );

create policy warranty_claims_authenticated_delete
  on public.warranty_claims
  for delete
  to authenticated
  using (
    (
      filed_by = (select auth.uid())
      and status = 'draft'::public.claim_status
      and coalesce(legal_hold, false) = false
    )
    or private.can_mutate_warranty(warranty_id)
  );

drop policy if exists "Users can view claim events" on public.claim_events;
drop policy if exists "Claim parties can create claim events" on public.claim_events;
drop policy if exists claim_events_authenticated_read on public.claim_events;
drop policy if exists claim_events_authenticated_insert on public.claim_events;

create policy claim_events_authenticated_read
  on public.claim_events
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.warranty_claims wc
      where wc.id = claim_events.claim_id
        and (
          wc.filed_by = (select auth.uid())
          or wc.assigned_to = (select auth.uid())
          or private.can_view_warranty(wc.warranty_id)
        )
    )
  );

create policy claim_events_authenticated_insert
  on public.claim_events
  for insert
  to authenticated
  with check (
    created_by = (select auth.uid())
    and old_status is null
    and (
      (
        event_type = 'created'
        and new_status in (
          'draft',
          'submitted',
          'open'
        )
      )
      or (
        event_type in ('comment', 'attachment_added')
        and new_status is null
      )
    )
    and exists (
      select 1
      from public.warranty_claims wc
      where wc.id = claim_events.claim_id
        and (
          wc.filed_by = (select auth.uid())
          or wc.assigned_to = (select auth.uid())
          or private.can_view_warranty(wc.warranty_id)
        )
    )
  );

drop policy if exists "Users can view claim attachments" on public.claim_attachments;
drop policy if exists "Claim parties can upload attachments" on public.claim_attachments;
drop policy if exists "Users can delete own claim attachments" on public.claim_attachments;
drop policy if exists claim_attachments_authenticated_read on public.claim_attachments;
drop policy if exists claim_attachments_authenticated_insert on public.claim_attachments;
drop policy if exists claim_attachments_authenticated_delete on public.claim_attachments;

create policy claim_attachments_authenticated_read
  on public.claim_attachments
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.warranty_claims wc
      where wc.id = claim_attachments.claim_id
        and (
          wc.filed_by = (select auth.uid())
          or wc.assigned_to = (select auth.uid())
          or private.can_view_warranty(wc.warranty_id)
        )
    )
  );

create policy claim_attachments_authenticated_insert
  on public.claim_attachments
  for insert
  to authenticated
  with check (
    uploaded_by = (select auth.uid())
    and exists (
      select 1
      from public.warranty_claims wc
      where wc.id = claim_attachments.claim_id
        and (
          wc.filed_by = (select auth.uid())
          or wc.assigned_to = (select auth.uid())
          or private.can_view_warranty(wc.warranty_id)
        )
    )
  );

create policy claim_attachments_authenticated_delete
  on public.claim_attachments
  for delete
  to authenticated
  using (
    uploaded_by = (select auth.uid())
    or exists (
      select 1
      from public.warranty_claims wc
      where wc.id = claim_attachments.claim_id
        and private.can_mutate_warranty(wc.warranty_id)
    )
  );

drop policy if exists warranty_documents_authenticated_read on public.warranty_documents;
drop policy if exists warranty_documents_authenticated_insert on public.warranty_documents;
drop policy if exists warranty_documents_authenticated_update on public.warranty_documents;
drop policy if exists warranty_documents_authenticated_delete on public.warranty_documents;

create policy warranty_documents_authenticated_read
  on public.warranty_documents
  for select
  to authenticated
  using (private.can_view_warranty(warranty_id));

create policy warranty_documents_authenticated_insert
  on public.warranty_documents
  for insert
  to authenticated
  with check (
    uploaded_by = (select auth.uid())
    and private.can_view_warranty(warranty_id)
  );

create policy warranty_documents_authenticated_update
  on public.warranty_documents
  for update
  to authenticated
  using (
    uploaded_by = (select auth.uid())
    or private.can_mutate_warranty(warranty_id)
  )
  with check (
    uploaded_by = (select auth.uid())
    or private.can_mutate_warranty(warranty_id)
  );

create policy warranty_documents_authenticated_delete
  on public.warranty_documents
  for delete
  to authenticated
  using (
    uploaded_by = (select auth.uid())
    or private.can_mutate_warranty(warranty_id)
  );

drop policy if exists warranty_extensions_authenticated_access on public.warranty_extensions;
drop policy if exists warranty_extensions_authenticated_read on public.warranty_extensions;
drop policy if exists warranty_extensions_authenticated_insert on public.warranty_extensions;

create policy warranty_extensions_authenticated_read
  on public.warranty_extensions
  for select
  to authenticated
  using (private.can_view_warranty(warranty_id));

create policy warranty_extensions_authenticated_insert
  on public.warranty_extensions
  for insert
  to authenticated
  with check (
    offered_by = (select auth.uid())
    and coalesce(is_purchased, false) = false
    and purchased_by is null
    and purchased_at is null
    and private.can_mutate_warranty(warranty_id)
  );

create index if not exists company_members_user_company_active_idx
  on public.company_members (user_id, company_id)
  where is_active = true;

create index if not exists warranties_issuer_company_status_created_idx
  on public.warranties (issuer_company_id, status, created_at desc)
  where deleted_at is null and issuer_company_id is not null;

create index if not exists warranties_recipient_company_status_created_idx
  on public.warranties (recipient_company_id, status, created_at desc)
  where deleted_at is null and recipient_company_id is not null;

-- Remove every historical policy that references either private bucket. This
-- avoids permissive-policy OR semantics retaining a broad legacy grant.
do $$
declare
  policy_row record;
begin
  for policy_row in
    select policyname
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and (
        coalesce(qual, '') like '%warranty-documents%'
        or coalesce(with_check, '') like '%warranty-documents%'
        or coalesce(qual, '') like '%claim-attachments%'
        or coalesce(with_check, '') like '%claim-attachments%'
      )
  loop
    execute format(
      'drop policy if exists %I on storage.objects',
      policy_row.policyname
    );
  end loop;
end
$$;

create policy warranty_documents_storage_authenticated_read
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'warranty-documents'
    and split_part(name, '/', 1) = (select auth.uid())::text
  );

create policy warranty_documents_storage_authenticated_insert
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'warranty-documents'
    and split_part(name, '/', 1) = (select auth.uid())::text
  );

create policy warranty_documents_storage_authenticated_update
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'warranty-documents'
    and split_part(name, '/', 1) = (select auth.uid())::text
  )
  with check (
    bucket_id = 'warranty-documents'
    and split_part(name, '/', 1) = (select auth.uid())::text
  );

create policy warranty_documents_storage_authenticated_delete
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'warranty-documents'
    and split_part(name, '/', 1) = (select auth.uid())::text
  );

create policy claim_attachments_storage_authenticated_read
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'claim-attachments'
    and split_part(name, '/', 1) = (select auth.uid())::text
  );

create policy claim_attachments_storage_authenticated_insert
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'claim-attachments'
    and split_part(name, '/', 1) = (select auth.uid())::text
  );

create policy claim_attachments_storage_authenticated_update
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'claim-attachments'
    and split_part(name, '/', 1) = (select auth.uid())::text
  )
  with check (
    bucket_id = 'claim-attachments'
    and split_part(name, '/', 1) = (select auth.uid())::text
  );

create policy claim_attachments_storage_authenticated_delete
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'claim-attachments'
    and split_part(name, '/', 1) = (select auth.uid())::text
  );

update storage.buckets
set
  public = false,
  file_size_limit = 20971520,
  allowed_mime_types = array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]::text[]
where id = 'warranty-documents';

update storage.buckets
set
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]::text[]
where id = 'claim-attachments';
