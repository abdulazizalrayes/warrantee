ALTER TABLE public.warranties
  ADD COLUMN IF NOT EXISTS coverage_type text DEFAULT 'standard';

UPDATE public.warranties
SET coverage_type = 'standard'
WHERE coverage_type IS NULL;

NOTIFY pgrst, 'reload schema';

