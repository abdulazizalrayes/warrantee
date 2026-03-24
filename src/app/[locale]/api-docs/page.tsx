'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Copy, Check, Code2, Key, Globe } from 'lucide-react';
import { useState } from 'react';

const translations = {
  en: {
    title: 'API Documentation',
    subtitle: 'Integrate Warrantee with your systems',
    back: 'Back to Dashboard',
    auth: 'Authentication',
    authDesc: 'All API requests require a Bearer token. Use your Supabase access token.',
    baseUrl: 'Base URL',
    endpoints: 'Endpoints',
    listWarranties: 'List Warranties',
    createWarranty: 'Create Warranty',
    getWarranty: 'Get Warranty',
    updateWarranty: 'Update Warranty',
    deleteWarranty: 'Delete Warranty',
    parameters: 'Parameters',
    response: 'Response',
    required: 'Required',
    optional: 'Optional',
    copied: 'Copied!',
    rateLimit: 'Rate Limiting',
    rateLimitDesc: '100 requests per minute per API key',
  },
  ar: {
    title: '\u0648\u062b\u0627\u0626\u0642 API',
    subtitle: '\u062f\u0645\u062c Warrantee \u0645\u0639 \u0623\u0646\u0638\u0645\u062a\u0643',
    back: '\u0627\u0644\u0639\u0648\u062f\u0629 \u0625\u0644\u0649 \u0644\u0648\u062d\u0629 \u0627\u0644\u062a\u062d\u0643\u0645',
    auth: '\u0627\u0644\u0645\u0635\u0627\u062f\u0642\u0629',
    authDesc: '\u062c\u0645\u064a\u0639 \u0637\u0644\u0628\u0627\u062a API \u062a\u062a\u0637\u0644\u0628 \u0631\u0645\u0632 Bearer.',
    baseUrl: '\u0627\u0644\u0631\u0627\u0628\u0637 \u0627\u0644\u0623\u0633\u0627\u0633\u064a',
    endpoints: '\u0646\u0642\u0627\u0637 \u0627\u0644\u0648\u0635\u0648\u0644',
    listWarranties: '\u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0636\u0645\u0627\u0646\u0627\u062a',
    createWarranty: '\u0625\u0646\u0634\u0627\u0621 \u0636\u0645\u0627\u0646',
    getWarranty: '\u0639\u0631\u0636 \u0636\u0645\u0627\u0646',
    updateWarranty: '\u062a\u062d\u062f\u064a\u062b \u0636\u0645\u0627\u0646',
    deleteWarranty: '\u062d\u0630\u0641 \u0636\u0645\u0627\u0646',
    parameters: '\u0627\u0644\u0645\u0639\u0644\u0645\u0627\u062a',
    response: '\u0627\u0644\u0627\u0633\u062a\u062c\u0627\u0628\u0629',
    required: '\u0645\u0637\u0644\u0648\u0628',
    optional: '\u0627\u062e\u062a\u064a\u0627\u0631\u064a',
    copied: '\u062a\u0645 \u0627\u0644\u0646\u0633\u062e!',
    rateLimit: '\u062d\u062f\u0648\u062f \u0627\u0644\u0637\u0644\u0628\u0627\u062a',
    rateLimitDesc: '100 \u0637\u0644\u0628 \u0641\u064a \u0627\u0644\u062f\u0642\u064a\u0642\u0629',
  }
};

const endpoints = [
  { method: 'GET', path: '/api/v1/warranties', desc: 'listWarranties', params: 'page, limit, status, category' },
  { method: 'POST', path: '/api/v1/warranties', desc: 'createWarranty', params: 'product_name*, start_date*, end_date*, description, serial_number, category, supplier' },
  { method: 'GET', path: '/api/v1/warranties/:id', desc: 'getWarranty', params: 'id (path)' },
  { method: 'PUT', path: '/api/v1/warranties/:id', desc: 'updateWarranty', params: 'product_name, start_date, end_date, status, category, supplier' },
  { method: 'DELETE', path: '/api/v1/warranties/:id', desc: 'deleteWarranty', params: 'id (path)' },
];

const methodColors: Record<string, string> = {
  GET: 'bg-green-100 text-green-700',
  POST: 'bg-blue-100 text-blue-700',
  PUT: 'bg-yellow-100 text-yellow-700',
  DELETE: 'bg-red-100 text-red-700',
};

export default function ApiDocsPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const isRTL = locale === 'ar';
  const t = translations[locale as keyof typeof translations] || translations.en;
  const [copied, setCopied] = useState('');

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(''), 2000);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA]" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link href={`/${locale}/dashboard`} className="text-[#4169E1] hover:underline flex items-center gap-2 mb-2 text-sm">
            <ArrowLeft className="w-4 h-4" /> {t.back}
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{t.title}</h1>
          <p className="text-gray-500 mt-1">{t.subtitle}</p>
        </div>

        {/* Base URL */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Globe className="w-5 h-5 text-[#4169E1]" />
            <h3 className="font-semibold text-gray-900">{t.baseUrl}</h3>
          </div>
          <div className="flex items-center gap-2 bg-gray-900 rounded-lg p-3">
            <code className="text-green-400 flex-1 text-sm" dir="ltr">https://warrantee.io/api/v1</code>
            <button onClick={() => copyText('https://warrantee.io/api/v1', 'baseUrl')}>
              {copied === 'baseUrl' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400 hover:text-white" />}
            </button>
          </div>
        </div>

        {/* Authentication */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Key className="w-5 h-5 text-[#4169E1]" />
            <h3 className="font-semibold text-gray-900">{t.auth}</h3>
          </div>
          <p className="text-gray-600 text-sm mb-4">{t.authDesc}</p>
          <div className="bg-gray-900 rounded-lg p-3">
            <code className="text-sm text-gray-300" dir="ltr">
              Authorization: Bearer YOUR_SUPABASE_ACCESS_TOKEN
            </code>
          </div>
        </div>

        {/* Rate Limiting */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-yellow-800 font-medium">{t.rateLimit}: {t.rateLimitDesc}</p>
        </div>

        {/* Endpoints */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Code2 className="w-5 h-5 text-[#4169E1]" />
            <h3 className="font-semibold text-gray-900">{t.endpoints}</h3>
          </div>
          <div className="space-y-4">
            {endpoints.map((ep, i) => (
              <div key={i} className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="flex items-center gap-3 p-4 bg-gray-50">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${methodColors[ep.method]}`}>{ep.method}</span>
                  <code className="text-sm font-mono text-gray-800" dir="ltr">{ep.path}</code>
                  <span className="text-sm text-gray-500 ml-auto">{t[ep.desc as keyof typeof t]}</span>
                </div>
                <div className="p-4 text-sm text-gray-600">
                  <span className="font-medium">{t.parameters}:</span> <code dir="ltr">{ep.params}</code>
                </div>
              </div>
            ))}
          </div>

          {/* Example */}
          <div className="mt-8">
            <h4 className="font-medium text-gray-900 mb-3">Example Request</h4>
            <div className="bg-gray-900 rounded-lg p-4 relative">
              <button onClick={() => copyText(`curl -X GET "https://warrantee.io/api/v1/warranties?page=1&limit=10" -H "Authorization: Bearer YOUR_TOKEN"`, 'example')}
                className="absolute top-3 right-3">
                {copied === 'example' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400 hover:text-white" />}
              </button>
              <pre className="text-sm text-gray-300 overflow-x-auto" dir="ltr">{`curl -X GET "https://warrantee.io/api/v1/warranties?page=1&limit=10" \\
  -H "Authorization: Bearer YOUR_TOKEN"`}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
