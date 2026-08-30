-- Keep the service-role-only concierge ledger explicit to humans and the
-- database advisor. Normal API roles receive a deny-all RLS policy.

create policy "Agent concierge questions deny client access"
  on public.agent_concierge_questions
  for all
  to anon, authenticated
  using (false)
  with check (false);

notify pgrst, 'reload schema';
