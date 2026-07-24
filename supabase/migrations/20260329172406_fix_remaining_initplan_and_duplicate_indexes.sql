
-- ============================================================
-- FIX last 2 auth_rls_initplan warnings (auth.role() calls)
-- ============================================================
DROP POLICY "Service role full access" ON public.push_subscriptions;
CREATE POLICY "Service role full access" ON public.push_subscriptions
  FOR ALL TO public
  USING ((SELECT auth.role()) = 'service_role'::text)
  WITH CHECK ((SELECT auth.role()) = 'service_role'::text);

DROP POLICY "Service role can manage subscriptions" ON public.subscriptions;
CREATE POLICY "Service role can manage subscriptions" ON public.subscriptions
  FOR ALL TO public
  USING ((SELECT auth.role()) = 'service_role'::text)
  WITH CHECK ((SELECT auth.role()) = 'service_role'::text);

-- ============================================================
-- DROP 7 duplicate indexes (keeping the more descriptive names)
-- ============================================================

-- activity_log: keep idx_activity_log_entity, drop idx_activity_entity
DROP INDEX IF EXISTS public.idx_activity_entity;

-- notifications: keep idx_notifications_created_at, drop idx_notifications_created
DROP INDEX IF EXISTS public.idx_notifications_created;

-- notifications: keep idx_notifications_user_read, drop idx_notifications_user
DROP INDEX IF EXISTS public.idx_notifications_user;

-- warranty_chain_assignments: keep idx_chain_assignments_warranty, drop idx_chain_original
DROP INDEX IF EXISTS public.idx_chain_original;

-- warranty_claims: keep idx_warranty_claims_filed_by, drop idx_claims_filed_by
DROP INDEX IF EXISTS public.idx_claims_filed_by;

-- warranty_claims: keep idx_warranty_claims_status, drop idx_claims_status
DROP INDEX IF EXISTS public.idx_claims_status;

-- warranty_claims: keep idx_warranty_claims_warranty_id, drop idx_claims_warranty
DROP INDEX IF EXISTS public.idx_claims_warranty;

