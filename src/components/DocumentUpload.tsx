'use client';

import { useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  url: string;
  type: string;
}

interface DocumentUploadProps {
  warrantyId: string;
  onUploadComplete?: (files: UploadedFile[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
}

export default function DocumentUpload({ warrantyId, onUploadComplete, maxFiles = 5, maxSizeMB = 10 }: DocumentUploadProps) {
  const pathname = usePathname();
  const locale = pathname?.startsWith('/ar') ? 'ar' : 'en';
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);

  const t = {
    en: {
      dropzone: 'Drop files here or click to browse',
      formats: 'PDF, JPG, PNG up to ' + maxSizeMB + 'MB each',
      uploading: 'Uploading...',
      uploaded: 'Uploaded files',
      remove: 'Remove',
      maxFiles: `Maximum ${maxFiles} files allowed`,
      tooLarge: `File exceeds ${maxSizeMB}MB limit`,
      invalidType: 'Only PDF, JPG, and PNG files are accepted',
    },
    ar: {
      dropzone: '\u0627\u0633\u062D\u0628 \u0627\u0644\u0645\u0644\u0641\u0627\u062A \u0647\u0646\u0627 \u0623\u0648 \u0627\u0646\u0642\u0631 \u0644\u0644\u062A\u0635\u0641\u062D',
      formats: `PDF, JPG, PNG \u062D\u062A\u0649 ${maxSizeMB} \u0645\u064A\u062C\u0627\u0628\u0627\u064A\u062A \u0644\u0643\u0644 \u0645\u0644\u0641`,
      uploading: '\u062C\u0627\u0631\u064A \u0627\u0644\u0631\u0641\u0639...',
      uploaded: '\u0627\u0644\u0645\u0644\u0641\u0627\u062A \u0627\u0644\u0645\u0631\u0641\u0648\u0639\u0629',
      remove: '\u0625\u0632\u0627\u0644\u0629',
      maxFiles: `\u0627\u0644\u062D\u062F \u0627\u0644\u0623\u0642\u0635\u0649 ${maxFiles} \u0645\u0644\u0641\u0627\u062A`,
      tooLarge: `\u0627\u0644\u0645\u0644\u0641 \u064A\u062A\u062C\u0627\u0648\u0632 ${maxSizeMB} \u0645\u064A\u062C\u0627\u0628\u0627\u064A\u062A`,
      invalidType: '\u064A\u062A\u0645 \u0642\u0628\u0648\u0644 \u0645\u0644\u0641\u0627\u062A PDF \u0648 JPG \u0648 PNG \u0641\u0642\u0637',
    },
  };

  const text = t[locale as keyof typeof t] || t.en;
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];

  const handleUpload = useCallback(async (fileList: FileList) => {
    setError('');
    const newFiles = Array.from(fileList);

    if (files.length + newFiles.length > maxFiles) {
      setError(text.maxFiles);
      return;
    }

    for (const file of newFiles) {
      if (!allowedTypes.includes(file.type)) {
        setError(text.invalidType);
        return;
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(text.tooLarge);
        return;
      }
    }

    setUploading(true);
    const uploaded: UploadedFile[] = [];

    for (let i = 0; i < newFiles.length; i++) {
      const file = newFiles[i];
      const ext = file.name.split('.').pop();
      const path = `${warrantyId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { data, error: uploadError } = await supabase.storage
        .from('warranty-documents')
        .upload(path, file, { cacheControl: '3600', upsert: false });

      if (uploadError) {
        setError(uploadError.message);
        break;
      }

      const { data: urlData } = supabase.storage
        .from('warranty-documents')
        .getPublicUrl(data.path);

      uploaded.push({
        id: data.path,
        name: file.name,
        size: file.size,
        url: urlData.publicUrl,
        type: file.type,
      });

      setProgress(Math.round(((i + 1) / newFiles.length) * 100));
    }

    const allFiles = [...files, ...uploaded];
    setFiles(allFiles);
    onUploadComplete?.(allFiles);
    setUploading(false);
    setProgress(0);
  }, [files, warrantyId, maxFiles, maxSizeMB, text, onUploadComplete]);

  const removeFile = async (fileId: string) => {
    await supabase.storage.from('warranty-documents').remove([fileId]);
    const updated = files.filter(f => f.id !== fileId);
    setFiles(updated);
    onUploadComplete?.(updated);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-4" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files); }}
        onClick={() => document.getElementById('file-upload-input')?.click()}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          dragOver ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300 hover:border-emerald-400 hover:bg-gray-50'
        }`}
      >
        <input
          id="file-upload-input"
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png"
          className="hidden"
          onChange={(e) => e.target.files && handleUpload(e.target.files)}
        />
        <svg className="mx-auto w-10 h-10 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <p className="text-sm font-medium text-gray-700">{uploading ? text.uploading : text.dropzone}</p>
        <p className="text-xs text-gray-500 mt-1">{text.formats}</p>
        {uploading && (
          <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
            <div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: progress + '%' }} />
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">{text.uploaded}</p>
          {files.map((file) => (
            <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex-shrink-0 w-8 h-8 rounded bg-emerald-100 flex items-center justify-center">
                  {file.type === 'application/pdf' ? (
                    <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                  <p className="text-xs text-gray-500">{formatSize(file.size)}</p>
                </div>
              </div>
              <button onClick={() => removeFile(file.id)} className="text-xs text-red-500 hover:text-red-700 font-medium flex-shrink-0">
                {text.remove}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}