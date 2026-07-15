-- Preserve the existing authorization model while removing planner and linter
-- warnings that make the production policy surface harder to audit.

alter function public.check_warranty_status_transition() set search_path = '';

create index if not exists company_members_invited_by_idx
  on public.company_members (invited_by);

drop index if exists public.idx_company_members_company;
drop index if exists public.idx_company_members_user;
drop index if exists public.idx_support_tickets_user;
drop index if exists public.idx_warranty_docs;

alter policy profiles_authenticated_owner_read
  on public.profiles
  using (id = (select auth.uid()));

alter policy profiles_authenticated_owner_update
  on public.profiles
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

alter policy company_members_authenticated_self_read
  on public.company_members
  using (user_id = (select auth.uid()));

alter policy notifications_authenticated_owner_access
  on public.notifications
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

alter policy provisional_warranties_authenticated_owner_access
  on public.provisional_warranties
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

alter policy push_subscriptions_authenticated_owner_access
  on public.push_subscriptions
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

alter policy seller_invitations_authenticated_participant_access
  on public.seller_invitations
  using (
    inviter_id = (select auth.uid())
    or invited_by = (select auth.uid())
    or user_id = (select auth.uid())
  )
  with check (
    inviter_id = (select auth.uid())
    or invited_by = (select auth.uid())
    or user_id = (select auth.uid())
  );

alter policy support_tickets_authenticated_owner_access
  on public.support_tickets
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

alter policy warranties_authenticated_delete
  on public.warranties
  using (
    (select auth.uid()) = user_id
    or (select auth.uid()) = created_by
    or (select auth.uid()) = seller_id
    or (select auth.uid()) = issuer_user_id
  );

alter policy warranties_authenticated_insert
  on public.warranties
  with check (
    (select auth.uid()) = user_id
    or (select auth.uid()) = created_by
    or (select auth.uid()) = issuer_user_id
  );

alter policy warranties_authenticated_read
  on public.warranties
  using (
    (select auth.uid()) = user_id
    or (select auth.uid()) = created_by
    or (select auth.uid()) = recipient_user_id
    or (select auth.uid()) = buyer_id
    or (select auth.uid()) = seller_id
    or (select auth.uid()) = issuer_user_id
  );

alter policy warranties_authenticated_update
  on public.warranties
  using (
    (select auth.uid()) = user_id
    or (select auth.uid()) = created_by
    or (select auth.uid()) = seller_id
    or (select auth.uid()) = issuer_user_id
  )
  with check (
    (select auth.uid()) = user_id
    or (select auth.uid()) = created_by
    or (select auth.uid()) = seller_id
    or (select auth.uid()) = issuer_user_id
  );

alter policy warranty_documents_authenticated_delete
  on public.warranty_documents
  using (uploaded_by = (select auth.uid()));

alter policy warranty_documents_authenticated_insert
  on public.warranty_documents
  with check (
    uploaded_by = (select auth.uid())
    and exists (
      select 1
      from public.warranties w
      where w.id = warranty_documents.warranty_id
    )
  );

alter policy warranty_documents_authenticated_read
  on public.warranty_documents
  using (
    uploaded_by = (select auth.uid())
    or exists (
      select 1
      from public.warranties w
      where w.id = warranty_documents.warranty_id
    )
  );

alter policy warranty_documents_authenticated_update
  on public.warranty_documents
  using (uploaded_by = (select auth.uid()))
  with check (uploaded_by = (select auth.uid()));

alter policy "Users can read their own API usage events"
  on public.api_usage_events
  using (user_id = (select auth.uid()));

-- Admin access is already a subset of member access for reads. Split the
-- write privileges by command so each table has one permissive SELECT policy.
drop policy if exists company_admins_can_manage_branches on public.company_branches;
drop policy if exists company_members_can_view_branches on public.company_branches;

create policy company_members_can_view_branches
  on public.company_branches
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.company_members cm
      where cm.company_id = company_branches.company_id
        and cm.user_id = (select auth.uid())
        and cm.is_active = true
    )
  );

create policy company_admins_can_insert_branches
  on public.company_branches
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.company_members cm
      where cm.company_id = company_branches.company_id
        and cm.user_id = (select auth.uid())
        and cm.role = any (array['company_admin'::public.user_role, 'platform_admin'::public.user_role])
        and cm.is_active = true
    )
  );

create policy company_admins_can_update_branches
  on public.company_branches
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.company_members cm
      where cm.company_id = company_branches.company_id
        and cm.user_id = (select auth.uid())
        and cm.role = any (array['company_admin'::public.user_role, 'platform_admin'::public.user_role])
        and cm.is_active = true
    )
  )
  with check (
    exists (
      select 1
      from public.company_members cm
      where cm.company_id = company_branches.company_id
        and cm.user_id = (select auth.uid())
        and cm.role = any (array['company_admin'::public.user_role, 'platform_admin'::public.user_role])
        and cm.is_active = true
    )
  );

