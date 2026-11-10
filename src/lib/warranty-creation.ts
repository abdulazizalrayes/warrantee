import { WARRANTY_DOCUMENT_ALLOWED_TYPES, WARRANTY_DOCUMENT_MAX_SIZE, WARRANTY_DOCUMENTS_BUCKET } from "./documents";
import { isValidEmail } from "./validation";

export const CREATION_FILE_LIMIT = 10;
export const OCR_DATA_URI_LIMIT = 4 * 1024 * 1024;
export const OCR_MIME_TYPES = ["image/jpeg", "image/png", "application/pdf"];
export const CREATION_CATEGORIES = ["electronics", "appliances", "automotive", "machinery", "hvac", "plumbing", "construction", "furniture", "software", "other"];

export type CreationFields = {
  productName: string; productNameAr: string; category: string; quantity: number;
  startDate: string; endDate: string; sellerEmail: string;
};
export type CreationErrors = Partial<Record<keyof CreationFields, string>>;
export type CreationAttempt = { key: string; body: string; signature: string; uncertain: boolean };

export function prepareCreationAttempt(previous: CreationAttempt | null, payload: Record<string, unknown>, reference: () => string): CreationAttempt {
  const signature = JSON.stringify(payload);
  if (previous && (previous.uncertain || previous.signature === signature)) return previous;
  return { key: crypto.randomUUID(), body: JSON.stringify({ ...payload, reference_number: reference() }), signature, uncertain: false };
}

export function strictCreationDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validateCreationFields(fields: CreationFields, step: 1 | 2, ar: boolean): CreationErrors {
  const errors: CreationErrors = {};
  if (step === 1) {
    if (!fields.productName.trim() || fields.productName.trim().length > 200) {
      errors.productName = ar ? "أدخل اسم المنتج (حتى 200 حرف) بأي لغة." : "Enter a product name in either language (up to 200 characters).";
    }
    if (fields.productNameAr.trim().length > 200) errors.productNameAr = ar ? "الحد الأقصى 200 حرف." : "Use up to 200 characters.";
    if (!CREATION_CATEGORIES.includes(fields.category)) errors.category = ar ? "اختر فئة صحيحة." : "Choose a valid category.";
    if (!Number.isSafeInteger(fields.quantity) || fields.quantity < 1) errors.quantity = ar ? "أدخل كمية صحيحة أكبر من صفر." : "Enter a whole quantity greater than zero.";
  } else {
    if (!strictCreationDate(fields.startDate)) errors.startDate = ar ? "أدخل تاريخ بداية صحيحاً." : "Enter a valid start date.";
    if (!strictCreationDate(fields.endDate)) errors.endDate = ar ? "أدخل تاريخ انتهاء صحيحاً." : "Enter a valid end date.";
    else if (!errors.startDate && fields.endDate <= fields.startDate) errors.endDate = ar ? "يجب أن يكون تاريخ الانتهاء بعد تاريخ البداية." : "End date must be after start date.";
    if (fields.sellerEmail.trim() && !isValidEmail(fields.sellerEmail.trim())) errors.sellerEmail = ar ? "أدخل بريداً إلكترونياً صحيحاً أو اتركه فارغاً." : "Enter a valid email address or leave it blank.";
  }
  return errors;
}

export function creationFileError(file: Pick<File, "size" | "type">, ar: boolean, scan = false) {
  if (!(scan ? OCR_MIME_TYPES : WARRANTY_DOCUMENT_ALLOWED_TYPES).includes(file.type)) {
    return scan
      ? ar ? "للمسح اختر PDF أو JPEG أو PNG." : "Choose PDF, JPEG, or PNG for scanning."
      : ar ? "اختر PDF أو JPEG أو PNG أو DOC أو DOCX." : "Choose PDF, JPEG, PNG, DOC, or DOCX.";
  }
  if (!Number.isSafeInteger(file.size) || file.size <= 0 || file.size > WARRANTY_DOCUMENT_MAX_SIZE) {
    return ar ? "يجب أن يكون الملف غير فارغ وألا يتجاوز 20 MiB." : "Files must be nonempty and no larger than 20 MiB.";
  }
  // The OCR route limits the entire encoded data URI, not just decoded bytes.
  if (scan && `data:${file.type};base64,`.length + 4 * Math.ceil(file.size / 3) > OCR_DATA_URI_LIMIT) {
    return ar ? "الملف كبير للمسح. حد البيانات المشفرة 4 MiB؛ استخدم ملفاً أصغر من نحو 3 MiB أو أرفقه دون مسح." : "Too large to scan: encoded data is limited to 4 MiB. Use a file under about 3 MiB or attach it without scanning.";
  }
  return null;
}

export class CreationRequestError extends Error {
  constructor(public reason: "network" | "timeout" | "response" | "http" | "uncertain", public status?: number) {
    super(reason);
  }
}

