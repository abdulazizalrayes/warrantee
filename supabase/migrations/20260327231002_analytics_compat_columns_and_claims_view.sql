
-- Add compatibility columns to warranties for analytics page
-- user_id mirrors issuer_user_id
ALTER TABLE warranties ADD COLUMN IF NOT EXISTS user_id uuid;
-- supplier mirrors seller_name
ALTER TABLE warranties ADD COLUMN IF NOT EXISTS supplier text;
-- purchase_price for coverage value tracking
ALTER TABLE warranties ADD COLUMN IF NOT EXISTS purchase_price numeric DEFAULT 0;

-- Backfill existing rows
UPDATE warranties SET user_id = issuer_user_id WHERE user_id IS NULL;
UPDATE warranties SET supplier = seller_name WHERE supplier IS NULL AND seller_name IS NOT NULL;

-- Trigger to keep compat columns in sync
CREATE OR REPLACE FUNCTION sync_warranty_compat_columns()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Sync user_id with issuer_user_id
  IF NEW.issuer_user_id IS NOT NULL THEN
    NEW.user_id := NEW.issuer_user_id;
  END IF;
  -- Sync supplier with seller_name
  IF NEW.seller_name IS NOT NULL THEN
    NEW.supplier := NEW.seller_name;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_warranty_compat ON warranties;
CREATE TRIGGER trg_warranty_compat
BEFORE INSERT OR UPDATE ON warranties
FOR EACH ROW EXECUTE FUNCTION sync_warranty_compat_columns();

-- Create a 'claims' view pointing to warranty_claims for analytics page compatibility
CREATE OR REPLACE VIEW claims AS
SELECT 
  id,
  warranty_id,
  claim_number,
  title,
  description,
  status,
  severity,
  filed_by,
  assigned_to,
  claim_amount,
  currency,
  resolution_notes,
  filed_at,
  resolved_at,
  created_at,
  updated_at
FROM warranty_claims;

-- Grant access to the view
GRANT SELECT ON claims TO authenticated;
GRANT SELECT ON claims TO anon;

