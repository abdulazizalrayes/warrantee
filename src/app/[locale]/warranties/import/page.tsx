// @ts-nocheck
"use client";

import { useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Upload, FileText, CheckCircle, AlertCircle, Download, FileSpreadsheet, ShieldCheck, Sparkles } from "lucide-react";
import { getDictionary, DIRECTION } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import Papa from "papaparse";

interface ParsedRow {
  product_name: string;
  serial_number?: string;
  sku?: string;
  category?: string;
  start_date: string;
  end_date: string;
  seller_name?: string;
  seller_email?: string;
  quantity?: string;
}

export default function ImportWarrantiesPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params.locale as string) || "en";
  const dict = getDictionary(locale);
  const isRTL = locale === "ar";
  const direction = DIRECTION[locale as Locale];

  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(0);
  const [done, setDone] = useState(false);
  const requiredColumns = ["product_name", "start_date", "end_date"];
  const recommendedColumns = ["serial_number", "sku", "category", "seller_name", "seller_email", "quantity"];

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!selected.name.endsWith(".csv")) {
      setErrors(["Only CSV files are accepted"]);
      return;
    }

    setFile(selected);
    setErrors([]);
    const text = await selected.text();
    const result = Papa.parse<ParsedRow>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase().replace(/\s+/g, "_"),
    });

    const nextErrors = [
      ...result.errors.map((error) => error.message),
    ];
    const rows = result.data.filter((row, index) => {
      const valid = row.product_name && row.start_date && row.end_date;
      if (!valid) {
        nextErrors.push(`Row ${index + 2}: Missing required fields (product_name, start_date, end_date)`);
      }
      return valid;
    });

    setErrors(nextErrors);
    setParsedData(rows);
  };

  const handleImport = async () => {
    if (!user || parsedData.length === 0 || !file) return;
    setImporting(true);
    setImported(0);
    setErrors([]);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/warranties/bulk-import", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Bulk import failed");
      }

      setImported(result.imported || 0);
      setErrors((result.errors || []).map((error: { row: number; message: string }) => `Row ${error.row}: ${error.message}`));
      setDone(true);
    } catch (error) {
      setErrors([error instanceof Error ? error.message : "Bulk import failed"]);
    } finally {
      setImporting(false);
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
          {isRTL ? `\u062A\u0645 \u0627\u0633\u062A\u064A\u0631\u0627\u062F ${imported} \u0636\u0645\u0627\u0646 \u0628\u0646\u062C\u0627\u062D!` : `Successfully imported ${imported} warranties!`}
        </h2>
        <button
          onClick={() => router.push(`/${locale}/warranties`)}
          className="mt-4 bg-gold hover:bg-yellow-500 text-navy font-semibold py-3 px-6 rounded-lg transition"
        >
          {isRTL ? "\u0639\u0631\u0636 \u0627\u0644\u0636\u0645\u0627\u0646\u0627\u062A" : "View Warranties"}
        </button>
      </div>
    );
  }

  return (
    <div dir={direction} className="max-w-5xl space-y-8">
      <div className="rounded-3xl bg-gradient-to-br from-[#1A1A2E] via-[#242446] to-[#2f2f5f] px-6 py-7 text-white shadow-lg">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[12px] font-medium text-white/85">
              <Sparkles size={14} />
              {isRTL ? "استيراد جماعي جاهز للتشغيل" : "Production-ready bulk import"}
            </div>
            <h1 className="mt-4 text-[30px] font-semibold tracking-tight">
              {isRTL ? "استيراد الضمانات من CSV" : "Import Warranties from CSV"}
            </h1>
            <p className="mt-3 max-w-xl text-[15px] text-white/70">
              {isRTL
                ? "حمّل ملفاً واحداً، راجع الصفوف قبل التنفيذ، ثم ادخل الضمانات دفعة واحدة مع تقليل الاخطاء اليدوية."
                : "Upload a single CSV, validate the rows before commit, and bring large warranty batches into Warrantee with less manual work."}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:w-[420px]">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <FileSpreadsheet className="mb-3 h-5 w-5 text-[#f5d76e]" />
              <p className="text-[13px] font-medium">{isRTL ? "ملف واحد" : "Single source file"}</p>
              <p className="mt-1 text-[12px] text-white/60">{isRTL ? "CSV فقط لتدفق واضح وقابل للتدقيق" : "CSV-only for a clear, auditable workflow"}</p>
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
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg transition">
          {isRTL ? <ArrowRight size={20} /> : <ArrowLeft size={20} />}
        </button>
        <div>
          <h2 className="text-2xl font-bold text-navy">{isRTL ? "\u0627\u0633\u062A\u064A\u0631\u0627\u062F \u0636\u0645\u0627\u0646\u0627\u062A \u0645\u0646 CSV" : "Import Warranties from CSV"}</h2>
          <p className="text-sm text-gray-500 mt-1">
            {isRTL ? "الخطوة 1: نزّل القالب ثم ارفع ملفك وراجع المعاينة." : "Step 1: download the template, upload your file, and verify the preview."}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6 shadow-sm">
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
            {file ? file.name : isRTL ? "\u0627\u0636\u063A\u0637 \u0644\u0631\u0641\u0639 \u0645\u0644\u0641 CSV" : "Click to upload CSV file"}
          </p>
          <p className="mt-2 text-xs text-gray-400">
            {isRTL ? "سيتم تحليل الملف محلياً وعرض الصفوف الصالحة قبل التنفيذ." : "The file is parsed first so you can review valid rows before import."}
          </p>
          <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileSelect} className="hidden" />
        </div>

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
              {isRTL ? `\u0645\u0639\u0627\u064A\u0646\u0629: ${parsedData.length} \u0636\u0645\u0627\u0646` : `Preview: ${parsedData.length} warranties`}
            </h3>
            <div className="overflow-x-auto border border-gray-200 rounded-2xl">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">{isRTL ? "\u0627\u0644\u0645\u0646\u062A\u062C" : "Product"}</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">{isRTL ? "\u0627\u0644\u0628\u062F\u0621" : "Start"}</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">{isRTL ? "\u0627\u0644\u0627\u0646\u062A\u0647\u0627\u0621" : "End"}</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">{isRTL ? "\u0627\u0644\u0628\u0627\u0626\u0639" : "Seller"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {parsedData.slice(0, 10).map((row, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2">{row.product_name}</td>
                      <td className="px-3 py-2">{row.start_date}</td>
                      <td className="px-3 py-2">{row.end_date}</td>
                      <td className="px-3 py-2">{row.seller_name || "\u2014"}</td>
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
              disabled={importing}
              className="mt-4 w-full bg-gold hover:bg-yellow-500 text-navy font-semibold py-3 rounded-full transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importing
                ? `${isRTL ? "\u062C\u0627\u0631\u064A \u0627\u0644\u0627\u0633\u062A\u064A\u0631\u0627\u062F..." : "Importing..."} (${imported}/${parsedData.length})`
                : isRTL ? `\u0627\u0633\u062A\u064A\u0631\u0627\u062F ${parsedData.length} \u0636\u0645\u0627\u0646` : `Import ${parsedData.length} Warranties`}
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
