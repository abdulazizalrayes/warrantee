// Warrantee — OCR Pipeline
// Google Cloud Vision API integration with confidence scoring

import type { OCRResult, OCRExtractedFields, ExtractedField } from './types';
import { extractTextFromPdfBuffer } from '@/lib/ocr/pdf';
import { recognizeImageBufferWithTesseract } from '@/lib/ocr/tesseract';
import { cleanOCRTelemetry, type OCRProviderTelemetry } from '@/lib/ocr/telemetry';
import {
  hasMistralOCRConfig,
  MistralOCRConfigurationError,
  MistralOCRUnsupportedFileError,
  recognizeBase64WithMistral,
} from '@/lib/ocr/mistral';

const VISION_API_URL = 'https://vision.googleapis.com/v1/images:annotate';

type VisionPage = {
  property?: { detectedLanguages?: Array<{ languageCode: string; confidence: number }> };
  blocks: Array<{
    paragraphs: Array<{
      words: Array<{
        symbols: Array<{ text: string; confidence?: number }>;
        confidence?: number;
      }>;
    }>;
  }>;
};

interface VisionAnnotation {
  fullTextAnnotation?: {
    text: string;
    pages: VisionPage[];
  };
}

function summarizeOCRProviderError(error: unknown) {
  const rawMessage = error instanceof Error ? error.message : String(error);
  const name = error instanceof Error ? error.name : 'Error';
  const message = rawMessage
    .replace(/key=[^&\s]+/gi, 'key=[redacted]')
    .replace(/\b\d{10,}\b/g, '[redacted-number]')
    .slice(0, 300);

  return `${name}: ${message}`;
}

function withOCRProvider(result: Omit<OCRResult, 'provider'>, provider: OCRProviderTelemetry): OCRResult {
  return {
    ...result,
    provider: cleanOCRTelemetry(provider),
  };
}

/**
 * Process a document image through Google Cloud Vision OCR.
 * Supports PDF pages (as images), PNG, JPG, TIFF.
 * Returns structured extracted fields with per-field confidence.
 */
export async function processDocument(
  imageBase64: string,
  mimeType: string
): Promise<OCRResult> {
  const provider = getOCRProviderPreference();
  const tryMistral = shouldTryMistral();

  if (mimeType === 'application/pdf') {
    const localResult = await processPdfWithLocalStack(imageBase64, !tryMistral, false, provider, mimeType);
    if (localResult.raw_text.trim() || !tryMistral) {
      return localResult;
    }

    try {
      return await processWithMistral(imageBase64, mimeType, false, provider);
    } catch (error) {
      if ((provider === 'mistral' || error instanceof MistralOCRConfigurationError) && !shouldTryGoogleVision()) {
        throw error;
      }
      console.warn('Mistral PDF OCR unavailable, falling back to local PDF OCR:', summarizeOCRProviderError(error));
      return processPdfWithLocalStack(imageBase64, true, true, provider, mimeType);
    }
  }

  let fallbackFromMistral = false;
  if (tryMistral) {
    try {
      return await processWithMistral(imageBase64, mimeType, false, provider);
    } catch (error) {
      fallbackFromMistral = true;
      if ((provider === 'mistral' || error instanceof MistralOCRConfigurationError) && !shouldTryGoogleVision()) {
        throw error;
      }
      if (error instanceof MistralOCRUnsupportedFileError && !shouldTryGoogleVision()) {
        throw error;
      }
      console.warn('Mistral OCR unavailable, trying next OCR provider:', summarizeOCRProviderError(error));
    }
  }

  const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;
  if (!apiKey || !mimeType.startsWith('image/') || !shouldTryGoogleVision()) {
    const fallbackToLocal = fallbackFromMistral || provider === 'mistral' || provider === 'google' || provider === 'google-vision';
    return processWithTesseract(imageBase64, mimeType, fallbackToLocal, provider);
  }

  try {
    // Call Google Cloud Vision API
    const response = await fetch(`${VISION_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          image: { content: imageBase64 },
          features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
          imageContext: {
            languageHints: ['ar', 'en'],
          },
        }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Vision API unavailable with status ${response.status}`);
    }

    const data = await response.json();
    const annotation: VisionAnnotation = data.responses?.[0] || {};

    if (!annotation.fullTextAnnotation) {
      return withOCRProvider({
        raw_text: '',
        language_detected: 'unknown',
        confidence: 0,
        extracted_fields: emptyFields(),
        aggregate_confidence: 0,
      }, {
        provider: 'google_vision',
        engine: 'google_document_text_detection',
        mode: 'hosted',
        providerPreference: provider,
        fallback: fallbackFromMistral,
        mimeType,
      });
    }

    const rawText = annotation.fullTextAnnotation.text;
    const pages = annotation.fullTextAnnotation.pages;

    // Detect primary language
    const languageDetected = detectPrimaryLanguage(pages);

    // Calculate average word confidence
    const wordConfidence = calculateWordConfidence(pages);

    // Extract structured fields
    const extractedFields = extractFields(rawText, languageDetected);

    // Calculate aggregate confidence
    const aggregateConfidence = calculateAggregateConfidence(
      wordConfidence,
      extractedFields
    );

    return withOCRProvider({
      raw_text: rawText,
      language_detected: languageDetected,
      confidence: wordConfidence,
      extracted_fields: extractedFields,
      aggregate_confidence: aggregateConfidence,
    }, {
      provider: 'google_vision',
      engine: 'google_document_text_detection',
      mode: 'hosted',
      providerPreference: provider,
      fallback: fallbackFromMistral,
      mimeType,
      confidence: wordConfidence,
      pageCount: pages?.length,
    });
  } catch (error) {
    console.warn('Vision OCR unavailable, falling back to in-house Tesseract OCR:', summarizeOCRProviderError(error));
    return processWithTesseract(imageBase64, mimeType, true, provider);
  }
}

