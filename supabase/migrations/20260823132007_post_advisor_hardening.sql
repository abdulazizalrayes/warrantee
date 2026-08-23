-- Post-advisor hardening for the growth and operational foundations.

create schema if not exists extensions;
alter extension pg_trgm set schema extensions;

create index if not exists api_idempotency_records_client_idx
  on public.api_idempotency_records (client_id) where client_id is not null;
create index if not exists api_integration_tokens_company_idx
  on public.api_integration_tokens (company_id) where company_id is not null;
create index if not exists asset_lifecycle_events_actor_idx
  on public.asset_lifecycle_events (actor_id) where actor_id is not null;
create index if not exists asset_lifecycle_events_claim_idx
  on public.asset_lifecycle_events (claim_id) where claim_id is not null;
create index if not exists async_jobs_company_idx
  on public.async_jobs (company_id) where company_id is not null;
create index if not exists async_jobs_owner_idx
  on public.async_jobs (owner_user_id) where owner_user_id is not null;
create index if not exists customer_feedback_events_actor_idx
  on public.customer_feedback_events (actor_id) where actor_id is not null;
create index if not exists recall_matches_reviewer_idx
  on public.recall_matches (reviewed_by) where reviewed_by is not null;
create index if not exists recall_notices_company_idx
  on public.recall_notices (company_id) where company_id is not null;
create index if not exists recall_notices_creator_idx
  on public.recall_notices (created_by) where created_by is not null;
create index if not exists warranty_extension_requests_requester_idx
  on public.warranty_extension_requests (requester_id, created_at desc);
create index if not exists warranty_extension_requests_reviewer_idx
  on public.warranty_extension_requests (reviewed_by) where reviewed_by is not null;
create index if not exists warranty_policy_templates_company_idx
  on public.warranty_policy_templates (company_id, is_active) where company_id is not null;
create index if not exists warranty_policy_templates_owner_idx
  on public.warranty_policy_templates (owner_user_id, is_active);

create policy api_clients_explicit_service_only on public.api_clients
  for all to authenticated using (false) with check (false);
create policy api_idempotency_explicit_service_only on public.api_idempotency_records
  for all to authenticated using (false) with check (false);
create policy api_integration_tokens_explicit_service_only on public.api_integration_tokens
  for all to authenticated using (false) with check (false);
create policy async_jobs_explicit_service_only on public.async_jobs
  for all to authenticated using (false) with check (false);
create policy payment_reconciliation_explicit_service_only on public.payment_reconciliation_findings
  for all to authenticated using (false) with check (false);
create policy platform_audit_explicit_service_only on public.platform_audit_events
  for all to authenticated using (false) with check (false);

notify pgrst, 'reload schema';