export async function creationRequest<T = Record<string, unknown>>(url: string, init: RequestInit = {}, timeoutMs = 20000): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      (async () => {
        const response = await fetch(url, { ...init, signal: controller.signal });
        if (!response.ok) {
          // Storage may wrap Duplicate/statusCode 409 in an HTTP 400 response.
          if (init.method === "PUT" && response.status === 400) {
            const body = await response.text();
            if (body.length <= 256 * 1024) {
              let failure;
              try { failure = JSON.parse(body); } catch { /* Keep the HTTP status. */ }
              if (String(failure?.statusCode) === "409" && failure?.error === "Duplicate") throw new CreationRequestError("http", 409);
            }
          }
          throw new CreationRequestError("http", response.status);
        }
        const body = await response.text();
        if (body.length > 256 * 1024) throw new CreationRequestError("response");
        try { return JSON.parse(body) as T; }
        catch { throw new CreationRequestError("response"); }
      })(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new CreationRequestError("timeout"));
        }, timeoutMs);
      }),
    ]);
  } catch (error) {
    throw error instanceof CreationRequestError ? error : new CreationRequestError(controller.signal.aborted ? "timeout" : "network");
  } finally {
    clearTimeout(timer);
  }
}

export function creationFailureMessage(error: unknown, ar: boolean) {
  const status = error instanceof CreationRequestError ? error.status : undefined;
  if (status === 401 || status === 403) return ar ? "انتهت الجلسة أو لا تملك الصلاحية. سجّل الدخول مجدداً." : "Your session expired or access was denied. Sign in again.";
  if (status === 429) return ar ? "طلبات كثيرة. انتظر قليلاً قبل إعادة المحاولة." : "Too many requests. Wait before trying again.";
  if (status === 409) return ar ? "تعذر تأكيد الطلب السابق. تحقق من قائمة الضمانات قبل إنشاء طلب جديد." : "The earlier request could not be confirmed. Check your warranties before starting a new request.";
  if (status && status >= 400 && status < 500) return ar ? "تعذر قبول البيانات. راجع الحقول وحاول مجدداً." : "The details were not accepted. Review the fields and try again.";
  return ar ? "تعذر تأكيد الطلب. تحقق من الاتصال وأعد المحاولة؛ سيُستخدم الطلب نفسه دون إنشاء ضمان آخر." : "Could not confirm the request. Check your connection and retry; the same request will be used without creating another warranty.";
}

export function readCreationScan(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const timer = setTimeout(() => { reject(new CreationRequestError("timeout")); reader.abort(); }, 10000);
    reader.onload = () => { clearTimeout(timer); resolve(String(reader.result)); };
    reader.onerror = reader.onabort = () => { clearTimeout(timer); reject(new CreationRequestError("response")); };
    reader.readAsDataURL(file);
  });
}

export type CreationUploadState = {
  prepared?: { signedUrl: string; path: string; bucket: string };
  uploaded?: boolean;
  finalizationUncertain?: boolean;
  done?: boolean;
};

export async function uploadCreationAttachment(warrantyId: string, file: File, state: CreationUploadState, isCurrentAccount = () => true) {
  const guardAccount = () => { if (!isCurrentAccount()) throw new CreationRequestError("uncertain"); };
  guardAccount();
  if (state.done) return;
  const hash = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  const fileHash = Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
  const base = `/api/warranties/${encodeURIComponent(warrantyId)}/documents`;
  guardAccount();
  const existing = await creationRequest<Array<{ file_hash?: string; file_size?: number; storage_path?: string }>>(base);
  if (!Array.isArray(existing)) throw new CreationRequestError("response");
  if (existing.some((doc) => (state.prepared && doc.storage_path === state.prepared.path) || (doc.file_hash === fileHash && doc.file_size === file.size))) {
    state.done = true;
    state.finalizationUncertain = false;
    return;
  }
  if (!state.prepared) {
    guardAccount();
    const prepared = await creationRequest<{ signedUrl: string; path: string; bucket: string }>(`${base}/upload-url`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName: file.name, fileType: file.type, fileSize: file.size }),
    });
    if (prepared.bucket !== WARRANTY_DOCUMENTS_BUCKET || typeof prepared.path !== "string" || typeof prepared.signedUrl !== "string") throw new CreationRequestError("response");
    const destination = new URL(prepared.signedUrl);
    const storageOrigin = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "").origin;
    if (destination.origin !== storageOrigin || !destination.pathname.includes(`/object/upload/sign/${WARRANTY_DOCUMENTS_BUCKET}/`)) throw new CreationRequestError("response");
    state.prepared = prepared;
  }
  if (!state.uploaded) {
    guardAccount();
    const body = new FormData();
    body.append("cacheControl", "3600");
    body.append("", file);
    try {
      await creationRequest(state.prepared.signedUrl, { method: "PUT", body, headers: { "x-upsert": "false" } }, 45000);
    } catch (error) {
      // A previous PUT may have completed even when its response was lost.
      if (!(error instanceof CreationRequestError) || error.status !== 409) throw error;
    }
    state.uploaded = true;
  }
  guardAccount();
  // Finalization is atomic per warranty/storage path, so an ambiguous POST can
  // safely replay the same operation without preparing or uploading a new file.
  state.finalizationUncertain = true;
  const finalized = await creationRequest<{ id?: string }>(base, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ storagePath: state.prepared.path, fileName: file.name, fileType: file.type, fileSize: file.size, fileHash, documentKind: "original_proof", sourceContext: "warranty_creation" }),
  });
  if (!finalized?.id || typeof finalized.id !== "string") throw new CreationRequestError("response");
  state.done = true;
  state.finalizationUncertain = false;
}
