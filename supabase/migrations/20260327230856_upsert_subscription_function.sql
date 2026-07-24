
-- Create a function the webhook can call to upsert subscription records
-- This provides a clean API for the webhook to persist Stripe data
CREATE OR REPLACE FUNCTION upsert_subscription(
  p_user_id uuid,
  p_plan_id text,
  p_status text,
  p_stripe_customer_id text DEFAULT NULL,
  p_stripe_subscription_id text DEFAULT NULL,
  p_current_period_start timestamptz DEFAULT NULL,
  p_current_period_end timestamptz DEFAULT NULL,
  p_trial_start timestamptz DEFAULT NULL,
  p_trial_end timestamptz DEFAULT NULL,
  p_cancel_at_period_end boolean DEFAULT false
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  sub_id uuid;
  plan_warranty_limit integer;
  plan_team_limit integer;
BEGIN
  -- Set limits based on plan
  CASE p_plan_id
    WHEN 'free' THEN plan_warranty_limit := 10; plan_team_limit := 1;
    WHEN 'pro' THEN plan_warranty_limit := -1; plan_team_limit := 5;
    WHEN 'enterprise' THEN plan_warranty_limit := -1; plan_team_limit := -1;
    ELSE plan_warranty_limit := 10; plan_team_limit := 1;
  END CASE;

  INSERT INTO subscriptions (
    id, user_id, plan_id, status, stripe_customer_id, stripe_subscription_id,
    current_period_start, current_period_end, trial_start, trial_end,
    cancel_at_period_end, warranty_limit, team_limit, updated_at
  ) VALUES (
    gen_random_uuid(), p_user_id, p_plan_id, p_status, p_stripe_customer_id, p_stripe_subscription_id,
    p_current_period_start, p_current_period_end, p_trial_start, p_trial_end,
    p_cancel_at_period_end, plan_warranty_limit, plan_team_limit, now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    plan_id = EXCLUDED.plan_id,
    status = EXCLUDED.status,
    stripe_customer_id = COALESCE(EXCLUDED.stripe_customer_id, subscriptions.stripe_customer_id),
    stripe_subscription_id = COALESCE(EXCLUDED.stripe_subscription_id, subscriptions.stripe_subscription_id),
    current_period_start = COALESCE(EXCLUDED.current_period_start, subscriptions.current_period_start),
    current_period_end = COALESCE(EXCLUDED.current_period_end, subscriptions.current_period_end),
    trial_start = COALESCE(EXCLUDED.trial_start, subscriptions.trial_start),
    trial_end = COALESCE(EXCLUDED.trial_end, subscriptions.trial_end),
    cancel_at_period_end = EXCLUDED.cancel_at_period_end,
    warranty_limit = EXCLUDED.warranty_limit,
    team_limit = EXCLUDED.team_limit,
    updated_at = now()
  RETURNING id INTO sub_id;

  RETURN sub_id;
END;
$$;

-- Add unique constraint on user_id if not exists (needed for ON CONFLICT)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_user_id_key'
  ) THEN
    ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_user_id_key UNIQUE (user_id);
  END IF;
END $$;