function getOCRProviderPreference() {
  return (process.env.OCR_PROVIDER || 'auto').trim().toLowerCase();
}

function shouldTryMistral() {
  const provider = getOCRProviderPreference();
  return (provider === 'mistral' || provider === 'auto') && hasMistralOCRConfig();
}

function shouldTryGoogleVision() {
  const provider = getOCRProviderPreference();
  return (
    provider === 'google' ||
    provider === 'google-vision' ||
    ((provider === 'auto' || provider === 'mistral') && Boolean(process.env.GOOGLE_CLOUD_VISION_API_KEY))
  );
}

async function processWithMistral(
  imageBase64: string,
  mimeType: string,
  fallback = false,
  providerPreference = getOCRProviderPreference()
): Promise<OCRResult> {
  const result = await recognizeBase64WithMistral(imageBase64, mimeType);
  const rawText = result.text;
  if (!rawText) {
    return withOCRProvider({
      raw_text: '',
      language_detected: 'unknown',
      confidence: result.confidence,
      extracted_fields: emptyFields(),
      aggregate_confidence: 0,
    }, {
      provider: 'mistral',
      engine: 'mistral_ocr',
      mode: 'hosted',
      providerPreference,
      fallback,
      mimeType,
      model: result.model,
      confidence: result.confidence,
      pageCount: result.pageCount,
    });
  }

  const languageDetected = /[\u0600-\u06FF]/.test(rawText) ? 'ar' : 'en';
  const extractedFields = extractFields(rawText, languageDetected);
  const aggregateConfidence = calculateAggregateConfidence(
    result.confidence,
    extractedFields
  );

  return withOCRProvider({
    raw_text: rawText,
    language_detected: languageDetected,
    confidence: result.confidence,
    extracted_fields: extractedFields,
    aggregate_confidence: aggregateConfidence,
  }, {
    provider: 'mistral',
    engine: 'mistral_ocr',
    mode: 'hosted',
    providerPreference,
    fallback,
    mimeType,
    model: result.model,
    confidence: result.confidence,
    pageCount: result.pageCount,
  });
}

async function processWithTesseract(
  imageBase64: string,
  mimeType: string,
  fallback = false,
  providerPreference = getOCRProviderPreference()
): Promise<OCRResult> {
  if (!mimeType.startsWith('image/')) {
    throw new Error(`In-house OCR fallback only supports image attachments right now: ${mimeType}`);
  }

  const result = await recognizeImageBufferWithTesseract(
    Buffer.from(imageBase64, 'base64'),
    ['eng', 'ara']
  );
  const rawText = result.text;
  if (!rawText) {
    return withOCRProvider({
      raw_text: '',
      language_detected: 'mixed',
      confidence: 0,
      extracted_fields: emptyFields(),
      aggregate_confidence: 0,
    }, {
      provider: 'tesseract',
      engine: 'tesseract',
      mode: fallback ? 'fallback' : 'local',
      providerPreference,
      fallback,
      mimeType,
      confidence: 0,
    });
  }

  const languageDetected = result.language.includes('ara') ? 'ar' : 'en';
  const wordConfidence = result.confidence;
  const extractedFields = extractFields(rawText, languageDetected);
  const aggregateConfidence = calculateAggregateConfidence(
    wordConfidence,
    extractedFields
  );

  return withOCRProvider({
    raw_text: rawText,
    language_detected: languageDetected,
    confidence: wordConfidence,
    extracted_fields: extractedFields,
    aggregate_confidence: aggregateConfidence,
  }, {
    provider: 'tesseract',
    engine: 'tesseract',
    mode: fallback ? 'fallback' : 'local',
    providerPreference,
    fallback,
    mimeType,
    confidence: wordConfidence,
  });
}

