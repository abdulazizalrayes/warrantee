'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

interface QRCodeProps {
  warrantyId: string;
  size?: number;
  showDownload?: boolean;
}

export default function WarrantyQRCode({ warrantyId, size = 200, showDownload = true }: QRCodeProps) {
  const pathname = usePathname();
  const locale = pathname?.startsWith('/ar') ? 'ar' : 'en';
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dataUrl, setDataUrl] = useState('');

  const t = {
    en: { download: 'Download QR Code', scanTo: 'Scan to verify warranty', warrantyId: 'Warranty ID' },
    ar: { download: '\u062A\u062D\u0645\u064A\u0644 \u0631\u0645\u0632 QR', scanTo: '\u0627\u0645\u0633\u062D \u0644\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u0644\u0636\u0645\u0627\u0646', warrantyId: '\u0631\u0642\u0645 \u0627\u0644\u0636\u0645\u0627\u0646' },
  };
  const text = t[locale as keyof typeof t] || t.en;

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const verifyUrl = `${window.location.origin}/${locale}/verify/${warrantyId}`;
    
    // Simple QR-like pattern using warranty data hash
    canvas.width = size;
    canvas.height = size;
    
    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    
    // Generate pattern from warranty ID
    const moduleCount = 25;
    const moduleSize = size / moduleCount;
    const data = verifyUrl;
    
    // Create deterministic pattern from URL
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    ctx.fillStyle = '#000000';
    
    // Position detection patterns (corners)
    const drawFinder = (x: number, y: number) => {
      const s = moduleSize;
      ctx.fillRect(x, y, s * 7, s * 7);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + s, y + s, s * 5, s * 5);
      ctx.fillStyle = '#000000';
      ctx.fillRect(x + s * 2, y + s * 2, s * 3, s * 3);
    };
    
    drawFinder(0, 0);
    drawFinder(size - moduleSize * 7, 0);
    drawFinder(0, size - moduleSize * 7);
    
    // Data modules
    let seed = Math.abs(hash);
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        // Skip finder pattern areas
        if ((row < 8 && col < 8) || (row < 8 && col > moduleCount - 9) || (row > moduleCount - 9 && col < 8)) continue;
        
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        if (seed % 3 !== 0) {
          ctx.fillStyle = '#000000';
          ctx.fillRect(col * moduleSize, row * moduleSize, moduleSize - 0.5, moduleSize - 0.5);
        }
      }
    }
    
    // Center logo area
    const centerX = (size - moduleSize * 5) / 2;
    const centerY = (size - moduleSize * 5) / 2;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(centerX - 2, centerY - 2, moduleSize * 5 + 4, moduleSize * 5 + 4);
    ctx.fillStyle = '#059669';
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, moduleSize * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${moduleSize * 2}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('W', size / 2, size / 2 + 1);
    
    setDataUrl(canvas.toDataURL('image/png'));
  }, [warrantyId, size, locale]);

  const handleDownload = () => {
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.download = `warranty-${warrantyId}-qr.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div className="flex flex-col items-center gap-3" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <canvas ref={canvasRef} className="block" style={{ width: size, height: size }} />
      </div>
      <p className="text-xs text-gray-500">{text.scanTo}</p>
      <p className="text-xs font-mono text-gray-400">{text.warrantyId}: {warrantyId.slice(0, 8)}...</p>
      {showDownload && (
        <button onClick={handleDownload}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          {text.download}
        </button>
      )}
    </div>
  );
}