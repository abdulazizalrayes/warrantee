-- Privacy-safe question ledger for the public read-only agent concierge.
-- Only the service role can write or read this table. Public and signed-in
-- clients must use the bounded public answer endpoint or protected admin report.

create table public.agent_concierge_questions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  question_redacted text not null,
  question_hash text not null,
  locale text not null,
  intent text not null,
  fit boolean not null,
  answer_status text not null,
  source_protocol text not null,
  citations jsonb not null default '[]'::jsonb,
  improvement_tags text[] not null default '{}'::text[],
  redaction_applied boolean not null default false,
  client_class text not null default 'unknown',
  constraint agent_concierge_questions_text_length
    check (char_length(question_redacted) between 1 and 1000),
  constraint agent_concierge_questions_hash_format
    check (question_hash ~ '^[0-9a-f]{64}$'),
  constraint agent_concierge_questions_locale
    check (locale in ('en', 'ar')),
  constraint agent_concierge_questions_answer_status
    check (answer_status in ('answered', 'partial', 'not_supported', 'routed')),
  constraint agent_concierge_questions_source_protocol
    check (source_protocol in ('http', 'mcp', 'a2a')),
  constraint agent_concierge_questions_citations_array
    check (jsonb_typeof(citations) = 'array')
);

comment on table public.agent_concierge_questions is
  'Redacted public agent questions used for aggregate product and content improvement. Contains no IP address, raw user-agent, credentials, or private warranty payloads.';

create index agent_concierge_questions_created_at_idx
  on public.agent_concierge_questions (created_at desc);
create index agent_concierge_questions_intent_created_at_idx
  on public.agent_concierge_questions (intent, created_at desc);
create index agent_concierge_questions_status_created_at_idx
  on public.agent_concierge_questions (answer_status, created_at desc);
create index agent_concierge_questions_hash_idx
  on public.agent_concierge_questions (question_hash);

alter table public.agent_concierge_questions enable row level security;
alter table public.agent_concierge_questions force row level security;

revoke all on table public.agent_concierge_questions from public, anon, authenticated;
grant all on table public.agent_concierge_questions to service_role;

notify pgrst, 'reload schema';
