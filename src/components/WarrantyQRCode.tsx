'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import QRCode from 'qrcode';

interface QRCodeProps {
  warrantyId: string;
  size?: number;
  showDownload?: boolean;
}

export default function WarrantyQRCode({ warrantyId, size = 200, showDownload = true }: QRCodeProps) {
  const pathname = usePathname();
  const locale = pathname?.startsWith('/ar') ? 'ar' : 'en';
  const [dataUrl, setDataUrl] = useState('');

  const t = {
    en: { download: 'Download QR Code', scanTo: 'Scan to verify warranty', warrantyId: 'Warranty ID' },
    ar: { download: '\u062A\u062D\u0645\u064A\u0644 \u0631\u0645\u0632 QR', scanTo: '\u0627\u0645\u0633\u062D \u0644\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u0644\u0636\u0645\u0627\u0646', warrantyId: '\u0631\u0642\u0645 \u0627\u0644\u0636\u0645\u0627\u0646' },
  };
  const text = t[locale as keyof typeof t] || t.en;

  useEffect(() => {
    const verifyUrl = `${window.location.origin}/${locale}/verify/${warrantyId}`;

    let cancelled = false;
    QRCode.toDataURL(verifyUrl, {
      width: size,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#1d1d1f',
        light: '#ffffff',
      },
    })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setDataUrl('');
      });

    return () => {
      cancelled = true;
    };
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
        {dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={dataUrl}
            alt={text.scanTo}
            className="block"
            style={{ width: size, height: size }}
          />
        ) : (
          <div
            className="animate-pulse rounded-lg bg-[#f5f5f7]"
            style={{ width: size, height: size }}
            aria-label={text.scanTo}
          />
        )}
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
