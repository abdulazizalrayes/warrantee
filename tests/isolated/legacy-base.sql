-- Missing original-schema prerequisites reconstructed from checked-in database
-- Row/Insert/Relationships types. Canonical migrations supply behavior/policies.
-- Test-only extension of base.sql; not a production schema clone or restore.
create type public.claim_status as enum ('open', 'in_progress', 'resolved', 'contested', 'closed', 'draft', 'submitted', 'under_review', 'awaiting_info', 'approved', 'rejected');
create type public.notification_type as enum ('warranty_created', 'warranty_submitted', 'warranty_approved', 'warranty_rejected', 'expiry_reminder', 'claim_opened', 'claim_resolved', 'extension_offered', 'extension_purchased', 'document_uploaded', 'bulk_import_complete', 'seller_invitation', 'warranty_verified', 'general', 'whatsapp', 'claim_status_changed', 'info_requested', 'system');
create type public.chain_visibility as enum ('full', 'notification_only', 'none');

alter table public.companies
  add column address text, add column city text, add column cr_number text,
  add column logo_url text, add column phone text, add column vat_number text,
  add column website text;

alter table public.warranties
  add column archive_reason text, add column archived_by uuid references public.profiles(id),
  add column legal_hold boolean default false, add column legal_hold_reason text,
  add column chain_visibility public.chain_visibility,
  add column parent_warranty_id uuid references public.warranties(id),
  add column contract_reference text;

alter table public.warranty_claims alter column status drop default;
alter table public.warranty_claims alter column status type public.claim_status using status::public.claim_status;
alter table public.warranty_claims alter column status set default 'draft'::public.claim_status;
alter table public.warranty_claims
  add column claim_number text not null unique,
  add column title text not null, add column description text not null,
  add column claim_amount numeric, add column currency text default 'SAR',
  add column resolution_notes text, add column filed_at timestamptz not null default now(),
  add column resolved_at timestamptz, add column responded_at timestamptz,
  add column deleted_at timestamptz, add column is_archived boolean default false,
  add column archived_at timestamptz, add column archived_by uuid references public.profiles(id),
  add column legal_hold boolean default false;
alter table public.warranty_claims alter column warranty_id set not null;
alter table public.warranty_claims alter column filed_by set not null;
alter table public.warranty_claims alter column status set not null;

alter table public.notifications alter column type drop default;
alter table public.notifications alter column type type public.notification_type using type::public.notification_type;
alter table public.notifications alter column body set not null;
alter table public.notifications
  add column warranty_id uuid references public.warranties(id),
  add column claim_id uuid references public.warranty_claims(id);

create table public.warranty_extensions (
  id uuid primary key default gen_random_uuid(),
  warranty_id uuid not null references public.warranties(id),
  new_end_date date not null, price numeric, currency text default 'SAR', terms text,
  offered_by uuid references public.profiles(id), is_purchased boolean not null default false,
  purchased_by uuid references public.profiles(id), purchased_at timestamptz,
  new_warranty_id uuid references public.warranties(id), commission_rate numeric,
  commission_amount numeric, payment_status text not null default 'pending',
  stripe_checkout_session_id text, stripe_payment_intent_id text,
  payment_exception_event_id text, refunded_at timestamptz, disputed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.ingestion_jobs (
  id uuid primary key default gen_random_uuid(), from_email text not null,
  to_email text not null, from_name text, subject text, text_body text, html_body text,
  raw_payload jsonb, message_id text, cc_emails text[], ip_address inet,
  matched_user_id uuid, status text not null default 'pending',
  attachment_count integer, error_message text, retry_count integer,
  trust_level text, trust_score numeric, processed_at timestamptz,
  sensitive_payload_redacted_at timestamptz, created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.warranties add column ingestion_job_id uuid references public.ingestion_jobs(id);

create table public.ingestion_attachments (
  id uuid primary key default gen_random_uuid(),
  ingestion_job_id uuid not null references public.ingestion_jobs(id),
  filename text not null, content_type text not null, file_size bigint not null,
  file_hash text not null, storage_path text not null,
  warranty_id uuid references public.warranties(id), ocr_status text,
  ocr_raw_text text, ocr_language_detected text, ocr_word_confidence numeric,
  aggregate_confidence numeric, extracted_fields jsonb, sim_hash text,
  processed_at timestamptz, sensitive_ocr_redacted_at timestamptz,
  created_at timestamptz default now()
);

create table public.fraud_signals (
  id uuid primary key default gen_random_uuid(), signal_type text not null,
  entity_type text not null, entity_id uuid not null, description text not null,
  severity text not null default 'low', status text not null default 'open', evidence jsonb,
  related_entities jsonb, ingestion_job_id uuid references public.ingestion_jobs(id),
  attachment_id uuid references public.ingestion_attachments(id),
  assigned_to uuid references public.profiles(id), resolved_by uuid references public.profiles(id),
  resolution_notes text, resolved_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.revenue_events (
  id uuid primary key default gen_random_uuid(), event_type text not null,
  amount numeric not null, currency text not null default 'SAR',
  user_id uuid references public.profiles(id), company_id uuid references public.companies(id),
  subscription_id uuid references public.subscriptions(id),
  warranty_extension_id uuid references public.warranty_extensions(id),
  stripe_event_id text, metadata jsonb, created_at timestamptz not null default now()
);

create table public.admin_audit_log (
  id uuid primary key default gen_random_uuid(), admin_id uuid not null references public.profiles(id),
  action text not null, entity_type text not null, entity_id uuid, details jsonb,
  previous_state jsonb, new_state jsonb, ip_address inet, user_agent text,
  session_id uuid, risk_level text, created_at timestamptz not null default now()
);

create table public.system_config (
  id uuid primary key default gen_random_uuid(), key text not null unique,
  value jsonb not null, category text not null default 'general', description text,
  updated_by uuid references public.profiles(id), created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into storage.buckets(id, name, public) values ('claim-attachments', 'claim-attachments', false);

do $$
declare t text;
begin
  foreach t in array array['warranty_extensions', 'ingestion_jobs', 'ingestion_attachments', 'fraud_signals', 'revenue_events', 'admin_audit_log', 'system_config'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('revoke all on public.%I from public, anon, authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('grant select on public.%I to authenticated', t);
  end loop;
end $$;