create policy company_admins_can_delete_branches
  on public.company_branches
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.company_members cm
      where cm.company_id = company_branches.company_id
        and cm.user_id = (select auth.uid())
        and cm.role = any (array['company_admin'::public.user_role, 'platform_admin'::public.user_role])
        and cm.is_active = true
    )
  );

drop policy if exists company_admins_can_manage_contacts on public.company_contacts;
drop policy if exists company_members_can_view_contacts on public.company_contacts;

create policy company_members_can_view_contacts
  on public.company_contacts
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.company_members cm
      where cm.company_id = company_contacts.company_id
        and cm.user_id = (select auth.uid())
        and cm.is_active = true
    )
  );

create policy company_admins_can_insert_contacts
  on public.company_contacts
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.company_members cm
      where cm.company_id = company_contacts.company_id
        and cm.user_id = (select auth.uid())
        and cm.role = any (array['company_admin'::public.user_role, 'platform_admin'::public.user_role])
        and cm.is_active = true
    )
  );

create policy company_admins_can_update_contacts
  on public.company_contacts
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.company_members cm
      where cm.company_id = company_contacts.company_id
        and cm.user_id = (select auth.uid())
        and cm.role = any (array['company_admin'::public.user_role, 'platform_admin'::public.user_role])
        and cm.is_active = true
    )
  )
  with check (
    exists (
      select 1
      from public.company_members cm
      where cm.company_id = company_contacts.company_id
        and cm.user_id = (select auth.uid())
        and cm.role = any (array['company_admin'::public.user_role, 'platform_admin'::public.user_role])
        and cm.is_active = true
    )
  );

create policy company_admins_can_delete_contacts
  on public.company_contacts
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.company_members cm
      where cm.company_id = company_contacts.company_id
        and cm.user_id = (select auth.uid())
        and cm.role = any (array['company_admin'::public.user_role, 'platform_admin'::public.user_role])
        and cm.is_active = true
    )
  );

-- Merge owner/admin read paths for ingestion records while keeping admin-only
-- writes explicit. This is logically identical to the previous OR of policies.
drop policy if exists "Admins manage all attachments" on public.ingestion_attachments;
drop policy if exists "Users see own attachments" on public.ingestion_attachments;

create policy ingestion_attachments_authenticated_read
  on public.ingestion_attachments
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.ingestion_jobs
      where ingestion_jobs.id = ingestion_attachments.ingestion_job_id
        and ingestion_jobs.matched_user_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = any (array['admin'::text, 'super_admin'::text])
    )
  );

create policy ingestion_attachments_admin_insert
  on public.ingestion_attachments
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = any (array['admin'::text, 'super_admin'::text])
    )
  );

create policy ingestion_attachments_admin_update
  on public.ingestion_attachments
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = any (array['admin'::text, 'super_admin'::text])
    )
  )
  with check (
    exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = any (array['admin'::text, 'super_admin'::text])
    )
  );

create policy ingestion_attachments_admin_delete
  on public.ingestion_attachments
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = any (array['admin'::text, 'super_admin'::text])
    )
  );

drop policy if exists "Admins manage all ingestion jobs" on public.ingestion_jobs;
drop policy if exists "Users see own ingestion jobs" on public.ingestion_jobs;

create policy ingestion_jobs_authenticated_read
  on public.ingestion_jobs
  for select
  to authenticated
  using (
    matched_user_id = (select auth.uid())
    or exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = any (array['admin'::text, 'super_admin'::text])
    )
  );

create policy ingestion_jobs_admin_insert
  on public.ingestion_jobs
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = any (array['admin'::text, 'super_admin'::text])
    )
  );

create policy ingestion_jobs_admin_update
  on public.ingestion_jobs
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = any (array['admin'::text, 'super_admin'::text])
    )
  )
  with check (
    exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = any (array['admin'::text, 'super_admin'::text])
    )
  );

create policy ingestion_jobs_admin_delete
  on public.ingestion_jobs
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = any (array['admin'::text, 'super_admin'::text])
    )
  );

drop policy if exists "Service role can manage subscriptions" on public.subscriptions;
drop policy if exists "Users can view own subscription" on public.subscriptions;
drop policy if exists subscriptions_authenticated_owner_read on public.subscriptions;

create policy subscriptions_authenticated_read
  on public.subscriptions
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'admin'
    )
  );

notify pgrst, 'reload schema';
