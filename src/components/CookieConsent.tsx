'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

interface ConsentState {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
}

export default function CookieConsent() {
  const pathname = usePathname();
  const locale = pathname?.startsWith('/ar') ? 'ar' : 'en';
  const isRTL = locale === 'ar';
  const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [consent, setConsent] = useState<ConsentState>({
    necessary: true,
    analytics: false,
    marketing: false,
    timestamp: '',
  });

  useEffect(() => {
    const saved = localStorage.getItem('warrantee_cookie_consent');
    if (!saved) {
      const timer = setTimeout(() => setShowBanner(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const saveConsent = (state: ConsentState) => {
    const finalState = { ...state, timestamp: new Date().toISOString() };
    localStorage.setItem('warrantee_cookie_consent', JSON.stringify(finalState));
    setShowBanner(false);
    if (finalState.analytics && typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('consent', 'update', {
        analytics_storage: 'granted',
        ad_storage: finalState.marketing ? 'granted' : 'denied',
      });
    }
  };

  const acceptAll = () => saveConsent({ necessary: true, analytics: true, marketing: true, timestamp: '' });
  const rejectAll = () => saveConsent({ necessary: true, analytics: false, marketing: false, timestamp: '' });
  const saveCustom = () => saveConsent(consent);

  const t = {
    en: {
      title: 'Cookie Preferences',
      description: 'We use cookies to improve your experience. In compliance with Saudi Arabia\'s Personal Data Protection Law (PDPL), we need your consent for non-essential cookies.',
      acceptAll: 'Accept All',
      rejectAll: 'Reject All',
      customize: 'Customize',
      savePreferences: 'Save Preferences',
      necessary: 'Necessary',
      necessaryDesc: 'Required for the website to function properly.',
      analytics: 'Analytics',
      analyticsDesc: 'Help us understand how visitors interact with our website.',
      marketing: 'Marketing',
      marketingDesc: 'Used to deliver relevant advertisements.',
      pdplNotice: 'Protected under Saudi PDPL',
    },
    ar: {
      title: '\u062A\u0641\u0636\u064A\u0644\u0627\u062A \u0645\u0644\u0641\u0627\u062A \u062A\u0639\u0631\u064A\u0641 \u0627\u0644\u0627\u0631\u062A\u0628\u0627\u0637',
      description: '\u0646\u0633\u062A\u062E\u062F\u0645 \u0645\u0644\u0641\u0627\u062A \u062A\u0639\u0631\u064A\u0641 \u0627\u0644\u0627\u0631\u062A\u0628\u0627\u0637 \u0644\u062A\u062D\u0633\u064A\u0646 \u062A\u062C\u0631\u0628\u062A\u0643. \u0648\u0641\u0642\u064B\u0627 \u0644\u0646\u0638\u0627\u0645 \u062D\u0645\u0627\u064A\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0634\u062E\u0635\u064A\u0629 \u0641\u064A \u0627\u0644\u0645\u0645\u0644\u0643\u0629 \u0627\u0644\u0639\u0631\u0628\u064A\u0629 \u0627\u0644\u0633\u0639\u0648\u062F\u064A\u0629\u060C \u0646\u062D\u062A\u0627\u062C \u0645\u0648\u0627\u0641\u0642\u062A\u0643 \u0639\u0644\u0649 \u0645\u0644\u0641\u0627\u062A \u062A\u0639\u0631\u064A\u0641 \u0627\u0644\u0627\u0631\u062A\u0628\u0627\u0637 \u063A\u064A\u0631 \u0627\u0644\u0636\u0631\u0648\u0631\u064A\u0629.',
      acceptAll: '\u0642\u0628\u0648\u0644 \u0627\u0644\u0643\u0644',
      rejectAll: '\u0631\u0641\u0636 \u0627\u0644\u0643\u0644',
      customize: '\u062A\u062E\u0635\u064A\u0635',
      savePreferences: '\u062D\u0641\u0638 \u0627\u0644\u062A\u0641\u0636\u064A\u0644\u0627\u062A',
      necessary: '\u0636\u0631\u0648\u0631\u064A\u0629',
      necessaryDesc: '\u0645\u0637\u0644\u0648\u0628\u0629 \u0644\u0639\u0645\u0644 \u0627\u0644\u0645\u0648\u0642\u0639 \u0628\u0634\u0643\u0644 \u0635\u062D\u064A\u062D.',
      analytics: '\u062A\u062D\u0644\u064A\u0644\u064A\u0629',
      analyticsDesc: '\u062A\u0633\u0627\u0639\u062F\u0646\u0627 \u0641\u064A \u0641\u0647\u0645 \u0643\u064A\u0641\u064A\u0629 \u062A\u0641\u0627\u0639\u0644 \u0627\u0644\u0632\u0648\u0627\u0631 \u0645\u0639 \u0645\u0648\u0642\u0639\u0646\u0627.',
      marketing: '\u062A\u0633\u0648\u064A\u0642\u064A\u0629',
      marketingDesc: '\u062A\u0633\u062A\u062E\u062F\u0645 \u0644\u062A\u0642\u062F\u064A\u0645 \u0625\u0639\u0644\u0627\u0646\u0627\u062A \u0630\u0627\u062A \u0635\u0644\u0629.',
      pdplNotice: '\u0645\u062D\u0645\u064A \u0628\u0645\u0648\u062C\u0628 \u0646\u0638\u0627\u0645 \u062D\u0645\u0627\u064A\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0634\u062E\u0635\u064A\u0629',
    },
  };

  const text = t[locale as keyof typeof t] || t.en;

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4" role="dialog" aria-label="Cookie consent" aria-live="polite" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <h3 className="font-semibold text-gray-900">{text.title}</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">{text.description}</p>

          {showDetails && (
            <div className="space-y-3 mb-4 p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm text-gray-900">{text.necessary}</p>
                  <p className="text-xs text-gray-500">{text.necessaryDesc}</p>
                </div>
                <div className="w-10 h-6 bg-emerald-500 rounded-full relative">
                  <div className="absolute top-1 right-1 w-4 h-4 bg-white rounded-full" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm text-gray-900">{text.analytics}</p>
                  <p className="text-xs text-gray-500">{text.analyticsDesc}</p>
                </div>
                <button onClick={() => setConsent(p => ({ ...p, analytics: !p.analytics }))}
                  className={`w-10 h-6 rounded-full relative transition-colors ${consent.analytics ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${consent.analytics ? (isRTL ? 'left-1' : 'right-1') : (isRTL ? 'right-1' : 'left-1')}`} />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm text-gray-900">{text.marketing}</p>
                  <p className="text-xs text-gray-500">{text.marketingDesc}</p>
                </div>
                <button onClick={() => setConsent(p => ({ ...p, marketing: !p.marketing }))}
                  className={`w-10 h-6 rounded-full relative transition-colors ${consent.marketing ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${consent.marketing ? (isRTL ? 'left-1' : 'right-1') : (isRTL ? 'right-1' : 'left-1')}`} />
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button onClick={acceptAll}
              className="flex-1 px-4 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors">
              {text.acceptAll}
            </button>
            <button onClick={rejectAll}
              className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors">
              {text.rejectAll}
            </button>
            {!showDetails ? (
              <button onClick={() => setShowDetails(true)}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
                {text.customize}
              </button>
            ) : (
              <button onClick={saveCustom}
                className="flex-1 px-4 py-2.5 border border-emerald-300 text-emerald-700 text-sm font-medium rounded-lg hover:bg-emerald-50 transition-colors">
                {text.savePreferences}
              </button>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-3 text-center flex items-center justify-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            {text.pdplNotice}
          </p>
        </div>
      </div>
    </div>
  );
}
