
-- BRD #7: Company profile — branches and multiple contacts
-- Branches: name, city, address, phone, is_main
CREATE TABLE IF NOT EXISTS public.company_branches (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name          text NOT NULL,
  name_ar       text,
  city          text,
  address       text,
  phone         text,
  is_main       boolean NOT NULL DEFAULT false,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_company_branches_company_id ON public.company_branches(company_id);

ALTER TABLE public.company_branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_members_can_view_branches"
  ON public.company_branches FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = company_branches.company_id
        AND cm.user_id = auth.uid()
        AND cm.is_active = true
    )
  );

CREATE POLICY "company_admins_can_manage_branches"
  ON public.company_branches FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = company_branches.company_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('company_admin', 'platform_admin')
        AND cm.is_active = true
    )
  );

-- Contacts: multiple contacts per company (name, role/title, email, phone, is_primary)
CREATE TABLE IF NOT EXISTS public.company_contacts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  full_name     text NOT NULL,
  title         text,
  email         text,
  phone         text,
  is_primary    boolean NOT NULL DEFAULT false,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_company_contacts_company_id ON public.company_contacts(company_id);

ALTER TABLE public.company_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_members_can_view_contacts"
  ON public.company_contacts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = company_contacts.company_id
        AND cm.user_id = auth.uid()
        AND cm.is_active = true
    )
  );

CREATE POLICY "company_admins_can_manage_contacts"
  ON public.company_contacts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = company_contacts.company_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('company_admin', 'platform_admin')
        AND cm.is_active = true
    )
  );

