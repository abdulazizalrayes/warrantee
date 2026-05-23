alter table public.warranty_documents
  add column if not exists document_kind text not null default 'reference',
  add column if not exists storage_path text,
  add column if not exists file_hash text,
  add column if not exists uploaded_at timestamptz not null default now(),
  add column if not exists provenance_status text not null default 'legacy',
  add column if not exists evidence_metadata jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'warranty_documents_document_kind_check'
  ) then
    alter table public.warranty_documents
      add constraint warranty_documents_document_kind_check
      check (document_kind in ('original_proof', 'certificate', 'claim_support', 'reference', 'other'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'warranty_documents_provenance_status_check'
  ) then
    alter table public.warranty_documents
      add constraint warranty_documents_provenance_status_check
      check (provenance_status in ('recorded', 'legacy', 'verified'));
  end if;
end $$;

update public.warranty_documents
set
  uploaded_at = coalesce(uploaded_at, created_at, now()),
  document_kind = case
    when lower(coalesce(file_name, '')) like '%certificate%' then 'certificate'
    when lower(coalesce(file_name, '')) like '%claim%' then 'claim_support'
    when lower(coalesce(file_name, '')) like '%invoice%'
      or lower(coalesce(file_name, '')) like '%receipt%'
      or lower(coalesce(file_name, '')) like '%warranty%'
      or lower(coalesce(file_name, '')) like '%proof%' then 'original_proof'
    when document_kind is null or document_kind = '' then 'reference'
    else document_kind
  end,
  provenance_status = coalesce(nullif(provenance_status, ''), 'legacy');

create index if not exists warranty_documents_warranty_id_idx
  on public.warranty_documents (warranty_id);

create index if not exists warranty_documents_document_kind_idx
  on public.warranty_documents (document_kind);

create index if not exists warranty_documents_file_hash_idx
  on public.warranty_documents (file_hash);
