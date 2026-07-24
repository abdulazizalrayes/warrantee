begin;

alter table public.webhook_events
  add column if not exists status text not null default 'processed',
  add column if not exists attempt_count integer not null default 1,
  add column if not exists last_error text,
  add column if not exists updated_at timestamptz not null default now();

alter table public.warranty_extensions
  add column if not exists payment_status text not null default 'pending',
  add column if not exists stripe_checkout_session_id text,
  add column if not exists stripe_payment_intent_id text,
  add column if not exists payment_exception_event_id text,
  add column if not exists refunded_at timestamptz,
  add column if not exists disputed_at timestamptz;

alter table public.webhook_events
  alter column processed_at drop not null,
  alter column processed_at drop default;

alter table public.webhook_events
  drop constraint if exists webhook_events_status_check,
  add constraint webhook_events_status_check
    check (status in ('processing', 'processed', 'failed')),
  drop constraint if exists webhook_events_attempt_count_check,
  add constraint webhook_events_attempt_count_check
    check (attempt_count > 0);

create or replace function public.claim_stripe_webhook_event(
  p_event_id text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  claimed boolean := false;
begin
  if p_event_id is null or btrim(p_event_id) = '' then
    raise exception 'stripe_event_id_required';
  end if;

  insert into public.webhook_events (
    event_id,
    status,
    processed_at,
    attempt_count,
    last_error,
    updated_at
  )
  values (
    p_event_id,
    'processing',
    null,
    1,
    null,
    now()
  )
  on conflict (event_id) do update
  set
    status = 'processing',
    processed_at = null,
    attempt_count = public.webhook_events.attempt_count + 1,
    last_error = null,
    updated_at = now()
  where public.webhook_events.status = 'failed'
     or (
       public.webhook_events.status = 'processing'
       and public.webhook_events.updated_at < now() - interval '15 minutes'
     )
  returning true into claimed;

  return coalesce(claimed, false);
end;
$$;

create or replace function public.complete_stripe_webhook_event(
  p_event_id text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  updated_count integer;
begin
  update public.webhook_events
  set
    status = 'processed',
    processed_at = now(),
    last_error = null,
    updated_at = now()
  where event_id = p_event_id
    and status = 'processing';

  get diagnostics updated_count = row_count;
  return updated_count = 1;
end;
$$;

create or replace function public.fail_stripe_webhook_event(
  p_event_id text,
  p_error text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  updated_count integer;
begin
  update public.webhook_events
  set
    status = 'failed',
    processed_at = null,
    last_error = left(coalesce(p_error, 'webhook_processing_failed'), 1000),
    updated_at = now()
  where event_id = p_event_id
    and status = 'processing';

  get diagnostics updated_count = row_count;
  return updated_count = 1;
end;
$$;

create or replace function public.fulfill_warranty_extension_payment(
  p_extension_id uuid,
  p_user_id uuid,
  p_amount_paid_minor bigint,
  p_currency text,
  p_source text,
  p_checkout_session_id text,
  p_payment_intent_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  extension_record public.warranty_extensions%rowtype;
  warranty_record public.warranties%rowtype;
  expected_amount_minor bigint;
begin
  select *
  into extension_record
  from public.warranty_extensions
  where id = p_extension_id
  for update;

  if not found then
    raise exception 'extension_offer_not_found';
  end if;

  expected_amount_minor := round(extension_record.price * 100);
  if expected_amount_minor is null
     or expected_amount_minor <= 0
     or p_amount_paid_minor is distinct from expected_amount_minor then
    raise exception 'extension_payment_amount_mismatch';
  end if;

  if lower(coalesce(extension_record.currency, 'SAR'))
     <> lower(coalesce(p_currency, '')) then
    raise exception 'extension_payment_currency_mismatch';
  end if;

  if extension_record.is_purchased then
    if extension_record.purchased_by is not null
       and p_user_id is not null
       and extension_record.purchased_by <> p_user_id then
      raise exception 'extension_already_purchased_by_another_user';
    end if;

    return jsonb_build_object(
      'extension_id', extension_record.id,
      'warranty_id', extension_record.warranty_id,
      'deduplicated', true
    );
  end if;

  select *
  into warranty_record
  from public.warranties
  where id = extension_record.warranty_id
  for update;

  if not found then
    raise exception 'extension_warranty_not_found';
  end if;

  if extension_record.new_end_date <= warranty_record.end_date then
    raise exception 'extension_end_date_must_increase';
  end if;

  update public.warranty_extensions
  set
    is_purchased = true,
    purchased_by = coalesce(p_user_id, extension_record.purchased_by),
    purchased_at = now(),
    payment_status = 'paid',
    stripe_checkout_session_id = coalesce(
      left(nullif(btrim(p_checkout_session_id), ''), 255),
      extension_record.stripe_checkout_session_id
    ),
    stripe_payment_intent_id = coalesce(
      left(nullif(btrim(p_payment_intent_id), ''), 255),
      extension_record.stripe_payment_intent_id
    )
  where id = extension_record.id;

  update public.warranties
  set
    end_date = extension_record.new_end_date,
    status = 'renewed',
    updated_at = now()
  where id = warranty_record.id;

  insert into public.activity_log (
    actor_id,
    entity_type,
    entity_id,
    action,
    metadata
  )
  values (
    p_user_id,
    'warranty_extension',
    extension_record.id,
    'extension_payment_fulfilled',
    jsonb_build_object(
      'warranty_id', extension_record.warranty_id,
      'amount_minor', p_amount_paid_minor,
      'currency', lower(p_currency),
      'source', left(coalesce(p_source, 'stripe'), 100)
    )
  );

  return jsonb_build_object(
    'extension_id', extension_record.id,
    'warranty_id', extension_record.warranty_id,
    'deduplicated', false
  );
end;
$$;

create or replace function public.record_warranty_extension_payment_exception(
  p_extension_id uuid,
  p_status text,
  p_event_id text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  updated_count integer;
begin
  if p_status not in ('refunded', 'disputed') then
    raise exception 'invalid_extension_payment_exception_status';
  end if;

  update public.warranty_extensions
  set
    payment_status = p_status,
    payment_exception_event_id = left(nullif(btrim(p_event_id), ''), 255),
    refunded_at = case when p_status = 'refunded' then now() else refunded_at end,
    disputed_at = case when p_status = 'disputed' then now() else disputed_at end
  where id = p_extension_id
    and is_purchased = true;

  get diagnostics updated_count = row_count;
  return updated_count = 1;
end;
$$;

revoke all on function public.claim_stripe_webhook_event(text) from public, anon, authenticated;
revoke all on function public.complete_stripe_webhook_event(text) from public, anon, authenticated;
revoke all on function public.fail_stripe_webhook_event(text, text) from public, anon, authenticated;
revoke all on function public.fulfill_warranty_extension_payment(
  uuid,
  uuid,
  bigint,
  text,
  text,
  text,
  text
)
  from public, anon, authenticated;
revoke all on function public.record_warranty_extension_payment_exception(uuid, text, text)
  from public, anon, authenticated;

grant execute on function public.claim_stripe_webhook_event(text) to service_role;
grant execute on function public.complete_stripe_webhook_event(text) to service_role;
grant execute on function public.fail_stripe_webhook_event(text, text) to service_role;
grant execute on function public.fulfill_warranty_extension_payment(
  uuid,
  uuid,
  bigint,
  text,
  text,
  text,
  text
)
  to service_role;
grant execute on function public.record_warranty_extension_payment_exception(uuid, text, text)
  to service_role;

alter table public.warranties
  drop constraint if exists warranties_quantity_positive,
  add constraint warranties_quantity_positive check (quantity > 0),
  drop constraint if exists warranties_purchase_price_nonnegative,
  add constraint warranties_purchase_price_nonnegative
    check (purchase_price is null or purchase_price >= 0);

alter table public.warranty_extensions
  drop constraint if exists warranty_extensions_price_positive,
  add constraint warranty_extensions_price_positive
    check (price is null or price > 0),
  drop constraint if exists warranty_extensions_currency_format,
  add constraint warranty_extensions_currency_format
    check (currency is null or currency ~ '^[A-Z]{3}$'),
  drop constraint if exists warranty_extensions_commission_rate_range,
  add constraint warranty_extensions_commission_rate_range
    check (commission_rate is null or commission_rate between 0 and 100),
  drop constraint if exists warranty_extensions_commission_amount_nonnegative,
  add constraint warranty_extensions_commission_amount_nonnegative
    check (commission_amount is null or commission_amount >= 0),
  drop constraint if exists warranty_extensions_payment_status_check,
  add constraint warranty_extensions_payment_status_check
    check (payment_status in ('pending', 'paid', 'refunded', 'disputed'));

alter table public.warranty_documents
  drop constraint if exists warranty_documents_file_size_bounds,
  add constraint warranty_documents_file_size_bounds
    check (file_size > 0 and file_size <= 20971520);

alter table public.claim_attachments
  drop constraint if exists claim_attachments_file_size_bounds,
  add constraint claim_attachments_file_size_bounds
    check (file_size is null or (file_size > 0 and file_size <= 10485760));

alter table public.subscriptions
  drop constraint if exists subscriptions_warranty_limit_positive,
  add constraint subscriptions_warranty_limit_positive
    check (warranty_limit is null or warranty_limit > 0),
  drop constraint if exists subscriptions_team_limit_positive,
  add constraint subscriptions_team_limit_positive
    check (team_limit is null or team_limit > 0);

create index if not exists idx_webhook_events_status_updated_at
  on public.webhook_events (status, updated_at);

create unique index if not exists warranty_extensions_stripe_checkout_session_unique
  on public.warranty_extensions (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

create unique index if not exists warranty_extensions_stripe_payment_intent_unique
  on public.warranty_extensions (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

commit;
