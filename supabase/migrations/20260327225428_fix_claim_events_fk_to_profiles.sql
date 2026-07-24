
-- Fix claim_events: FK must point to profiles (not auth.users) for PostgREST joins
ALTER TABLE claim_events DROP CONSTRAINT claim_events_created_by_fkey;
ALTER TABLE claim_events ADD CONSTRAINT claim_events_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES profiles(id);

-- Also fix warranty_claims FKs if they point to auth.users instead of profiles
DO $$
DECLARE
  ref_table text;
BEGIN
  -- Check filed_by FK
  SELECT confrelid::regclass::text INTO ref_table
  FROM pg_constraint WHERE conname = 'warranty_claims_filed_by_fkey';
  
  IF ref_table = 'auth.users' THEN
    ALTER TABLE warranty_claims DROP CONSTRAINT warranty_claims_filed_by_fkey;
    ALTER TABLE warranty_claims ADD CONSTRAINT warranty_claims_filed_by_fkey
      FOREIGN KEY (filed_by) REFERENCES profiles(id);
  END IF;

  -- Check assigned_to FK
  SELECT confrelid::regclass::text INTO ref_table
  FROM pg_constraint WHERE conname = 'warranty_claims_assigned_to_fkey';
  
  IF ref_table IS NOT NULL AND ref_table = 'auth.users' THEN
    ALTER TABLE warranty_claims DROP CONSTRAINT warranty_claims_assigned_to_fkey;
    ALTER TABLE warranty_claims ADD CONSTRAINT warranty_claims_assigned_to_fkey
      FOREIGN KEY (assigned_to) REFERENCES profiles(id);
  END IF;
END $$;

