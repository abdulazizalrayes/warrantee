
-- ============================================================
-- FIX 1: contact_submissions - restrict anon inserts
-- Require non-empty name and email (no message column exists)
-- ============================================================
DROP POLICY "Allow anonymous inserts" ON public.contact_submissions;
CREATE POLICY "Allow anonymous inserts with validation" ON public.contact_submissions
  FOR INSERT TO anon
  WITH CHECK (
    name IS NOT NULL AND name <> '' AND
    email IS NOT NULL AND email <> ''
  );

-- ============================================================
-- FIX 2: ingestion_rate_limits - remove overly permissive public policies
-- Service role bypasses RLS, so these are unnecessary and dangerous.
-- ============================================================
DROP POLICY "System can insert rate limits" ON public.ingestion_rate_limits;
DROP POLICY "System can update rate limits" ON public.ingestion_rate_limits;

-- ============================================================
-- FIX 3: profiles - restrict insert to own profile only
-- Service role (signup trigger) bypasses RLS anyway.
-- ============================================================
DROP POLICY "Service can create profiles" ON public.profiles;
CREATE POLICY "Users can create own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = id);

-- ============================================================
-- FIX 4: seller_invitations - remove wide-open insert policy
-- "Users can create invitations" already covers authenticated inserts.
-- ============================================================
DROP POLICY "Anyone can submit seller registration" ON public.seller_invitations;

