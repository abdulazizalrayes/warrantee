
-- 1. Create no-arg is_admin() overload for frontend RPC calls
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin', 'platform_admin')
  );
$$;

-- 2. Fix ingestion_rate_limits RLS
CREATE POLICY "Users can view their own rate limits"
  ON ingestion_rate_limits FOR SELECT
  USING (identifier = auth.uid()::text);

CREATE POLICY "System can insert rate limits"
  ON ingestion_rate_limits FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update rate limits"
  ON ingestion_rate_limits FOR UPDATE
  USING (true);

-- 3. Add INSERT policy for notifications
CREATE POLICY "Authenticated users can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 4. Add DELETE policies
CREATE POLICY "Users can delete own claim attachments"
  ON claim_attachments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM warranty_claims wc
      WHERE wc.id = claim_attachments.claim_id
      AND wc.filed_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own documents"
  ON warranty_documents FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM warranties w
      WHERE w.id = warranty_documents.warranty_id
      AND (w.issuer_user_id = auth.uid() OR w.recipient_user_id = auth.uid())
    )
  );

-- 5. Soft delete columns
ALTER TABLE warranties ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE warranty_claims ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE warranty_documents ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- 6. Indexes for soft delete + pagination performance
CREATE INDEX IF NOT EXISTS idx_warranties_deleted_at ON warranties(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_warranty_claims_deleted_at ON warranty_claims(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_warranty_documents_deleted_at ON warranty_documents(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_warranties_created_at ON warranties(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_warranty_claims_created_at ON warranty_claims(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_claim_events_created_at ON claim_events(created_at DESC);

