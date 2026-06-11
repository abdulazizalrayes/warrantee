'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Copy, Check, Code2, Key, Globe, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Footer } from '@/components/Footer';
import { Navbar } from '@/components/Navbar';
import { DIRECTION, getContentLocale, getDictionary, normalizeLocale } from '@/lib/i18n';

const translations = {
  en: {
    title: 'API Documentation',
    subtitle: 'Integrate Warrantee with ERP, ecommerce, and internal systems',
    back: 'Back to Home',
    auth: 'Authentication',
    authDesc: 'API access is limited to registered Warrantee users. For ERP, ecommerce, or server-to-server integrations, do not store a Warrantee username or password in the external system. Sign in once to Warrantee, create a dedicated integration token, then send that token as x-api-key.',
    passwordPolicyTitle: 'No shared usernames or passwords',
    passwordPolicyDesc: 'The person setting up the integration signs into Warrantee only to create, view, revoke, or rotate integration tokens. The connected system should store only the generated server integration token, which can be scoped, rate-limited, expired, and revoked.',
    bearerTokenLabel: 'Signed-in app sessions',
    integrationTokenLabel: 'Recommended for server integrations',
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
    rateLimitDesc: '100 requests per minute per signed-in user or integration token, plus IP-level abuse throttles.',
    integrationNotes: 'Integration Notes',
    integrationDesc: 'Use Idempotency-Key on create requests, keep a stable reference number when possible, and use scoped server-to-server integration tokens for ERP sync jobs. Never ask a client to send their Warrantee password to an integration partner.',
    security: 'Security Model',
    securityDesc: 'Every warranty request is authenticated, scoped to the owner, seller, or issuer records of the resolved user, rate-limited, and returned with no-store cache headers.',
    tokenManagement: 'Integration Tokens',
    tokenManagementDesc: 'Create up to 20 active tokens from a signed-in session. Warrantee shows the secret once, stores only a hash, supports read/write scopes, expiry, last-used tracking, and revocation.',
    createToken: 'Create token',
    revokeToken: 'Revoke token',
    scopes: 'Scopes',
    scopesDesc: 'warranties:read for list/detail access and warranties:write for create/update/delete access.',
    responseHeaders: 'Responses include X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, Cache-Control: no-store, and Vary: Authorization, x-api-key.',
  },
  ar: {
    title: '\u0648\u062b\u0627\u0626\u0642 API',
    subtitle: '\u062f\u0645\u062c Warrantee \u0645\u0639 \u0623\u0646\u0638\u0645\u0629 ERP \u0648\u0627\u0644\u0645\u062A\u0627\u062C\u0631 \u0648\u0627\u0644\u0623\u0646\u0638\u0645\u0629 \u0627\u0644\u062F\u0627\u062E\u0644\u064A\u0629',
    back: '\u0627\u0644\u0639\u0648\u062f\u0629 \u0625\u0644\u0649 \u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629',
    auth: '\u0627\u0644\u0645\u0635\u0627\u062f\u0642\u0629',
    authDesc: '\u0627\u0644\u0648\u0635\u0648\u0644 \u0644\u0644\u0648\u0627\u062C\u0647\u0629 \u0645\u062D\u0635\u0648\u0631 \u0628\u0645\u0633\u062A\u062E\u062F\u0645\u064A Warrantee \u0627\u0644\u0645\u0633\u062C\u0644\u064A\u0646. \u0644\u062A\u0643\u0627\u0645\u0644\u0627\u062A ERP \u0623\u0648 \u0627\u0644\u0645\u062A\u0627\u062C\u0631 \u0623\u0648 \u0627\u0644\u062E\u0648\u0627\u062F\u0645\u060C \u0644\u0627 \u062A\u062D\u0641\u0638 \u0627\u0633\u0645 \u0645\u0633\u062A\u062E\u062F\u0645 Warrantee \u0623\u0648 \u0643\u0644\u0645\u0629 \u0645\u0631\u0648\u0631\u0647 \u0641\u064A \u0627\u0644\u0646\u0638\u0627\u0645 \u0627\u0644\u062E\u0627\u0631\u062C\u064A. \u0633\u062C\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0645\u0631\u0629 \u0648\u0627\u062D\u062F\u0629 \u0641\u064A Warrantee\u060C \u0623\u0646\u0634\u0626 \u0631\u0645\u0632 \u062A\u0643\u0627\u0645\u0644 \u0645\u062E\u0635\u0635\u060C \u062B\u0645 \u0623\u0631\u0633\u0644 \u0647\u0630\u0627 \u0627\u0644\u0631\u0645\u0632 \u0643\u0640 x-api-key.',
    passwordPolicyTitle: '\u0644\u0627 \u0645\u0634\u0627\u0631\u0643\u0629 \u0644\u0623\u0633\u0645\u0627\u0621 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645\u064A\u0646 \u0623\u0648 \u0643\u0644\u0645\u0627\u062A \u0627\u0644\u0645\u0631\u0648\u0631',
    passwordPolicyDesc: '\u064A\u0633\u062C\u0644 \u0645\u0633\u0624\u0648\u0644 \u0627\u0644\u062A\u0643\u0627\u0645\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0625\u0644\u0649 Warrantee \u0641\u0642\u0637 \u0644\u0625\u0646\u0634\u0627\u0621 \u0631\u0645\u0648\u0632 \u0627\u0644\u062A\u0643\u0627\u0645\u0644 \u0623\u0648 \u0639\u0631\u0636\u0647\u0627 \u0623\u0648 \u0625\u0644\u063A\u0627\u0626\u0647\u0627 \u0623\u0648 \u062A\u062F\u0648\u064A\u0631\u0647\u0627. \u064A\u062C\u0628 \u0623\u0646 \u064A\u062D\u0641\u0638 \u0627\u0644\u0646\u0638\u0627\u0645 \u0627\u0644\u0645\u062A\u0635\u0644 \u0631\u0645\u0632 \u0627\u0644\u062A\u0643\u0627\u0645\u0644 \u0641\u0642\u0637\u060C \u0648\u064A\u0645\u0643\u0646 \u062A\u062D\u062F\u064A\u062F \u0635\u0644\u0627\u062D\u064A\u0627\u062A\u0647 \u0648\u062D\u062F\u0648\u062F \u0637\u0644\u0628\u0627\u062A\u0647 \u0648\u062A\u0627\u0631\u064A\u062E \u0627\u0646\u062A\u0647\u0627\u0626\u0647 \u0648\u0625\u0644\u063A\u0627\u0626\u0647.',
    bearerTokenLabel: '\u062C\u0644\u0633\u0627\u062A \u0627\u0644\u062A\u0637\u0628\u064A\u0642 \u0627\u0644\u0645\u0633\u062C\u0644\u0629',
    integrationTokenLabel: '\u0627\u0644\u0645\u0648\u0635\u0649 \u0628\u0647 \u0644\u062A\u0643\u0627\u0645\u0644\u0627\u062A \u0627\u0644\u062E\u0648\u0627\u062F\u0645',
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
    rateLimitDesc: '100 \u0637\u0644\u0628 \u0641\u064A \u0627\u0644\u062F\u0642\u064A\u0642\u0629 \u0644\u0643\u0644 \u0645\u0633\u062A\u062E\u062F\u0645 \u0645\u0633\u062C\u0644 \u0623\u0648 \u0631\u0645\u0632 \u062A\u0643\u0627\u0645\u0644\u060C \u0645\u0639 \u062D\u062F\u0648\u062F \u0625\u0636\u0627\u0641\u064A\u0629 \u0639\u0644\u0649 IP \u0644\u0645\u0646\u0639 \u0627\u0644\u0625\u0633\u0627\u0621\u0629.',
    integrationNotes: '\u0645\u0644\u0627\u062d\u0638\u0627\u062a \u0627\u0644\u062a\u0643\u0627\u0645\u0644',
    integrationDesc: '\u0627\u0633\u062A\u062E\u062F\u0645 Idempotency-Key \u0645\u0639 \u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0625\u0646\u0634\u0627\u0621\u060c \u0648\u062D\u0627\u0641\u0638 \u0639\u0644\u0649 \u0631\u0642\u0645 \u0645\u0631\u062C\u0639\u064A \u062B\u0627\u0628\u062A \u0645\u062A\u0649 \u0623\u0645\u0643\u0646\u060c \u0648\u0627\u0633\u062A\u062E\u062F\u0645 \u0631\u0645\u0648\u0632 \u062A\u0643\u0627\u0645\u0644 \u0645\u062D\u062F\u062F\u0629 \u0627\u0644\u0635\u0644\u0627\u062D\u064A\u0627\u062A \u0644\u0645\u0632\u0627\u0645\u0646\u0629 ERP. \u0644\u0627 \u062A\u0637\u0644\u0628 \u0645\u0646 \u0627\u0644\u0639\u0645\u064A\u0644 \u0625\u0631\u0633\u0627\u0644 \u0643\u0644\u0645\u0629 \u0645\u0631\u0648\u0631 Warrantee \u0625\u0644\u0649 \u0634\u0631\u064A\u0643 \u062A\u0643\u0627\u0645\u0644.',
    security: '\u0646\u0645\u0648\u0630\u062C \u0627\u0644\u0623\u0645\u0627\u0646',
    securityDesc: '\u0643\u0644 \u0637\u0644\u0628 \u0636\u0645\u0627\u0646 \u064A\u062A\u0637\u0644\u0628 \u0645\u0635\u0627\u062F\u0642\u0629\u060C \u0648\u064A\u0642\u062A\u0635\u0631 \u0639\u0644\u0649 \u0633\u062C\u0644\u0627\u062A \u0627\u0644\u0645\u0627\u0644\u0643 \u0623\u0648 \u0627\u0644\u0628\u0627\u0626\u0639 \u0623\u0648 \u0627\u0644\u0645\u0635\u062F\u0631 \u0644\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0627\u0644\u0645\u062D\u062F\u062F\u060C \u0645\u0639 \u062D\u062F\u0648\u062F \u0637\u0644\u0628\u0627\u062A \u0648\u0631\u0624\u0648\u0633 no-store.',
    tokenManagement: '\u0631\u0645\u0648\u0632 \u0627\u0644\u062A\u0643\u0627\u0645\u0644',
    tokenManagementDesc: '\u0623\u0646\u0634\u0626 \u062D\u062A\u0649 20 \u0631\u0645\u0632\u0627\u064B \u0646\u0634\u0637\u0627\u064B \u0645\u0646 \u062C\u0644\u0633\u0629 \u0645\u0633\u062C\u0644\u0629. \u064A\u0638\u0647\u0631 \u0627\u0644\u0633\u0631 \u0645\u0631\u0629 \u0648\u0627\u062D\u062F\u0629\u060C \u0648\u064A\u062A\u0645 \u062D\u0641\u0638 \u0627\u0644\u0647\u0627\u0634 \u0641\u0642\u0637\u060C \u0645\u0639 \u0635\u0644\u0627\u062D\u064A\u0627\u062A \u0642\u0631\u0627\u0621\u0629/\u0643\u062A\u0627\u0628\u0629 \u0648\u062A\u0627\u0631\u064A\u062E \u0627\u0646\u062A\u0647\u0627\u0621 \u0648\u0625\u0644\u063A\u0627\u0621.',
    createToken: '\u0625\u0646\u0634\u0627\u0621 \u0631\u0645\u0632',
    revokeToken: '\u0625\u0644\u063A\u0627\u0621 \u0631\u0645\u0632',
    scopes: '\u0627\u0644\u0635\u0644\u0627\u062D\u064A\u0627\u062A',
    scopesDesc: 'warranties:read \u0644\u0644\u0642\u0631\u0627\u0621\u0629 \u0648 warranties:write \u0644\u0644\u0625\u0646\u0634\u0627\u0621 \u0648\u0627\u0644\u062A\u062D\u062F\u064A\u062B \u0648\u0627\u0644\u062D\u0630\u0641.',
    responseHeaders: '\u062A\u062A\u0636\u0645\u0646 \u0627\u0644\u0627\u0633\u062A\u062C\u0627\u0628\u0627\u062A X-RateLimit-Limit \u0648 X-RateLimit-Remaining \u0648 X-RateLimit-Reset \u0648 Cache-Control: no-store \u0648 Vary: Authorization, x-api-key.',
  }
};