async function processPdfWithLocalStack(
  imageBase64: string,
  enableImageOcr = true,
  fallback = false,
  providerPreference = getOCRProviderPreference(),
  mimeType = 'application/pdf'
): Promise<OCRResult> {
  const result = await extractTextFromPdfBuffer(Buffer.from(imageBase64, 'base64'), 5, { enableImageOcr });
  const rawText = result.text;
  if (!rawText) {
    return withOCRProvider({
      raw_text: '',
      language_detected: 'mixed',
      confidence: 0,
      extracted_fields: emptyFields(),
      aggregate_confidence: 0,
    }, {
      provider: 'pdfjs',
      engine: result.engine,
      mode: fallback ? 'fallback' : 'local',
      providerPreference,
      fallback,
      mimeType,
      confidence: 0,
      pageCount: result.pageCount,
    });
  }

  const languageDetected = /[\u0600-\u06FF]/.test(rawText) ? 'ar' : 'en';
  const extractedFields = extractFields(rawText, languageDetected);
  const aggregateConfidence = calculateAggregateConfidence(
    result.confidence,
    extractedFields
  );

  return withOCRProvider({
    raw_text: rawText,
    language_detected: languageDetected,
    confidence: result.confidence,
    extracted_fields: extractedFields,
    aggregate_confidence: aggregateConfidence,
  }, {
    provider: 'pdfjs',
    engine: result.engine,
    mode: fallback ? 'fallback' : 'local',
    providerPreference,
    fallback,
    mimeType,
    confidence: result.confidence,
    pageCount: result.pageCount,
  });
}

function detectPrimaryLanguage(pages: VisionPage[] | undefined): string {
  if (!pages?.length) return 'unknown';
  const langs = pages[0]?.property?.detectedLanguages || [];
  if (!langs.length) return 'unknown';
  return langs.sort((a: { confidence: number }, b: { confidence: number }) => (b.confidence || 0) - (a.confidence || 0))[0].languageCode;
}

function calculateWordConfidence(pages: VisionPage[] | undefined): number {
  let totalConfidence = 0;
  let wordCount = 0;

  for (const page of pages || []) {
    for (const block of page.blocks || []) {
      for (const paragraph of block.paragraphs || []) {
        for (const word of paragraph.words || []) {
          if (word.confidence !== undefined) {
            totalConfidence += word.confidence;
            wordCount++;
          }
        }
      }
    }
  }

  return wordCount > 0 ? totalConfidence / wordCount : 0;
}

/**
 * Extract structured warranty fields from raw OCR text.
 * Uses regex patterns for both Arabic and English.
 */
function extractFields(rawText: string, language: string): OCRExtractedFields {
  const text = rawText.trim();
  if (!text) return emptyFields();

  return {
    product_name: extractProductName(text, language),
    brand: extractBrand(text, language),
    model_number: extractModelNumber(text),
    serial_number: extractSerialNumber(text),
    warranty_duration_months: extractWarrantyDuration(text, language),
    purchase_date: extractDate(text, 'purchase', language),
    expiry_date: extractDate(text, 'expiry', language),
    seller_name: extractSellerName(text, language),
    buyer_name: extractBuyerName(text, language),
  };
}

// --- Field Extraction Functions ---

function extractProductName(text: string, lang: string): ExtractedField | null {
  // English patterns
  const enPatterns = [
    /product\s*(?:name)?[:\s]+([^\n,]+)/i,
    /item[:\s]+([^\n,]+)/i,
    /description[:\s]+([^\n,]+)/i,
  ];
  // Arabic patterns
  const arPatterns = [
    /(?:اسم\s*)?المنتج[:\s]+([^\n,]+)/,
    /الصنف[:\s]+([^\n,]+)/,
    /الوصف[:\s]+([^\n,]+)/,
  ];

  const patterns = lang === 'ar' ? [...arPatterns, ...enPatterns] : [...enPatterns, ...arPatterns];
  return matchPattern(text, patterns, 0.75);
}

