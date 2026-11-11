-- Focused reconstructed journey prerequisites, NOT a production schema clone.
-- Column names and enum values are checked against src/types/database.ts.
create type public.account_type as enum ('consumer', 'business');
create type public.company_role as enum ('vendor', 'client', 'both');
create type public.user_role as enum ('viewer', 'creator', 'approver', 'company_admin', 'platform_admin');
create type public.warranty_status as enum ('draft', 'pending_approval', 'active', 'claimed', 'expired', 'cancelled', 'renewed');
create type public.claim_status as enum ('open', 'in_progress', 'resolved', 'contested', 'closed', 'draft', 'submitted', 'under_review', 'awaiting_info', 'approved', 'rejected');
create type public.notification_type as enum ('warranty_created', 'warranty_submitted', 'warranty_approved', 'warranty_rejected', 'expiry_reminder', 'claim_opened', 'claim_resolved', 'extension_offered', 'extension_purchased', 'document_uploaded', 'bulk_import_complete', 'seller_invitation', 'warranty_verified', 'general', 'whatsapp', 'claim_status_changed', 'info_requested', 'system');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null default '', full_name text not null,
  avatar_url text, role text default 'user', account_type public.account_type not null default 'consumer',
  company text, phone text, preferred_language text not null default 'en',
  preferred_locale text not null default 'en', timezone text not null default 'Asia/Riyadh',
  onboarding_completed boolean default false,
  email_notifications boolean not null default true, push_notifications boolean not null default false,
  notify_expiry boolean not null default true, notify_claims boolean not null default true,
  notify_newsletter boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.companies (
  id uuid primary key default gen_random_uuid(), name text not null, name_ar text,
  company_role public.company_role not null default 'both', email text,
  created_by uuid references public.profiles(id), country text not null default 'SA',
  is_verified boolean not null default false, is_archived boolean default false, archived_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.company_members (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id),
  user_id uuid not null references auth.users(id), role public.user_role not null default 'viewer',
  is_active boolean not null default true, invited_by uuid references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(company_id, user_id)
);
create table public.warranties (
  id uuid primary key default gen_random_uuid(), reference_number text not null unique,
  product_name text not null, product_name_ar text, sku text, serial_number text,
  quantity integer not null default 1, category text, description text,
  start_date date not null, end_date date not null, status public.warranty_status not null default 'active',
  user_id uuid references auth.users(id), created_by uuid references public.profiles(id),
  issuer_user_id uuid references public.profiles(id), recipient_user_id uuid references public.profiles(id),
  buyer_id uuid references public.profiles(id), seller_id uuid references public.profiles(id),
  issuer_company_id uuid references public.companies(id), recipient_company_id uuid references public.companies(id),
  seller_name text, seller_email text, supplier text, manufacturer text, model_number text,
  po_reference text, invoice_reference text, terms_and_conditions text, custom_clauses jsonb,
  language text not null default 'en', source text default 'manual', coverage_type text default 'standard',
  purchase_price numeric, is_self_registered boolean not null default true,
  is_seller_verified boolean not null default false, certificate_url text, certificate_hash text,
  approved_at timestamptz, approved_by uuid references public.profiles(id),
  deleted_at timestamptz, is_archived boolean default false, archived_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (end_date > start_date), check (quantity > 0)
);
create table public.warranty_documents (
  id uuid primary key default gen_random_uuid(), warranty_id uuid not null references public.warranties(id),
  file_name text not null, file_type text not null, file_size bigint not null,
  file_url text not null, uploaded_by uuid references public.profiles(id),
  storage_path text, file_hash text, document_kind text not null default 'other',
  provenance_status text not null default 'recorded', evidence_metadata jsonb not null default '{}',
  uploaded_at timestamptz not null default now(), created_at timestamptz not null default now(),
  deleted_at timestamptz, version integer not null default 1, is_watermarked boolean not null default false
);
create table public.activity_log (
  id uuid primary key default gen_random_uuid(), actor_id uuid references public.profiles(id),
  entity_type text not null, entity_id uuid not null, action text not null,
  metadata jsonb, details jsonb, previous_state jsonb, new_state jsonb,
  performed_by uuid, ip_address inet, created_at timestamptz not null default now()
);
create table public.warranty_claims (
  id uuid primary key default gen_random_uuid(), warranty_id uuid not null references public.warranties(id),
  filed_by uuid not null references public.profiles(id), assigned_to uuid references public.profiles(id),
  claim_number text not null unique, title text not null, description text not null,
  status public.claim_status not null default 'draft', claim_amount numeric, currency text default 'SAR',
  resolution_notes text, filed_at timestamptz not null default now(), resolved_at timestamptz, responded_at timestamptz,
  deleted_at timestamptz, is_archived boolean default false, archived_at timestamptz,
  archived_by uuid references public.profiles(id), legal_hold boolean default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.notifications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id),
  warranty_id uuid references public.warranties(id), claim_id uuid references public.warranty_claims(id),
  title text not null, body text not null, title_ar text, body_ar text,
  type public.notification_type not null, action_url text, is_read boolean not null default false,
  is_email_sent boolean not null default false, created_at timestamptz not null default now()
);

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

do $$
declare t text;
begin
  foreach t in array array['profiles','companies','company_members','warranties','warranty_documents','activity_log','warranty_claims','notifications'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
end $$;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.companies, public.warranties, public.warranty_documents to authenticated;
grant select on public.company_members, public.warranty_claims to authenticated;
grant select, insert on public.activity_log to authenticated;
grant select, insert, update, delete on public.notifications to authenticated;

insert into storage.buckets(id, name, public) values ('warranty-documents', 'warranty-documents', false);
