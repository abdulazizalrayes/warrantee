create or replace function public.transition_warranty_claim(
  p_claim_id uuid,
  p_new_status public.claim_status,
  p_note text,
  p_actor_id uuid
)
returns public.warranty_claims
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_claim public.warranty_claims%rowtype;
  current_warranty public.warranties%rowtype;
  transitioned_claim public.warranty_claims%rowtype;
  actor_is_authorized boolean;
  normalized_note text;
begin
  if p_actor_id is null then
    raise exception 'actor_required' using errcode = '22023';
  end if;

  select *
  into current_claim
  from public.warranty_claims
  where id = p_claim_id
  for update;

  if not found then
    raise exception 'claim_not_found' using errcode = 'P0002';
  end if;

  select *
  into current_warranty
  from public.warranties
  where id = current_claim.warranty_id;

  if not found then
    raise exception 'warranty_not_found' using errcode = 'P0002';
  end if;

  select
    exists (
      select 1
      from public.profiles p
      where p.id = p_actor_id
        and p.role in ('admin', 'super_admin', 'platform_admin')
    )
    or p_actor_id in (
      current_warranty.user_id,
      current_warranty.created_by,
      current_warranty.seller_id,
      current_warranty.issuer_user_id
    )
    or exists (
      select 1
      from public.company_members cm
      where cm.company_id = current_warranty.issuer_company_id
        and cm.user_id = p_actor_id
        and cm.is_active = true
        and cm.role in (
          'approver'::public.user_role,
          'company_admin'::public.user_role,
          'platform_admin'::public.user_role
        )
    )
  into actor_is_authorized;

  if not actor_is_authorized then
    raise exception 'claim_transition_forbidden' using errcode = '42501';
  end if;

  if not (
    (current_claim.status = 'draft' and p_new_status = 'submitted')
    or (current_claim.status = 'submitted' and p_new_status = 'under_review')
    or (
      current_claim.status = 'under_review'
      and p_new_status in ('approved', 'rejected', 'awaiting_info')
    )
    or (current_claim.status = 'awaiting_info' and p_new_status = 'under_review')
    or (current_claim.status = 'approved' and p_new_status = 'resolved')
    or (current_claim.status = 'rejected' and p_new_status = 'closed')
    or (current_claim.status = 'resolved' and p_new_status = 'closed')
    or (
      current_claim.status = 'open'
      and p_new_status in ('in_progress', 'resolved')
    )
    or (
      current_claim.status = 'in_progress'
      and p_new_status in ('resolved', 'closed')
    )
  ) then
    raise exception 'invalid_claim_transition:%->%',
      current_claim.status,
      p_new_status
      using errcode = '22023';
  end if;

  normalized_note := nullif(left(trim(coalesce(p_note, '')), 2000), '');

  update public.warranty_claims
  set
    status = p_new_status,
    responded_at = case
      when responded_at is null
        and p_new_status in ('under_review', 'awaiting_info', 'approved', 'rejected')
      then now()
      else responded_at
    end,
    resolved_at = case
      when p_new_status in ('resolved', 'closed') then now()
      else resolved_at
    end,
    resolution_notes = case
      when normalized_note is not null
        and p_new_status in ('approved', 'rejected', 'resolved', 'closed')
      then normalized_note
      else resolution_notes
    end,
    updated_at = now()
  where id = p_claim_id
    and status = current_claim.status
  returning *
  into transitioned_claim;

  if not found then
    raise exception 'claim_transition_conflict' using errcode = '40001';
  end if;

  insert into public.claim_events (
    claim_id,
    event_type,
    old_status,
    new_status,
    description,
    created_by
  )
  values (
    p_claim_id,
    'status_change',
    current_claim.status::text,
    p_new_status::text,
    normalized_note,
    p_actor_id
  );

  insert into public.activity_log (
    actor_id,
    entity_type,
    entity_id,
    action,
    previous_state,
    new_state,
    metadata
  )
  values (
    p_actor_id,
    'warranty_claim',
    p_claim_id,
    'claim_status_changed',
    jsonb_build_object('status', current_claim.status),
    jsonb_build_object('status', p_new_status),
    jsonb_build_object('note', normalized_note)
  );

  return transitioned_claim;
end;
$$;

revoke all on function public.transition_warranty_claim(
  uuid,
  public.claim_status,
  text,
  uuid
) from public, anon, authenticated;

grant execute on function public.transition_warranty_claim(
  uuid,
  public.claim_status,
  text,
  uuid
) to service_role;
