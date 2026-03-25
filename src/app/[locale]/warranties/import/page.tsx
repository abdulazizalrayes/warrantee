// @ts-nocheck
"use client";

import { useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Upload, FileText, CheckCircle, AlertCircle, Download } from "lucide-react";
import { getDictionary, DIRECTION } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

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
  const supabase = createSupabaseBrowserClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(0);
  const [done, setDone] = useState(false);

  const parseCSV = (text: string): ParsedRow[] => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
    const rows: ParsedRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
      const row: Record<string, string> = {};
      headers.forEach((h, j) => { row[h] = values[j] || ""; });

      if (row.product_name && row.start_date && row.end_date) {
        rows.push(row as unknown as ParsedRow);
      } else {
        setErrors((prev) => [...prev, `Row ${i + 1}: Missing required fields (product_name, start_date, end_date)`]);
      }
    }

    return rows;
  };

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
    const parsed = parseCSV(text);
    setParsedData(parsed);
  };

  const handleImport = async () => {
    if (!user || parsedData.length === 0) return;
    setImporting(true);
    setImported(0);

    for (const row of parsedData) {
      const refNum = `WR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

      const { error } = await supabase.from("warranties").insert({
        reference_number: refNum,
        product_name: row.product_name,
        serial_number: row.serial_number || null,
        sku: row.sku || null,
        category: row.category || "other",
        start_date: row.start_date,
        end_date: row.end_date,
        seller_name: row.seller_name || null,
        seller_email: row.seller_email || null,
        quantity: parseInt(row.quantity || "1") || 1,
        status: "active",
        created_by: user.id,
        issuer_user_id: user.id,
        is_self_registered: true,
      });

      if (!error) setImported((prev) => prev + 1);
    }

    setDone(true);
    setImporting(false);
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
    <div dir={direction} className="max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg transition">
          {isRTL ? <ArrowRight size={20} /> : <ArrowLeft size={20} />}
        </button>
        <h1 className="text-2xl font-bold text-navy">{isRTL ? "\u0627\u0633\u062A\u064A\u0631\u0627\u062F \u0636\u0645\u0627\u0646\u0627\u062A \u0645\u0646 CSV" : "Import Warranties from CSV"}</h1>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
          <p className="text-sm text-blue-800">
            {isRTL ? "\u062D\u0645\u0644 \u0627\u0644\u0642\u0627\u0644\u0628 \u0644\u0631\u0624\u064A\u0629 \u0627\u0644\u062A\u0646\u0633\u064A\u0642 \u0627\u0644\u0645\u0637\u0644\u0648\u0628" : "Download the template to see the required format"}
          </p>
          <button onClick={downloadTemplate} className="text-blue-700 hover:text-blue-900 font-medium text-sm flex items-center gap-1">
            <Download size={14} /> {isRTL ? "\u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u0642\u0627\u0644\u0628" : "Download Template"}
          </button>
        </div>

        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gold transition"
        >
          <Upload size={32} className="mx-auto text-gray-400 mb-2" />
          <p className="text-sm text-gray-600">
            {file ? file.name : isRTL ? "\u0627\u0636\u063A\u0637 \u0644\u0631\u0641\u0639 \u0645\u0644\u0641 CSV" : "Click to upload CSV file"}
          </p>
          <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileSelect} className="hidden" />
        </div>

        {errors.length > 0 && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
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
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
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
              className="mt-4 w-full bg-gold hover:bg-yellow-500 text-navy font-semibold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importing
                ? `${isRTL ? "\u062C\u0627\u0631\u064A \u0627\u0644\u0627\u0633\u062A\u064A\u0631\u0627\u062F..." : "Importing..."} (${imported}/${parsedData.length})`
                : isRTL ? `\u0627\u0633\u062A\u064A\u0631\u0627\u062F ${parsedData.length} \u0636\u0645\u0627\u0646` : `Import ${parsedData.length} Warranties`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
