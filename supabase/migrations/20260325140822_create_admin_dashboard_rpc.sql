
-- Admin dashboard stats: platform-wide metrics
CREATE OR REPLACE FUNCTION public.get_admin_platform_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_users', (SELECT count(*) FROM profiles),
    'total_companies', (SELECT count(*) FROM companies),
    'total_warranties', (SELECT count(*) FROM warranties),
    'active_warranties', (SELECT count(*) FROM warranties WHERE status = 'active'),
    'expired_warranties', (SELECT count(*) FROM warranties WHERE status = 'expired'),
    'pending_warranties', (SELECT count(*) FROM warranties WHERE status = 'pending_approval'),
    'draft_warranties', (SELECT count(*) FROM warranties WHERE status = 'draft'),
    'total_claims', (SELECT count(*) FROM warranty_claims),
    'open_claims', (SELECT count(*) FROM warranty_claims WHERE status IN ('open', 'in_progress')),
    'resolved_claims', (SELECT count(*) FROM warranty_claims WHERE status IN ('resolved', 'closed')),
    'total_extensions', (SELECT count(*) FROM warranty_extensions),
    'purchased_extensions', (SELECT count(*) FROM warranty_extensions WHERE is_purchased = true),
    'total_documents', (SELECT count(*) FROM warranty_documents),
    'total_notifications', (SELECT count(*) FROM notifications),
    'unread_notifications', (SELECT count(*) FROM notifications WHERE is_read = false),
    'total_activity_logs', (SELECT count(*) FROM activity_log),
    'total_seller_invitations', (SELECT count(*) FROM seller_invitations),
    'contact_submissions', (SELECT count(*) FROM contact_submissions),
    'users_today', (SELECT count(*) FROM profiles WHERE created_at >= CURRENT_DATE),
    'users_this_week', (SELECT count(*) FROM profiles WHERE created_at >= date_trunc('week', CURRENT_DATE)),
    'users_this_month', (SELECT count(*) FROM profiles WHERE created_at >= date_trunc('month', CURRENT_DATE)),
    'warranties_today', (SELECT count(*) FROM warranties WHERE created_at >= CURRENT_DATE),
    'warranties_this_week', (SELECT count(*) FROM warranties WHERE created_at >= date_trunc('week', CURRENT_DATE)),
    'warranties_this_month', (SELECT count(*) FROM warranties WHERE created_at >= date_trunc('month', CURRENT_DATE))
  ) INTO result;
  RETURN result;
END;
$$;

-- Admin: get all users with subscription info
CREATE OR REPLACE FUNCTION public.get_admin_users_list()
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
      p.id,
      p.email,
      p.full_name,
      p.phone,
      p.account_type,
      p.role,
      p.preferred_locale,
      p.onboarding_completed,
      p.created_at,
      s.plan_id,
      s.status AS subscription_status,
      s.trial_end,
      (SELECT count(*) FROM warranties WHERE created_by = p.id OR recipient_user_id = p.id) AS warranty_count,
      (SELECT count(*) FROM warranty_claims WHERE filed_by = p.id) AS claim_count
    FROM profiles p
    LEFT JOIN subscriptions s ON s.user_id = p.id
    ORDER BY p.created_at DESC
  ) t;
  RETURN COALESCE(result, '[]'::json);
END;
$$;

-- Admin: user growth by month
CREATE OR REPLACE FUNCTION public.get_admin_user_growth()
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
      count(*) AS new_users
    FROM profiles
    WHERE created_at >= date_trunc('month', CURRENT_DATE) - INTERVAL '11 months'
    GROUP BY date_trunc('month', created_at)
    ORDER BY date_trunc('month', created_at) ASC
  ) t;
  RETURN COALESCE(result, '[]'::json);
END;
$$;

-- Admin: subscription distribution
CREATE OR REPLACE FUNCTION public.get_admin_subscription_stats()
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
      plan_id,
      status,
      count(*) AS count
    FROM subscriptions
    GROUP BY plan_id, status
    ORDER BY count(*) DESC
  ) t;
  RETURN COALESCE(result, '[]'::json);
END;
$$;

