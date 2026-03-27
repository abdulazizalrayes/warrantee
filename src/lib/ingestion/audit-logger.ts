// Warrantee — Ingestion Audit Logger

import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export type AuditAction =
  | 'received'
  | 'signature_verified'
  | 'signature_failed'
  | 'rate_limited'
  | 'matched_user'
  | 'no_user_match'
  | 'attachment_stored'
  | 'ocr_started'
  | 'ocr_completed'
  | 'ocr_failed'
  | 'confidence_scored'
  | 'auto_confirmed'
  | 'provisional_created'
  | 'review_queued'
  | 'user_confirmed'
  | 'user_rejected'
  | 'buyer_confirmation_sent'
  | 'buyer_confirmed'
  | 'buyer_rejected'
  | 'duplicate_detected'
  | 'fraud_flagged'
  | 'fraud_resolved'
  | 'invitation_sent'
  | 'invitation_accepted'
  | 'error';

export async function logAudit(
  ingestionJobId: string,
  action: AuditAction,
  actor: string = 'system',
  details?: Record<string, unknown>,
  attachmentId?: string
): Promise<void> {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    await supabaseAdmin.from('ingestion_audit_log').insert({
      ingestion_job_id: ingestionJobId,
      attachment_id: attachmentId || null,
      action,
      actor,
      details: details || null,
    });
  } catch (error) {
    // Audit logging should never break the pipeline
    console.error('[AuditLog] Failed to log:', { ingestionJobId, action, error });
  }
}
