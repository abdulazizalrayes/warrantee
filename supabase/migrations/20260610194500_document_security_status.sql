-- Document safety state for future malware scanning/quarantine.
-- New uploads start as pending_scan. A later scanner can mark them clean,
-- blocked, or failed without changing the upload/download API contract.

alter table if exists public.warranty_documents
  add column if not exists security_status text not null default 'pending_scan',
  add column if not exists security_checked_at timestamptz null,
  add column if not exists security_metadata jsonb not null default '{}'::jsonb;

do $$
begin
  if to_regclass('public.warranty_documents') is not null then
    alter table public.warranty_documents
      drop constraint if exists warranty_documents_security_status_check;

    alter table public.warranty_documents
      add constraint warranty_documents_security_status_check
      check (security_status in ('pending_scan', 'clean', 'blocked', 'scan_failed'));

    create index if not exists warranty_documents_security_status_idx
      on public.warranty_documents (security_status, created_at desc);
  end if;
end $$;
