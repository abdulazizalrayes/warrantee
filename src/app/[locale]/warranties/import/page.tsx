"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Upload, CheckCircle, AlertCircle, Download, FileSpreadsheet, ShieldCheck, RotateCcw } from "lucide-react";
import { SubpageHeroHeader } from "@/components/dashboard/SubpageHeroHeader";
import { DIRECTION } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { WARRANTY_IMPORT_FIELDS } from "@/lib/warranty-import";

interface PreviewRow {
  sourceRow: number;
  product_name?: string;
  serial_number?: string;
  sku?: string;
  category?: string;
  start_date: string;
  end_date: string;
  seller_name?: string;
  seller_email?: string;
  quantity?: string;
  valid: boolean;
  duplicate: boolean;
  errors: string[];
}

export default function ImportWarrantiesPage() {
  const params = useParams() ?? {};
  const router = useRouter();
  const locale = (params.locale as string) || "en";
  const isRTL = locale === "ar";
  const direction = DIRECTION[locale as Locale];

  const { user, loading } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<PreviewRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState({ total: 0, valid: 0, invalid: 0, duplicates: 0 });
  const [errors, setErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(0);
  const [done, setDone] = useState(false);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [rollingBack, setRollingBack] = useState(false);
  const [rolledBack, setRolledBack] = useState(false);
  const requiredColumns = ["product_name", "start_date", "end_date"];
  const recommendedColumns = ["serial_number", "sku", "category", "seller_name", "seller_email", "quantity"];

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/${locale}/auth?redirect=${encodeURIComponent(`/${locale}/warranties/import`)}`);
    }
  }, [loading, locale, router, user]);

  if (loading || !user) {
    return (
      <div dir={direction} className="flex min-h-[40vh] items-center justify-center text-sm text-gray-500">
        {isRTL ? "جاري التحقق من الجلسة..." : "Checking your session..."}
      </div>
    );
  }

  const previewFile = async (selected: File, selectedMapping?: Record<string, string>) => {
    setImporting(true);
    setErrors([]);
    try {
      const formData = new FormData();
      formData.append("file", selected);
      formData.append("mode", "preview");
      if (selectedMapping) formData.append("mapping", JSON.stringify(selectedMapping));
      const response = await fetch("/api/warranties/bulk-import", { method: "POST", body: formData });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Import preview failed");
      setHeaders(result.headers || []);
      setMapping(result.mapping || {});
      setParsedData(result.rows || []);
      setSummary(result.summary || { total: 0, valid: 0, invalid: 0, duplicates: 0 });
    } catch (error) {
      setErrors([error instanceof Error ? error.message : "Import preview failed"]);
      setParsedData([]);
    } finally {
      setImporting(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!/\.(csv|xlsx)$/i.test(selected.name)) {
      setErrors([isRTL ? "يُقبل ملف CSV أو XLSX فقط" : "Only CSV and XLSX files are accepted"]);
      return;
    }

    setFile(selected);
    setErrors([]);
    await previewFile(selected);
  };

  const handleImport = async () => {
    if (!user || summary.valid === 0 || summary.invalid > 0 || !file) return;
    setImporting(true);
    setImported(0);
    setErrors([]);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mode", "commit");
      formData.append("mapping", JSON.stringify(mapping));

      const response = await fetch("/api/warranties/bulk-import", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Bulk import failed");
      }

      setImported(result.imported || 0);
      setBatchId(result.batchId || null);
      setDone(true);
    } catch (error) {
      setErrors([error instanceof Error ? error.message : "Bulk import failed"]);
    } finally {
      setImporting(false);
    }
  };

  const handleRollback = async () => {
    if (!batchId || rollingBack || rolledBack) return;
    setRollingBack(true);
    setErrors([]);
    try {
      const response = await fetch(`/api/warranties/bulk-import/${batchId}/rollback`, { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Rollback failed");
      setRolledBack(true);
    } catch (error) {
      setErrors([error instanceof Error ? error.message : "Rollback failed"]);
    } finally {
      setRollingBack(false);
    }
  };

  const downloadTemplate = () => {
    const csv = "product_name,serial_number,sku,category,start_date,end_date,seller_name,seller_email,quantity\nSamsung TV 65\",SN-123456,TV-65-SAM,electronics,2024-01-15,2026-01-15,Samsung Store,store@samsung.com,1\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "warrantee_import_template.csv";
    a.click();
  };

  if (done) {
    return (
      <div dir={direction} className="max-w-2xl mx-auto text-center py-16">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={40} className="text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-navy mb-2">
          {rolledBack
            ? (isRTL ? "تم التراجع عن دفعة الاستيراد." : "The import batch was rolled back.")
            : (isRTL ? `\u062A\u0645 \u0627\u0633\u062A\u064A\u0631\u0627\u062F ${imported} \u0636\u0645\u0627\u0646 \u0628\u0646\u062C\u0627\u062D!` : `Successfully imported ${imported} warranties!`)}
        </h2>
        <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
          <button onClick={() => router.push(`/${locale}/warranties`)} className="bg-[#0071e3] hover:bg-[#0077ED] text-white font-semibold py-3 px-6 rounded-lg transition">
            {isRTL ? "\u0639\u0631\u0636 \u0627\u0644\u0636\u0645\u0627\u0646\u0627\u062A" : "View Warranties"}
          </button>
          {batchId && !rolledBack && (
            <button onClick={handleRollback} disabled={rollingBack} className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 px-6 py-3 font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50">
              <RotateCcw size={16} /> {rollingBack ? (isRTL ? "جاري التراجع..." : "Rolling back...") : (isRTL ? "التراجع عن هذه الدفعة" : "Roll back this batch")}
            </button>
          )}
        </div>
        {errors.map((message) => <p key={message} className="mt-3 text-sm text-red-600">{message}</p>)}
      </div>
    );
  }

  return (
    <div dir={direction} className="max-w-5xl space-y-8">
      <SubpageHeroHeader
        fallbackHref={`/${locale}/warranties`}
        isRTL={isRTL}
        eyebrow={isRTL ? "استيراد جماعي جاهز للتشغيل" : "Production-ready bulk import"}
        title={isRTL ? "استيراد الضمانات من CSV أو XLSX" : "Import Warranties from CSV or XLSX"}
        subtitle={
          isRTL
            ? "حمّل ملفاً واحداً، راجع الصفوف قبل التنفيذ، ثم ادخل الضمانات دفعة واحدة مع تقليل الاخطاء اليدوية."
            : "Upload one CSV or XLSX file, map its fields, review duplicates and validation issues, then commit or roll back the batch."
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:w-[420px]">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <FileSpreadsheet className="mb-3 h-5 w-5 text-[#0071e3]" />
              <p className="text-[13px] font-medium">{isRTL ? "ملف واحد" : "Single source file"}</p>
              <p className="mt-1 text-[12px] text-white/60">{isRTL ? "CSV أو XLSX بتدفق واضح وقابل للتدقيق" : "CSV or XLSX with an auditable workflow"}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <ShieldCheck className="mb-3 h-5 w-5 text-[#30d158]" />
              <p className="text-[13px] font-medium">{isRTL ? "مراجعة قبل التنفيذ" : "Preview before commit"}</p>
              <p className="mt-1 text-[12px] text-white/60">{isRTL ? "راجع الصفوف والاخطاء قبل الاستيراد" : "Check rows and validation issues before import"}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <Upload className="mb-3 h-5 w-5 text-[#5ac8fa]" />
              <p className="text-[13px] font-medium">{isRTL ? "دخول سريع" : "Fast ingestion"}</p>
              <p className="mt-1 text-[12px] text-white/60">{isRTL ? "مثالي للدفعات الاولية والانتقال من ملفات خارجية" : "Great for onboarding legacy warranty lists"}</p>
            </div>
          </div>
      </SubpageHeroHeader>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6 shadow-sm">
        <div className="border-b border-gray-100 pb-4">
          <h2 className="text-2xl font-bold text-navy">{isRTL ? "استيراد ضمانات من CSV أو XLSX" : "Import Warranties from CSV or XLSX"}</h2>
          <p className="mt-1 text-sm text-gray-500">
            {isRTL ? "الخطوة 1: نزّل القالب ثم ارفع ملفك وراجع المعاينة." : "Step 1: download the template, upload your file, and verify the preview."}
          </p>
        </div>
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between">
          <p className="text-sm text-blue-800">
            {isRTL ? "\u062D\u0645\u0644 \u0627\u0644\u0642\u0627\u0644\u0628 \u0644\u0631\u0624\u064A\u0629 \u0627\u0644\u062A\u0646\u0633\u064A\u0642 \u0627\u0644\u0645\u0637\u0644\u0648\u0628" : "Download the template to see the required format"}
          </p>
          <button onClick={downloadTemplate} className="text-blue-700 hover:text-blue-900 font-medium text-sm flex items-center gap-1">
            <Download size={14} /> {isRTL ? "\u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u0642\u0627\u0644\u0628" : "Download Template"}
          </button>
        </div>

        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-2xl p-10 text-center cursor-pointer hover:border-gold hover:bg-[#fffdf5] transition"
        >
          <Upload size={32} className="mx-auto text-gray-400 mb-2" />
          <p className="text-sm text-gray-600">
            {file ? file.name : isRTL ? "اضغط لرفع ملف CSV أو XLSX" : "Click to upload CSV or XLSX"}
          </p>
          <p className="mt-2 text-xs text-gray-400">
            {isRTL ? "سيتم تحليل الملف محلياً وعرض الصفوف الصالحة قبل التنفيذ." : "The file is parsed first so you can review valid rows before import."}
          </p>
          <input ref={fileInputRef} type="file" accept=".csv,.xlsx" onChange={handleFileSelect} className="hidden" />
        </div>

        {headers.length > 0 && (
          <div className="rounded-2xl border border-gray-200 p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold text-navy">{isRTL ? "مطابقة الأعمدة" : "Field mapping"}</h3>
              <button onClick={() => file && previewFile(file, mapping)} disabled={importing} className="text-sm font-medium text-[#0071e3] disabled:opacity-50">
                {isRTL ? "إعادة التحقق" : "Revalidate mapping"}
              </button>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {headers.map((header) => (
                <label key={header} className="grid grid-cols-[1fr_1fr] items-center gap-3 text-sm">
                  <span className="truncate text-gray-600" title={header}>{header}</span>
                  <select value={mapping[header] || "ignore"} onChange={(event) => setMapping((current) => ({ ...current, [header]: event.target.value }))} className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                    <option value="ignore">{isRTL ? "تجاهل" : "Ignore"}</option>
                    {WARRANTY_IMPORT_FIELDS.map((field) => <option key={field} value={field}>{field}</option>)}
                  </select>
                </label>
              ))}
            </div>
          </div>
        )}

        {errors.length > 0 && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-2xl">
            {errors.map((err, i) => (
              <p key={i} className="text-sm text-red-800 flex items-center gap-1">
                <AlertCircle size={14} /> {err}
              </p>
            ))}
          </div>
        )}

        {parsedData.length > 0 && (
          <div>
            <h3 className="font-bold text-navy mb-3">
              {isRTL ? `معاينة: ${summary.valid} صالح من ${summary.total}` : `Preview: ${summary.valid} valid of ${summary.total}`}
            </h3>
            <div className="mb-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-green-50 px-3 py-1 text-green-700">{summary.valid} {isRTL ? "صالح" : "valid"}</span>
              <span className="rounded-full bg-red-50 px-3 py-1 text-red-700">{summary.invalid} {isRTL ? "يحتاج تصحيحاً" : "need correction"}</span>
              <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">{summary.duplicates} {isRTL ? "مكرر محتمل" : "possible duplicates"}</span>
            </div>
            <div className="overflow-x-auto border border-gray-200 rounded-2xl">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">{isRTL ? "\u0627\u0644\u0645\u0646\u062A\u062C" : "Product"}</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">{isRTL ? "\u0627\u0644\u0628\u062F\u0621" : "Start"}</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">{isRTL ? "\u0627\u0644\u0627\u0646\u062A\u0647\u0627\u0621" : "End"}</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">{isRTL ? "\u0627\u0644\u0628\u0627\u0626\u0639" : "Seller"}</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">{isRTL ? "التحقق" : "Validation"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {parsedData.slice(0, 10).map((row, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2">{row.product_name}</td>
                      <td className="px-3 py-2">{row.start_date}</td>
                      <td className="px-3 py-2">{row.end_date}</td>
                      <td className="px-3 py-2">{row.seller_name || "\u2014"}</td>
                      <td className="px-3 py-2 text-xs"><span className={row.valid ? "text-green-700" : "text-red-700"}>{row.valid ? (isRTL ? "صالح" : "Valid") : row.errors.join(", ")}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsedData.length > 10 && (
                <p className="text-center text-sm text-gray-500 py-2">
                  ...{isRTL ? `\u0648 ${parsedData.length - 10} \u0623\u062E\u0631\u0649` : `and ${parsedData.length - 10} more`}
                </p>
              )}
            </div>

            <button
              onClick={handleImport}
              disabled={importing || summary.invalid > 0 || summary.valid === 0}
              className="mt-4 w-full bg-[#0071e3] hover:bg-[#0077ED] text-white font-semibold py-3 rounded-full transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importing
                ? `${isRTL ? "\u062C\u0627\u0631\u064A \u0627\u0644\u0627\u0633\u062A\u064A\u0631\u0627\u062F..." : "Importing..."} (${imported}/${parsedData.length})`
                : isRTL ? `استيراد ${summary.valid} ضمان` : `Import ${summary.valid} Warranties`}
            </button>
          </div>
        )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="text-[15px] font-semibold text-navy">
              {isRTL ? "الأعمدة المطلوبة" : "Required columns"}
            </h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {requiredColumns.map((column) => (
                <span key={column} className="rounded-full bg-[#1A1A2E]/6 px-3 py-1 text-[12px] font-medium text-[#1A1A2E]">
                  {column}
                </span>
              ))}
            </div>
            <p className="mt-4 text-[12px] text-gray-500">
              {isRTL ? "أي صف لا يحتوي على هذه الحقول لن يدخل في الاستيراد." : "Rows missing these fields will be excluded from the import preview."}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="text-[15px] font-semibold text-navy">
              {isRTL ? "أعمدة موصى بها" : "Recommended columns"}
            </h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {recommendedColumns.map((column) => (
                <span key={column} className="rounded-full bg-gold/15 px-3 py-1 text-[12px] font-medium text-navy">
                  {column}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="text-[15px] font-semibold text-navy">
              {isRTL ? "متى تستخدم هذا التدفق" : "Best use cases"}
            </h3>
            <ul className="mt-4 space-y-3 text-[13px] text-gray-600">
              <li>{isRTL ? "نقل الضمانات من ملف خارجي أو ERP" : "Migrating warranties from spreadsheets or ERP exports"}</li>
              <li>{isRTL ? "إدخال دفعات أولية لعميل جديد" : "Loading a first batch for a new client or seller"}</li>
              <li>{isRTL ? "توحيد البيانات قبل التشغيل اليومي" : "Standardizing warranty data before daily operations"}</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
