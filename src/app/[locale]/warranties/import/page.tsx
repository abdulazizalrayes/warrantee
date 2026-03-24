"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Shield, Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";

const t = {
  en: {
    title: "Import Warranties",
    subtitle: "Upload a CSV file to bulk import warranties",
    dropzone: "Drag & drop a CSV file here, or click to browse",
    download: "Download Sample Template",
    preview: "Preview",
    rows: "rows found",
    importBtn: "Import Warranties",
    importing: "Importing...",
    results: "Import Results",
    imported: "Successfully imported",
    errors: "Errors",
    row: "Row",
    back: "Back to Warranties",
    noFile: "Please select a CSV file first",
    required: "Required columns: product_name, start_date, end_date",
  },
  ar: {
    title: "\u0627\u0633\u062a\u064a\u0631\u0627\u062f \u0627\u0644\u0636\u0645\u0627\u0646\u0627\u062a",
    subtitle: "\u0627\u0631\u0641\u0639 \u0645\u0644\u0641 CSV \u0644\u0627\u0633\u062a\u064a\u0631\u0627\u062f \u0627\u0644\u0636\u0645\u0627\u0646\u0627\u062a \u0628\u0627\u0644\u062c\u0645\u0644\u0629",
    dropzone: "\u0627\u0633\u062d\u0628 \u0645\u0644\u0641 CSV \u0647\u0646\u0627 \u0623\u0648 \u0627\u0646\u0642\u0631 \u0644\u0644\u0627\u062e\u062a\u064a\u0627\u0631",
    download: "\u062a\u062d\u0645\u064a\u0644 \u0646\u0645\u0648\u0630\u062c",
    preview: "\u0645\u0639\u0627\u064a\u0646\u0629",
    rows: "\u0635\u0641\u0648\u0641",
    importBtn: "\u0627\u0633\u062a\u064a\u0631\u0627\u062f",
    importing: "\u062c\u0627\u0631\u064a \u0627\u0644\u0627\u0633\u062a\u064a\u0631\u0627\u062f...",
    results: "\u0646\u062a\u0627\u0626\u062c \u0627\u0644\u0627\u0633\u062a\u064a\u0631\u0627\u062f",
    imported: "\u062a\u0645 \u0627\u0633\u062a\u064a\u0631\u0627\u062f",
    errors: "\u0623\u062e\u0637\u0627\u0621",
    row: "\u0635\u0641",
    back: "\u0627\u0644\u0639\u0648\u062f\u0629 \u0644\u0644\u0636\u0645\u0627\u0646\u0627\u062a",
    noFile: "\u064a\u0631\u062c\u0649 \u0627\u062e\u062a\u064a\u0627\u0631 \u0645\u0644\u0641 CSV \u0623\u0648\u0644\u0627\u064b",
    required: "\u0627\u0644\u0623\u0639\u0645\u062f\u0629 \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629: product_name, start_date, end_date",
  },
};

export default function ImportPage() {
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const l = t[locale as keyof typeof t] || t.en;
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ imported: number; errors: { row: number; message: string }[] } | null>(null);

  function handleFile(f: File) {
    setFile(f);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split("\n").filter(Boolean);
      if (lines.length > 0) {
        setHeaders(lines[0].split(",").map(h => h.trim()));
        const rows = lines.slice(1, 6).map(line => line.split(",").map(c => c.trim()));
        setPreview(rows);
      }
    };
    reader.readAsText(f);
  }

  function downloadTemplate() {
    const csv = "product_name,product_name_ar,serial_number,sku,category,start_date,end_date,seller_name,seller_email,language\nSamsung TV 55,\u062a\u0644\u0641\u0632\u064a\u0648\u0646 \u0633\u0627\u0645\u0633\u0648\u0646\u062c,SN-12345,SKU-001,Electronics,2024-01-01,2026-01-01,Best Buy,seller@example.com,en";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "warranty_template.csv"; a.click();
  }

  async function handleImport() {
    if (!file) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/warranties/bulk-import", { method: "POST", body: formData });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setResult({ imported: 0, errors: [{ row: 0, message: "Import failed" }] });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-[#4169E1]" />
            <span className="text-xl font-bold text-[#1A1A2E]">{l.title}</span>
          </div>
          <Link href={"/" + locale + "/warranties"} className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#4169E1]">
            <ArrowLeft className="w-4 h-4" /> {l.back}
          </Link>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-8">
        <p className="text-gray-500 mb-2">{l.subtitle}</p>
        <p className="text-xs text-gray-400 mb-6">{l.required}</p>

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          onClick={() => { const inp = document.createElement("input"); inp.type = "file"; inp.accept = ".csv"; inp.onchange = (e: any) => { if (e.target.files[0]) handleFile(e.target.files[0]); }; inp.click(); }}
          className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center cursor-pointer hover:border-[#4169E1] transition-colors bg-white"
        >
          <Upload className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">{l.dropzone}</p>
          {file && <p className="text-[#4169E1] font-medium mt-2">{file.name}</p>}
        </div>

        <button onClick={downloadTemplate} className="flex items-center gap-2 mt-4 text-sm text-[#4169E1] hover:underline">
          <Download className="w-4 h-4" /> {l.download}
        </button>

        {preview.length > 0 && (
          <div className="mt-6 bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b bg-gray-50 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">{l.preview} ({preview.length} {l.rows})</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-gray-50">{headers.map((h, i) => <th key={i} className="px-3 py-2 text-start text-xs font-medium text-gray-500">{h}</th>)}</tr></thead>
                <tbody>{preview.map((row, i) => <tr key={i} className="border-b">{row.map((c: string, j: number) => <td key={j} className="px-3 py-2 text-gray-600">{c}</td>)}</tr>)}</tbody>
              </table>
            </div>
          </div>
        )}

        {file && !result && (
          <button onClick={handleImport} disabled={loading} className="mt-6 bg-[#4169E1] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#3457b5] disabled:opacity-50">
            {loading ? l.importing : l.importBtn}
          </button>
        )}

        {result && (
          <div className="mt-6 bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-bold text-lg mb-4">{l.results}</h3>
            <div className="flex items-center gap-2 text-green-600 mb-2">
              <CheckCircle2 className="w-5 h-5" /> {l.imported}: {result.imported}
            </div>
            {result.errors.length > 0 && (
              <div className="mt-3">
                <p className="text-red-600 font-medium flex items-center gap-2"><AlertCircle className="w-5 h-5" /> {l.errors}: {result.errors.length}</p>
                <ul className="mt-2 text-sm text-red-500 space-y-1">
                  {result.errors.map((e, i) => <li key={i}>{l.row} {e.row}: {e.message}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
