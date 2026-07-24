-- Step 1: Add compatibility columns if missing
ALTER TABLE public.warranties
  ADD COLUMN IF NOT EXISTS buyer_id uuid,
  ADD COLUMN IF NOT EXISTS seller_id uuid;

-- Step 2: Backfill from canonical columns
UPDATE public.warranties
SET
  buyer_id  = COALESCE(recipient_user_id, user_id),
  seller_id = COALESCE(issuer_user_id, created_by)
WHERE buyer_id IS NULL OR seller_id IS NULL;

-- Step 3: Add indexes for query performance
CREATE INDEX IF NOT EXISTS warranties_buyer_id_idx  ON public.warranties (buyer_id);
CREATE INDEX IF NOT EXISTS warranties_seller_id_idx ON public.warranties (seller_id);

-- Step 4: Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

