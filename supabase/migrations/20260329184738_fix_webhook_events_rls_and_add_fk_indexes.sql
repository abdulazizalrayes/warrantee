
-- 1. Add RLS policy for webhook_events (service_role bypasses RLS, so block all direct access)
CREATE POLICY "webhook_events_service_role_only"
  ON public.webhook_events
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- 2. Add missing indexes on foreign keys for query performance at scale
CREATE INDEX IF NOT EXISTS idx_admin_invitations_invited_by ON public.admin_invitations (invited_by);
CREATE INDEX IF NOT EXISTS idx_claim_attachments_uploaded_by ON public.claim_attachments (uploaded_by);
CREATE INDEX IF NOT EXISTS idx_claim_events_created_by ON public.claim_events (created_by);
CREATE INDEX IF NOT EXISTS idx_companies_created_by ON public.companies (created_by);
CREATE INDEX IF NOT EXISTS idx_email_ingestion_warranty_id ON public.email_ingestion (warranty_id);
CREATE INDEX IF NOT EXISTS idx_fraud_signals_assigned_to ON public.fraud_signals (assigned_to);
CREATE INDEX IF NOT EXISTS idx_fraud_signals_attachment_id ON public.fraud_signals (attachment_id);
CREATE INDEX IF NOT EXISTS idx_fraud_signals_resolved_by ON public.fraud_signals (resolved_by);
CREATE INDEX IF NOT EXISTS idx_ingestion_attachments_warranty_id ON public.ingestion_attachments (warranty_id);
CREATE INDEX IF NOT EXISTS idx_ingestion_audit_log_attachment_id ON public.ingestion_audit_log (attachment_id);
CREATE INDEX IF NOT EXISTS idx_notifications_claim_id ON public.notifications (claim_id);
CREATE INDEX IF NOT EXISTS idx_notifications_warranty_id ON public.notifications (warranty_id);
CREATE INDEX IF NOT EXISTS idx_provisional_warranties_attachment_id ON public.provisional_warranties (attachment_id);
CREATE INDEX IF NOT EXISTS idx_provisional_warranties_ingestion_job_id ON public.provisional_warranties (ingestion_job_id);
CREATE INDEX IF NOT EXISTS idx_revenue_events_company_id ON public.revenue_events (company_id);
CREATE INDEX IF NOT EXISTS idx_revenue_events_subscription_id ON public.revenue_events (subscription_id);
CREATE INDEX IF NOT EXISTS idx_revenue_events_warranty_extension_id ON public.revenue_events (warranty_extension_id);
CREATE INDEX IF NOT EXISTS idx_seller_invitations_invited_by ON public.seller_invitations (invited_by);
CREATE INDEX IF NOT EXISTS idx_seller_invitations_seller_company_id ON public.seller_invitations (seller_company_id);
CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_sender_id ON public.support_ticket_messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_related_claim_id ON public.support_tickets (related_claim_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_related_warranty_id ON public.support_tickets (related_warranty_id);
CREATE INDEX IF NOT EXISTS idx_system_config_updated_by ON public.system_config (updated_by);
CREATE INDEX IF NOT EXISTS idx_warranties_approved_by ON public.warranties (approved_by);
CREATE INDEX IF NOT EXISTS idx_warranties_archived_by ON public.warranties (archived_by);
CREATE INDEX IF NOT EXISTS idx_warranties_created_by ON public.warranties (created_by);
CREATE INDEX IF NOT EXISTS idx_warranties_ingestion_job_id ON public.warranties (ingestion_job_id);
CREATE INDEX IF NOT EXISTS idx_warranties_issuer_user_id ON public.warranties (issuer_user_id);
CREATE INDEX IF NOT EXISTS idx_warranty_chain_assignments_initiated_by ON public.warranty_chain_assignments (initiated_by);
CREATE INDEX IF NOT EXISTS idx_warranty_chain_assignments_manufacturer_company_id ON public.warranty_chain_assignments (manufacturer_company_id);
CREATE INDEX IF NOT EXISTS idx_warranty_chain_assignments_revoked_by ON public.warranty_chain_assignments (revoked_by);
CREATE INDEX IF NOT EXISTS idx_warranty_chain_assignments_servicing_company_id ON public.warranty_chain_assignments (servicing_company_id);
CREATE INDEX IF NOT EXISTS idx_warranty_claims_archived_by ON public.warranty_claims (archived_by);
CREATE INDEX IF NOT EXISTS idx_warranty_claims_assigned_to ON public.warranty_claims (assigned_to);
CREATE INDEX IF NOT EXISTS idx_warranty_documents_uploaded_by ON public.warranty_documents (uploaded_by);
CREATE INDEX IF NOT EXISTS idx_warranty_extensions_new_warranty_id ON public.warranty_extensions (new_warranty_id);
CREATE INDEX IF NOT EXISTS idx_warranty_extensions_offered_by ON public.warranty_extensions (offered_by);
CREATE INDEX IF NOT EXISTS idx_warranty_extensions_purchased_by ON public.warranty_extensions (purchased_by);

