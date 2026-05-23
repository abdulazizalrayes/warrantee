-- Warrantee production safety guardrail:
-- Lock warranty data to authenticated users who are directly connected to the
-- row. This intentionally keeps anonymous users from reading warranty records
-- through the public Supabase API.

do $$
declare
  policy_record record;
begin
  for policy_record in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'profiles',
        'warranties',
        'warranty_documents',
        'warranty_claims',
        'warranty_extensions',
        'notifications',
        'seller_invitations',
        'provisional_warranties'
      )
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      policy_record.policyname,
      policy_record.schemaname,
      policy_record.tablename
    );
  end loop;
end $$;

do $$
begin
  -- RLS is the row-level guard; these grants make the API surface fail closed
  -- for anonymous traffic before any row can be returned.
  if to_regclass('public.profiles') is not null then
    revoke all on table public.profiles from anon;
    grant select, update on table public.profiles to authenticated;
  end if;

  if to_regclass('public.warranties') is not null then
    revoke all on table public.warranties from anon;
    grant select, insert, update, delete on table public.warranties to authenticated;
  end if;

  if to_regclass('public.warranty_documents') is not null then
    revoke all on table public.warranty_documents from anon;
    grant select, insert, update, delete on table public.warranty_documents to authenticated;
  end if;

  if to_regclass('public.warranty_claims') is not null then
    revoke all on table public.warranty_claims from anon;
    grant select, insert, update, delete on table public.warranty_claims to authenticated;
  end if;

  if to_regclass('public.warranty_extensions') is not null then
    revoke all on table public.warranty_extensions from anon;
    grant select, insert, update, delete on table public.warranty_extensions to authenticated;
  end if;

  if to_regclass('public.notifications') is not null then
    revoke all on table public.notifications from anon;
    grant select, insert, update, delete on table public.notifications to authenticated;
  end if;

  if to_regclass('public.seller_invitations') is not null then
    revoke all on table public.seller_invitations from anon;
    grant select, insert, update, delete on table public.seller_invitations to authenticated;
  end if;

  if to_regclass('public.provisional_warranties') is not null then
    revoke all on table public.provisional_warranties from anon;
    grant select, insert, update, delete on table public.provisional_warranties to authenticated;
  end if;
end $$;

