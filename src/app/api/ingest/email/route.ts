// Warrantee — Inbound Email Webhook Handler
// POST /api/ingest/email
// Receives parsed emails from Resend inbound webhook

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { Resend, type AttachmentData } from 'resend';
import type { Database, Json } from '@/types/database';
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
import emailTemplates from '@/lib/email-templates';
import { createBuyerConfirmationToken } from '@/lib/provisional-warranties';
import { sanitizeInboundAttachmentFilename } from '@/lib/ingestion/attachments';
import { escapeHtml } from '@/lib/html-escape';
import { getClientIp, getRateLimitHeaders, rateLimit, webhookRateLimit } from '@/lib/rate-limit';
import {
  extractEmailAddress,
  getInboundEmailAuthentication,
  type InboundEmailAuthentication,
} from '@/lib/ingestion/email-authentication';
import { scanDocumentBaseline } from '@/lib/server/document-security-baseline';
import { scanSignedDocumentWithConfiguredScanner } from '@/lib/server/document-security-scanner';
import { assessUntrustedContent, isInstructionAttack } from '@/lib/untrusted-content';
import { recordUntrustedContentEvent } from '@/lib/server/untrusted-content-events';

function getSupabaseAdmin() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

type SupabaseAdminClient = ReturnType<typeof getSupabaseAdmin>;
type InboundAttachment = NonNullable<ResendInboundPayload['attachments']>[number];

type ResendReceivedEvent = {
  type: 'email.received';
  created_at: string;
  data: {
    email_id: string;
    message_id?: string | null;
    from: string;
    to: string[];
    cc?: string[] | null;
    subject?: string | null;
  };
};

function createResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY is not configured');
  return new Resend(apiKey);
}

function verifyResendWebhook(resend: Resend, body: string, request: NextRequest) {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  const id = request.headers.get('svix-id');
  const timestamp = request.headers.get('svix-timestamp');
  const signature = request.headers.get('svix-signature');
  if (!webhookSecret || !id || !timestamp || !signature) return null;

  try {
    return resend.webhooks.verify({
      payload: body,
      headers: { id, timestamp, signature },
      webhookSecret,
    });
  } catch {
    return null;
  }
}

