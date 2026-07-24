
-- Step 1: Create a SECURITY DEFINER function that bypasses RLS to get user's company IDs
CREATE OR REPLACE FUNCTION get_user_company_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM company_members WHERE user_id = auth.uid();
$$;

-- Step 2: Create a SECURITY DEFINER function to check if user is company admin
CREATE OR REPLACE FUNCTION is_company_admin(p_company_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM company_members
    WHERE company_id = p_company_id
      AND user_id = auth.uid()
      AND role = 'company_admin'
  );
$$;

-- Step 3: Create a SECURITY DEFINER function to check if company has any members
CREATE OR REPLACE FUNCTION company_has_members(p_company_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM company_members WHERE company_id = p_company_id
  );
$$;

-- Step 4: Drop the old recursive policies
DROP POLICY IF EXISTS "Members can view company members" ON company_members;
DROP POLICY IF EXISTS "Company admins can manage members" ON company_members;

-- Step 5: Recreate SELECT policy using the SECURITY DEFINER function
CREATE POLICY "Members can view company members"
ON company_members FOR SELECT
USING (
  user_id = auth.uid()
  OR company_id IN (SELECT get_user_company_ids())
);

-- Step 6: Recreate INSERT policy using the SECURITY DEFINER functions
CREATE POLICY "Company admins can manage members"
ON company_members FOR INSERT
WITH CHECK (
  is_company_admin(company_id)
  OR NOT company_has_members(company_id)
);