do $$
begin
  if to_regclass('public.warranties') is not null then
    alter table public.warranties enable row level security;
    alter table public.warranties force row level security;

    drop policy if exists warranties_authenticated_read on public.warranties;
    drop policy if exists warranties_authenticated_insert on public.warranties;
    drop policy if exists warranties_authenticated_update on public.warranties;
    drop policy if exists warranties_authenticated_delete on public.warranties;

    create policy warranties_authenticated_read
      on public.warranties
      for select
      to authenticated
      using (
        auth.uid() = user_id
        or auth.uid() = created_by
        or auth.uid() = recipient_user_id
        or auth.uid() = buyer_id
        or auth.uid() = seller_id
        or auth.uid() = issuer_user_id
      );

    create policy warranties_authenticated_insert
      on public.warranties
      for insert
      to authenticated
      with check (
        auth.uid() = user_id
        or auth.uid() = created_by
        or auth.uid() = issuer_user_id
      );

    create policy warranties_authenticated_update
      on public.warranties
      for update
      to authenticated
      using (
        auth.uid() = user_id
        or auth.uid() = created_by
        or auth.uid() = seller_id
        or auth.uid() = issuer_user_id
      )
      with check (
        auth.uid() = user_id
        or auth.uid() = created_by
        or auth.uid() = seller_id
        or auth.uid() = issuer_user_id
      );

    create policy warranties_authenticated_delete
      on public.warranties
      for delete
      to authenticated
      using (
        auth.uid() = user_id
        or auth.uid() = created_by
        or auth.uid() = seller_id
        or auth.uid() = issuer_user_id
      );
  end if;

  if to_regclass('public.warranty_documents') is not null then
    alter table public.warranty_documents enable row level security;
    alter table public.warranty_documents force row level security;

    drop policy if exists warranty_documents_authenticated_read on public.warranty_documents;
    drop policy if exists warranty_documents_authenticated_insert on public.warranty_documents;
    drop policy if exists warranty_documents_authenticated_update on public.warranty_documents;
    drop policy if exists warranty_documents_authenticated_delete on public.warranty_documents;

    create policy warranty_documents_authenticated_read
      on public.warranty_documents
      for select
      to authenticated
      using (
        uploaded_by = auth.uid()
        or exists (
          select 1
          from public.warranties w
          where w.id = warranty_documents.warranty_id
        )
      );

    create policy warranty_documents_authenticated_insert
      on public.warranty_documents
      for insert
      to authenticated
      with check (
        uploaded_by = auth.uid()
        and exists (
          select 1
          from public.warranties w
          where w.id = warranty_documents.warranty_id
        )
      );

    create policy warranty_documents_authenticated_update
      on public.warranty_documents
      for update
      to authenticated
      using (uploaded_by = auth.uid())
      with check (uploaded_by = auth.uid());

    create policy warranty_documents_authenticated_delete
      on public.warranty_documents
      for delete
      to authenticated
      using (uploaded_by = auth.uid());
  end if;

  if to_regclass('public.warranty_claims') is not null then
    alter table public.warranty_claims enable row level security;
    alter table public.warranty_claims force row level security;

    drop policy if exists warranty_claims_authenticated_access on public.warranty_claims;

    create policy warranty_claims_authenticated_access
      on public.warranty_claims
      for all
      to authenticated
      using (
        exists (
          select 1
          from public.warranties w
          where w.id = warranty_claims.warranty_id
        )
      )
      with check (
        exists (
          select 1
          from public.warranties w
          where w.id = warranty_claims.warranty_id
        )
      );
  end if;

  if to_regclass('public.warranty_extensions') is not null then
    alter table public.warranty_extensions enable row level security;
    alter table public.warranty_extensions force row level security;

    drop policy if exists warranty_extensions_authenticated_access on public.warranty_extensions;

    create policy warranty_extensions_authenticated_access
      on public.warranty_extensions
      for all
      to authenticated
      using (
        exists (
          select 1
          from public.warranties w
          where w.id = warranty_extensions.warranty_id
        )
      )
      with check (
        exists (
          select 1
          from public.warranties w
          where w.id = warranty_extensions.warranty_id
        )
      );
  end if;

  if to_regclass('public.notifications') is not null then
    alter table public.notifications enable row level security;
    alter table public.notifications force row level security;

    drop policy if exists notifications_authenticated_owner_access on public.notifications;

    create policy notifications_authenticated_owner_access
      on public.notifications
      for all
      to authenticated
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;

  if to_regclass('public.provisional_warranties') is not null then
    alter table public.provisional_warranties enable row level security;
    alter table public.provisional_warranties force row level security;

    drop policy if exists provisional_warranties_authenticated_owner_access on public.provisional_warranties;

    create policy provisional_warranties_authenticated_owner_access
      on public.provisional_warranties
      for all
      to authenticated
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;

  if to_regclass('public.seller_invitations') is not null then
    alter table public.seller_invitations enable row level security;
    alter table public.seller_invitations force row level security;

    drop policy if exists seller_invitations_authenticated_inviter_access on public.seller_invitations;

    create policy seller_invitations_authenticated_inviter_access
      on public.seller_invitations
      for all
      to authenticated
      using (invited_by = auth.uid())
      with check (invited_by = auth.uid());
  end if;

  if to_regclass('public.profiles') is not null then
    alter table public.profiles enable row level security;
    alter table public.profiles force row level security;

    drop policy if exists profiles_authenticated_owner_read on public.profiles;
    drop policy if exists profiles_authenticated_owner_update on public.profiles;

    create policy profiles_authenticated_owner_read
      on public.profiles
      for select
      to authenticated
      using (id = auth.uid());

    create policy profiles_authenticated_owner_update
      on public.profiles
      for update
      to authenticated
      using (id = auth.uid())
      with check (id = auth.uid());
  end if;
end $$;

do $$
begin
  if to_regclass('storage.objects') is not null then
    drop policy if exists warranty_documents_storage_authenticated_read on storage.objects;
    drop policy if exists warranty_documents_storage_authenticated_insert on storage.objects;
    drop policy if exists warranty_documents_storage_authenticated_update on storage.objects;
    drop policy if exists warranty_documents_storage_authenticated_delete on storage.objects;

    create policy warranty_documents_storage_authenticated_read
      on storage.objects
      for select
      to authenticated
      using (
        bucket_id = 'warranty-documents'
        and split_part(name, '/', 1) = auth.uid()::text
      );

    create policy warranty_documents_storage_authenticated_insert
      on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id = 'warranty-documents'
        and split_part(name, '/', 1) = auth.uid()::text
      );

    create policy warranty_documents_storage_authenticated_update
      on storage.objects
      for update
      to authenticated
      using (
        bucket_id = 'warranty-documents'
        and split_part(name, '/', 1) = auth.uid()::text
      )
      with check (
        bucket_id = 'warranty-documents'
        and split_part(name, '/', 1) = auth.uid()::text
      );

    create policy warranty_documents_storage_authenticated_delete
      on storage.objects
      for delete
      to authenticated
      using (
        bucket_id = 'warranty-documents'
        and split_part(name, '/', 1) = auth.uid()::text
      );
  end if;
end $$;
