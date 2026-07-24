
-- BRD #5: Warranty state machine — enforce valid transitions at DB level
-- Valid transitions:
--   draft         -> pending_approval | active | cancelled
--   pending_approval -> active | cancelled
--   active        -> claimed | expired | cancelled | renewed
--   claimed       -> active | cancelled
--   expired       -> renewed | cancelled
--   cancelled     -> (terminal, no transitions)
--   renewed       -> active | expired | cancelled

CREATE OR REPLACE FUNCTION public.check_warranty_status_transition()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  allowed_next text[];
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  CASE OLD.status::text
    WHEN 'draft'            THEN allowed_next := ARRAY['pending_approval','active','cancelled'];
    WHEN 'pending_approval' THEN allowed_next := ARRAY['active','cancelled'];
    WHEN 'active'           THEN allowed_next := ARRAY['claimed','expired','cancelled','renewed'];
    WHEN 'claimed'          THEN allowed_next := ARRAY['active','cancelled'];
    WHEN 'expired'          THEN allowed_next := ARRAY['renewed','cancelled'];
    WHEN 'cancelled'        THEN allowed_next := ARRAY[]::text[];
    WHEN 'renewed'          THEN allowed_next := ARRAY['active','expired','cancelled'];
    ELSE                         allowed_next := ARRAY[]::text[];
  END CASE;

  IF NOT (NEW.status::text = ANY(allowed_next)) THEN
    RAISE EXCEPTION 'Invalid warranty status transition: % -> %', OLD.status, NEW.status
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_warranty_status_machine ON public.warranties;

CREATE TRIGGER trg_warranty_status_machine
  BEFORE UPDATE OF status ON public.warranties
  FOR EACH ROW
  EXECUTE FUNCTION public.check_warranty_status_transition();

