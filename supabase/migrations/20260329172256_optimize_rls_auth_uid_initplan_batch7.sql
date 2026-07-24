
-- warranty_claims
DROP POLICY "Admins can update all claims" ON public.warranty_claims;
CREATE POLICY "Admins can update all claims" ON public.warranty_claims
  FOR UPDATE TO public
  USING (is_admin((SELECT auth.uid())));

DROP POLICY "Admins can view all claims" ON public.warranty_claims;
CREATE POLICY "Admins can view all claims" ON public.warranty_claims
  FOR SELECT TO public
  USING (is_admin((SELECT auth.uid())));

DROP POLICY "Relevant parties can update claims" ON public.warranty_claims;
CREATE POLICY "Relevant parties can update claims" ON public.warranty_claims
  FOR UPDATE TO public
  USING (filed_by = (SELECT auth.uid()) OR assigned_to = (SELECT auth.uid()));

DROP POLICY "Users can create claims" ON public.warranty_claims;
CREATE POLICY "Users can create claims" ON public.warranty_claims
  FOR INSERT TO public
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY "Users can view relevant claims" ON public.warranty_claims;
CREATE POLICY "Users can view relevant claims" ON public.warranty_claims
  FOR SELECT TO public
  USING (
    filed_by = (SELECT auth.uid()) OR warranty_id IN (
      SELECT warranties.id FROM warranties
      WHERE warranties.created_by = (SELECT auth.uid()) OR warranties.recipient_user_id = (SELECT auth.uid())
        OR warranties.issuer_company_id IN ( SELECT company_members.company_id FROM company_members WHERE company_members.user_id = (SELECT auth.uid()))
        OR warranties.recipient_company_id IN ( SELECT company_members.company_id FROM company_members WHERE company_members.user_id = (SELECT auth.uid()))
    )
  );

-- warranty_coverage_items
DROP POLICY "Creators and company admins can insert coverage items" ON public.warranty_coverage_items;
CREATE POLICY "Creators and company admins can insert coverage items" ON public.warranty_coverage_items
  FOR INSERT TO public
  WITH CHECK (EXISTS ( SELECT 1 FROM warranties w WHERE w.id = warranty_coverage_items.warranty_id AND (
    w.created_by = (SELECT auth.uid())
    OR EXISTS ( SELECT 1 FROM company_members cm WHERE cm.user_id = (SELECT auth.uid()) AND cm.is_active = true AND cm.company_id = w.issuer_company_id AND cm.role = ANY (ARRAY['creator'::user_role, 'approver'::user_role, 'company_admin'::user_role]))
    OR EXISTS ( SELECT 1 FROM profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'::text)
  )));

DROP POLICY "Creators and company admins can update coverage items" ON public.warranty_coverage_items;
CREATE POLICY "Creators and company admins can update coverage items" ON public.warranty_coverage_items
  FOR UPDATE TO public
  USING (EXISTS ( SELECT 1 FROM warranties w WHERE w.id = warranty_coverage_items.warranty_id AND (
    w.created_by = (SELECT auth.uid())
    OR EXISTS ( SELECT 1 FROM company_members cm WHERE cm.user_id = (SELECT auth.uid()) AND cm.is_active = true AND cm.company_id = w.issuer_company_id AND cm.role = ANY (ARRAY['creator'::user_role, 'approver'::user_role, 'company_admin'::user_role]))
    OR EXISTS ( SELECT 1 FROM profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'::text)
  )));

DROP POLICY "Users can view coverage items for accessible warranties" ON public.warranty_coverage_items;
CREATE POLICY "Users can view coverage items for accessible warranties" ON public.warranty_coverage_items
  FOR SELECT TO public
  USING (EXISTS ( SELECT 1 FROM warranties w WHERE w.id = warranty_coverage_items.warranty_id AND (
    w.created_by = (SELECT auth.uid()) OR w.recipient_user_id = (SELECT auth.uid()) OR w.issuer_user_id = (SELECT auth.uid())
    OR EXISTS ( SELECT 1 FROM company_members cm WHERE cm.user_id = (SELECT auth.uid()) AND cm.is_active = true AND (cm.company_id = w.issuer_company_id OR cm.company_id = w.recipient_company_id))
    OR EXISTS ( SELECT 1 FROM profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'::text)
  )));

