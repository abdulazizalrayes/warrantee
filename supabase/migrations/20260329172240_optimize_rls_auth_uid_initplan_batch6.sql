
-- warranties
DROP POLICY "Admins can view all warranties" ON public.warranties;
CREATE POLICY "Admins can view all warranties" ON public.warranties
  FOR SELECT TO public
  USING (EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin'::text));

DROP POLICY "Authenticated users can create warranties" ON public.warranties;
CREATE POLICY "Authenticated users can create warranties" ON public.warranties
  FOR INSERT TO public
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY "Relevant parties can update warranties" ON public.warranties;
CREATE POLICY "Relevant parties can update warranties" ON public.warranties
  FOR UPDATE TO public
  USING (
    created_by = (SELECT auth.uid()) OR recipient_user_id = (SELECT auth.uid())
    OR issuer_company_id IN ( SELECT company_members.company_id FROM company_members WHERE company_members.user_id = (SELECT auth.uid()))
    OR recipient_company_id IN ( SELECT company_members.company_id FROM company_members WHERE company_members.user_id = (SELECT auth.uid()))
  );

DROP POLICY "Users can delete own draft warranties" ON public.warranties;
CREATE POLICY "Users can delete own draft warranties" ON public.warranties
  FOR DELETE TO public
  USING (created_by = (SELECT auth.uid()) AND status = 'draft'::warranty_status);

DROP POLICY "Users can view their warranties" ON public.warranties;
CREATE POLICY "Users can view their warranties" ON public.warranties
  FOR SELECT TO public
  USING (
    created_by = (SELECT auth.uid()) OR recipient_user_id = (SELECT auth.uid())
    OR issuer_company_id IN ( SELECT company_members.company_id FROM company_members WHERE company_members.user_id = (SELECT auth.uid()))
    OR recipient_company_id IN ( SELECT company_members.company_id FROM company_members WHERE company_members.user_id = (SELECT auth.uid()))
  );

-- warranty_chain_assignments
DROP POLICY "Involved parties can update chain" ON public.warranty_chain_assignments;
CREATE POLICY "Involved parties can update chain" ON public.warranty_chain_assignments
  FOR UPDATE TO public
  USING (
    from_company_id IN ( SELECT company_members.company_id FROM company_members WHERE company_members.user_id = (SELECT auth.uid()))
    OR to_company_id IN ( SELECT company_members.company_id FROM company_members WHERE company_members.user_id = (SELECT auth.uid()))
    OR manufacturer_company_id IN ( SELECT company_members.company_id FROM company_members WHERE company_members.user_id = (SELECT auth.uid()))
  );

DROP POLICY "Users can create chain assignments" ON public.warranty_chain_assignments;
CREATE POLICY "Users can create chain assignments" ON public.warranty_chain_assignments
  FOR INSERT TO public
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY "Users can view chain assignments" ON public.warranty_chain_assignments;
CREATE POLICY "Users can view chain assignments" ON public.warranty_chain_assignments
  FOR SELECT TO public
  USING (
    from_company_id IN ( SELECT company_members.company_id FROM company_members WHERE company_members.user_id = (SELECT auth.uid()))
    OR to_company_id IN ( SELECT company_members.company_id FROM company_members WHERE company_members.user_id = (SELECT auth.uid()))
    OR manufacturer_company_id IN ( SELECT company_members.company_id FROM company_members WHERE company_members.user_id = (SELECT auth.uid()))
  );

