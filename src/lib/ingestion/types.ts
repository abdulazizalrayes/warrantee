// Warrantee — OCR & Email-Ingestion Engine Types

export interface ResendInboundPayload {
  from: string;
  to: string;
  cc?: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: ResendAttachment[];
  headers: Record<string, string>;
  message_id: string;
}

export interface ResendAttachment {
  filename: string;
  content_type: string;
  content: string; // base64 encoded
  size: number;
}

export type TrustLevel = 'verified_owner' | 'verified_seller' | 'known_contact' | 'unknown';

export interface SenderMatch {
  user_id: string | null;
  trust_level: TrustLevel;
  trust_score: number;
  match_method: string;
  buyer_id?: string | null;
}

export interface ExtractedField<T = string> {
  value: T;
  confidence: number;
}

export interface OCRExtractedFields {
  product_name: ExtractedField | null;
  brand: ExtractedField | null;
  model_number: ExtractedField | null;
  serial_number: ExtractedField | null;
  warranty_duration_months: ExtractedField<number> | null;
  purchase_date: ExtractedField | null;
  expiry_date: ExtractedField | null;
  seller_name: ExtractedField | null;
  buyer_name: ExtractedField | null;
}

export interface OCRResult {
  raw_text: string;
  language_detected: string;
  confidence: number;
  extracted_fields: OCRExtractedFields;
  aggregate_confidence: number;
}

export type IngestionJobStatus =
  | 'received'
  | 'processing'
  | 'matched'
  | 'ocr_complete'
  | 'auto_confirmed'
  | 'pending_review'
  | 'pending_buyer_confirmation'
  | 'confirmed'
  | 'rejected'
  | 'failed'
  | 'not_warranty'
  | 'archived';

export type OCRStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'skipped' | 'unsupported';

export type ProvisionalWarrantyStatus = 'pending' | 'confirmed' | 'rejected' | 'expired' | 'not_warranty';

export type InvitationStatus = 'pending' | 'sent' | 'accepted' | 'expired' | 'revoked';

export type FraudSeverity = 'low' | 'medium' | 'high';

export interface ConfidenceThresholds {
  HIGH: number;  // >= 0.85: auto-confirm
  MEDIUM: number; // >= 0.50: provisional
  LOW: number;    // < 0.50: review queue
}

export const CONFIDENCE_THRESHOLDS: ConfidenceThresholds = {
  HIGH: 0.85,
  MEDIUM: 0.50,
  LOW: 0.0,
};

export const RATE_LIMITS = {
  PER_EMAIL_PER_HOUR: 5,
  PER_EMAIL_PER_DAY: 20,
  GLOBAL_PER_HOUR: 1000,
};

export const SUPPORTED_FILE_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/tiff',
  'image/heic',
  'image/heif',
];

export const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
