// @ts-nocheck
// Warrantee — Inbound Email Webhook Handler
// POST /api/ingest/email
// Receives parsed emails from Resend inbound webhook

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import type { Database } from '@/types/database';
import {
  matchSender,
  processDocument,
  detectFraud,
  computeSimHash,
  logAudit,
  SUPPORTED_FILE_TYPES,
  MAX_FILE_SIZE,
  CONFIDENCE_THRESHOLDS,
  RATE_LIMITS,
} from '@/lib/ingestion';
import type { ResendInboundPayload, IngestionJobStatus } from '@/lib/ingestion';
import { sendEmail } from '@/lib/email';

function getSupabaseAdmin() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

type SupabaseAdminClient = ReturnType<typeof getSupabaseAdmin>;
type InboundAttachment = NonNullable<ResendInboundPayload['attachments']>[number];

export async function POST(request: NextRequest) {
  const supabaseAdmin = getSupabaseAdmin();
  try {
    // 1. Verify Resend webhook signature
    const signature = request.headers.get('resend-signature');
    const body = await request.text();

    if (!verifyResendSignature(body, signature)) {
      console.error('[Ingest] Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const payload: ResendInboundPayload = JSON.parse(body);

    // 2. Rate limiting
    const fromEmail = payload.from.toLowerCase().trim();
    const isAllowed = await checkRateLimit(fromEmail, supabaseAdmin);
    if (!isAllowed) {
      console.warn(`[Ingest] Rate limited: ${fromEmail}`);
      return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
    }

    // 3. Create ingestion job
    const ccEmails = payload.cc ? payload.cc.split(',').map((e: string) => e.trim()) : [];
    const { data: job, error: jobError } = await supabaseAdmin
      .from('ingestion_jobs')
      .insert({
        message_id: payload.message_id,
        from_email: fromEmail,
        from_name: extractName(payload.from),
        to_email: payload.to,
        cc_emails: ccEmails,
        subject: payload.subject || '',
        text_body: payload.text || '',
        html_body: payload.html || '',
        status: 'received',
        attachment_count: payload.attachments?.length || 0,
        raw_payload: payload,
        ip_address: request.headers.get('x-forwarded-for') || null,
      })
      .select('id')
      .single();

    if (jobError || !job) {
      // Duplicate message_id = already processed
      if (jobError?.code === '23505') {
        return NextResponse.json({ status: 'duplicate' }, { status: 200 });
      }
      throw new Error(`Failed to create ingestion job: ${jobError?.message}`);
    }

    await logAudit(job.id, 'received', 'system', {
      from: fromEmail,
      subject: payload.subject,
      attachment_count: payload.attachments?.length || 0,
    });

    // 4. Match sender to registered user
    const senderMatch = await matchSender(fromEmail, ccEmails);

    await supabaseAdmin.from('ingestion_jobs').update({
      matched_user_id: senderMatch.user_id,
      trust_level: senderMatch.trust_level,
      trust_score: senderMatch.trust_score,
      status: 'processing',
    }).eq('id', job.id);

    await logAudit(job.id, senderMatch.user_id ? 'matched_user' : 'no_user_match', 'system', {
      trust_level: senderMatch.trust_level,
      trust_score: senderMatch.trust_score,
      match_method: senderMatch.match_method,
    });

    // 5. Process attachments
    if (!payload.attachments || payload.attachments.length === 0) {
      await supabaseAdmin.from('ingestion_jobs').update({
        status: 'pending_review',
        error_message: 'No attachments found',
      }).eq('id', job.id);

      await sendNoAttachmentNotification(fromEmail, payload.subject);
      return NextResponse.json({ status: 'no_attachments', job_id: job.id });
    }

    // Process each attachment
    const attachmentResults = [];
    for (const attachment of payload.attachments) {
      const result = await processAttachment(job.id, attachment, senderMatch, fromEmail, supabaseAdmin);
      attachmentResults.push(result);
    }

    // 6. Determine overall job status
    const hasHighConfidence = attachmentResults.some((r) => r.confidence >= CONFIDENCE_THRESHOLDS.HIGH);
    const hasMediumConfidence = attachmentResults.some(
      (r) => r.confidence >= CONFIDENCE_THRESHOLDS.MEDIUM && r.confidence < CONFIDENCE_THRESHOLDS.HIGH
    );
    const hasFraud = attachmentResults.some((r) => r.hasFraud);

    let finalStatus: IngestionJobStatus = 'ocr_complete';
    if (hasFraud) {
      finalStatus = 'pending_review';
    } else if (hasHighConfidence && senderMatch.trust_score >= 0.9) {
      finalStatus = 'auto_confirmed';
    } else if (hasMediumConfidence || hasHighConfidence) {
      finalStatus = senderMatch.buyer_id
        ? 'pending_buyer_confirmation'
        : 'pending_review';
    } else {
      finalStatus = 'pending_review';
    }

    await supabaseAdmin.from('ingestion_jobs').update({
      status: finalStatus,
      processed_at: new Date().toISOString(),
    }).eq('id', job.id);

    // Send confirmation email when warranty is auto-confirmed via ingestion
    if (finalStatus === 'auto_confirmed') {
      await sendEmail({
        to: fromEmail,
        subject: "Your warranty has been registered on Warrantee",
        html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #1A1A2E; font-size: 22px;">Warrantee</h1>
  <p>Great news — your warranty document has been successfully processed and registered.</p>
  <p><strong>Reference:</strong> Job #${job.id}</p>
  <p>You can view and manage your warranty by logging into your Warrantee account.</p>
  <div style="text-align: center; margin: 24px 0;">
    <a href="https://warrantee.io/en/dashboard" style="background: #F5C542; color: #1A1A2E; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
      View Dashboard
    </a>
  </div>
  <p style="color: #999; font-size: 12px;">Warrantee — Trust the Terms™</p>
</div>`,
      }).catch((err) => console.error('[Ingest] Confirmation email failed:', err));
    }

    return NextResponse.json({
      status: finalStatus,
      job_id: job.id,
      attachments_processed: attachmentResults.length,
    });

  } catch (error) {
    console.error('[Ingest] Webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function processAttachment(
  jobId: string,
  attachment: InboundAttachment,
  senderMatch: Awaited<ReturnType<typeof matchSender>>,
  fromEmail: string,
  supabaseAdmin: SupabaseAdminClient
): Promise<{ confidence: number; hasFraud: boolean }> {
  const isSupported = SUPPORTED_FILE_TYPES.includes(attachment.content_type);
  if (attachment.size > MAX_FILE_SIZE) {
    await logAudit(jobId, 'error', 'system', {
      error: 'File too large',
      filename: attachment.filename,
      size: attachment.size,
    });
    return { confidence: 0, hasFraud: false };
  }

  const fileBuffer = Buffer.from(attachment.content, 'base64');
  const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

  const storagePath = `ingestion/${jobId}/${attachment.filename}`;
  const { error: storageError } = await supabaseAdmin.storage
    .from('warranty-documents')
    .upload(storagePath, fileBuffer, {
      contentType: attachment.content_type,
    });

  if (storageError) {
    await logAudit(jobId, 'error', 'system', {
      error: 'Attachment storage failed',
      filename: attachment.filename,
      details: storageError.message,
    });
    return { confidence: 0, hasFraud: false };
  }

  const { data: attachmentRecord } = await supabaseAdmin
    .from('ingestion_attachments')
    .insert({
      ingestion_job_id: jobId,
      filename: attachment.filename,
      content_type: attachment.content_type,
      file_size: attachment.size,
      file_hash: fileHash,
      storage_path: storagePath,
      ocr_status: isSupported ? 'processing' : 'unsupported',
    })
    .select('id')
    .single();

  if (!attachmentRecord) {
    return { confidence: 0, hasFraud: false };
  }

  await logAudit(jobId, 'attachment_stored', 'system', {
    attachment_id: attachmentRecord.id,
    filename: attachment.filename,
    file_hash: fileHash,
    supported: isSupported,
  });

  if (!isSupported) {
    return { confidence: 0, hasFraud: false };
  }

  await logAudit(jobId, 'ocr_started', 'system', {
    attachment_id: attachmentRecord.id,
  }, attachmentRecord.id);

  try {
    const ocrResult = await processDocument(attachment.content, attachment.content_type);
    const simHash = ocrResult.raw_text ? computeSimHash(ocrResult.raw_text) : null;

    await supabaseAdmin.from('ingestion_attachments').update({
      ocr_status: 'completed',
      ocr_raw_text: ocrResult.raw_text,
      ocr_language_detected: ocrResult.language_detected,
      ocr_word_confidence: ocrResult.confidence,
      extracted_fields: ocrResult.extracted_fields,
      aggregate_confidence: ocrResult.aggregate_confidence,
      sim_hash: simHash,
      processed_at: new Date().toISOString(),
    }).eq('id', attachmentRecord.id);

    await logAudit(jobId, 'ocr_completed', 'system', {
      attachment_id: attachmentRecord.id,
      confidence: ocrResult.aggregate_confidence,
      language: ocrResult.language_detected,
      fields_extracted: Object.keys(ocrResult.extracted_fields)
        .filter((k) => ocrResult.extracted_fields[k as keyof typeof ocrResult.extracted_fields] !== null).length,
    }, attachmentRecord.id);

    const fraudSignals = await detectFraud(
      jobId,
      attachmentRecord.id,
      fileHash,
      ocrResult.extracted_fields,
      fromEmail,
      senderMatch.user_id
    );

    const hasFraud = fraudSignals.some((s) => s.severity === 'high');
    if (fraudSignals.length > 0) {
      await logAudit(jobId, 'fraud_flagged', 'system', {
        signals: fraudSignals.map((s) => s.signal_type),
        severity_max: hasFraud ? 'high' : fraudSignals.some((s) => s.severity === 'medium') ? 'medium' : 'low',
      }, attachmentRecord.id);
    }

    if (senderMatch.user_id && ocrResult.aggregate_confidence >= CONFIDENCE_THRESHOLDS.MEDIUM && !hasFraud) {
      await createProvisionalWarranty(jobId, attachmentRecord.id, senderMatch.user_id, ocrResult, supabaseAdmin);
    }

    if (
      ocrResult.aggregate_confidence >= CONFIDENCE_THRESHOLDS.HIGH &&
      senderMatch.trust_score >= 0.9 &&
      !hasFraud
    ) {
      await autoConfirmWarranty(jobId, attachmentRecord.id, senderMatch.user_id!, ocrResult, supabaseAdmin);
      await logAudit(jobId, 'auto_confirmed', 'system', {
        confidence: ocrResult.aggregate_confidence,
        trust_score: senderMatch.trust_score,
      }, attachmentRecord.id);
    }

    return { confidence: ocrResult.aggregate_confidence, hasFraud };

  } catch (ocrError) {
    await supabaseAdmin.from('ingestion_attachments').update({
      ocr_status: 'failed',
    }).eq('id', attachmentRecord.id);

    await logAudit(jobId, 'ocr_failed', 'system', {
      attachment_id: attachmentRecord.id,
      error: (ocrError as Error).message,
    }, attachmentRecord.id);

    return { confidence: 0, hasFraud: false };
  }
}

async function createProvisionalWarranty(
  jobId: string,
  attachmentId: string,
  userId: string,
  ocrResult: Awaited<ReturnType<typeof processDocument>>,
  supabaseAdmin: SupabaseAdminClient
) {
  const fields = ocrResult.extracted_fields;
  const needsInput: string[] = [];

  const fieldChecks: [string, unknown][] = [
    ['product_name', fields.product_name],
    ['brand', fields.brand],
    ['warranty_duration_months', fields.warranty_duration_months],
    ['purchase_date', fields.purchase_date],
  ];
  for (const [name, field] of fieldChecks) {
    if (!field || (field as { confidence: number }).confidence < 0.5) {
      needsInput.push(name);
    }
  }

  await supabaseAdmin.from('provisional_warranties').insert({
    ingestion_job_id: jobId,
    attachment_id: attachmentId,
    user_id: userId,
    product_name: fields.product_name?.value || null,
    brand: fields.brand?.value || null,
    model_number: fields.model_number?.value || null,
    serial_number: fields.serial_number?.value || null,
    warranty_duration_months: fields.warranty_duration_months?.value || null,
    purchase_date: fields.purchase_date?.value || null,
    expiry_date: fields.expiry_date?.value || null,
    seller_name: fields.seller_name?.value || null,
    confidence_score: ocrResult.aggregate_confidence,
    needs_input_fields: needsInput,
  });

  await logAudit(jobId, 'provisional_created', 'system', {
    user_id: userId,
    confidence: ocrResult.aggregate_confidence,
    needs_input: needsInput,
  }, attachmentId);
}

async function autoConfirmWarranty(
  jobId: string,
  attachmentId: string,
  userId: string,
  ocrResult: Awaited<ReturnType<typeof processDocument>>,
  supabaseAdmin: SupabaseAdminClient
) {
  const fields = ocrResult.extracted_fields;

  const { data: warranty } = await supabaseAdmin
    .from('warranties')
    .insert({
      recipient_user_id: userId,
      product_name: fields.product_name?.value || 'Unknown Product',
      sku: fields.model_number?.value || null,
      serial_number: fields.serial_number?.value || null,
      start_date: fields.purchase_date?.value || null,
      end_date: fields.expiry_date?.value || null,
      seller_name: fields.seller_name?.value || null,
      is_self_registered: true,
      source: 'email_ingestion',
      ingestion_job_id: jobId,
    })
    .select('id')
    .single();

  if (warranty) {
    await supabaseAdmin.from('ingestion_attachments').update({
      warranty_id: warranty.id,
    }).eq('id', attachmentId);
  }
}

function verifyResendSignature(body: string, signature: string | null): boolean {
  if (!signature || !process.env.RESEND_WEBHOOK_SECRET) {
    if (process.env.NODE_ENV === 'development') return true;
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RESEND_WEBHOOK_SECRET)
    .update(body)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

async function checkRateLimit(email: string, supabaseAdmin: SupabaseAdminClient): Promise<boolean> {
  const { data } = await supabaseAdmin.rpc('check_rate_limit', {
    p_identifier: email,
    p_type: 'email',
    p_max_requests: RATE_LIMITS.PER_EMAIL_PER_HOUR,
    p_window_minutes: 60,
  });
  return data !== false;
}

function extractName(fromField: string): string | null {
  const match = fromField.match(/^([^<]+)<[^>]+>$/);
  return match ? match[1].trim() : null;
}

async function sendNoAttachmentNotification(email: string, subject: string | undefined) {
  const originalSubject = subject ? `"${subject}"` : "your email";
  await sendEmail({
    to: email,
    subject: "We received your email but found no warranty documents",
    html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #1A1A2E; font-size: 22px;">Warrantee</h1>
  <p>Thank you for emailing <strong>hello@warrantee.io</strong>.</p>
  <p>We received ${originalSubject} but could not find any warranty documents attached (PDF, JPG, PNG, etc.).</p>
  <p>To register a warranty via email, please:</p>
  <ol>
    <li>Attach the warranty document (PDF or image) to your email</li>
    <li>Send it to <a href="mailto:hello@warrantee.io">hello@warrantee.io</a></li>
  </ol>
  <p>If you have questions, reply to this email or visit <a href="https://warrantee.io">warrantee.io</a>.</p>
  <p style="color: #999; font-size: 12px;">Warrantee — Trust the Terms™</p>
</div>`,
  });
}
