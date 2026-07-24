
-- claim_events
DROP POLICY "Admins can insert claim events" ON public.claim_events;
CREATE POLICY "Admins can insert claim events" ON public.claim_events
  FOR INSERT TO public
  WITH CHECK (is_admin((SELECT auth.uid())) OR created_by = (SELECT auth.uid()));

DROP POLICY "Authenticated can create claim events" ON public.claim_events;
CREATE POLICY "Authenticated can create claim events" ON public.claim_events
  FOR INSERT TO public
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY "Users can view claim events" ON public.claim_events;
CREATE POLICY "Users can view claim events" ON public.claim_events
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

-- companies
DROP POLICY "Admins can view all companies" ON public.companies;
CREATE POLICY "Admins can view all companies" ON public.companies
  FOR SELECT TO public
  USING (EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin'::text));

DROP POLICY "Authenticated users can create companies" ON public.companies;
CREATE POLICY "Authenticated users can create companies" ON public.companies
  FOR INSERT TO public
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY "Company admins can update" ON public.companies;
CREATE POLICY "Company admins can update" ON public.companies
  FOR UPDATE TO public
  USING (EXISTS ( SELECT 1 FROM company_members WHERE company_members.company_id = companies.id AND company_members.user_id = (SELECT auth.uid()) AND company_members.role = 'company_admin'::user_role));

-- company_members
DROP POLICY "Members can view company members" ON public.company_members;
CREATE POLICY "Members can view company members" ON public.company_members
  FOR SELECT TO public
  USING (user_id = (SELECT auth.uid()) OR company_id IN ( SELECT get_user_company_ids() AS get_user_company_ids));

-- email_ingestion
DROP POLICY "Users can create email records" ON public.email_ingestion;
CREATE POLICY "Users can create email records" ON public.email_ingestion
  FOR INSERT TO public
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY "Users can view own email ingestion" ON public.email_ingestion;
CREATE POLICY "Users can view own email ingestion" ON public.email_ingestion
  FOR SELECT TO public
  USING (user_id = (SELECT auth.uid()));

-- fraud_signals
DROP POLICY "fraud_signals_admin" ON public.fraud_signals;
CREATE POLICY "fraud_signals_admin" ON public.fraud_signals
  FOR ALL TO public
  USING (EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])))
  WITH CHECK (EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])));

