
-- warranty_documents
DROP POLICY "Users can delete own documents" ON public.warranty_documents;
CREATE POLICY "Users can delete own documents" ON public.warranty_documents
  FOR DELETE TO public
  USING (EXISTS ( SELECT 1 FROM warranties w WHERE w.id = warranty_documents.warranty_id AND (w.issuer_user_id = (SELECT auth.uid()) OR w.recipient_user_id = (SELECT auth.uid()))));

DROP POLICY "Users can upload docs" ON public.warranty_documents;
CREATE POLICY "Users can upload docs" ON public.warranty_documents
  FOR INSERT TO public
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY "Users can view warranty docs" ON public.warranty_documents;
CREATE POLICY "Users can view warranty docs" ON public.warranty_documents
  FOR SELECT TO public
  USING (
    warranty_id IN (
      SELECT warranties.id FROM warranties
      WHERE warranties.created_by = (SELECT auth.uid()) OR warranties.recipient_user_id = (SELECT auth.uid())
        OR warranties.issuer_company_id IN ( SELECT company_members.company_id FROM company_members WHERE company_members.user_id = (SELECT auth.uid()))
        OR warranties.recipient_company_id IN ( SELECT company_members.company_id FROM company_members WHERE company_members.user_id = (SELECT auth.uid()))
    )
  );

-- warranty_extensions
DROP POLICY "Users can create extensions" ON public.warranty_extensions;
CREATE POLICY "Users can create extensions" ON public.warranty_extensions
  FOR INSERT TO public
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY "Users can view extensions" ON public.warranty_extensions;
CREATE POLICY "Users can view extensions" ON public.warranty_extensions
  FOR SELECT TO public
  USING (
    warranty_id IN (
      SELECT warranties.id FROM warranties
      WHERE warranties.created_by = (SELECT auth.uid()) OR warranties.recipient_user_id = (SELECT auth.uid())
        OR warranties.issuer_company_id IN ( SELECT company_members.company_id FROM company_members WHERE company_members.user_id = (SELECT auth.uid()))
        OR warranties.recipient_company_id IN ( SELECT company_members.company_id FROM company_members WHERE company_members.user_id = (SELECT auth.uid()))
    )
  );

