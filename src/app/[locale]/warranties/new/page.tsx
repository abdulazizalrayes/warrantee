// @ts-nocheck
"use client";

import { useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Upload, X, FileText, CheckCircle } from "lucide-react";
import { getDictionary, DIRECTION } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type Step = 1 | 2 | 3 | 4;

const CATEGORIES = [
  { value: "electronics", en: "Electronics", ar: "\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A\u0627\u062A" },
  { value: "appliances", en: "Appliances", ar: "\u0623\u062C\u0647\u0632\u0629 \u0645\u0646\u0632\u0644\u064A\u0629" },
  { value: "automotive", en: "Automotive", ar: "\u0633\u064A\u0627\u0631\u0627\u062A" },
  { value: "machinery", en: "Machinery", ar: "\u0622\u0644\u0627\u062A" },
  { value: "hvac", en: "HVAC", ar: "\u062A\u0643\u064A\u064A\u0641" },
  { value: "plumbing", en: "Plumbing", ar: "\u0633\u0628\u0627\u0643\u0629" },
  { value: "construction", en: "Construction", ar: "\u0628\u0646\u0627\u0621" },
  { value: "furniture", en: "Furniture", ar: "\u0623\u062B\u0627\u062B" },
  { value: "software", en: "Software", ar: "\u0628\u0631\u0645\u062C\u064A\u0627\u062A" },
  { value: "other", en: "Other", ar: "\u0623\u062E\u0631\u0649" },
];

