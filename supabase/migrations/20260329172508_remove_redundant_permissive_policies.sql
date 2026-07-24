
-- ============================================================
-- Remove redundant PERMISSIVE policies that overlap with broader ones
-- ============================================================

-- push_subscriptions: "Users can manage own subscriptions" (ALL) already covers
-- DELETE, INSERT, and SELECT. Drop the individual ones.
DROP POLICY "Users can delete own subscriptions" ON public.push_subscriptions;
DROP POLICY "Users can insert own subscriptions" ON public.push_subscriptions;
DROP POLICY "Users can view own subscriptions" ON public.push_subscriptions;

-- activity_log: "System can insert activity" (auth.uid() IS NOT NULL) is a superset
-- of "Admins can insert activity log" (is_admin OR actor_id match).
-- Any authenticated user satisfying the admin check also satisfies IS NOT NULL.
-- Keep only "System can insert activity" for INSERT.
DROP POLICY "Admins can insert activity log" ON public.activity_log;

-- claim_events: Same pattern — "Authenticated can create claim events" (auth.uid() IS NOT NULL)
-- is a superset of "Admins can insert claim events". Drop the redundant one.
DROP POLICY "Admins can insert claim events" ON public.claim_events;

-- warranty_claims: "Admins can update all claims" overlaps with "Relevant parties can update claims"
-- These are intentional (different access patterns), so keep both.

-- profiles: "Users can view own profile" is a subset of "Admins can view all profiles"
-- (which includes uid = id check). Drop the subset.
DROP POLICY "Users can view own profile" ON public.profiles;

