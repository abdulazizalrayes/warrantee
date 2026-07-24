
-- The audit_* triggers have the same trigger name for multiple events
-- We need to drop and recreate them with per-event naming to avoid duplicates
-- For now, drop all instances and we'll verify with a fresh query
DROP TRIGGER IF EXISTS audit_companies ON companies CASCADE;
DROP TRIGGER IF EXISTS audit_fraud_signals ON fraud_signals CASCADE;
DROP TRIGGER IF EXISTS audit_profiles ON profiles CASCADE;
DROP TRIGGER IF EXISTS audit_warranties ON warranties CASCADE;
DROP TRIGGER IF EXISTS audit_warranty_claims ON warranty_claims CASCADE;