const endpoints = [
  { method: 'GET', path: '/api/v1/warranties', desc: 'listWarranties', params: 'page, limit, status, category' },
  { method: 'POST', path: '/api/v1/warranties', desc: 'createWarranty', params: 'product_name*, start_date*, end_date*, description, serial_number, category, supplier, seller_name, seller_email' },
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
  const params = useParams() ?? {};
  const locale = normalizeLocale(String(params?.locale || 'en'));
  const contentLocale = getContentLocale(locale);
  const isRTL = locale === 'ar';
  const dictionary = getDictionary(locale);
  const direction = DIRECTION[locale];
  const t = translations[contentLocale] || translations.en;
  const [copied, setCopied] = useState('');

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(''), 2000);
  };

  return (
    <div className="min-h-screen bg-[#fbfbfd] text-[#1d1d1f]" dir={direction}>
      <Navbar locale={locale} dictionary={dictionary} />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <Link href={`/${locale}`} className="text-[#0071e3] hover:underline flex items-center gap-2 mb-2 text-sm">
            <ArrowLeft className="w-4 h-4" /> {t.back}
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{t.title}</h1>
          <p className="text-gray-500 mt-1">{t.subtitle}</p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link
              href={`/${locale}/auth?redirect=${encodeURIComponent(`/${locale}/settings`)}`}
              className="inline-flex items-center justify-center rounded-full bg-[#0071e3] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0077ed]"
            >
              {isRTL ? 'إنشاء رمز تكامل' : 'Create integration token'}
            </Link>
            <Link
              href={`/${locale}/seller/register`}
              className="inline-flex items-center justify-center rounded-full border border-[#d2d2d7] px-5 py-2.5 text-sm font-semibold text-[#1d1d1f] transition hover:bg-[#f5f5f7]"
            >
              {isRTL ? 'انضم كبائع' : 'Onboard as seller'}
            </Link>
          </div>
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
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 mb-4">
            <p className="text-sm font-semibold text-[#1d1d1f]">{t.passwordPolicyTitle}</p>
            <p className="mt-1 text-sm text-gray-600">{t.passwordPolicyDesc}</p>
          </div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{t.integrationTokenLabel}</p>
          <div className="bg-gray-900 rounded-lg p-3">
            <code className="text-sm text-gray-300" dir="ltr">
              x-api-key: YOUR_SERVER_INTEGRATION_TOKEN
            </code>
          </div>
          <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-gray-500">{t.bearerTokenLabel}</p>
          <div className="bg-gray-900 rounded-lg p-3 mt-3">
            <code className="text-sm text-gray-300" dir="ltr">
              Authorization: Bearer YOUR_SUPABASE_ACCESS_TOKEN
            </code>
          </div>
        </div>

        {/* Rate Limiting */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-yellow-800 font-medium">{t.rateLimit}: {t.rateLimitDesc}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-5 h-5 text-[#4169E1]" />
            <h3 className="font-semibold text-gray-900">{t.security}</h3>
          </div>
          <p className="text-gray-600 text-sm mb-3">{t.securityDesc}</p>
          <p className="text-gray-600 text-sm">{t.responseHeaders}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-2">{t.tokenManagement}</h3>
          <p className="text-gray-600 text-sm mb-4">{t.tokenManagementDesc}</p>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">{t.createToken}</p>
              <code className="text-sm text-gray-800" dir="ltr">POST /api/integration-tokens</code>
            </div>
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">{t.revokeToken}</p>
              <code className="text-sm text-gray-800" dir="ltr">DELETE /api/integration-tokens/:id</code>
            </div>
          </div>
          <div className="mt-4 rounded-lg bg-gray-900 p-3">
            <code className="text-sm text-gray-300" dir="ltr">
              {`{ "name": "ERP production", "scopes": ["warranties:read", "warranties:write"], "rate_limit_per_minute": 100 }`}
            </code>
          </div>
          <p className="mt-3 text-sm text-gray-600"><span className="font-medium">{t.scopes}:</span> {t.scopesDesc}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-2">{t.integrationNotes}</h3>
          <p className="text-gray-600 text-sm mb-3">{t.integrationDesc}</p>
          <div className="bg-gray-900 rounded-lg p-3">
            <code className="text-sm text-gray-300" dir="ltr">
              Idempotency-Key: 8f5d07d0-erp-order-102044
            </code>
          </div>
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
              <button onClick={() => copyText(`curl -X GET "https://warrantee.io/api/v1/warranties?page=1&limit=10" -H "x-api-key: YOUR_SERVER_INTEGRATION_TOKEN"`, 'example')}
                className="absolute top-3 right-3">
                {copied === 'example' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400 hover:text-white" />}
              </button>
              <pre className="text-sm text-gray-300 overflow-x-auto" dir="ltr">{`curl -X GET "https://warrantee.io/api/v1/warranties?page=1&limit=10" \\
  -H "x-api-key: YOUR_SERVER_INTEGRATION_TOKEN"`}</pre>
            </div>
          </div>
        </div>
      </main>
      <Footer locale={locale} dictionary={dictionary} />
    </div>
  );
}
