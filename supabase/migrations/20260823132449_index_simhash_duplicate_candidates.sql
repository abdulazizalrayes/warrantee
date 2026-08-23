-- Bound near-duplicate OCR candidate scans with indexed SimHash bands.

alter table public.ingestion_attachments
  add column if not exists sim_hash_bucket_1 text generated always as (substring(sim_hash from 1 for 4)) stored,
  add column if not exists sim_hash_bucket_2 text generated always as (substring(sim_hash from 5 for 4)) stored,
  add column if not exists sim_hash_bucket_3 text generated always as (substring(sim_hash from 9 for 4)) stored,
  add column if not exists sim_hash_bucket_4 text generated always as (substring(sim_hash from 13 for 4)) stored;

create index if not exists ingestion_attachments_sim_hash_bucket_1_idx
  on public.ingestion_attachments (sim_hash_bucket_1) where sim_hash is not null;
create index if not exists ingestion_attachments_sim_hash_bucket_2_idx
  on public.ingestion_attachments (sim_hash_bucket_2) where sim_hash is not null;
create index if not exists ingestion_attachments_sim_hash_bucket_3_idx
  on public.ingestion_attachments (sim_hash_bucket_3) where sim_hash is not null;
create index if not exists ingestion_attachments_sim_hash_bucket_4_idx
  on public.ingestion_attachments (sim_hash_bucket_4) where sim_hash is not null;

notify pgrst, 'reload schema';
