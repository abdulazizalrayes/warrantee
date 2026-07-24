
-- Add severity and category columns to warranty_claims
ALTER TABLE warranty_claims ADD COLUMN IF NOT EXISTS severity text CHECK (severity IN ('low','medium','high','critical')) DEFAULT 'medium';
ALTER TABLE warranty_claims ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE warranty_claims ADD COLUMN IF NOT EXISTS contact_method text CHECK (contact_method IN ('email','phone','in_person','other')) DEFAULT 'email';

-- Change default status to 'draft'
ALTER TABLE warranty_claims ALTER COLUMN status SET DEFAULT 'draft'::claim_status;

-- Create claim_events table for timeline
CREATE TABLE IF NOT EXISTS claim_events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_id uuid NOT NULL REFERENCES warranty_claims(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN (
    'created','status_change','comment','attachment_added',
    'assigned','escalated','info_requested','info_provided',
    'resolution_proposed','approved','rejected','reopened','closed'
  )),
  old_status text,
  new_status text,
  description text,
  metadata jsonb DEFAULT '{}',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create claim_attachments table
CREATE TABLE IF NOT EXISTS claim_attachments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_id uuid NOT NULL REFERENCES warranty_claims(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_type text,
  file_size bigint,
  storage_path text NOT NULL,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE claim_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE claim_attachments ENABLE ROW LEVEL SECURITY;

-- RLS for claim_events
CREATE POLICY "Users can view claim events" ON claim_events FOR SELECT
  USING (
    claim_id IN (
      SELECT wc.id FROM warranty_claims wc
      WHERE wc.filed_by = auth.uid()
        OR wc.assigned_to = auth.uid()
        OR wc.warranty_id IN (
          SELECT w.id FROM warranties w
          WHERE w.created_by = auth.uid()
            OR w.recipient_user_id = auth.uid()
        )
    )
    OR is_admin(auth.uid())
  );

CREATE POLICY "Authenticated can create claim events" ON claim_events FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- RLS for claim_attachments
CREATE POLICY "Users can view claim attachments" ON claim_attachments FOR SELECT
  USING (
    claim_id IN (
      SELECT wc.id FROM warranty_claims wc
      WHERE wc.filed_by = auth.uid()
        OR wc.assigned_to = auth.uid()
        OR wc.warranty_id IN (
          SELECT w.id FROM warranties w
          WHERE w.created_by = auth.uid()
            OR w.recipient_user_id = auth.uid()
        )
    )
    OR is_admin(auth.uid())
  );

CREATE POLICY "Authenticated can upload attachments" ON claim_attachments FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Fix admin RLS on warranty_claims (recursion bug)
DROP POLICY IF EXISTS "Admins can view all claims" ON warranty_claims;
CREATE POLICY "Admins can view all claims" ON warranty_claims FOR SELECT
  USING (is_admin(auth.uid()));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_claim_events_claim_id ON claim_events(claim_id);
CREATE INDEX IF NOT EXISTS idx_claim_events_created_at ON claim_events(created_at);
CREATE INDEX IF NOT EXISTS idx_claim_attachments_claim_id ON claim_attachments(claim_id);
CREATE INDEX IF NOT EXISTS idx_warranty_claims_status ON warranty_claims(status);
CREATE INDEX IF NOT EXISTS idx_warranty_claims_filed_by ON warranty_claims(filed_by);
CREATE INDEX IF NOT EXISTS idx_warranty_claims_warranty_id ON warranty_claims(warranty_id);