async function downloadResendAttachment(attachment: AttachmentData): Promise<InboundAttachment> {
  if (attachment.size <= 0 || attachment.size > MAX_FILE_SIZE) {
    throw new Error('Inbound attachment exceeds the supported size');
  }

  const downloadUrl = new URL(attachment.download_url);
  if (downloadUrl.protocol !== 'https:' || downloadUrl.username || downloadUrl.password) {
    throw new Error('Invalid inbound attachment URL');
  }

  const response = await fetch(downloadUrl, {
    redirect: 'error',
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    throw new Error(`Inbound attachment download failed (${response.status})`);
  }

  const contentLength = Number(response.headers.get('content-length') || attachment.size);
  if (!Number.isFinite(contentLength) || contentLength <= 0 || contentLength > MAX_FILE_SIZE) {
    throw new Error('Inbound attachment content length is invalid');
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length <= 0 || bytes.length > MAX_FILE_SIZE) {
    throw new Error('Inbound attachment download size is invalid');
  }

  return {
    filename: sanitizeInboundAttachmentFilename(attachment.filename || 'attachment'),
    content_type: attachment.content_type.toLowerCase(),
    content: bytes.toString('base64'),
    size: bytes.length,
  };
}

async function loadReceivedEmail(
  resend: Resend,
  event: ResendReceivedEvent
): Promise<ResendInboundPayload> {
  const { data: email, error: emailError } = await resend.emails.receiving.get(
    event.data.email_id,
    { html_format: 'cid' }
  );
  if (emailError || !email) {
    throw new Error(`Could not retrieve inbound email: ${emailError?.message || 'not found'}`);
  }

  const { data: attachmentList, error: attachmentError } =
    await resend.emails.receiving.attachments.list({
      emailId: event.data.email_id,
      limit: 20,
    });
  if (attachmentError) {
    throw new Error(`Could not retrieve inbound attachments: ${attachmentError.message}`);
  }

  const attachments = await Promise.all(
    (attachmentList?.data || []).slice(0, 20).map(downloadResendAttachment)
  );

  return {
    from: email.from,
    to: email.to[0] || event.data.to[0] || '',
    cc: (email.cc || []).join(','),
    subject: email.subject || event.data.subject || '',
    text: email.text || '',
    html: email.html || '',
    attachments,
    headers: email.headers || {},
    message_id: email.message_id || event.data.message_id || event.data.email_id,
  };
}

export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request);
  const webhookLimitResult = await webhookRateLimit(clientIp);
  if (!webhookLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many webhook attempts' },
      { status: 429, headers: getRateLimitHeaders(webhookLimitResult) }
    );
  }

  const supabaseAdmin = getSupabaseAdmin();
  try {
    // 1. Verify Resend webhook signature
    const body = await request.text();
    const resend = createResendClient();
    const verifiedEvent = verifyResendWebhook(resend, body, request);
    if (!verifiedEvent) {
      console.error('[Ingest] Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    if (verifiedEvent.type !== 'email.received') {
      return NextResponse.json({ status: 'ignored' });
    }

    const receivedEvent = verifiedEvent as ResendReceivedEvent;
    const payload = await loadReceivedEmail(resend, receivedEvent);

    // 2. Rate limiting
    const fromEmail = extractEmailAddress(payload.from).toLowerCase().trim();
    const emailAuth = getInboundEmailAuthentication(payload.headers || {}, fromEmail);
    const isAllowed = await checkRateLimit(fromEmail, clientIp);
    if (!isAllowed) {
      console.warn(`[Ingest] Rate limited: ${fromEmail}`);
      return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
    }

    const emailAssessment = assessUntrustedContent(
      [payload.subject, payload.text, payload.html].filter(Boolean).join('\n')
    );
    if (isInstructionAttack(emailAssessment) && emailAssessment.category !== 'none') {
      await recordUntrustedContentEvent('email_body', emailAssessment.category);
      return NextResponse.json({ status: 'blocked_untrusted_content' }, { status: 202 });
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
        raw_payload: receivedEvent as unknown as Json,
        ip_address: clientIp,
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
      email_authentication: emailAuth,
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
      email_authentication: emailAuth,
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
      const result = await processAttachment(job.id, attachment, senderMatch, fromEmail, emailAuth, supabaseAdmin);
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
    } else if (hasHighConfidence && senderMatch.trust_score >= 0.9 && emailAuth.aligned) {
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

    const responseLocale = 'en';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://warrantee.io';
    const dashboardUrl = `${appUrl}/${responseLocale}/dashboard`;

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
    <a href="${dashboardUrl}" style="background: #0071e3; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
      View Dashboard
    </a>
  </div>
  <p style="color: #999; font-size: 12px;">Warrantee — Trust the Terms™</p>
</div>`,
      }).catch((err) => console.error('[Ingest] Confirmation email failed:', err));
    }

    if (finalStatus === 'pending_buyer_confirmation' && senderMatch.buyer_id) {
      const pendingProvisionalResults = attachmentResults.filter((result) => result.provisional);
      for (const result of pendingProvisionalResults) {
        try {
          await sendBuyerConfirmationEmail({
            provisional: result.provisional!,
            recipientEmail: fromEmail,
            jobId: job.id,
            locale: responseLocale,
          });
        } catch (err) {
          console.error('[Ingest] Buyer confirmation email failed:', err);
        }
      }
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
  emailAuth: InboundEmailAuthentication,
  supabaseAdmin: SupabaseAdminClient
): Promise<{ confidence: number; hasFraud: boolean; provisional?: any | null }> {
  const safeFilename = sanitizeInboundAttachmentFilename(attachment.filename);
  const contentType = String(attachment.content_type || '').toLowerCase();
  const isSupported = SUPPORTED_FILE_TYPES.includes(contentType);
  if (attachment.size > MAX_FILE_SIZE) {
    await logAudit(jobId, 'error', 'system', {
      error: 'File too large',
      filename: safeFilename,
      size: attachment.size,
    });
    return { confidence: 0, hasFraud: false, provisional: null };
  }

  if (typeof attachment.content !== 'string' || !attachment.content.trim()) {
    await logAudit(jobId, 'error', 'system', {
      error: 'Attachment content missing',
      filename: safeFilename,
    });
    return { confidence: 0, hasFraud: false, provisional: null };
  }

  const fileBuffer = Buffer.from(attachment.content, 'base64');
  if (fileBuffer.byteLength > MAX_FILE_SIZE) {
    await logAudit(jobId, 'error', 'system', {
      error: 'Decoded file too large',
      filename: safeFilename,
      size: fileBuffer.byteLength,
    });
    return { confidence: 0, hasFraud: false, provisional: null };
  }
  const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
  const baseline = scanDocumentBaseline({
    fileName: safeFilename,
    fileType: contentType,
    fileSize: fileBuffer.byteLength,
    fileHash,
    bytes: fileBuffer,
  });
  if (baseline.verdict !== 'clean') {
    await logAudit(jobId, 'attachment_security_blocked', 'system', {
      reason: baseline.reason || 'baseline_security_check_failed',
      engine: baseline.engine || 'document_security_baseline',
    });
    return { confidence: 0, hasFraud: true, provisional: null };
  }

  const storagePath = `ingestion/${jobId}/${safeFilename}`;
  const { error: storageError } = await supabaseAdmin.storage
    .from('warranty-documents')
    .upload(storagePath, fileBuffer, {
      contentType,
    });

  if (storageError) {
    await logAudit(jobId, 'error', 'system', {
      error: 'Attachment storage failed',
      filename: safeFilename,
      details: storageError.message,
    });
    return { confidence: 0, hasFraud: false, provisional: null };
  }

  const { data: attachmentRecord } = await supabaseAdmin
    .from('ingestion_attachments')
    .insert({
      ingestion_job_id: jobId,
      filename: safeFilename,
      content_type: contentType,
      file_size: fileBuffer.byteLength,
      file_hash: fileHash,
      storage_path: storagePath,
      ocr_status: isSupported ? 'processing' : 'unsupported',
    })
    .select('id')
    .single();

  if (!attachmentRecord) {
    return { confidence: 0, hasFraud: false, provisional: null };
  }

  await logAudit(jobId, 'attachment_stored', 'system', {
    attachment_id: attachmentRecord.id,
    filename: safeFilename,
    file_hash: fileHash,
    supported: isSupported,
  });

  const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
    .from('warranty-documents')
    .createSignedUrl(storagePath, 5 * 60);
  if (signedUrlError || !signedUrlData?.signedUrl) {
    await supabaseAdmin.storage.from('warranty-documents').remove([storagePath]);
    await supabaseAdmin.from('ingestion_attachments').update({
      ocr_status: 'failed',
    }).eq('id', attachmentRecord.id);
    await logAudit(jobId, 'attachment_security_blocked', 'system', {
      reason: 'signed_url_failed',
    }, attachmentRecord.id);
    return { confidence: 0, hasFraud: true, provisional: null };
  }

  const securityScan = await scanSignedDocumentWithConfiguredScanner({
    signedUrl: signedUrlData.signedUrl,
    documentId: attachmentRecord.id,
    fileName: safeFilename,
    fileType: contentType,
    fileSize: fileBuffer.byteLength,
    fileHash,
    storagePath,
  });
  if (securityScan.configured && securityScan.verdict !== 'clean') {
    await supabaseAdmin.storage.from('warranty-documents').remove([storagePath]);
    await supabaseAdmin.from('ingestion_attachments').update({
      ocr_status: 'failed',
    }).eq('id', attachmentRecord.id);
    await logAudit(jobId, 'attachment_security_blocked', 'system', {
      reason: securityScan.metadata.reason || 'document_security_scan_failed',
      engine: securityScan.metadata.engine || 'external',
      signature: securityScan.metadata.signature || null,
    }, attachmentRecord.id);
    return { confidence: 0, hasFraud: true, provisional: null };
  }

  if (!isSupported) {
    return { confidence: 0, hasFraud: false, provisional: null };
  }

  await logAudit(jobId, 'ocr_started', 'system', {
    attachment_id: attachmentRecord.id,
  }, attachmentRecord.id);

  try {
    const ocrResult = await processDocument(attachment.content, contentType);
    const ocrAssessment = assessUntrustedContent(ocrResult.raw_text);
    if (isInstructionAttack(ocrAssessment) && ocrAssessment.category !== 'none') {
      await recordUntrustedContentEvent('ocr_output', ocrAssessment.category);
      const { error: removalError } = await supabaseAdmin.storage
        .from('warranty-documents')
        .remove([storagePath]);
      await supabaseAdmin.from('ingestion_attachments').update({
        ocr_status: 'failed',
        ocr_raw_text: null,
        extracted_fields: {} as Json,
        aggregate_confidence: 0,
        processed_at: new Date().toISOString(),
      }).eq('id', attachmentRecord.id);
      await logAudit(jobId, 'ocr_untrusted_content_blocked', 'system', {
        category: ocrAssessment.category,
        retained_in_quarantine: Boolean(removalError),
      }, attachmentRecord.id);
      return { confidence: 0, hasFraud: true, provisional: null };
    }
    const simHash = ocrResult.raw_text ? computeSimHash(ocrResult.raw_text) : null;

    await supabaseAdmin.from('ingestion_attachments').update({
      ocr_status: 'completed',
      ocr_raw_text: ocrResult.raw_text,
      ocr_language_detected: ocrResult.language_detected,
      ocr_word_confidence: ocrResult.confidence,
      extracted_fields: ocrResult.extracted_fields as unknown as Json,
      aggregate_confidence: ocrResult.aggregate_confidence,
      sim_hash: simHash,
      processed_at: new Date().toISOString(),
    }).eq('id', attachmentRecord.id);

    await logAudit(jobId, 'ocr_completed', 'system', {
      attachment_id: attachmentRecord.id,
      confidence: ocrResult.aggregate_confidence,
      language: ocrResult.language_detected,
      ocr_provider: ocrResult.provider,
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

    let provisional = null;
    if (senderMatch.user_id && ocrResult.aggregate_confidence >= CONFIDENCE_THRESHOLDS.MEDIUM && !hasFraud) {
      provisional = await createProvisionalWarranty(jobId, attachmentRecord.id, senderMatch.user_id, ocrResult, supabaseAdmin);
    }

    if (
      ocrResult.aggregate_confidence >= CONFIDENCE_THRESHOLDS.HIGH &&
      senderMatch.trust_score >= 0.9 &&
      emailAuth.aligned &&
      !hasFraud
    ) {
      const autoConfirmed = await autoConfirmWarranty(
        jobId,
        attachmentRecord.id,
        senderMatch.user_id!,
        ocrResult,
        supabaseAdmin
      );
      if (autoConfirmed) {
        await logAudit(jobId, 'auto_confirmed', 'system', {
          confidence: ocrResult.aggregate_confidence,
          trust_score: senderMatch.trust_score,
          email_authentication: emailAuth,
        }, attachmentRecord.id);
      }
    }

    return { confidence: ocrResult.aggregate_confidence, hasFraud, provisional: provisional || null };

  } catch (ocrError) {
    await supabaseAdmin.from('ingestion_attachments').update({
      ocr_status: 'failed',
    }).eq('id', attachmentRecord.id);

    await logAudit(jobId, 'ocr_failed', 'system', {
      attachment_id: attachmentRecord.id,
      error: (ocrError as Error).message,
    }, attachmentRecord.id);

    return { confidence: 0, hasFraud: false, provisional: null };
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

  const { data: provisional } = await supabaseAdmin.from('provisional_warranties').insert({
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
  }).select('id, user_id, product_name, seller_name, purchase_date, expiry_date, ingestion_job_id, attachment_id').single();

  await logAudit(jobId, 'provisional_created', 'system', {
    user_id: userId,
    confidence: ocrResult.aggregate_confidence,
    needs_input: needsInput,
  }, attachmentId);

  return provisional || null;
}

async function autoConfirmWarranty(
  jobId: string,
  attachmentId: string,
  userId: string,
  ocrResult: Awaited<ReturnType<typeof processDocument>>,
  supabaseAdmin: SupabaseAdminClient
) {
  const fields = ocrResult.extracted_fields;
  const startDate = fields.purchase_date?.value;
  const endDate = fields.expiry_date?.value;

  if (!startDate || !endDate) {
    return false;
  }

  const { data: warranty } = await supabaseAdmin
    .from('warranties')
    .insert({
      user_id: userId,
      created_by: userId,
      recipient_user_id: userId,
      product_name: fields.product_name?.value || 'Unknown Product',
      sku: fields.model_number?.value || null,
      serial_number: fields.serial_number?.value || null,
      start_date: startDate,
      end_date: endDate,
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

  return Boolean(warranty);
}

async function checkRateLimit(email: string, clientIp: string): Promise<boolean> {
  const [emailLimit, globalLimit] = await Promise.all([
    rateLimit(email, {
      maxRequests: RATE_LIMITS.PER_EMAIL_PER_HOUR,
      windowMs: 60 * 60 * 1000,
      identifier: 'email-ingest-sender',
    }),
    rateLimit(clientIp, {
      maxRequests: RATE_LIMITS.GLOBAL_PER_HOUR,
      windowMs: 60 * 60 * 1000,
      identifier: 'email-ingest-global',
    }),
  ]);
  return emailLimit.success && globalLimit.success;
}

function extractName(fromField: string): string | null {
  const match = fromField.match(/^([^<]+)<[^>]+>$/);
  return match ? match[1].trim() : null;
}

async function sendNoAttachmentNotification(email: string, subject: string | undefined) {
  const originalSubject = subject ? `&quot;${escapeHtml(subject)}&quot;` : "your email";
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

async function sendBuyerConfirmationEmail({
  provisional,
  recipientEmail,
  jobId,
  locale,
}: {
  provisional: {
    id: string;
    user_id: string;
    product_name?: string | null;
    seller_name?: string | null;
    purchase_date?: string | null;
    expiry_date?: string | null;
    attachment_id?: string | null;
  };
  recipientEmail: string;
  jobId: string;
  locale: 'en' | 'ar';
}) {
  const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 3;
  const confirmToken = createBuyerConfirmationToken({
    provisionalId: provisional.id,
    userId: provisional.user_id,
    email: recipientEmail,
    action: 'confirm',
    expiresAt,
    locale,
  });
  const rejectToken = createBuyerConfirmationToken({
    provisionalId: provisional.id,
    userId: provisional.user_id,
    email: recipientEmail,
    action: 'reject',
    expiresAt,
    locale,
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://warrantee.io';
  const confirmUrl = `${appUrl}/api/warranties/provisional/email-action?token=${encodeURIComponent(confirmToken)}`;
  const rejectUrl = `${appUrl}/api/warranties/provisional/email-action?token=${encodeURIComponent(rejectToken)}`;

  const template = emailTemplates.provisionalWarrantyConfirmation;
  const sendResult = await sendEmail({
    to: recipientEmail,
    subject: template.subject[locale],
    html: template.html(
      {
        product: provisional.product_name || '',
        seller: provisional.seller_name || '',
        purchaseDate: provisional.purchase_date || '',
        expiryDate: provisional.expiry_date || '',
        confirmUrl,
        rejectUrl,
      },
      locale
    ),
  });

  if (sendResult.success) {
    await logAudit(jobId, 'buyer_confirmation_sent', 'system', {
      provisional_id: provisional.id,
      recipient_email: recipientEmail,
      expires_at: new Date(expiresAt).toISOString(),
    }, provisional.attachment_id || undefined);
  }
}
