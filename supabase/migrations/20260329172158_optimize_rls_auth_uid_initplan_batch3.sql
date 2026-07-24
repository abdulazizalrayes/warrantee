
-- ingestion_attachments
DROP POLICY "Admins manage all attachments" ON public.ingestion_attachments;
CREATE POLICY "Admins manage all attachments" ON public.ingestion_attachments
  FOR ALL TO public
  USING (EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])))
  WITH CHECK (EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])));

DROP POLICY "Users see own attachments" ON public.ingestion_attachments;
CREATE POLICY "Users see own attachments" ON public.ingestion_attachments
  FOR SELECT TO public
  USING (EXISTS ( SELECT 1 FROM ingestion_jobs WHERE ingestion_jobs.id = ingestion_attachments.ingestion_job_id AND ingestion_jobs.matched_user_id = (SELECT auth.uid())));

-- ingestion_audit_log
DROP POLICY "Admins read audit log" ON public.ingestion_audit_log;
CREATE POLICY "Admins read audit log" ON public.ingestion_audit_log
  FOR SELECT TO public
  USING (EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])));

-- ingestion_jobs
DROP POLICY "Admins manage all ingestion jobs" ON public.ingestion_jobs;
CREATE POLICY "Admins manage all ingestion jobs" ON public.ingestion_jobs
  FOR ALL TO public
  USING (EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])))
  WITH CHECK (EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])));

DROP POLICY "Users see own ingestion jobs" ON public.ingestion_jobs;
CREATE POLICY "Users see own ingestion jobs" ON public.ingestion_jobs
  FOR SELECT TO public
  USING (matched_user_id = (SELECT auth.uid()));

-- ingestion_rate_limits (remaining policy)
DROP POLICY "Users can view their own rate limits" ON public.ingestion_rate_limits;
CREATE POLICY "Users can view their own rate limits" ON public.ingestion_rate_limits
  FOR SELECT TO public
  USING (identifier = ((SELECT auth.uid()))::text);

-- notifications
DROP POLICY "Authenticated users can create notifications" ON public.notifications;
CREATE POLICY "Authenticated users can create notifications" ON public.notifications
  FOR INSERT TO public
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY "Users can delete own notifications" ON public.notifications;
CREATE POLICY "Users can delete own notifications" ON public.notifications
  FOR DELETE TO public
  USING (user_id = (SELECT auth.uid()));

DROP POLICY "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE TO public
  USING (user_id = (SELECT auth.uid()));

DROP POLICY "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT TO public
  USING (user_id = (SELECT auth.uid()));

