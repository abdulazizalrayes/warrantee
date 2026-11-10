"use client";

import { SearchableSelect } from '@/components/SearchableSelect';

import { useEffect, useRef, useState } from "react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Upload, X, FileText, CheckCircle, ScanLine, Sparkles, Camera } from "lucide-react";
import { SubpageHeroHeader } from "@/components/dashboard/SubpageHeroHeader";
import { getDictionary, DIRECTION } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { trackWarrantyCreated, trackWarrantyScan, trackWarrantyJourney } from "@/lib/ga4-events";
import { addMonthsToIsoDate, getWarrantyTemplate } from "@/lib/warranty-templates";
import { WARRANTY_DOCUMENT_ALLOWED_TYPES } from "@/lib/documents";
import { isValidUUID } from "@/lib/validation";
import {
  CREATION_CATEGORIES, CREATION_FILE_LIMIT, OCR_MIME_TYPES, CreationRequestError,
  creationFailureMessage, creationFileError, creationRequest, prepareCreationAttempt, readCreationScan,
  strictCreationDate, uploadCreationAttachment, validateCreationFields,
  type CreationAttempt, type CreationErrors, type CreationUploadState,
} from "@/lib/warranty-creation";
import {
  clearCreationDraftStorage, creationDraftStorage, CREATION_DRAFT_TTL, loadCreationDraft, saveCreationDraft,
} from "@/lib/warranty-creation-draft";

type Step = 1 | 2 | 3 | 4;
const PROVISIONAL_REVIEW_CONFIDENCE_THRESHOLD = 0.85;

const CATEGORIES = [
  { value: "electronics", en: "Electronics", ar: "\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a\u0627\u062a" },
  { value: "appliances", en: "Appliances", ar: "\u0623\u062c\u0647\u0632\u0629 \u0645\u0646\u0632\u0644\u064a\u0629" },
  { value: "automotive", en: "Automotive", ar: "\u0633\u064a\u0627\u0631\u0627\u062a" },
  { value: "machinery", en: "Machinery", ar: "\u0622\u0644\u0627\u062a" },
  { value: "hvac", en: "HVAC", ar: "\u062a\u0643\u064a\u064a\u0641" },
  { value: "plumbing", en: "Plumbing", ar: "\u0633\u0628\u0627\u0643\u0629" },
  { value: "construction", en: "Construction", ar: "\u0628\u0646\u0627\u0621" },
  { value: "furniture", en: "Furniture", ar: "\u0623\u062b\u0627\u062b" },
  { value: "software", en: "Software", ar: "\u0628\u0631\u0645\u062c\u064a\u0627\u062a" },
  { value: "other", en: "Other", ar: "\u0623\u062e\u0631\u0649" },
];

