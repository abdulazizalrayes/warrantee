// @ts-nocheck
"use client";

import { useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle, Paperclip, X, Upload } from "lucide-react";
import { getDictionary, DIRECTION } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function FileClaimPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params.locale as string) || "en";
  const warrantyId = params.id as string;
  const dict = getDictionary(locale);
  const isRTL = locale === "ar";
  const direction = DIRECTION[locale as Locale];
  const { user } = useAuth();
  const supabase = createSupabaseBrowserClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [claimAmount, setClaimAmount] = useState("");
  const [currency, setCurrency] = useState("SAR");
  const [severity, setSeverity] = useState("medium");
  const [category, setCategory] = useState("");
  const [contactMethod, setContactMethod] = useState("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [createdClaimId, setCreatedClaimId] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState("");

  const generateClaimNumber = () => {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `CL-${ts}-${rand}`;
  };

  const handleFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;
    const maxSize = 10 * 1024 * 1024;
    const valid = Array.from(newFiles).filter(f => f.size <= maxSize);
    setFiles(prev => [...prev, ...valid].slice(0, 5));
  };

  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const t = isRTL ? {
    title: "تقديم مطالبة", claimTitle: "عنوان المطالبة", desc: "وصف المشكلة",
    amount: "مبلغ المطالبة", curr: "العملة", sev: "الخطورة",
    cat: "الفئة", contact: "طريقة التواصل", submit: "تقديم المطالبة",
    saveDraft: "حفظ كمسودة", success: "تم تقديم المطالبة بنجاح!",
    back: "العودة", viewClaim: "عرض المطالبة",
    low: "منخفض", medium: "متوسط", high: "عالي", critical: "حرج",
    defect: "عيب", damage: "تلف", malfunction: "خلل",
    missing_parts: "أجزاء مفقودة", other: "أخرى",
    email: "بريد", phone: "هاتف", in_person: "شخصي", otherC: "أخرى",
    selectCat: "اختر الفئة",
    attachFiles: "إرفاق ملفات", dragDrop: "اسحب الملفات هنا أو انقر للاختيار",
    maxSize: "الحد الأقصى 10 ميغا لكل ملف، 5 ملفات كحد أقصى",
    uploading: "جاري رفع الملفات..."
  } : {
    title: "File a Claim", claimTitle: "Claim Title", desc: "Describe the Issue",
    amount: "Claim Amount", curr: "Currency", sev: "Severity",
    cat: "Category", contact: "Preferred Contact", submit: "Submit Claim",
    saveDraft: "Save as Draft", success: "Claim Filed Successfully!",
    back: "Back to Warranty", viewClaim: "View Claim",
    low: "Low", medium: "Medium", high: "High", critical: "Critical",
    defect: "Defect", damage: "Damage", malfunction: "Malfunction",
    missing_parts: "Missing Parts", other: "Other",
    email: "Email", phone: "Phone", in_person: "In Person", otherC: "Other",
    selectCat: "Select category",
    attachFiles: "Attach Files", dragDrop: "Drag files here or click to browse",
    maxSize: "Max 10MB per file, up to 5 files",
    uploading: "Uploading files..."
  };

  const handleSubmit = async (asDraft = false) => {
    setLoading(true);
    setError("");
    const claimNumber = generateClaimNumber();
    const status = asDraft ? "draft" : "submitted";

    const { data: claim, error: insertError } = await supabase
      .from("warranty_claims")
      .insert({
        warranty_id: warrantyId,
        claim_number: claimNumber,
        title,
        description,
        claim_amount: claimAmount ? parseFloat(claimAmount) : null,
        currency,
        severity,
        category: category || null,
        contact_method: contactMethod,
        status,
        filed_by: user!.id,
      })
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    // Upload files
    if (files.length > 0) {
      setUploadProgress(t.uploading);
      for (const file of files) {
        const ext = file.name.split('.').pop();
        const path = `claims/${claim.id}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('claim-attachments')
          .upload(path, file);
        if (!upErr) {
          await supabase.from('claim_attachments').insert({
            claim_id: claim.id,
            file_name: file.name,
            file_type: file.type,
            file_size: file.size,
            storage_path: path,
            uploaded_by: user!.id,
          });
        }
      }
      setUploadProgress("");
    }

    await supabase.from("claim_events").insert({
      claim_id: claim.id,
      event_type: "created",
      new_status: status,
      description: asDraft ? "Claim saved as draft" : "Claim submitted",
      created_by: user!.id,
    });

    await supabase.from("activity_log").insert({
      actor_id: user!.id,
      entity_type: "claim",
      entity_id: claim.id,
      action: "warranty_claimed",
      metadata: { warranty_id: warrantyId, claim_number: claimNumber },
    });

    setCreatedClaimId(claim.id);
    setSuccess(true);
    setLoading(false);
  };

  if (success) return (
    <div dir={direction} className="max-w-2xl mx-auto text-center py-16">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <CheckCircle size={40} className="text-green-600" />
      </div>
      <h2 className="text-2xl font-bold text-[#1A1A2E] mb-2">{t.success}</h2>
      <div className="flex gap-3 justify-center mt-4">
        <button onClick={() => router.push(`/${locale}/warranties/${warrantyId}`)} className="bg-gray-100 text-[#1A1A2E] font-semibold py-3 px-6 rounded-lg">{t.back}</button>
        <button onClick={() => router.push(`/${locale}/dashboard/claims/${createdClaimId}`)} className="bg-[#4169E1] text-white font-semibold py-3 px-6 rounded-lg">{t.viewClaim}</button>
      </div>
    </div>
  );

  return (
    <div dir={direction} className="max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg">
          {isRTL ? <ArrowRight size={20} /> : <ArrowLeft size={20} />}
        </button>
        <h1 className="text-2xl font-bold text-[#1A1A2E]">{t.title}</h1>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">{error}</div>}
        <form onSubmit={e => { e.preventDefault(); handleSubmit(false); }} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-[#1A1A2E] mb-1">{t.claimTitle} *</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4169E1]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1A1A2E] mb-1">{t.desc} *</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4169E1] resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#1A1A2E] mb-1">{t.sev}</label>
              <select value={severity} onChange={e => setSeverity(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4169E1]">
                <option value="low">{t.low}</option><option value="medium">{t.medium}</option>
                <option value="high">{t.high}</option><option value="critical">{t.critical}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1A1A2E] mb-1">{t.cat}</label>
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4169E1]">
                <option value="">{t.selectCat}</option><option value="defect">{t.defect}</option>
                <option value="damage">{t.damage}</option><option value="malfunction">{t.malfunction}</option>
                <option value="missing_parts">{t.missing_parts}</option><option value="other">{t.other}</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#1A1A2E] mb-1">{t.amount}</label>
              <input type="number" value={claimAmount} onChange={e => setClaimAmount(e.target.value)}
                step="0.01" dir="ltr" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4169E1]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1A1A2E] mb-1">{t.curr}</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4169E1]">
                <option value="SAR">SAR</option><option value="USD">USD</option><option value="EUR">EUR</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1A1A2E] mb-1">{t.contact}</label>
            <select value={contactMethod} onChange={e => setContactMethod(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4169E1]">
              <option value="email">{t.email}</option><option value="phone">{t.phone}</option>
              <option value="in_person">{t.in_person}</option><option value="other">{t.otherC}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1A1A2E] mb-1">{t.attachFiles}</label>
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[#4169E1] transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add("border-[#4169E1]", "bg-blue-50"); }}
              onDragLeave={e => { e.preventDefault(); e.currentTarget.classList.remove("border-[#4169E1]", "bg-blue-50"); }}
              onDrop={e => { e.preventDefault(); e.currentTarget.classList.remove("border-[#4169E1]", "bg-blue-50"); handleFiles(e.dataTransfer.files); }}
            >
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">{t.dragDrop}</p>
              <p className="text-xs text-gray-400 mt-1">{t.maxSize}</p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                onChange={e => handleFiles(e.target.files)}
              />
            </div>
            {files.length > 0 && (
              <div className="mt-3 space-y-2">
                {files.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                    <Paperclip className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 truncate">{file.name}</p>
                      <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button type="button" onClick={() => removeFile(idx)} className="p-1 hover:bg-gray-200 rounded">
                      <X className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {uploadProgress && <p className="text-sm text-[#4169E1] mt-2">{uploadProgress}</p>}
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => handleSubmit(true)} disabled={loading || !title || !description}
              className="flex-1 bg-gray-100 text-[#1A1A2E] font-semibold py-3 rounded-lg disabled:opacity-50">
              {loading ? "..." : t.saveDraft}
            </button>
            <button type="submit" disabled={loading || !title || !description}
              className="flex-1 bg-[#4169E1] text-white font-semibold py-3 rounded-lg disabled:opacity-50">
              {loading ? "..." : t.submit}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
