
-- For trg_warranty_compat, since it's a single trigger name covering multiple events,
-- we need to drop and recreate it to ensure it's only defined once
DROP TRIGGER IF EXISTS trg_warranty_compat ON warranties CASCADE;

