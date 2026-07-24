
-- Create webhook_events table for Stripe webhook idempotency
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id text NOT NULL UNIQUE,
  processed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: only service_role should access this table
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- No public policies — only service_role (which bypasses RLS) should insert/read
-- Add an index on event_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON public.webhook_events (event_id);

-- Add comment
COMMENT ON TABLE public.webhook_events IS 'Tracks processed Stripe webhook events for idempotency';

