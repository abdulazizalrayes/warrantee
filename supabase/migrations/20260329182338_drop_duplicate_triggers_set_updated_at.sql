
-- Drop duplicate set_updated_at triggers (keep the more specific ones)
DROP TRIGGER IF EXISTS set_updated_at ON companies;
DROP TRIGGER IF EXISTS set_updated_at ON profiles;
DROP TRIGGER IF EXISTS set_updated_at ON warranties;
DROP TRIGGER IF EXISTS set_updated_at ON warranty_claims;
DROP TRIGGER IF EXISTS set_updated_at ON seller_invitations;
DROP TRIGGER IF EXISTS set_updated_at ON warranty_chain_assignments;

