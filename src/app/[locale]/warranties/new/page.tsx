"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Upload, X, FileText, CheckCircle, ScanLine, Sparkles, Camera } from "lucide-react";
import { SubpageHeroHeader } from "@/components/dashboard/SubpageHeroHeader";
import { getDictionary, DIRECTION } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { trackWarrantyCreated, trackWarrantyScan } from "@/lib/ga4-events";

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
  const locale = (params.locale as string) || "en";
  const dict = getDictionary(locale);
  const isRTL = locale === "ar";
  const direction = DIRECTION[locale as Locale];
  const { user, loading: authLoading } = useAuth();
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

  const [dragOver, setDragOver] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanResult, setScanResult] = useState<{fieldsFound: number} | null>(null);
  const [scanReviewNotice, setScanReviewNotice] = useState<string | null>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace(`/${locale}/auth?redirect=${encodeURIComponent(`/${locale}/warranties/new`)}`);
    }
  }, [authLoading, locale, router, user]);

  if (authLoading || !user) {
    return (
      <div dir={direction} className="flex min-h-[40vh] items-center justify-center text-sm text-gray-500">
        {isRTL ? "جاري التحقق من الجلسة..." : "Checking your session..."}
      </div>
    );
  }

  const handleSmartScan = async (file: File) => {
    setScanning(true);
    setScanProgress(0);
    setScanResult(null);
    setScanReviewNotice(null);
    setError("");
    trackWarrantyScan("started", { locale, file_type: file.type || "unknown" });
    let worker: any = null;
    let fieldsFound = 0;
    try {
      setScanProgress(5);
      const Tesseract = await import("tesseract.js");
      setScanProgress(10);
      worker = await Tesseract.createWorker("eng+ara", 1, {
        logger: (m: any) => {
          if (m.status === "recognizing text") {
            setScanProgress(10 + Math.round(m.progress * 80));
          }
        },
      });
      const { data: { text: ocrText } } = await worker.recognize(file);
      await worker.terminate();
      worker = null;
      setScanProgress(95);
      if (!ocrText || ocrText.trim().length === 0) {
        setError(isRTL ? "\u0644\u0645 \u064a\u062a\u0645 \u0627\u0644\u0639\u062b\u0648\u0631 \u0639\u0644\u0649 \u0646\u0635 \u0641\u064a \u0627\u0644\u0635\u0648\u0631\u0629" : "No text found in the image. Try a clearer photo.");
        setFiles((prev) => [...prev, file]);
        return;
      }
      const res = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: ocrText }),
      });
      if (!res.ok) {
        throw new Error(isRTL ? "\u0641\u0634\u0644 \u062a\u062d\u0644\u064a\u0644 \u0627\u0644\u0646\u0635" : "Failed to analyze text");
      }
      const parsed = await res.json();
      setScanProgress(100);
      if (parsed.success && parsed.fields) {
        const f = parsed.fields;
        let count = 0;
        if (f.product_name) { setProductName(f.product_name); count++; }
        if (f.serial_number) { setSerialNumber(f.serial_number); count++; }
        if (f.category) { setCategory(f.category); count++; }
        if (f.supplier) { setSellerName(f.supplier); count++; }
        if (f.invoice_reference) { setInvoiceReference(f.invoice_reference); count++; }
        if (f.start_date) { setStartDate(f.start_date); count++; }
        if (f.end_date) { setEndDate(f.end_date); count++; }
        setScanResult({ fieldsFound: count });
        fieldsFound = count;

        const scanConfidence = typeof f.confidence === "number" ? f.confidence : 0;
        if (scanConfidence < PROVISIONAL_REVIEW_CONFIDENCE_THRESHOLD && count > 0) {
          const needsInputFields = [
            !f.product_name ? "product_name" : null,
            !f.serial_number ? "serial_number" : null,
            !f.start_date ? "purchase_date" : null,
            !f.end_date ? "expiry_date" : null,
            !f.supplier ? "seller_name" : null,
          ].filter(Boolean);

          const provisionalResponse = await fetch("/api/warranties/provisional", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              product_name: f.product_name || null,
              brand: null,
              model_number: sku || null,
              serial_number: f.serial_number || null,
              purchase_date: f.start_date || null,
              expiry_date: f.end_date || null,
              seller_name: f.supplier || null,
              confidence_score: scanConfidence,
              needs_input_fields: needsInputFields,
            }),
          });

          if (provisionalResponse.ok) {
            setScanReviewNotice(
              isRTL
                ? "تم إنشاء عنصر مراجعة في صندوق المراجعة لأن ثقة المسح ليست كافية للاعتماد الكامل."
                : "A provisional review item was created because the scan confidence is not high enough for full trust."
            );
          }
        }
      }
      trackWarrantyScan("completed", {
        locale,
        fields_found: fieldsFound,
      });
      setFiles((prev) => [...prev, file]);
    } catch (err: any) {
      console.error("Smart Scan error:", err);
      trackWarrantyScan("failed", { locale, reason: err?.message || "unknown" });
      const msg = err?.message || "";
      const userMsg = msg.length > 0 ? msg : (isRTL ? "\u062d\u062f\u062b \u062e\u0637\u0623 \u063a\u064a\u0631 \u0645\u062a\u0648\u0642\u0639" : "An unexpected error occurred. Please try again.");
      setError(isRTL ? `\u0641\u0634\u0644 \u0627\u0644\u0645\u0633\u062d \u0627\u0644\u0630\u0643\u064a: ${userMsg}` : `Smart Scan failed: ${userMsg}`);
    } finally {
      if (worker) { try { await worker.terminate(); } catch {} }
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
  };

  const addFiles = (selected: File[]) => {
    const maxSize = 10 * 1024 * 1024;
    setError("");
    const valid = selected.filter((f) => {
      if (f.size > maxSize) {
        setError(isRTL ? `\u0627\u0644\u0645\u0644\u0641 ${f.name} \u0643\u0628\u064a\u0631 \u062c\u062f\u0627\u064b (\u062d\u062f 10MB)` : `File ${f.name} too large (10MB limit)`);
        return false;
      }
      return true;
    });
    setFiles((prev) => [...prev, ...valid]);
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

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (asDraft: boolean = false) => {
    setLoading(true);
    setError("");
    setCompletionNotice(null);

    if (!user) {
      setError(
        isRTL
          ? "يجب تسجيل الدخول أولاً قبل إنشاء الضمان."
          : "You need to sign in before creating a warranty."
      );
      setLoading(false);
      return;
    }

    const referenceNumber = generateReferenceNumber();
    const createResponse = await fetch("/api/warranties", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reference_number: referenceNumber,
        product_name: productName,
        product_name_ar: productNameAr || null,
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
        seller_email: sellerEmail || null,
        po_reference: poReference || null,
        invoice_reference: invoiceReference || null,
        terms_and_conditions: termsAndConditions || null,
        custom_clauses: customClauses || null,
        language,
        status: asDraft ? "draft" : "active",
      }),
    });

    const createPayload = await createResponse.json().catch(() => null);
    if (!createResponse.ok || !createPayload?.data) {
      setError(createPayload?.error || (isRTL ? "تعذر إنشاء الضمان." : "Failed to create warranty."));
      setLoading(false);
      return;
    }

    const warranty = createPayload.data;
    trackWarrantyCreated(asDraft ? "manual_draft" : files.length > 0 ? "manual_with_documents" : "manual");
    const issues: string[] = [];
    if (files.length > 0 && warranty) {
      setUploading(true);
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("documentKind", "original_proof");
        formData.append("sourceContext", "warranty_creation");

        const uploadResponse = await fetch(`/api/warranties/${warranty.id}/documents`, {
          method: "POST",
          body: formData,
        });

        if (!uploadResponse.ok) {
          issues.push(`Attachment upload failed for ${file.name}`);
          continue;
        }
      }
      setUploading(false);
    }
    const { error: activityError } = await supabase.from("activity_log").insert({
      actor_id: user.id, entity_type: "warranty", entity_id: warranty.id,
      action: "warranty_created", metadata: { reference_number: referenceNumber, product_name: productName },
    });
    if (activityError) {
      issues.push("Activity log could not be written");
    }
    setCreatedWarrantyId(warranty.id);
    if (issues.length > 0) {
      setCompletionNotice(
        isRTL
          ? "تم إنشاء الضمان، لكن بعض الملفات أو السجل لم يكتمل. افتح الضمان وتحقق من المرفقات."
          : "The warranty was created, but some attachments or logs did not complete. Open the warranty and verify the uploaded documents."
      );
    }
    setStep(4);
    setLoading(false);
  };

  const canProceedStep1 = productName && category;
  const canProceedStep2 = startDate && endDate;

  const renderStep1 = () => (
    <div className="space-y-5">
      <h2 className="text-lg font-bold text-navy">{isRTL ? "\u0645\u0639\u0644\u0648\u0645\u0627\u062a \u0627\u0644\u0645\u0646\u062a\u062c" : "Product Information"}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-navy mb-1">{dict.warranty.fields.product_name} ({isRTL ? "\u0625\u0646\u062c\u0644\u064a\u0632\u064a" : "English"}) *</label>
          <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3]" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-navy mb-1">{dict.warranty.fields.product_name} ({isRTL ? "\u0639\u0631\u0628\u064a" : "Arabic"})</label>
          <input type="text" value={productNameAr} onChange={(e) => setProductNameAr(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3]" dir="rtl" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-navy mb-1">SKU</label>
          <input type="text" value={sku} onChange={(e) => setSku(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3]" dir="ltr" />
        </div>
        <div>
          <label className="block text-sm font-medium text-navy mb-1">{dict.warranty.fields.serial_number}</label>
          <input type="text" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3]" dir="ltr" />
        </div>
        <div>
          <label className="block text-sm font-medium text-navy mb-1">{isRTL ? "\u0627\u0644\u0643\u0645\u064a\u0629" : "Quantity"}</label>
          <input type="number" value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 1)} min={1}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3]" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-navy mb-1">{isRTL ? "\u0627\u0644\u0641\u0626\u0629" : "Category"} *</label>
        <select value={category} onChange={(e) => setCategory(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3]">
          {CATEGORIES.map((c) => (<option key={c.value} value={c.value}>{isRTL ? c.ar : c.en}</option>))}
        </select>
      </div>
      <div className="flex justify-end">
        <button onClick={() => setStep(2)} disabled={!canProceedStep1}
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
          <label className="block text-sm font-medium text-navy mb-1">{dict.warranty.fields.start_date} *</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3]" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-navy mb-1">{dict.warranty.fields.warranty_end_date} *</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3]" required />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-navy mb-1">{isRTL ? "\u0627\u0633\u0645 \u0627\u0644\u0628\u0627\u0626\u0639" : "Seller Name"}</label>
          <input type="text" value={sellerName} onChange={(e) => setSellerName(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3]" />
        </div>
        <div>
          <label className="block text-sm font-medium text-navy mb-1">{isRTL ? "\u0628\u0631\u064a\u062f \u0627\u0644\u0628\u0627\u0626\u0639" : "Seller Email"}</label>
          <input type="email" value={sellerEmail} onChange={(e) => setSellerEmail(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3]" dir="ltr" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-navy mb-1">{isRTL ? "\u0645\u0631\u062c\u0639 \u0623\u0645\u0631 \u0627\u0644\u0634\u0631\u0627\u0621" : "PO Reference"}</label>
          <input type="text" value={poReference} onChange={(e) => setPoReference(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3]" dir="ltr" />
        </div>
        <div>
          <label className="block text-sm font-medium text-navy mb-1">{isRTL ? "\u0645\u0631\u062c\u0639 \u0627\u0644\u0641\u0627\u062a\u0648\u0631\u0629" : "Invoice Reference"}</label>
          <input type="text" value={invoiceReference} onChange={(e) => setInvoiceReference(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3]" dir="ltr" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-navy mb-1">{dict.warranty.fields.terms_conditions}</label>
        <textarea value={termsAndConditions} onChange={(e) => setTermsAndConditions(e.target.value)} rows={3}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3] resize-none" />
      </div>
      <div>
        <label className="block text-sm font-medium text-navy mb-1">{isRTL ? "\u0628\u0646\u0648\u062f \u0645\u062e\u0635\u0635\u0629" : "Custom Clauses"}</label>
        <textarea value={customClauses} onChange={(e) => setCustomClauses(e.target.value)} rows={2}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3] resize-none" />
      </div>
      <div className="flex gap-3">
        <button onClick={() => setStep(1)} className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium text-navy">{dict.common.back}</button>
        <button onClick={() => setStep(3)} disabled={!canProceedStep2}
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
      <div onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition ${dragOver ? "border-[#0071e3] bg-[#0071e3]/5" : "border-gray-300 hover:border-[#0071e3]"}`}>
        <Upload size={32} className={`mx-auto mb-2 ${dragOver ? "text-[#0071e3]" : "text-gray-400"}`} />
        <p className="text-sm text-gray-600">{isRTL ? "\u0627\u0633\u062d\u0628 \u0627\u0644\u0645\u0644\u0641\u0627\u062a \u0647\u0646\u0627 \u0623\u0648 \u0627\u0636\u063a\u0637 \u0644\u0644\u0631\u0641\u0639" : "Drag & drop files here or click to upload"}</p>
        <p className="text-xs text-gray-400 mt-1">{isRTL ? "\u062c\u0645\u064a\u0639 \u0623\u0646\u0648\u0627\u0639 \u0627\u0644\u0645\u0644\u0641\u0627\u062a \u0645\u062f\u0639\u0648\u0645\u0629 (\u062d\u062f 10MB)" : "All file types accepted (max 10MB)"}</p>
        <input ref={fileInputRef} type="file" multiple onChange={handleFileSelect} className="hidden" />
      </div>
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f, i) => (
            <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-3">
                <FileText size={18} className="text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-navy">{f.name}</p>
                  <p className="text-xs text-gray-500">{(f.size / 1024).toFixed(0)} KB</p>
                </div>
              </div>
              <button onClick={() => removeFile(i)} className="p-1 hover:bg-gray-200 rounded transition">
                <X size={16} className="text-gray-500" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-3">
        <button onClick={() => setStep(2)} className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium text-navy">{dict.common.back}</button>
        <button onClick={() => handleSubmit(true)} disabled={loading}
          className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium text-navy disabled:opacity-50">
          {isRTL ? "\u062d\u0641\u0638 \u0643\u0645\u0633\u0648\u062f\u0629" : "Save as Draft"}
        </button>
        <button onClick={() => handleSubmit(false)} disabled={loading}
          className="flex-1 bg-[#0071e3] hover:bg-[#0077ED] text-white font-semibold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
          {loading || uploading ? dict.common.loading : isRTL ? "\u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0636\u0645\u0627\u0646" : "Create Warranty"}
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
        <button onClick={() => { setStep(1); setProductName(""); setProductNameAr(""); setSku(""); setSerialNumber(""); setQuantity(1); setStartDate(new Date().toISOString().split("T")[0]); setEndDate(""); setSellerName(""); setSellerEmail(""); setFiles([]); setCreatedWarrantyId(null); setCompletionNotice(null); }}
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

        {step < 4 && (
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
                <input ref={scanInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleSmartScan(f); }} />
                <button onClick={() => scanInputRef.current?.click()} disabled={scanning} className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition disabled:opacity-50">
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
          {error && (<div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">{error}</div>)}
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
        </div>
      </div>
    </div>
  );
}
