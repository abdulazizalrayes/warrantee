
-- 1. Drop redundant "Admins can view all companies" policy
-- "Anyone can view companies" (qual: true) already covers all users including admins
DROP POLICY IF EXISTS "Admins can view all companies" ON companies;

-- 2. Fix "Admins can view all warranties" to include super_admin role
DROP POLICY IF EXISTS "Admins can view all warranties" ON warranties;
CREATE POLICY "Admins can view all warranties" ON warranties
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