function extractBrand(text: string, lang: string): ExtractedField | null {
  const enPatterns = [
    /brand[:\s]+([^\n,]+)/i,
    /manufacturer[:\s]+([^\n,]+)/i,
    /(?:made|mfg)\s+by[:\s]+([^\n,]+)/i,
  ];
  const arPatterns = [
    /العلامة\s*التجارية[:\s]+([^\n,]+)/,
    /الشركة\s*المصنعة[:\s]+([^\n,]+)/,
    /صنع\s+بواسطة[:\s]+([^\n,]+)/,
  ];

  const patterns = lang === 'ar' ? [...arPatterns, ...enPatterns] : [...enPatterns, ...arPatterns];
  return matchPattern(text, patterns, 0.7);
}

function extractModelNumber(text: string): ExtractedField | null {
  const patterns = [
    /model\s*(?:no\.?|number|#)?[:\s]+([A-Z0-9][\w\-\/]+)/i,
    /رقم\s*الموديل[:\s]+([A-Z0-9][\w\-\/]+)/,
    /موديل[:\s]+([A-Z0-9][\w\-\/]+)/,
    /(?:type|نوع)[:\s]+([A-Z0-9][\w\-\/]+)/i,
  ];
  return matchPattern(text, patterns, 0.85);
}

function extractSerialNumber(text: string): ExtractedField | null {
  const patterns = [
    /(?:serial|s\/n|ser\.?\s*no\.?)[:\s]+([A-Z0-9][\w\-]+)/i,
    /الرقم\s*التسلسلي[:\s]+([A-Z0-9][\w\-]+)/,
    /رقم\s*السيريال[:\s]+([A-Z0-9][\w\-]+)/,
  ];
  return matchPattern(text, patterns, 0.9);
}

function extractWarrantyDuration(text: string, _lang: string): ExtractedField<number> | null {
  // Years
  const yearPatterns = [
    /(\d+)\s*(?:year|yr)s?\s*(?:warranty|guarantee)/i,
    /warranty[:\s]*(\d+)\s*(?:year|yr)s?/i,
    /(\d+)\s*سن[ةو](?:ات)?\s*ضمان/,
    /ضمان\s*(?:لمدة\s*)?(\d+)\s*سن[ةو](?:ات)?/,
  ];

  for (const pattern of yearPatterns) {
    const match = text.match(pattern);
    if (match) {
      const years = parseInt(match[1], 10);
      if (years > 0 && years <= 25) {
        return { value: years * 12, confidence: 0.9 };
      }
    }
  }

  // Months
  const monthPatterns = [
    /(\d+)\s*months?\s*(?:warranty|guarantee)/i,
    /warranty[:\s]*(\d+)\s*months?/i,
    /(\d+)\s*(?:شهر|أشهر)\s*ضمان/,
    /ضمان\s*(?:لمدة\s*)?(\d+)\s*(?:شهر|أشهر)/,
  ];

  for (const pattern of monthPatterns) {
    const match = text.match(pattern);
    if (match) {
      const months = parseInt(match[1], 10);
      if (months > 0 && months <= 300) {
        return { value: months, confidence: 0.9 };
      }
    }
  }

  // Lifetime
  if (/lifetime\s*warranty/i.test(text) || /ضمان\s*مدى\s*الحياة/.test(text)) {
    return { value: 999, confidence: 0.7 };
  }

  return null;
}

function extractDate(text: string, type: 'purchase' | 'expiry', _lang: string): ExtractedField | null {
  const dateRegex = /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/g;
  const matches = [...text.matchAll(dateRegex)];

  if (matches.length === 0) return null;

  // Look for context clues
  const purchaseKeywords = /(?:purchase|buy|bought|date of sale|تاريخ\s*الشراء|تاريخ\s*البيع)/i;
  const expiryKeywords = /(?:expir|valid\s*until|end\s*date|تاريخ\s*الانتهاء|صالح\s*حتى)/i;

  const targetKeywords = type === 'purchase' ? purchaseKeywords : expiryKeywords;

  for (const match of matches) {
    const idx = match.index || 0;
    const context = text.substring(Math.max(0, idx - 60), idx + match[0].length + 10);
    if (targetKeywords.test(context)) {
      const dateStr = normalizeDate(match[1], match[2], match[3]);
      if (dateStr) return { value: dateStr, confidence: 0.85 };
    }
  }

  // Fallback: first date = purchase, second = expiry
  if (matches.length >= 2) {
    const matchToUse = type === 'purchase' ? matches[0] : matches[1];
    const dateStr = normalizeDate(matchToUse[1], matchToUse[2], matchToUse[3]);
    if (dateStr) return { value: dateStr, confidence: 0.5 };
  }

  if (matches.length === 1 && type === 'purchase') {
    const dateStr = normalizeDate(matches[0][1], matches[0][2], matches[0][3]);
    if (dateStr) return { value: dateStr, confidence: 0.4 };
  }

  return null;
}

function extractSellerName(text: string, _lang: string): ExtractedField | null {
  const patterns = [
    /(?:sold\s*by|seller|dealer|vendor|retailer)[:\s]+([^\n,]+)/i,
    /(?:البائع|الموزع|التاجر|المورد)[:\s]+([^\n,]+)/,
    /(?:store|shop|company)[:\s]+([^\n,]+)/i,
    /(?:المتجر|الشركة|المحل)[:\s]+([^\n,]+)/,
  ];
  return matchPattern(text, patterns, 0.65);
}

function extractBuyerName(text: string, _lang: string): ExtractedField | null {
  const patterns = [
    /(?:customer|buyer|purchased\s*by|sold\s*to|client)[:\s]+([^\n,]+)/i,
    /(?:العميل|المشتري|الزبون)[:\s]+([^\n,]+)/,
    /(?:name|الاسم)[:\s]+([^\n,]+)/i,
  ];
  return matchPattern(text, patterns, 0.6);
}

// --- Utility Functions ---

function matchPattern(text: string, patterns: RegExp[], baseConfidence: number): ExtractedField | null {
  for (let i = 0; i < patterns.length; i++) {
    const match = text.match(patterns[i]);
    if (match && match[1]) {
      const value = match[1].trim();
      if (value.length > 1 && value.length < 200) {
        // Earlier patterns get higher confidence
        const confidence = Math.max(0.3, baseConfidence - (i * 0.05));
        return { value, confidence };
      }
    }
  }
  return null;
}

function normalizeDate(d: string, m: string, y: string): string | null {
  let year = parseInt(y, 10);
  const month = parseInt(m, 10);
  const day = parseInt(d, 10);

  if (year < 100) year += 2000;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  if (year < 2000 || year > 2040) return null;

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Calculate aggregate confidence from word confidence and field extraction.
 *
 * Weights:
 * - OCR word confidence: 30%
 * - Pattern match strength: 25%
 * - Field completeness: 20%
 * - Cross-field consistency: 15%
 * - Language consistency: 10%
 */
function calculateAggregateConfidence(
  wordConfidence: number,
  fields: OCRExtractedFields
): number {
  const fieldEntries = Object.values(fields).filter(Boolean) as ExtractedField[];
  const totalFields = Object.keys(fields).length;
  const extractedCount = fieldEntries.length;

  // Pattern match strength (average field confidence)
  const patternStrength = extractedCount > 0
    ? fieldEntries.reduce((sum, f) => sum + f.confidence, 0) / extractedCount
    : 0;

  // Field completeness
  const completeness = extractedCount / totalFields;

  // Cross-field consistency (basic checks)
  let consistency = 0.5; // default
  if (fields.purchase_date && fields.expiry_date) {
    const purchase = new Date(fields.purchase_date.value);
    const expiry = new Date(fields.expiry_date.value);
    consistency = expiry > purchase ? 1.0 : 0.0;
  }
  if (fields.warranty_duration_months && fields.purchase_date && fields.expiry_date) {
    const purchase = new Date(fields.purchase_date.value);
    const expiry = new Date(fields.expiry_date.value);
    const expectedMonths = (expiry.getFullYear() - purchase.getFullYear()) * 12
      + (expiry.getMonth() - purchase.getMonth());
    const durationMatch = Math.abs(expectedMonths - fields.warranty_duration_months.value);
    consistency = durationMatch <= 1 ? 1.0 : durationMatch <= 3 ? 0.7 : 0.3;
  }

  // Language consistency (1.0 if we detected a language)
  const langConsistency = 0.8; // assumes Google Vision detected correctly

  const aggregate =
    (wordConfidence * 0.3) +
    (patternStrength * 0.25) +
    (completeness * 0.2) +
    (consistency * 0.15) +
    (langConsistency * 0.1);

  return Math.round(aggregate * 100) / 100;
}

function emptyFields(): OCRExtractedFields {
  return {
    product_name: null,
    brand: null,
    model_number: null,
    serial_number: null,
    warranty_duration_months: null,
    purchase_date: null,
    expiry_date: null,
    seller_name: null,
    buyer_name: null,
  };
}
