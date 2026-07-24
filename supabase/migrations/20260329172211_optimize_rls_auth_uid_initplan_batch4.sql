
-- profiles (remaining policies after permissive fix)
DROP POLICY "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT TO public
  USING ((SELECT auth.uid()) = id OR is_admin((SELECT auth.uid())));

DROP POLICY "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO public
  USING ((SELECT auth.uid()) = id);

DROP POLICY "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO public
  USING ((SELECT auth.uid()) = id);

-- provisional_warranties
DROP POLICY "Admins manage all provisional warranties" ON public.provisional_warranties;
CREATE POLICY "Admins manage all provisional warranties" ON public.provisional_warranties
  FOR ALL TO public
  USING (EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])))
  WITH CHECK (EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])));

DROP POLICY "Users see own provisional warranties" ON public.provisional_warranties;
CREATE POLICY "Users see own provisional warranties" ON public.provisional_warranties
  FOR SELECT TO public
  USING (user_id = (SELECT auth.uid()));

DROP POLICY "Users update own provisional warranties" ON public.provisional_warranties;
CREATE POLICY "Users update own provisional warranties" ON public.provisional_warranties
  FOR UPDATE TO public
  USING (user_id = (SELECT auth.uid()));

-- push_subscriptions
DROP POLICY "Users can delete own subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can delete own subscriptions" ON public.push_subscriptions
  FOR DELETE TO public
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY "Users can insert own subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can insert own subscriptions" ON public.push_subscriptions
  FOR INSERT TO public
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY "Users can manage own subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can manage own subscriptions" ON public.push_subscriptions
  FOR ALL TO public
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY "Users can view own subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can view own subscriptions" ON public.push_subscriptions
  FOR SELECT TO public
  USING ((SELECT auth.uid()) = user_id);

-- revenue_events
DROP POLICY "revenue_events_admin" ON public.revenue_events;
CREATE POLICY "revenue_events_admin" ON public.revenue_events
  FOR SELECT TO public
  USING (EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])));

