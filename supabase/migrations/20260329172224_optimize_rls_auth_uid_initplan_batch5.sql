
-- seller_invitations (remaining policies)
DROP POLICY "Users can create invitations" ON public.seller_invitations;
CREATE POLICY "Users can create invitations" ON public.seller_invitations
  FOR INSERT TO public
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY "Users can view own invitations" ON public.seller_invitations;
CREATE POLICY "Users can view own invitations" ON public.seller_invitations
  FOR SELECT TO public
  USING (invited_by = (SELECT auth.uid()));

-- subscriptions
DROP POLICY "Users can view own subscription" ON public.subscriptions;
CREATE POLICY "Users can view own subscription" ON public.subscriptions
  FOR SELECT TO public
  USING ((SELECT auth.uid()) = user_id);

-- support_ticket_messages
DROP POLICY "support_messages_access" ON public.support_ticket_messages;
CREATE POLICY "support_messages_access" ON public.support_ticket_messages
  FOR ALL TO public
  USING (EXISTS ( SELECT 1 FROM support_tickets st
    WHERE st.id = support_ticket_messages.ticket_id
    AND (st.user_id = (SELECT auth.uid()) OR EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'support'::text])))))
  WITH CHECK (EXISTS ( SELECT 1 FROM support_tickets st
    WHERE st.id = support_ticket_messages.ticket_id
    AND (st.user_id = (SELECT auth.uid()) OR EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'support'::text])))));

-- support_tickets
DROP POLICY "support_tickets_access" ON public.support_tickets;
CREATE POLICY "support_tickets_access" ON public.support_tickets
  FOR ALL TO public
  USING (user_id = (SELECT auth.uid()) OR EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'support'::text])))
  WITH CHECK (user_id = (SELECT auth.uid()) OR EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'support'::text])));

-- system_config
DROP POLICY "system_config_read" ON public.system_config;
CREATE POLICY "system_config_read" ON public.system_config
  FOR SELECT TO public
  USING (EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])));

DROP POLICY "system_config_write" ON public.system_config;
CREATE POLICY "system_config_write" ON public.system_config
  FOR UPDATE TO public
  USING (EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'super_admin'::text));

