
-- Add compatibility columns so frontend code using old column names still works
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS performed_by uuid;
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS details jsonb;

-- Create trigger to map compat columns to real columns on INSERT
CREATE OR REPLACE FUNCTION activity_log_compat_trigger()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Map performed_by -> actor_id
  IF NEW.actor_id IS NULL AND NEW.performed_by IS NOT NULL THEN
    NEW.actor_id := NEW.performed_by;
  END IF;
  -- Map details -> metadata
  IF NEW.metadata IS NULL AND NEW.details IS NOT NULL THEN
    NEW.metadata := NEW.details;
  END IF;
  -- Clear compat columns so we don't store duplicates
  NEW.performed_by := NULL;
  NEW.details := NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_activity_log_compat ON activity_log;
CREATE TRIGGER trg_activity_log_compat
BEFORE INSERT ON activity_log
FOR EACH ROW EXECUTE FUNCTION activity_log_compat_trigger();

