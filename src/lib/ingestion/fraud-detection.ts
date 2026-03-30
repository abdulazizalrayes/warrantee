// @ts-nocheck
// Warrantee â Fraud Detection & Duplicate Detection Engine

import { createClient } from '@supabase/supabase-js';
import type { FraudSeverity, OCRExtractedFields } from './types';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export interface FraudSignal {
  signal_type: string;
  severity: FraudSeverity;
  details: Record<string, unknown>;
}

export async function detectFraud(
  ingestionJobId: string,
  attachmentId: string,
  fileHash: string,
  extractedFields: OCRExtractedFields,
  fromEmail: string,
  matchedUserId: string | null
): Promise<FraudSignal[]> {
  const supabaseAdmin = getSupabaseAdmin();
  const signals: FraudSignal[] = [];

  // Check 1: Duplicate file hash
  const duplicateFile = await checkDuplicateFileHash(fileHash, attachmentId, supabaseAdmin);
  if (duplicateFile) {
    signals.push({
      signal_type: 'duplicate_document',
      severity: 'medium',
      details: {
        original_attachment_id: duplicateFile.id,
        original_job_id: duplicateFile.ingestion_job_id,
      },
    });
  }

  // Check 2: Duplicate serial number across different users
  if (extractedFields.serial_number) {
    const duplicateSerial = await checkDuplicateSerial(
      extractedFields.serial_number.value, matchedUserId, supabaseAdmin
    );
    if (duplicateSerial) {
      signals.push({
        signal_type: 'duplicate_serial_cross_user',
        severity: 'high',
        details: {
          serial_number: extractedFields.serial_number.value,
          existing_user_id: duplicateSerial.user_id,
          existing_warranty_id: duplicateSerial.id,
        },
      });
    }
  }

  // Check 3: Purchase date in the future
  if (extractedFields.purchase_date) {
    const purchaseDate = new Date(extractedFields.purchase_date.value);
    if (purchaseDate > new Date()) {
      signals.push({
        signal_type: 'future_purchase_date',
        severity: 'high',
        details: { purchase_date: extractedFields.purchase_date.value },
      });
    }
  }

  // Check 4: Warranty expiry very old (>5 years past)
  if (extractedFields.expiry_date) {
    const expiryDate = new Date(extractedFields.expiry_date.value);
    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
    if (expiryDate < fiveYearsAgo) {
      signals.push({
        signal_type: 'very_old_expiry',
        severity: 'medium',
        details: { expiry_date: extractedFields.expiry_date.value },
      });
    }
  }

  // Check 5: Excessive warranty duration (>25 years)
  if (extractedFields.warranty_duration_months &&
      extractedFields.warranty_duration_months.value > 300 &&
      extractedFields.warranty_duration_months.value !== 999) {
    signals.push({
      signal_type: 'excessive_duration',
      severity: 'medium',
      details: { months: extractedFields.warranty_duration_months.value },
    });
  }

  // Check 6: High volume from single sender
  const volumeCheck = await checkSenderVolume(fromEmail, supabaseAdmin);
  if (volumeCheck.last24h > 50) {
    signals.push({
      signal_type: 'high_volume_sender',
      severity: 'high',
      details: {
        email: fromEmail,
        count_24h: volumeCheck.last24h,
        count_1h: volumeCheck.last1h,
      },
    });
  }

  // Check 7: Disposable email domain
  if (isDisposableEmail(fromEmail)) {
    signals.push({
      signal_type: 'disposable_email',
      severity: 'low',
      details: { email: fromEmail, domain: fromEmail.split('@')[1] },
    });
  }

  // Persist all signals to database
  if (signals.length > 0) {
    await supabaseAdmin.from('fraud_signals').insert(
      signals.map((s) => ({
        ingestion_job_id: ingestionJobId,
        attachment_id: attachmentId,
        signal_type: s.signal_type,
        severity: s.severity,
        details: s.details,
      }))
    );
  }

  return signals;
}