export default function NewWarrantyPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params.locale as string) || "en";
  const dict = getDictionary(locale);
  const isRTL = locale === "ar";
  const direction = DIRECTION[locale as Locale];
  const { user } = useAuth();
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
  const [language, setLanguage] = useState(locale);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [createdWarrantyId, setCreatedWarrantyId] = useState<string | null>(null);

  const generateReferenceNumber = () => {
    const prefix = "WR";
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    const maxSize = 10 * 1024 * 1024;
    const allowed = ["image/png", "image/jpeg", "image/webp", "application/pdf",
      "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    const valid = selected.filter((f) => {
      if (f.size > maxSize) {
        setError(isRTL ? `\u0627\u0644\u0645\u0644\u0641 ${f.name} \u0643\u0628\u064A\u0631 \u062C\u062F\u0627\u064B (\u062D\u062F 10MB)` : `File ${f.name} too large (10MB limit)`);
        return false;
      }
      if (!allowed.includes(f.type)) {
        setError(isRTL ? `\u0646\u0648\u0639 \u0627\u0644\u0645\u0644\u0641 ${f.name} \u063A\u064A\u0631 \u0645\u062F\u0639\u0648\u0645` : `File type ${f.name} not supported`);
        return false;
      }
      return true;
    });
    setFiles((prev) => [...prev, ...valid]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (asDraft: boolean = false) => {
    setLoading(true);
    setError("");
    const referenceNumber = generateReferenceNumber();
    const { data: warranty, error: insertError } = await supabase
      .from("warranties")
      .insert({
        reference_number: referenceNumber,
        product_name: productName,
        product_name_ar: productNameAr || null,
        sku: sku || null,
        serial_number: serialNumber || null,
        quantity, category,
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
        created_by: user!.id,
        issuer_user_id: user!.id,
      })
      .select().single();
    if (insertError) { setError(insertError.message); setLoading(false); return; }
    if (files.length > 0 && warranty) {
      setUploading(true);
      for (const file of files) {
        const filePath = `${user!.id}/${warranty.id}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage.from("warranty-documents").upload(filePath, file);
        if (!uploadError) {
          const { data: publicUrl } = supabase.storage.from("warranty-documents").getPublicUrl(filePath);
          await supabase.from("warranty_documents").insert({
            warranty_id: warranty.id, file_name: file.name, file_type: file.type,
            file_size: file.size, file_url: publicUrl.publicUrl, uploaded_by: user!.id,
          });
        }
      }
      setUploading(false);
    }
    await supabase.from("activity_log").insert({
      actor_id: user!.id, entity_type: "warranty", entity_id: warranty.id,
      action: "warranty_created", metadata: { reference_number: referenceNumber, product_name: productName },
    });
    setCreatedWarrantyId(warranty.id);
    setStep(4);
    setLoading(false);
  };

  const canProceedStep1 = productName && category;
  const canProceedStep2 = startDate && endDate;

  const renderStep1 = () => (
    <div className="space-y-5">
      <h2 className="text-lg font-bold text-navy">{isRTL ? "\u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0627\u0644\u0645\u0646\u062A\u062C" : "Product Information"}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-navy mb-1">{dict.warranty.fields.product_name} ({isRTL ? "\u0625\u0646\u062C\u0644\u064A\u0632\u064A" : "English"}) *</label>
          <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-navy mb-1">{dict.warranty.fields.product_name} ({isRTL ? "\u0639\u0631\u0628\u064A" : "Arabic"})</label>
          <input type="text" value={productNameAr} onChange={(e) => setProductNameAr(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent" dir="rtl" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-navy mb-1">SKU</label>
          <input type="text" value={sku} onChange={(e) => setSku(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent" dir="ltr" />
        </div>
        <div>
          <label className="block text-sm font-medium text-navy mb-1">{dict.warranty.fields.serial_number}</label>
          <input type="text" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent" dir="ltr" />
        </div>
        <div>
          <label className="block text-sm font-medium text-navy mb-1">{isRTL ? "\u0627\u0644\u0643\u0645\u064A\u0629" : "Quantity"}</label>
          <input type="number" value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 1)} min={1}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-navy mb-1">{isRTL ? "\u0627\u0644\u0641\u0626\u0629" : "Category"} *</label>
        <select value={category} onChange={(e) => setCategory(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent">
          {CATEGORIES.map((c) => (<option key={c.value} value={c.value}>{isRTL ? c.ar : c.en}</option>))}
        </select>
      </div>
      <div className="flex justify-end">
        <button onClick={() => setStep(2)} disabled={!canProceedStep1}
          className="bg-gold hover:bg-yellow-500 text-navy font-semibold py-3 px-6 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
          {dict.common.next}
          {!isRTL ? <ArrowRight size={18} /> : <ArrowLeft size={18} />}
        </button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-5">
      <h2 className="text-lg font-bold text-navy">{isRTL ? "\u062A\u0641\u0627\u0635\u064A\u0644 \u0627\u0644\u0636\u0645\u0627\u0646" : "Warranty Details"}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-navy mb-1">{dict.warranty.fields.start_date} *</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-navy mb-1">{dict.warranty.fields.warranty_end_date} *</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent" required />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-navy mb-1">{isRTL ? "\u0627\u0633\u0645 \u0627\u0644\u0628\u0627\u0626\u0639" : "Seller Name"}</label>
          <input type="text" value={sellerName} onChange={(e) => setSellerName(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent" />
        </div>
        <div>
          <label className="block text-sm font-medium text-navy mb-1">{isRTL ? "\u0628\u0631\u064A\u062F \u0627\u0644\u0628\u0627\u0626\u0639" : "Seller Email"}</label>
          <input type="email" value={sellerEmail} onChange={(e) => setSellerEmail(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent" dir="ltr" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-navy mb-1">{isRTL ? "\u0645\u0631\u062C\u0639 \u0623\u0645\u0631 \u0627\u0644\u0634\u0631\u0627\u0621" : "PO Reference"}</label>
          <input type="text" value={poReference} onChange={(e) => setPoReference(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent" dir="ltr" />
        </div>
        <div>
          <label className="block text-sm font-medium text-navy mb-1">{isRTL ? "\u0645\u0631\u062C\u0639 \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629" : "Invoice Reference"}</label>
          <input type="text" value={invoiceReference} onChange={(e) => setInvoiceReference(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent" dir="ltr" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-navy mb-1">{dict.warranty.fields.terms_conditions}</label>
        <textarea value={termsAndConditions} onChange={(e) => setTermsAndConditions(e.target.value)} rows={3}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent resize-none" />
      </div>
      <div>
        <label className="block text-sm font-medium text-navy mb-1">{isRTL ? "\u0628\u0646\u0648\u062F \u0645\u062E\u0635\u0635\u0629" : "Custom Clauses"}</label>
        <textarea value={customClauses} onChange={(e) => setCustomClauses(e.target.value)} rows={2}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent resize-none" />
      </div>
      <div className="flex gap-3">
        <button onClick={() => setStep(1)} className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium text-navy">{dict.common.back}</button>
        <button onClick={() => setStep(3)} disabled={!canProceedStep2}
          className="flex-1 bg-gold hover:bg-yellow-500 text-navy font-semibold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
          {dict.common.next}
          {!isRTL ? <ArrowRight size={18} /> : <ArrowLeft size={18} />}
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-5">
      <h2 className="text-lg font-bold text-navy">{isRTL ? "\u0627\u0644\u0645\u0633\u062A\u0646\u062F\u0627\u062A" : "Documents"}</h2>
      <p className="text-sm text-gray-600">{isRTL ? "\u0627\u0631\u0641\u0642 \u0627\u0644\u0641\u0648\u0627\u062A\u064A\u0631 \u0623\u0648 \u0627\u0644\u0645\u0633\u062A\u0646\u062F\u0627\u062A \u0627\u0644\u0645\u062A\u0639\u0644\u0642\u0629 \u0628\u0627\u0644\u0636\u0645\u0627\u0646 (\u0627\u062E\u062A\u064A\u0627\u0631\u064A)" : "Attach invoices or warranty-related documents (optional)"}</p>
      <div onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gold transition">
        <Upload size={32} className="mx-auto text-gray-400 mb-2" />
        <p className="text-sm text-gray-600">{isRTL ? "\u0627\u0636\u063A\u0637 \u0644\u0631\u0641\u0639 \u0627\u0644\u0645\u0644\u0641\u0627\u062A" : "Click to upload files"}</p>
        <p className="text-xs text-gray-400 mt-1">PNG, JPEG, WebP, PDF, DOC, DOCX (max 10MB)</p>
        <input ref={fileInputRef} type="file" multiple accept=".png,.jpg,.jpeg,.webp,.pdf,.doc,.docx" onChange={handleFileSelect} className="hidden" />
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
          {isRTL ? "\u062D\u0641\u0638 \u0643\u0645\u0633\u0648\u062F\u0629" : "Save as Draft"}
        </button>
        <button onClick={() => handleSubmit(false)} disabled={loading}
          className="flex-1 bg-gold hover:bg-yellow-500 text-navy font-semibold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
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
      <h2 className="text-2xl font-bold text-navy">{isRTL ? "\u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0636\u0645\u0627\u0646 \u0628\u0646\u062C\u0627\u062D!" : "Warranty Created Successfully!"}</h2>
      <p className="text-gray-600">{isRTL ? "\u064A\u0645\u0643\u0646\u0643 \u0627\u0644\u0622\u0646 \u0639\u0631\u0636 \u0627\u0644\u0636\u0645\u0627\u0646 \u0648\u0625\u062F\u0627\u0631\u062A\u0647 \u0645\u0646 \u0644\u0648\u062D\u0629 \u0627\u0644\u062A\u062D\u0643\u0645." : "You can now view and manage the warranty from your dashboard."}</p>
      <div className="flex gap-3 justify-center">
        <button onClick={() => router.push(`/${locale}/warranties/${createdWarrantyId}`)}
          className="bg-gold hover:bg-yellow-500 text-navy font-semibold py-3 px-6 rounded-lg transition">
          {isRTL ? "\u0639\u0631\u0636 \u0627\u0644\u0636\u0645\u0627\u0646" : "View Warranty"}
        </button>
        <button onClick={() => { setStep(1); setProductName(""); setProductNameAr(""); setSku(""); setSerialNumber(""); setQuantity(1); setStartDate(new Date().toISOString().split("T")[0]); setEndDate(""); setSellerName(""); setSellerEmail(""); setFiles([]); setCreatedWarrantyId(null); }}
          className="border border-gray-300 text-navy font-medium py-3 px-6 rounded-lg hover:bg-gray-50 transition">
          {isRTL ? "\u0625\u0646\u0634\u0627\u0621 \u0622\u062E\u0631" : "Create Another"}
        </button>
      </div>
    </div>
  );

  return (
    <div dir={direction}>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg transition">
            {isRTL ? <ArrowRight size={20} /> : <ArrowLeft size={20} />}
          </button>
          <h1 className="text-2xl font-bold text-navy">{dict.warranty.create}</h1>
        </div>
        {step < 4 && (
          <div className="flex items-center gap-2 mb-8">
            {[1, 2, 3].map((s) => (
              <div key={s} className={`h-2 rounded-full flex-1 transition-all ${s <= step ? "bg-gold" : "bg-gray-200"}`} />
            ))}
          </div>
        )}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
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
