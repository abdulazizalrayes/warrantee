
-- ============================================================
-- PERFORMANCE FIX: Replace auth.uid() with (SELECT auth.uid())
-- This ensures the auth function is evaluated once per query
-- instead of once per row. Applied to all affected policies.
-- ============================================================

-- activity_log
DROP POLICY "Admins can insert activity log" ON public.activity_log;
CREATE POLICY "Admins can insert activity log" ON public.activity_log
  FOR INSERT TO public
  WITH CHECK (is_admin((SELECT auth.uid())) OR (actor_id = (SELECT auth.uid())));

DROP POLICY "System can insert activity" ON public.activity_log;
CREATE POLICY "System can insert activity" ON public.activity_log
  FOR INSERT TO public
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY "Users can view relevant activity" ON public.activity_log;
CREATE POLICY "Users can view relevant activity" ON public.activity_log
  FOR SELECT TO public
  USING (actor_id = (SELECT auth.uid()));

-- admin_audit_log
DROP POLICY "admin_audit_log_admin_read" ON public.admin_audit_log;
CREATE POLICY "admin_audit_log_admin_read" ON public.admin_audit_log
  FOR SELECT TO public
  USING (EXISTS ( SELECT 1 FROM profiles WHERE (profiles.id = (SELECT auth.uid()) AND profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))));

-- admin_invitations
DROP POLICY "admin_invitations_super" ON public.admin_invitations;
CREATE POLICY "admin_invitations_super" ON public.admin_invitations
  FOR ALL TO public
  USING (EXISTS ( SELECT 1 FROM profiles WHERE (profiles.id = (SELECT auth.uid()) AND profiles.role = 'super_admin'::text)))
  WITH CHECK (EXISTS ( SELECT 1 FROM profiles WHERE (profiles.id = (SELECT auth.uid()) AND profiles.role = 'super_admin'::text)));

-- admin_sessions
DROP POLICY "admin_sessions_own" ON public.admin_sessions;
CREATE POLICY "admin_sessions_own" ON public.admin_sessions
  FOR SELECT TO public
  USING (admin_id = (SELECT auth.uid()) OR EXISTS ( SELECT 1 FROM profiles WHERE (profiles.id = (SELECT auth.uid()) AND profiles.role = 'super_admin'::text)));

-- claim_attachments
DROP POLICY "Authenticated can upload attachments" ON public.claim_attachments;
CREATE POLICY "Authenticated can upload attachments" ON public.claim_attachments
  FOR INSERT TO public
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY "Users can delete own claim attachments" ON public.claim_attachments;
CREATE POLICY "Users can delete own claim attachments" ON public.claim_attachments
  FOR DELETE TO public
  USING (EXISTS ( SELECT 1 FROM warranty_claims wc WHERE wc.id = claim_attachments.claim_id AND wc.filed_by = (SELECT auth.uid())));

DROP POLICY "Users can view claim attachments" ON public.claim_attachments;
CREATE POLICY "Users can view claim attachments" ON public.claim_attachments
  FOR SELECT TO public
  USING (
    claim_id IN (
      SELECT wc.id FROM warranty_claims wc
      WHERE wc.filed_by = (SELECT auth.uid()) OR wc.assigned_to = (SELECT auth.uid())
        OR wc.warranty_id IN (
          SELECT w.id FROM warranties w
          WHERE w.created_by = (SELECT auth.uid()) OR w.recipient_user_id = (SELECT auth.uid())
        )
    ) OR is_admin((SELECT auth.uid()))
  );