export default function NewWarrantyPage() {
  const params = useParams() ?? {};
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = (params.locale as string) || "en";
  const dict = getDictionary(locale);
  const isRTL = locale === "ar";
  const direction = DIRECTION[locale as Locale];
  const { user, profile, loading: authLoading } = useAuth();
  const supabase = createSupabaseBrowserClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [productName, setProductName] = useState("");
  const [productNameAr, setProductNameAr] = useState("");
  const [sku, setSku] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [category, setCategory] = useState("electronics");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState("");
  const [sellerName, setSellerName] = useState("");
  const [sellerEmail, setSellerEmail] = useState("");
  const [poReference, setPoReference] = useState("");
  const [invoiceReference, setInvoiceReference] = useState("");
  const [termsAndConditions, setTermsAndConditions] = useState("");
  const [customClauses, setCustomClauses] = useState("");
  const [language] = useState(locale);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [createdWarrantyId, setCreatedWarrantyId] = useState<string | null>(null);
  const [completionNotice, setCompletionNotice] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<CreationErrors>({});
  const [draftEnabled, setDraftEnabled] = useState(false);
  const [draftNotice, setDraftNotice] = useState("");
  const [recoveryBlocked, setRecoveryBlocked] = useState(false);
  const [creationUncertain, setCreationUncertain] = useState(false);
  const [needsAttachmentReselection, setNeedsAttachmentReselection] = useState(false);
  const [uncertainUploads, setUncertainUploads] = useState<File[]>([]);
  const accountRef = useRef<string | null>(null);
  const busyRef = useRef(false);
  const scanningRef = useRef(false);
  const savedIdRef = useRef<string | null>(null);
  const attemptRef = useRef<CreationAttempt | null>(null);
  const uploadsRef = useRef(new Map<File, CreationUploadState>());
  const draftExpiresRef = useRef(0);
  const templateAppliedRef = useRef(false);
  const accountType = profile && profile.id === user?.id && (profile.account_type === "business" || profile.account_type === "consumer") ? profile.account_type : undefined;

  const [dragOver, setDragOver] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanResult, setScanResult] = useState<{fieldsFound: number} | null>(null);
  const [scanReviewNotice, setScanReviewNotice] = useState<string | null>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (authLoading) return;
    const accountId = user?.id ?? null;
    if (!accountId) {
      if (accountRef.current) resetCreation();
      clearCreationDraftStorage(creationDraftStorage()); accountRef.current = null; return;
    }
    if (accountRef.current === accountId) return;
    const previous = accountRef.current;
    accountRef.current = accountId;
    if (previous) {
      resetCreation();
      accountRef.current = null;
      setRecoveryBlocked(true);
      // Clear in-memory fields too; an account switch must not inherit another form.
      router.replace(`/${locale}/warranties`);
      return;
    }
    trackWarrantyJourney("form_opened", { locale });
    const draft = loadCreationDraft(creationDraftStorage(), accountId);
    if (!draft) return;
    templateAppliedRef.current = true;
    setProductName(draft.productName); setProductNameAr(draft.productNameAr);
    setCategory(draft.category); setQuantity(draft.quantity);
    setStartDate(draft.startDate); setEndDate(draft.endDate);
    savedIdRef.current = draft.savedWarrantyId;
    setCreatedWarrantyId(draft.savedWarrantyId);
    setNeedsAttachmentReselection(Boolean(draft.savedWarrantyId && draft.pendingAttachments));
    setRecoveryBlocked(draft.pendingCreation && !draft.savedWarrantyId);
    setStep(draft.savedWarrantyId ? 3 : draft.step);
    draftExpiresRef.current = draft.expiresAt;
    setDraftEnabled(true);
    setDraftNotice(isRTL ? "تمت استعادة المسودة المحفوظة في علامة التبويب. أعد اختيار أي مرفقات؛ لم تُحفظ الملفات أو بيانات البائع أو البنود." : "Saved tab draft resumed. Reselect any attachments; files, seller details and clauses were not retained.");
    trackWarrantyJourney("draft_resumed", { locale, step: draft.step, outcome: "success" });
  }, [authLoading, isRTL, locale, router, user?.id]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (event === "SIGNED_OUT" || (accountRef.current && session?.user.id !== accountRef.current)) {
        resetCreation();
        setRecoveryBlocked(true);
        accountRef.current = null;
        router.replace(`/${locale}/auth`);
      }
    });
    return () => subscription.unsubscribe();
  }, [locale, router, supabase]);

  const persistDraft = (explicit = false, savedId = savedIdRef.current, pendingCreation = recoveryBlocked || (attemptRef.current?.uncertain ?? false)) => {
    if (!user || accountRef.current !== user.id || (!explicit && !draftEnabled)) return false;
    if (explicit && !draftEnabled) draftExpiresRef.current = Date.now() + CREATION_DRAFT_TTL;
    if (draftExpiresRef.current <= Date.now()) {
      clearCreationDraftStorage(creationDraftStorage());
      return false;
    }
    return saveCreationDraft(creationDraftStorage(), {
      accountId: user.id, expiresAt: draftExpiresRef.current, step: step === 4 ? 3 : step,
      productName, productNameAr, category, quantity, startDate, endDate,
      savedWarrantyId: savedId, pendingCreation, pendingAttachments: files.length > 0,
    });
  };

  useEffect(() => {
    if (!draftEnabled || !user || accountRef.current !== user.id || step === 4) return;
    persistDraft();
    // Persist only after an explicit Save progress, without extending its TTL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftEnabled, user?.id, productName, productNameAr, category, quantity, startDate, endDate, step, createdWarrantyId, files.length]);

  useEffect(() => {
    if (!draftEnabled) return;
    const timer = setTimeout(() => {
      clearCreationDraftStorage(creationDraftStorage());
      setDraftEnabled(false);
      setDraftNotice(isRTL ? "انتهت صلاحية المسودة المحلية." : "The local draft has expired.");
    }, Math.max(0, draftExpiresRef.current - Date.now()));
    return () => clearTimeout(timer);
  }, [draftEnabled, isRTL]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace(`/${locale}/auth?redirect=${encodeURIComponent(`/${locale}/warranties/new`)}`);
    }
  }, [authLoading, locale, router, user]);

  useEffect(() => {
    const template = getWarrantyTemplate(searchParams.get("template"));
    if (!template || templateAppliedRef.current) return;
    templateAppliedRef.current = true;
    setCategory(template.category);
    setEndDate((current) => current || addMonthsToIsoDate(startDate, template.defaultDurationMonths));
  }, [searchParams, startDate, draftEnabled]);

  if (authLoading || !user) {
    return (
      <div dir={direction} className="flex min-h-[40vh] items-center justify-center text-sm text-gray-500">
        {isRTL ? "جاري التحقق من الجلسة..." : "Checking your session..."}
      </div>
    );
  }

  const handleSmartScan = async (file: File) => {
    if (scanningRef.current || busyRef.current || savedIdRef.current || attemptRef.current?.uncertain || recoveryBlocked) return;
    const invalid = creationFileError(file, isRTL, true);
    if (invalid) { setError(invalid); return; }
    if (files.length >= CREATION_FILE_LIMIT) { setError(isRTL ? "الحد الأقصى 10 مرفقات." : "Use at most 10 attachments."); return; }
    scanningRef.current = true;
    const accountId = user.id;
    setScanning(true);
    setScanProgress(0);
    setScanResult(null);
    setScanReviewNotice(null);
    setError("");
    trackWarrantyScan("started", { locale, file_type: file.type || "unknown" });
    let fieldsFound = 0;
    try {
      setScanProgress(5);
      const image = await readCreationScan(file);
      if (accountRef.current !== accountId) return;
      setScanProgress(30);
      const parsed = await creationRequest<{ success?: boolean; fields?: Record<string, unknown> }>("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image }),
      }, 60000);
      if (accountRef.current !== accountId) return;
      if (!parsed.success || !parsed.fields || typeof parsed.fields !== "object") throw new CreationRequestError("response");
      setScanProgress(100);
      if (parsed.success && parsed.fields) {
        const f = parsed.fields;
        let count = 0;
        if (typeof f.product_name === "string" && f.product_name.trim()) { setProductName(f.product_name.trim().slice(0, 200)); count++; }
        if (typeof f.serial_number === "string") { setSerialNumber(f.serial_number.slice(0, 200)); count++; }
        if (typeof f.category === "string" && CREATION_CATEGORIES.includes(f.category)) { setCategory(f.category); count++; }
        if (typeof f.supplier === "string") { setSellerName(f.supplier.slice(0, 200)); count++; }
        if (typeof f.invoice_reference === "string") { setInvoiceReference(f.invoice_reference.slice(0, 200)); count++; }
        if (typeof f.start_date === "string" && strictCreationDate(f.start_date)) { setStartDate(f.start_date); count++; }
        if (typeof f.end_date === "string" && strictCreationDate(f.end_date)) { setEndDate(f.end_date); count++; }
        setScanResult({ fieldsFound: count });
        fieldsFound = count;

        const scanConfidence = typeof f.confidence === "number" ? f.confidence : 0;
        if (scanConfidence < PROVISIONAL_REVIEW_CONFIDENCE_THRESHOLD && count > 0) {
          setScanReviewNotice(isRTL ? "راجع الحقول المستخرجة قبل إنشاء الضمان؛ لم يتم حفظ أي سجل بعد." : "Review the extracted fields before creating the warranty; no record has been saved yet.");
        }
      }
      trackWarrantyScan("completed", {
        locale,
        fields_found: fieldsFound,
      });
      setFiles((prev) => [...prev, file]);
    } catch (err: unknown) {
      if (accountRef.current !== accountId) return;
      trackWarrantyScan("failed", { locale, reason: requestReason(err) });
      setError(isRTL ? "تعذر المسح. حاول بصورة أو PDF أصغر وأوضح، أو أدخل البيانات يدوياً." : "Scan could not complete. Try a smaller, clearer image or PDF, or enter the details manually.");
    } finally {
      scanningRef.current = false;
      setScanning(false);
    }
  };

  const generateReferenceNumber = () => {
    const prefix = "WR";
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    addFiles(selected);
    e.target.value = "";
  };

  const addFiles = (selected: File[]) => {
    if (busyRef.current || scanningRef.current || recoveryBlocked) return;
    setError("");
    if (selected.length + files.length > CREATION_FILE_LIMIT) { setError(isRTL ? "الحد الأقصى 10 مرفقات." : "Use at most 10 attachments."); return; }
    const invalid = selected.map((file) => creationFileError(file, isRTL)).find(Boolean);
    if (invalid) { setError(invalid); return; }
    const valid = selected.filter((file) => !files.some((existing) => existing.name === file.name && existing.size === file.size && existing.lastModified === file.lastModified));
    setFiles((prev) => [...prev, ...valid]);
    if (valid.length) setNeedsAttachmentReselection(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const dropped = Array.from(e.dataTransfer.files);
    if (dropped.length > 0) addFiles(dropped);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const removeFile = (event: React.MouseEvent<HTMLButtonElement>) => {
    const index = Number(event.currentTarget.dataset.fileIndex);
    if (!Number.isInteger(index) || !files[index]) return;
    if (busyRef.current || uploadsRef.current.get(files[index])?.finalizationUncertain) return;
    uploadsRef.current.delete(files[index]);
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const requestReason = (failure: unknown): "network" | "timeout" | "unauthorized" | "validation" | "unavailable" | "upload" | "unknown" => {
    if (!(failure instanceof CreationRequestError)) return "unknown";
    if (failure.reason === "timeout" || failure.reason === "network") return failure.reason;
    if (failure.status === 401 || failure.status === 403) return "unauthorized";
    if (failure.status === 400 || failure.status === 422) return "validation";
    return "unavailable";
  };

  const fields = { productName, productNameAr, category, quantity, startDate, endDate, sellerEmail };
  const advance = (current: 1 | 2) => {
    const errors = validateCreationFields(fields, current, isRTL);
    setFieldErrors(errors);
    setError("");
    if (Object.keys(errors).length) return;
    if (current === 1) setProductName(productName.trim());
    trackWarrantyJourney("step_completed", { locale, step: current, outcome: "success", account_type: accountType });
    setStep(current === 1 ? 2 : 3);
  };

  const saveProgress = () => {
    const saved = persistDraft(true);
    setDraftEnabled(saved);
    setDraftNotice(saved
      ? isRTL ? "حُفظت الحقول الأساسية في علامة التبويب لمدة 30 دقيقة. لم تُحفظ الملفات أو بيانات البائع أو البنود." : "Core fields saved in this tab for 30 minutes. Files, seller details and clauses were not saved."
      : isRTL ? "تعذر حفظ المسودة في هذه الجلسة." : "Draft storage is unavailable in this session.");
  };

  const handleSubmit = async () => {
    if (busyRef.current || scanningRef.current || recoveryBlocked || (needsAttachmentReselection && files.length === 0) || accountRef.current !== user.id) return;
    if (!savedIdRef.current) {
      const errors = { ...validateCreationFields(fields, 1, isRTL), ...validateCreationFields(fields, 2, isRTL) };
      setFieldErrors(errors);
      if (Object.keys(errors).length) {
        setStep(Object.keys(validateCreationFields(fields, 1, isRTL)).length ? 1 : 2);
        trackWarrantyJourney("save_failed", { locale, outcome: "failure", reason: "validation", account_type: accountType });
        return;
      }
    }
    const invalid = files.map((file) => creationFileError(file, isRTL)).find(Boolean);
    if (invalid) { setError(invalid); return; }
    busyRef.current = true;
    const accountId = user.id;
    setLoading(true);
    setError("");
    setCompletionNotice(null);
    try {
      if (!savedIdRef.current) {
        const createData = {
          product_name: productName.trim(),
          product_name_ar: productNameAr.trim() || null,
          sku: sku || null,
          serial_number: serialNumber || null,
          quantity,
          category,
          purchase_date: startDate,
          warranty_start_date: startDate,
          warranty_end_date: endDate,
          start_date: startDate,
          end_date: endDate,
          seller_name: sellerName || null,
          seller_email: sellerEmail.trim() || null,
          po_reference: poReference || null,
          invoice_reference: invoiceReference || null,
          terms_and_conditions: termsAndConditions || null,
          custom_clauses: customClauses || null,
          language,
          status: "active",
          ...(profile?.id === accountId && profile.account_type === "business" && isValidUUID(profile.company_id)
            ? { issuer_company_id: profile.company_id } : {}),
        };
        attemptRef.current = prepareCreationAttempt(attemptRef.current, createData, generateReferenceNumber);
        const attempt = attemptRef.current;
        attempt.uncertain = true;
        setCreationUncertain(true);
        persistDraft(false, null, true);
        trackWarrantyJourney("save_started", { locale, step: 3, outcome: "pending", account_type: accountType });
        const payload = await creationRequest<{ data?: { id?: string } }>("/api/warranties", {
          method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": attempt.key }, body: attempt.body,
        });
        if (accountRef.current !== accountId) return;
        if (!isValidUUID(payload.data?.id)) throw new CreationRequestError("response");
        // Record the durable ID before any secondary request, including attachment upload.
        savedIdRef.current = payload.data.id;
        setCreatedWarrantyId(payload.data.id);
        attemptRef.current = null;
        setCreationUncertain(false);
        persistDraft(false, payload.data.id, false);
        trackWarrantyCreated(files.length > 0 ? "manual_with_documents" : "manual");
        trackWarrantyJourney("step_completed", { locale, step: 3, outcome: "success", account_type: accountType });
      }
      const warrantyId = savedIdRef.current;
      if (!warrantyId || accountRef.current !== accountId) return;
      setUploading(files.length > 0);
      const remaining: File[] = [];
      for (const file of files) {
        if (accountRef.current !== accountId) return;
        const state = uploadsRef.current.get(file) || {};
        uploadsRef.current.set(file, state);
        try {
          await uploadCreationAttachment(warrantyId, file, state, () => accountRef.current === accountId);
          uploadsRef.current.delete(file);
        } catch {
          if (accountRef.current !== accountId) return;
          remaining.push(file);
          trackWarrantyJourney("attachment_failed", { locale, step: 3, outcome: "failure", reason: "upload", account_type: accountType });
        }
      }
      if (accountRef.current !== accountId) return;
      setFiles(remaining);
      setUncertainUploads(remaining.filter((file) => uploadsRef.current.get(file)?.finalizationUncertain));
      if (remaining.length) {
        setCompletionNotice(isRTL ? "تم حفظ الضمان. بعض المرفقات لم تُؤكد. أعد محاولة المرفقات فقط أو افتح الضمان للتحقق؛ لن يُنشأ ضمان آخر." : "Warranty saved. Some attachments are unconfirmed. Retry only attachments or open the warranty to verify; another warranty will not be created.");
        return;
      }
      clearCreationDraftStorage(creationDraftStorage());
      setDraftEnabled(false);
      setDraftNotice("");
      setStep(4);
    } catch (failure) {
      if (accountRef.current !== accountId) return;
      if (failure instanceof CreationRequestError && failure.reason === "http" && failure.status && [400, 401, 403, 422, 429].includes(failure.status)) {
        if (attemptRef.current) attemptRef.current.uncertain = false;
        setCreationUncertain(false);
        persistDraft(false, null, false);
      }
      trackWarrantyJourney("save_failed", { locale, step: 3, outcome: "failure", reason: requestReason(failure), account_type: accountType });
      setError(creationFailureMessage(failure, isRTL));
    } finally {
      busyRef.current = false;
      setUploading(false);
      setLoading(false);
    }
  };

  function resetCreation() {
    clearCreationDraftStorage(creationDraftStorage());
    setDraftEnabled(false); setDraftNotice(""); setRecoveryBlocked(false); setCreationUncertain(false);
    setNeedsAttachmentReselection(false); setUncertainUploads([]);
    attemptRef.current = null; savedIdRef.current = null; uploadsRef.current.clear();
    setStep(1); setProductName(""); setProductNameAr(""); setSku(""); setSerialNumber("");
    setQuantity(1); setCategory("electronics"); setStartDate(new Date().toISOString().slice(0, 10)); setEndDate("");
    setSellerName(""); setSellerEmail(""); setPoReference(""); setInvoiceReference("");
    setTermsAndConditions(""); setCustomClauses(""); setFiles([]); setCreatedWarrantyId(null);
    setCompletionNotice(null); setError(""); setFieldErrors({}); setScanResult(null); setScanReviewNotice(null);
  }

  const discardDraft = () => {
    if (recoveryBlocked || creationUncertain || createdWarrantyId) {
      clearCreationDraftStorage(creationDraftStorage());
      setDraftEnabled(false);
      setDraftNotice(isRTL ? "تم تجاهل المسودة المحلية. حالة الحفظ الحالية لم تتغير." : "Local draft discarded. The current save status is unchanged.");
    } else resetCreation();
  };

  const fieldError = (name: keyof CreationErrors) => fieldErrors[name] ? <p id={`warranty-${name}-error`} className="mt-1 text-sm text-red-700" role="alert">{fieldErrors[name]}</p> : null;

  const renderStep1 = () => (
    <div className="space-y-5">
      <h2 className="text-lg font-bold text-navy">{isRTL ? "\u0645\u0639\u0644\u0648\u0645\u0627\u062a \u0627\u0644\u0645\u0646\u062a\u062c" : "Product Information"}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="warranty-product-name" className="block text-sm font-medium text-navy mb-1">{dict.warranty.fields.product_name} *</label>
          <input id="warranty-product-name" name="productName" type="text" value={productName} onChange={(e) => setProductName(e.target.value)}
            maxLength={200} aria-invalid={Boolean(fieldErrors.productName)} aria-describedby={fieldErrors.productName ? "warranty-productName-error" : undefined}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3]" required />
          {fieldError("productName")}
        </div>
        <div>
          <label htmlFor="warranty-product-name-ar" className="block text-sm font-medium text-navy mb-1">{dict.warranty.fields.product_name} ({isRTL ? "\u0639\u0631\u0628\u064a" : "Arabic"})</label>
          <input id="warranty-product-name-ar" name="productNameAr" type="text" value={productNameAr} onChange={(e) => setProductNameAr(e.target.value)}
            maxLength={200} aria-invalid={Boolean(fieldErrors.productNameAr)} aria-describedby={fieldErrors.productNameAr ? "warranty-productNameAr-error" : undefined}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3]" dir="rtl" />
          {fieldError("productNameAr")}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label htmlFor="warranty-sku" className="block text-sm font-medium text-navy mb-1">SKU</label>
          <input id="warranty-sku" name="sku" type="text" value={sku} onChange={(e) => setSku(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3]" dir="ltr" />
        </div>
        <div>
          <label htmlFor="warranty-serial-number" className="block text-sm font-medium text-navy mb-1">{dict.warranty.fields.serial_number}</label>
          <input id="warranty-serial-number" name="serialNumber" type="text" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3]" dir="ltr" />
        </div>
        <div>
          <label htmlFor="warranty-quantity" className="block text-sm font-medium text-navy mb-1">{isRTL ? "\u0627\u0644\u0643\u0645\u064a\u0629" : "Quantity"}</label>
          <input id="warranty-quantity" name="quantity" type="number" value={Number.isFinite(quantity) ? quantity : ""} onChange={(e) => setQuantity(e.target.valueAsNumber)} min={1} step={1}
            aria-invalid={Boolean(fieldErrors.quantity)} aria-describedby={fieldErrors.quantity ? "warranty-quantity-error" : undefined}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3]" />
          {fieldError("quantity")}
        </div>
      </div>
      <div>
        <label htmlFor="warranty-category" className="block text-sm font-medium text-navy mb-1">{isRTL ? "\u0627\u0644\u0641\u0626\u0629" : "Category"} *</label>
        <SearchableSelect id="warranty-category" name="category" value={category} onChange={(e) => setCategory(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3]">
          {CATEGORIES.map((c) => (<option key={c.value} value={c.value}>{isRTL ? c.ar : c.en}</option>))}
        </SearchableSelect>
        {fieldError("category")}
      </div>
      <div className="flex justify-end">
        <button onClick={() => advance(1)}
          className="bg-[#0071e3] hover:bg-[#0077ED] text-white font-semibold py-3 px-6 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
          {dict.common.next}
          {!isRTL ? <ArrowRight size={18} /> : <ArrowLeft size={18} />}
        </button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-5">
      <h2 className="text-lg font-bold text-navy">{isRTL ? "\u062a\u0641\u0627\u0635\u064a\u0644 \u0627\u0644\u0636\u0645\u0627\u0646" : "Warranty Details"}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="warranty-start-date" className="block text-sm font-medium text-navy mb-1">{dict.warranty.fields.start_date} *</label>
          <input id="warranty-start-date" name="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
            aria-invalid={Boolean(fieldErrors.startDate)} aria-describedby={fieldErrors.startDate ? "warranty-startDate-error" : undefined}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3]" required />
          {fieldError("startDate")}
        </div>
        <div>
          <label htmlFor="warranty-end-date" className="block text-sm font-medium text-navy mb-1">{dict.warranty.fields.warranty_end_date} *</label>
          <input id="warranty-end-date" name="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate}
            aria-invalid={Boolean(fieldErrors.endDate)} aria-describedby={fieldErrors.endDate ? "warranty-endDate-error" : undefined}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3]" required />
          {fieldError("endDate")}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="warranty-seller-name" className="block text-sm font-medium text-navy mb-1">{isRTL ? "\u0627\u0633\u0645 \u0627\u0644\u0628\u0627\u0626\u0639" : "Seller Name"}</label>
          <input id="warranty-seller-name" name="sellerName" autoComplete="organization" type="text" value={sellerName} onChange={(e) => setSellerName(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3]" />
        </div>
        <div>
          <label htmlFor="warranty-seller-email" className="block text-sm font-medium text-navy mb-1">{isRTL ? "\u0628\u0631\u064a\u062f \u0627\u0644\u0628\u0627\u0626\u0639" : "Seller Email"}</label>
          <input id="warranty-seller-email" name="sellerEmail" autoComplete="email" type="email" value={sellerEmail} onChange={(e) => setSellerEmail(e.target.value)}
            aria-invalid={Boolean(fieldErrors.sellerEmail)} aria-describedby={fieldErrors.sellerEmail ? "warranty-sellerEmail-error" : undefined}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3]" dir="ltr" />
          {fieldError("sellerEmail")}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="warranty-po-reference" className="block text-sm font-medium text-navy mb-1">{isRTL ? "\u0645\u0631\u062c\u0639 \u0623\u0645\u0631 \u0627\u0644\u0634\u0631\u0627\u0621" : "PO Reference"}</label>
          <input id="warranty-po-reference" name="poReference" type="text" value={poReference} onChange={(e) => setPoReference(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3]" dir="ltr" />
        </div>
        <div>
          <label htmlFor="warranty-invoice-reference" className="block text-sm font-medium text-navy mb-1">{isRTL ? "\u0645\u0631\u062c\u0639 \u0627\u0644\u0641\u0627\u062a\u0648\u0631\u0629" : "Invoice Reference"}</label>
          <input id="warranty-invoice-reference" name="invoiceReference" type="text" value={invoiceReference} onChange={(e) => setInvoiceReference(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3]" dir="ltr" />
        </div>
      </div>
      <div>
        <label htmlFor="warranty-terms" className="block text-sm font-medium text-navy mb-1">{dict.warranty.fields.terms_conditions}</label>
        <textarea id="warranty-terms" name="termsAndConditions" value={termsAndConditions} onChange={(e) => setTermsAndConditions(e.target.value)} rows={3}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3] resize-none" />
      </div>
      <div>
        <label htmlFor="warranty-custom-clauses" className="block text-sm font-medium text-navy mb-1">{isRTL ? "\u0628\u0646\u0648\u062f \u0645\u062e\u0635\u0635\u0629" : "Custom Clauses"}</label>
        <textarea id="warranty-custom-clauses" name="customClauses" value={customClauses} onChange={(e) => setCustomClauses(e.target.value)} rows={2}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3] resize-none" />
      </div>
      <div className="flex gap-3">
        <button onClick={() => setStep(1)} className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium text-navy">{dict.common.back}</button>
        <button onClick={() => advance(2)}
          className="flex-1 bg-[#0071e3] hover:bg-[#0077ED] text-white font-semibold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
          {dict.common.next}
          {!isRTL ? <ArrowRight size={18} /> : <ArrowLeft size={18} />}
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-5">
      <h2 className="text-lg font-bold text-navy">{isRTL ? "\u0627\u0644\u0645\u0633\u062a\u0646\u062d\u0627\u062a" : "Documents"}</h2>
      <p className="text-sm text-gray-600">{isRTL ? "\u0627\u0631\u0641\u0642 \u0627\u0644\u0641\u0648\u0627\u062a\u064a\u0631 \u0623\u0648 \u0627\u0644\u0645\u0633\u062a\u0646\u062d\u0627\u062a \u0627\u0644\u0645\u062a\u0639\u0644\u0642\u0629 \u0628\u0627\u0644\u0636\u0645\u0627\u0646 (\u0627\u062e\u062a\u064a\u0627\u0631\u064a)" : "Attach invoices or warranty-related documents (optional)"}</p>
      <div role="button" tabIndex={0} aria-label={isRTL ? "إرفاق المستندات" : "Attach documents"}
        onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); fileInputRef.current?.click(); } }}
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition ${dragOver ? "border-[#0071e3] bg-[#0071e3]/5" : "border-gray-300 hover:border-[#0071e3]"}`}>
        <Upload size={32} className={`mx-auto mb-2 ${dragOver ? "text-[#0071e3]" : "text-gray-400"}`} />
        <p className="text-sm text-gray-600">{isRTL ? "\u0627\u0633\u062d\u0628 \u0627\u0644\u0645\u0644\u0641\u0627\u062a \u0647\u0646\u0627 \u0623\u0648 \u0627\u0636\u063a\u0637 \u0644\u0644\u0631\u0641\u0639" : "Drag & drop files here or click to upload"}</p>
        <p className="text-xs text-gray-400 mt-1">{isRTL ? "PDF، JPEG، PNG، DOC، DOCX (حتى 20 MiB، بحد أقصى 10 ملفات)" : "PDF, JPEG, PNG, DOC, DOCX (max 20 MiB each, 10 files)"}</p>
        <input id="warranty-documents" ref={fileInputRef} type="file" accept={WARRANTY_DOCUMENT_ALLOWED_TYPES.join(",")} multiple onChange={handleFileSelect} className="hidden" />
      </div>
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f, i) => (
            <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
              <div className="flex min-w-0 items-center gap-3">
                <FileText size={18} className="text-gray-500" />
                <div className="min-w-0">
                  <p className="break-all text-sm font-medium text-navy">{f.name}</p>
                  <p className="text-xs text-gray-500">{(f.size / 1024).toFixed(0)} KB</p>
                </div>
              </div>
              <button type="button" data-file-index={i} disabled={uncertainUploads.includes(f)} title={uncertainUploads.includes(f) ? (isRTL ? "تحقق من المرفق المحفوظ أولاً" : "Verify the saved attachment first") : undefined} aria-label={isRTL ? `إزالة ${f.name}` : `Remove ${f.name}`} onClick={removeFile} className="p-1 hover:bg-gray-200 rounded transition disabled:opacity-50">
                <X size={16} className="text-gray-500" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        <button onClick={() => setStep(2)} disabled={loading || Boolean(createdWarrantyId) || creationUncertain} className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium text-navy disabled:opacity-50">{dict.common.back}</button>
        <button onClick={saveProgress} disabled={loading || recoveryBlocked}
          className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium text-navy disabled:opacity-50">
          {isRTL ? "حفظ التقدم" : "Save progress"}
        </button>
        <button id="warranty-create" onClick={() => handleSubmit()} disabled={loading || scanning || recoveryBlocked || (needsAttachmentReselection && files.length === 0)}
          className="flex-1 bg-[#0071e3] hover:bg-[#0077ED] text-white font-semibold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
          {loading || uploading ? dict.common.loading : createdWarrantyId ? (isRTL ? "إعادة محاولة المرفقات فقط" : "Retry attachments only") : isRTL ? "\u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0636\u0645\u0627\u0646" : "Create Warranty"}
        </button>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="text-center space-y-6 py-8">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
        <CheckCircle size={40} className="text-green-600" />
      </div>
      <h2 className="text-2xl font-bold text-navy">{isRTL ? "\u062a\u0645 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0636\u0645\u0627\u0646 \u0628\u0646\u062c\u0627\u062d!" : "Warranty Created Successfully!"}</h2>
      <p className="text-gray-600">{isRTL ? "\u064a\u0645\u0643\u0646\u0643 \u0627\u0644\u0622\u0646 \u0639\u0631\u0636 \u0627\u0644\u0636\u0645\u0627\u0646 \u0648\u0625\u062f\u0627\u0631\u062a\u0647 \u0645\u0646 \u0644\u0648\u062d\u0629 \u0627\u0644\u062a\u062d\u0643\u0645." : "You can now view and manage the warranty from your dashboard."}</p>
      {completionNotice ? (
        <div className="mx-auto max-w-xl rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {completionNotice}
        </div>
      ) : null}
      <div className="flex gap-3 justify-center">
        <button onClick={() => router.push(`/${locale}/warranties/${createdWarrantyId}`)}
          className="bg-[#0071e3] hover:bg-[#0077ED] text-white font-semibold py-3 px-6 rounded-lg transition">
          {isRTL ? "\u0639\u0631\u0636 \u0627\u0644\u0636\u0645\u0627\u0646" : "View Warranty"}
        </button>
        <button onClick={resetCreation}
          className="border border-gray-300 text-navy font-medium py-3 px-6 rounded-lg hover:bg-gray-50 transition">
          {isRTL ? "\u0625\u0646\u0634\u0627\u0621 \u0622\u062e\u0631" : "Create Another"}
        </button>
      </div>
    </div>
  );

  return (
    <div dir={direction}>
      <div className="max-w-3xl mx-auto">
        <SubpageHeroHeader
          fallbackHref={`/${locale}/warranties`}
          isRTL={isRTL}
          eyebrow={isRTL ? "إنشاء ضمان جديد" : "Create a new warranty"}
          title={dict.warranty.create}
          subtitle={
            isRTL
              ? "أدخل بيانات المنتج والضمان والمرفقات ضمن تدفق واضح من ثلاث خطوات قبل النشر."
              : "Capture product details, warranty terms, and supporting documents in a guided three-step flow before publishing."
          }
          badge={isRTL ? "جاهز للمسح الذكي والمرفقات" : "Supports smart scan and attachments"}
        />

        {step < 4 && !createdWarrantyId && !recoveryBlocked && !creationUncertain && (
          <div className="mb-6 bg-gradient-to-r from-[#1A1A2E] to-[#2d2d5e] rounded-2xl p-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                  <ScanLine size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-semibold">{isRTL ? "\u0627\u0644\u0645\u0633\u062d \u0627\u0644\u0630\u0643\u064a" : "Smart Scan"}</span>
                    <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full flex items-center gap-1"><Sparkles size={10} /> AI</span>
                  </div>
                  <p className="text-[12px] text-white/60">{isRTL ? "\u0627\u0645\u0633\u062d \u0645\u0633\u062a\u0646\u062f \u0627\u0644\u0636\u0645\u0627\u0646 \u0644\u0645\u0644\u0621 \u0627\u0644\u062d\u0642\u0648\u0644 \u062a\u0644\u0642\u0627\u0626\u064a\u0627\u064b" : "Scan warranty document to auto-fill fields"}</p>
                </div>
              </div>
              <div>
                <input id="warranty-smart-scan" ref={scanInputRef} type="file" accept={OCR_MIME_TYPES.join(",")} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleSmartScan(f); e.target.value = ""; }} />
                <button
                  type="button"
                  onClick={() => scanInputRef.current?.click()}
                  disabled={scanning || loading}
                  aria-label={isRTL ? "مسح مستند الضمان" : "Scan warranty document"}
                  title={isRTL ? "مسح مستند الضمان" : "Scan warranty document"}
                  className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition disabled:opacity-50"
                >
                  <Camera size={18} />
                </button>
              </div>
            </div>
            {scanning && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-[12px] mb-1">
                  <span>{isRTL ? "\u062c\u0627\u0631\u064d \u0627\u0644\u0645\u0633\u062d..." : "Scanning..."}</span>
                  <span>{scanProgress}%</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-1.5">
                  <div className="bg-[#30d158] h-1.5 rounded-full transition-all duration-300" style={{ width: scanProgress + "%" }} />
                </div>
              </div>
            )}
            {scanResult && (
              <div className="mt-3 flex items-center gap-2 text-[12px] text-[#30d158]">
                <CheckCircle size={14} />
                <span>{isRTL ? `\u062a\u0645 \u0627\u0644\u0639\u062b\u0648\u0631 \u0639\u0644\u0649 ${scanResult.fieldsFound} \u062d\u0642\u0648\u0644` : `Found ${scanResult.fieldsFound} fields`}</span>
              </div>
            )}
            {scanReviewNotice && (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
                {scanReviewNotice}
              </div>
            )}
          </div>
        )}

        {step < 4 && (
          <div className="flex items-center gap-2 mb-8">
            {[1, 2, 3].map((s) => (
              <div key={s} className={`h-2 rounded-full flex-1 transition-all ${s <= step ? "bg-gold" : "bg-gray-200"}`} />
            ))}
          </div>
        )}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="mb-5 border-b border-gray-100 pb-4">
            <h2 className="text-xl font-bold text-navy">
              {isRTL ? "تفاصيل الضمان" : "Warranty details"}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {isRTL ? "أكمل الحقول الأساسية ثم راجع المستندات قبل الإنشاء." : "Complete the core fields, then review documents before creation."}
            </p>
          </div>
          {draftNotice && step < 4 && <p role="status" className="mb-4 text-sm text-gray-600">{draftNotice}</p>}
          {step < 3 && <div className="mb-4 flex flex-wrap gap-3">
            <button id="warranty-save-progress" type="button" onClick={saveProgress} disabled={loading || scanning || recoveryBlocked} className="text-sm font-medium text-[#0071e3] disabled:opacity-50">{isRTL ? "حفظ التقدم" : "Save progress"}</button>
          </div>}
          {draftEnabled && step < 4 && <button id="warranty-discard-draft" type="button" onClick={discardDraft} disabled={loading || scanning} className="mb-4 text-sm font-medium text-red-700 disabled:opacity-50">{isRTL ? "تجاهل المسودة" : "Discard draft"}</button>}
          {recoveryBlocked && <p role="alert" className="mb-4 text-sm text-amber-800">{isRTL ? "كان طلب الحفظ قيد التنفيذ قبل إعادة التحميل. تحقق من قائمة الضمانات؛ تم إيقاف الإنشاء لمنع التكرار." : "A save was in progress before reload. Check your warranties; creation is paused to prevent duplicates."} <a href={`/${locale}/warranties`} className="underline">{isRTL ? "عرض الضمانات" : "View warranties"}</a></p>}
          {completionNotice && step < 4 && <p role="status" className="mb-4 text-sm text-amber-800">{completionNotice}</p>}
          {createdWarrantyId && step < 4 && <a href={`/${locale}/warranties/${createdWarrantyId}`} className="mb-4 inline-block text-sm font-medium text-[#0071e3] underline">{isRTL ? "فتح الضمان المحفوظ" : "Open saved warranty"}</a>}
          {error && (<div role="alert" className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">{error}</div>)}
          <fieldset disabled={loading || scanning || recoveryBlocked || creationUncertain || Boolean(createdWarrantyId)}>
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
          </fieldset>
          <fieldset disabled={loading || scanning || recoveryBlocked}>
            {step === 3 && renderStep3()}
          </fieldset>
          {step === 4 && renderStep4()}
        </div>
      </div>
    </div>
  );
}
