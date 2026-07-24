
-- Admin UPDATE policy for warranty_claims
CREATE POLICY "Admins can update all claims"
  ON warranty_claims FOR UPDATE
  USING (is_admin(auth.uid()));

-- Admin INSERT for claim_events  
CREATE POLICY "Admins can insert claim events"
  ON claim_events FOR INSERT
  WITH CHECK (is_admin(auth.uid()) OR created_by = auth.uid());

-- Admin INSERT for activity_log (uses actor_id column)
CREATE POLICY "Admins can insert activity log"
  ON activity_log FOR INSERT
  WITH CHECK (is_admin(auth.uid()) OR actor_id = auth.uid());

