-- Category-only security telemetry for untrusted external content.
-- Raw concierge wording and hashes are purged and no longer retained.

alter table public.agent_concierge_questions
  alter column question_redacted drop not null,
  alter column question_hash drop not null;

alter table public.agent_concierge_questions
  drop constraint if exists agent_concierge_questions_text_length,
  drop constraint if exists agent_concierge_questions_hash_format;

update public.agent_concierge_questions
set question_redacted = null,
    question_hash = null,
    redaction_applied = false
where question_redacted is not null
   or question_hash is not null
   or redaction_applied is true;

drop index if exists public.agent_concierge_questions_hash_idx;

comment on table public.agent_concierge_questions is
  'Category-only public agent interaction telemetry. No question text, hashes, IP addresses, raw user-agents, credentials, or private payloads are retained.';

create table public.untrusted_content_events (
  bucket_start timestamptz not null,
  surface text not null,
  category text not null,
  event_count bigint not null default 1,
  last_seen_at timestamptz not null default now(),
  primary key (bucket_start, surface, category),
  constraint untrusted_content_events_surface
    check (surface in ('agent_http', 'agent_mcp', 'agent_a2a', 'email_body', 'ocr_output', 'contact_form', 'seller_application', 'customer_feedback')),
  constraint untrusted_content_events_category
    check (category in ('prompt_injection', 'instruction_extraction', 'credential_exfiltration', 'authorization_spoofing', 'consequential_action')),
  constraint untrusted_content_events_positive_count check (event_count > 0)
);

comment on table public.untrusted_content_events is
  'Hourly category-only counts of blocked untrusted-content attacks. No source identifier or original wording is stored.';

alter table public.untrusted_content_events enable row level security;
alter table public.untrusted_content_events force row level security;
revoke all on table public.untrusted_content_events from public, anon, authenticated;
grant all on table public.untrusted_content_events to service_role;

create or replace function public.record_untrusted_content_event(
  p_surface text,
  p_category text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_bucket timestamptz := date_trunc('hour', now());
begin
  if p_surface not in ('agent_http', 'agent_mcp', 'agent_a2a', 'email_body', 'ocr_output', 'contact_form', 'seller_application', 'customer_feedback') then
    raise exception 'invalid security event surface';
  end if;
  if p_category not in ('prompt_injection', 'instruction_extraction', 'credential_exfiltration', 'authorization_spoofing', 'consequential_action') then
    raise exception 'invalid security event category';
  end if;

  insert into public.untrusted_content_events (
    bucket_start,
    surface,
    category,
    event_count,
    last_seen_at
  ) values (
    v_bucket,
    p_surface,
    p_category,
    1,
    now()
  )
  on conflict (bucket_start, surface, category)
  do update set
    event_count = public.untrusted_content_events.event_count + 1,
    last_seen_at = excluded.last_seen_at;
end;
$$;

revoke all on function public.record_untrusted_content_event(text, text) from public, anon, authenticated;
grant execute on function public.record_untrusted_content_event(text, text) to service_role;

notify pgrst, 'reload schema';
