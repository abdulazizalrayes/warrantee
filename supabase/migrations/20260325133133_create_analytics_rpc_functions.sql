
-- Seed existing users with free subscriptions
INSERT INTO public.subscriptions (user_id, plan_id, status, warranty_limit, team_limit)
SELECT p.id, 'free', 'active', 10, 1
FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.user_id = p.id);

-- Analytics: warranty trends by month (last 12 months)
CREATE OR REPLACE FUNCTION public.get_warranty_trends(user_uuid UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_agg(row_to_json(t)) INTO result
  FROM (
    SELECT
      to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
      to_char(date_trunc('month', created_at), 'Mon') AS month_label,
      count(*) AS total_created,
      count(*) FILTER (WHERE status = 'active') AS active,
      count(*) FILTER (WHERE status = 'expired') AS expired,
      count(*) FILTER (WHERE status = 'claimed') AS claimed
    FROM public.warranties
    WHERE (created_by = user_uuid OR recipient_user_id = user_uuid)
      AND created_at >= date_trunc('month', CURRENT_DATE) - INTERVAL '11 months'
    GROUP BY date_trunc('month', created_at)
    ORDER BY date_trunc('month', created_at) ASC
  ) t;
  RETURN COALESCE(result, '[]'::json);
END;
$$;

-- Analytics: warranty breakdown by category
CREATE OR REPLACE FUNCTION public.get_warranty_by_category(user_uuid UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_agg(row_to_json(t)) INTO result
  FROM (
    SELECT
      COALESCE(category, 'other') AS category,
      count(*) AS count,
      count(*) FILTER (WHERE status = 'active') AS active_count
    FROM public.warranties
    WHERE (created_by = user_uuid OR recipient_user_id = user_uuid)
    GROUP BY category
    ORDER BY count(*) DESC
  ) t;
  RETURN COALESCE(result, '[]'::json);
END;
$$;

-- Analytics: warranty status distribution
CREATE OR REPLACE FUNCTION public.get_warranty_status_distribution(user_uuid UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_agg(row_to_json(t)) INTO result
  FROM (
    SELECT
      status,
      count(*) AS count
    FROM public.warranties
    WHERE (created_by = user_uuid OR recipient_user_id = user_uuid)
    GROUP BY status
    ORDER BY count(*) DESC
  ) t;
  RETURN COALESCE(result, '[]'::json);
END;
$$;

-- Analytics: claims summary
CREATE OR REPLACE FUNCTION public.get_claims_summary(user_uuid UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_claims', (SELECT count(*) FROM warranty_claims WHERE filed_by = user_uuid),
    'open_claims', (SELECT count(*) FROM warranty_claims WHERE filed_by = user_uuid AND status = 'open'),
    'in_progress', (SELECT count(*) FROM warranty_claims WHERE filed_by = user_uuid AND status = 'in_progress'),
    'resolved', (SELECT count(*) FROM warranty_claims WHERE filed_by = user_uuid AND status = 'resolved'),
    'contested', (SELECT count(*) FROM warranty_claims WHERE filed_by = user_uuid AND status = 'contested'),
    'closed', (SELECT count(*) FROM warranty_claims WHERE filed_by = user_uuid AND status = 'closed'),
    'total_amount', (SELECT COALESCE(sum(claim_amount), 0) FROM warranty_claims WHERE filed_by = user_uuid),
    'avg_resolution_days', (
      SELECT COALESCE(
        round(avg(EXTRACT(epoch FROM (updated_at - created_at)) / 86400)::numeric, 1),
        0
      )
      FROM warranty_claims
      WHERE filed_by = user_uuid AND status IN ('resolved', 'closed')
    )
  ) INTO result;
  RETURN result;
END;
$$;

-- Get user subscription info
CREATE OR REPLACE FUNCTION public.get_user_subscription(user_uuid UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT row_to_json(s) INTO result
  FROM (
    SELECT
      sub.plan_id,
      sub.status,
      sub.current_period_start,
      sub.current_period_end,
      sub.trial_start,
      sub.trial_end,
      sub.cancel_at_period_end,
      sub.warranty_limit,
      sub.team_limit,
      (SELECT count(*) FROM warranties WHERE created_by = user_uuid OR recipient_user_id = user_uuid) AS warranties_used,
      (SELECT count(*) FROM company_members WHERE user_id = user_uuid AND is_active = true) AS team_members_used
    FROM subscriptions sub
    WHERE sub.user_id = user_uuid
    LIMIT 1
  ) s;
  RETURN result;
END;
$$;

