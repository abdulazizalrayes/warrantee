-- WAR-9: Security — RLS Policy Hardening
-- Audit date: 2026-04-05

-- FIX 1 (CRITICAL): profiles UPDATE — prevent role self-escalation
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (( SELECT auth.uid()) = id)
  WITH CHECK (
    ( SELECT auth.uid()) = id
    AND (
      role = (SELECT role FROM public.profiles WHERE id = auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = ( SELECT auth.uid())
          AND role = 'super_admin'
      )
    )
  );

-- FIX 2 (HIGH): contact_submissions SELECT — restrict to admins only
DROP POLICY IF EXISTS "Allow authenticated read" ON public.contact_submissions;

CREATE POLICY "Admins can read contact submissions"
  ON public.contact_submissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = ( SELECT auth.uid())
        AND role IN ('admin', 'super_admin')
    )
  );

-- FIX 3 (HIGH): warranty_documents INSERT — scope to warranty parties
DROP POLICY IF EXISTS "Users can upload docs" ON public.warranty_documents;

CREATE POLICY "Users can upload docs for own warranties"
  ON public.warranty_documents
  FOR INSERT
  WITH CHECK (
    ( SELECT auth.uid()) IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.warranties w
      WHERE w.id = warranty_id
        AND (
          w.created_by        = ( SELECT auth.uid())
          OR w.issuer_user_id = ( SELECT auth.uid())
          OR w.recipient_user_id = ( SELECT auth.uid())
          OR w.issuer_company_id IN (
            SELECT company_id FROM public.company_members
            WHERE user_id = ( SELECT auth.uid())
          )
          OR w.recipient_company_id IN (
            SELECT company_id FROM public.company_members
            WHERE user_id = ( SELECT auth.uid())
          )
        )
    )
  );

-- FIX 4 (HIGH): warranty_extensions INSERT — scope to warranty parties
DROP POLICY IF EXISTS "Users can create extensions" ON public.warranty_extensions;

CREATE POLICY "Users can create extensions for own warranties"
  ON public.warranty_extensions
  FOR INSERT
  WITH CHECK (
    ( SELECT auth.uid()) IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.warranties w
      WHERE w.id = warranty_id
        AND (
          w.created_by        = ( SELECT auth.uid())
          OR w.issuer_user_id = ( SELECT auth.uid())
          OR w.recipient_user_id = ( SELECT auth.uid())
          OR w.issuer_company_id IN (
            SELECT company_id FROM public.company_members
            WHERE user_id = ( SELECT auth.uid())
          )
        )
    )
  );

-- FIX 5 (HIGH): warranty_claims INSERT — scope to warranty parties
DROP POLICY IF EXISTS "Users can create claims" ON public.warranty_claims;

CREATE POLICY "Users can create claims on accessible warranties"
  ON public.warranty_claims
  FOR INSERT
  WITH CHECK (
    ( SELECT auth.uid()) IS NOT NULL
    AND filed_by = ( SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.warranties w
      WHERE w.id = warranty_id
        AND (
          w.recipient_user_id = ( SELECT auth.uid())
          OR w.created_by = ( SELECT auth.uid())
          OR w.issuer_user_id = ( SELECT auth.uid())
          OR w.recipient_company_id IN (
            SELECT company_id FROM public.company_members
            WHERE user_id = ( SELECT auth.uid())
          )
          OR w.issuer_company_id IN (
            SELECT company_id FROM public.company_members
            WHERE user_id = ( SELECT auth.uid())
          )
        )
    )
  );

-- FIX 6 (HIGH): claim_attachments INSERT — scope to claim parties
DROP POLICY IF EXISTS "Authenticated can upload attachments" ON public.claim_attachments;

CREATE POLICY "Claim parties can upload attachments"
  ON public.claim_attachments
  FOR INSERT
  WITH CHECK (
    ( SELECT auth.uid()) IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.warranty_claims wc
      WHERE wc.id = claim_id
        AND (
          wc.filed_by   = ( SELECT auth.uid())
          OR wc.assigned_to = ( SELECT auth.uid())
          OR wc.warranty_id IN (
            SELECT id FROM public.warranties
            WHERE created_by = ( SELECT auth.uid())
               OR issuer_user_id = ( SELECT auth.uid())
               OR issuer_company_id IN (
                 SELECT company_id FROM public.company_members
                 WHERE user_id = ( SELECT auth.uid())
               )
          )
        )
    )
  );

-- FIX 7 (HIGH): claim_events INSERT — scope to claim parties
DROP POLICY IF EXISTS "Authenticated can create claim events" ON public.claim_events;

CREATE POLICY "Claim parties can create claim events"
  ON public.claim_events
  FOR INSERT
  WITH CHECK (
    ( SELECT auth.uid()) IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.warranty_claims wc
      WHERE wc.id = claim_id
        AND (
          wc.filed_by   = ( SELECT auth.uid())
          OR wc.assigned_to = ( SELECT auth.uid())
          OR wc.warranty_id IN (
            SELECT id FROM public.warranties
            WHERE created_by = ( SELECT auth.uid())
               OR issuer_user_id = ( SELECT auth.uid())
               OR issuer_company_id IN (
                 SELECT company_id FROM public.company_members
                 WHERE user_id = ( SELECT auth.uid())
               )
          )
        )
    )
  );

-- FIX 8 (MEDIUM): warranty_chain_assignments INSERT — scope to company members
DROP POLICY IF EXISTS "Users can create chain assignments" ON public.warranty_chain_assignments;

CREATE POLICY "Company members can create chain assignments"
  ON public.warranty_chain_assignments
  FOR INSERT
  WITH CHECK (
    ( SELECT auth.uid()) IS NOT NULL
    AND (
      from_company_id IN (
        SELECT company_id FROM public.company_members
        WHERE user_id = ( SELECT auth.uid())
      )
      OR manufacturer_company_id IN (
        SELECT company_id FROM public.company_members
        WHERE user_id = ( SELECT auth.uid())
      )
    )
  );

-- FIX 9 (MEDIUM): notifications INSERT — only for own user_id
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON public.notifications;

CREATE POLICY "System or self can create notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (
    user_id = ( SELECT auth.uid())
    OR ( SELECT auth.role()) = 'service_role'
  );

-- FIX 10 (MEDIUM): email_ingestion INSERT — scope to own user_id
DROP POLICY IF EXISTS "Users can create email records" ON public.email_ingestion;

CREATE POLICY "Users can create own email ingestion records"
  ON public.email_ingestion
  FOR INSERT
  WITH CHECK (
    ( SELECT auth.uid()) IS NOT NULL
    AND user_id = ( SELECT auth.uid())
  );

-- FIX 11 (MEDIUM): seller_invitations INSERT — require sender matches invited_by
DROP POLICY IF EXISTS "Users can create invitations" ON public.seller_invitations;

CREATE POLICY "Users can create invitations as themselves"
  ON public.seller_invitations
  FOR INSERT
  WITH CHECK (
    ( SELECT auth.uid()) IS NOT NULL
    AND invited_by = ( SELECT auth.uid())
  );

-- FIX 12 (MEDIUM): activity_log INSERT — require actor_id matches caller
DROP POLICY IF EXISTS "System can insert activity" ON public.activity_log;

CREATE POLICY "Users can insert activity as themselves"
  ON public.activity_log
  FOR INSERT
  WITH CHECK (
    ( SELECT auth.uid()) IS NOT NULL
    AND actor_id = ( SELECT auth.uid())
  );

