"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Upload, File, Trash2, Download, AlertCircle } from "lucide-react";

const t = {
  en: { title: "Documents", dropzone: "Drag & drop files here", browse: "or click to browse", types: "PDF, JPEG, PNG, DOC, DOCX (max 250MB)", uploading: "Uploading...", noFiles: "No documents uploaded yet", delete: "Delete", download: "Download", error: "Upload failed" },
  ar: { title: "\u0627\u0644\u0645\u0633\u062a\u0646\u062f\u0627\u062a", dropzone: "\u0627\u0633\u062d\u0628 \u0627\u0644\u0645\u0644\u0641\u0627\u062a \u0647\u0646\u0627", browse: "\u0623\u0648 \u0627\u0646\u0642\u0631 \u0644\u0644\u0627\u062e\u062a\u064a\u0627\u0631", types: "PDF, JPEG, PNG, DOC, DOCX (\u0623\u0642\u0635\u0649 250MB)", uploading: "\u062c\u0627\u0631\u064a \u0627\u0644\u0631\u0641\u0639...", noFiles: "\u0644\u0627 \u062a\u0648\u062c\u062f \u0645\u0633\u062a\u0646\u062f\u0627\u062a", delete: "\u062d\u0630\u0641", download: "\u062a\u062d\u0645\u064a\u0644", error: "\u0641\u0634\u0644 \u0627\u0644\u0631\u0641\u0639" },
};

const ALLOWED = ["application/pdf", "image/jpeg", "image/png", "image/jpg", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];

interface Props { warrantyId: string; locale?: string; }

export default function DocumentUpload({ warrantyId, locale = "en" }: Props) {
  const l = t[locale as keyof typeof t] || t.en;
  const supabase = createClient();
  const [docs, setDocs] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const loadDocs = useCallback(async () => {
    const { data } = await supabase.from("warranty_documents").select("*").eq("warranty_id", warrantyId).order("created_at", { ascending: false });
    setDocs(data || []);
  }, [warrantyId]);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  async function handleUpload(file: globalThis.File) {
    if (!ALLOWED.includes(file.type)) { setError("Invalid file type"); return; }
    if (file.size > 250 * 1024 * 1024) { setError("File too large"); return; }
    setUploading(true); setError("");
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = warrantyId + "/" + Date.now() + "." + ext;
      const { error: upErr } = await supabase.storage.from("warranty-documents").upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      await supabase.from("warranty_documents").insert({ warranty_id: warrantyId, file_name: file.name, file_type: file.type, file_size: file.size, file_url: path });
      loadDocs();
    } catch (e: any) { setError(e.message || l.error); }
    finally { setUploading(false); }
  }

  async function handleDelete(doc: any) {
    await supabase.storage.from("warranty-documents").remove([doc.file_url]);
    await supabase.from("warranty_documents").delete().eq("id", doc.id);
    loadDocs();
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="font-bold text-lg mb-4">{l.title}</h3>
      <div onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleUpload(f); }}
        onClick={() => { const inp = document.createElement("input"); inp.type = "file"; inp.accept = ".pdf,.jpg,.jpeg,.png,.doc,.docx"; inp.onchange = (e: any) => { if (e.target.files[0]) handleUpload(e.target.files[0]); }; inp.click(); }}
        className={"border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors " + (dragOver ? "border-[#4169E1] bg-blue-50" : "border-gray-300 hover:border-[#4169E1]")}>
        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-500">{uploading ? l.uploading : l.dropzone}</p>
        <p className="text-xs text-gray-400 mt-1">{l.types}</p>
      </div>
      {error && <p className="text-red-500 text-sm mt-2 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{error}</p>}
      {docs.length > 0 ? (
        <div className="mt-4 space-y-2">
          {docs.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2"><File className="w-4 h-4 text-gray-500" /><span className="text-sm">{doc.file_name}</span><span className="text-xs text-gray-400">{(doc.file_size / 1024).toFixed(0)} KB</span></div>
              <div className="flex gap-2">
                <button onClick={(e) => { e.stopPropagation(); handleDelete(doc); }} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      ) : <p className="text-sm text-gray-400 mt-4 text-center">{l.noFiles}</p>}
    </div>
  );
}
