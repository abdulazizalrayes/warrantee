-- Operational data-retention controls for takeover readiness.
-- These columns let the application redact high-risk raw ingestion/OCR payloads
-- without deleting durable business records or audit trails.

alter table if exists public.ingestion_jobs
  add column if not exists sensitive_payload_redacted_at timestamptz;

alter table if exists public.ingestion_attachments
  add column if not exists sensitive_ocr_redacted_at timestamptz;

create index if not exists ingestion_jobs_sensitive_payload_retention_idx
  on public.ingestion_jobs (created_at)
  where sensitive_payload_redacted_at is null
    and (raw_payload is not null or text_body is not null or html_body is not null);

create index if not exists ingestion_attachments_sensitive_ocr_retention_idx
  on public.ingestion_attachments (processed_at)
  where sensitive_ocr_redacted_at is null
    and ocr_raw_text is not null;

create index if not exists api_usage_events_retention_created_idx
  on public.api_usage_events (created_at);

notify pgrst, 'reload schema';