async function checkDuplicateFileHash(
  fileHash: string, currentAttachmentId: string, supabaseAdmin: ReturnType<typeof createClient>
): Promise<{ id: string; ingestion_job_id: string } | null> {
  const { data } = await supabaseAdmin
    .from('ingestion_attachments')
    .select('id, ingestion_job_id')
    .eq('file_hash', fileHash)
    .neq('id', currentAttachmentId)
    .limit(1)
    .single();
  return data;
}

async function checkDuplicateSerial(
  serialNumber: string, currentUserId: string | null, supabaseAdmin: ReturnType<typeof createClient>
): Promise<{ id: string; user_id: string } | null> {
  const { data } = await supabaseAdmin
    .from('warranties')
    .select('id, user_id')
    .eq('serial_number', serialNumber)
    .limit(1)
    .single();

  if (data && data.user_id !== currentUserId) return data;

  const { data: provisional } = await supabaseAdmin
    .from('provisional_warranties')
    .select('id, user_id')
    .eq('serial_number', serialNumber)
    .eq('status', 'pending')
    .limit(1)
    .single();

  if (provisional && provisional.user_id !== currentUserId) return provisional;
  return null;
}

async function checkSenderVolume(email: string, supabaseAdmin: ReturnType<typeof createClient>): Promise<{ last24h: number; last1h: number }> {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const { count: last24h } = await supabaseAdmin
    .from('ingestion_jobs')
    .select('id', { count: 'exact', head: true })
    .eq('from_email', email.toLowerCase())
    .gte('created_at', oneDayAgo.toISOString());

  const { count: last1h } = await supabaseAdmin
    .from('ingestion_jobs')
    .select('id', { count: 'exact', head: true })
    .eq('from_email', email.toLowerCase())
    .gte('created_at', oneHourAgo.toISOString());

  return { last24h: last24h || 0, last1h: last1h || 0 };
}

export function computeSimHash(text: string): string {
  const tokens = text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean);
  const hashBits = new Int32Array(64);

  for (const token of tokens) {
    const hash = fnv1a64(token);
    for (let i = 0; i < 64; i++) {
      if ((hash >> BigInt(i)) & 1n) {
        hashBits[i]++;
      } else {
        hashBits[i]--;
      }
    }
  }

  let result = 0n;
  for (let i = 0; i < 64; i++) {
    if (hashBits[i] > 0) {
      result |= (1n << BigInt(i));
    }
  }

  return result.toString(16).padStart(16, '0');
}

function fnv1a64(str: string): bigint {
  let hash = 14695981039346656037n;
  for (let i = 0; i < str.length; i++) {
    hash ^= BigInt(str.charCodeAt(i));
    hash = (hash * 1099511628211n) & 0xFFFFFFFFFFFFFFFFn;
  }
  return hash;
}

export async function checkSimHashDuplicate(
  simHash: string, currentAttachmentId: string
): Promise<boolean> {
  const supabaseAdmin = getSupabaseAdmin();
  const { data: existing } = await supabaseAdmin
    .from('ingestion_attachments')
    .select('sim_hash')
    .neq('id', currentAttachmentId)
    .not('sim_hash', 'is', null);

  if (!existing) return false;

  for (const row of existing) {
    if (row.sim_hash && hammingDistance(simHash, row.sim_hash) < 3) {
      return true;
    }
  }
  return false;
}

function hammingDistance(a: string, b: string): number {
  const av = BigInt('0x' + a);
  const bv = BigInt('0x' + b);
  let xor = av ^ bv;
  let count = 0;
  while (xor > 0n) {
    count += Number(xor & 1n);
    xor >>= 1n;
  }
  return count;
}

const DISPOSABLE_DOMAINS = new Set([
  'tempmail.com', 'throwaway.email', 'guerrillamail.com', 'mailinator.com',
  'yopmail.com', 'temp-mail.org', 'trashmail.com', 'fakeinbox.com',
  'dispostable.com', 'sharklasers.com', 'guerrillamailblock.com',
  'grr.la', 'guerrillamail.info', 'guerrillamail.net', 'guerrillamail.org',
  'guerrillamail.de', 'tmail.ws', 'tmails.net',
]);

function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  return DISPOSABLE_DOMAINS.has(domain || '');
}
