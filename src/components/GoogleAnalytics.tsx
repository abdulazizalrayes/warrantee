"use client";

import Script from "next/script";
import { defaultCookieConsent } from "@/lib/cookie-consent";

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;

export default function GoogleAnalytics() {
  if (!GA_ID) return null;

  if (GTM_ID) return null;

  return (
    <>
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = window.gtag || gtag;
          function readConsent(){
            var consent = { analytics: ${defaultCookieConsent.analytics}, marketing: ${defaultCookieConsent.marketing} };
            try {
              var saved = window.localStorage.getItem('warrantee_cookie_consent');
              if (saved) {
                var parsed = JSON.parse(saved);
                consent.analytics = !!parsed.analytics;
                consent.marketing = !!parsed.marketing;
              }
            } catch (e) {}
            return consent;
          }
          function loadAnalytics(){
            var consent = readConsent();
            window.gtag('consent', window.__warranteeGaConsentSet ? 'update' : 'default', {
              analytics_storage: consent.analytics ? 'granted' : 'denied',
              ad_storage: consent.marketing ? 'granted' : 'denied',
              ad_user_data: consent.marketing ? 'granted' : 'denied',
              ad_personalization: consent.marketing ? 'granted' : 'denied',
            });
            window.__warranteeGaConsentSet = true;
            if (window.__warranteeGaLoaded || !consent.analytics) return;
            window.__warranteeGaLoaded = true;
            var script = document.createElement('script');
            script.async = true;
            script.src = 'https://www.googletagmanager.com/gtag/js?id=${GA_ID}';
            document.head.appendChild(script);
            gtag('js', new Date());
            gtag('config', '${GA_ID}', {
              page_title: document.title,
              page_location: window.location.href,
              send_page_view: true,
            });
          }
          window.warranteeLoadGoogleAnalytics = loadAnalytics;
          loadAnalytics();
          window.addEventListener('warrantee_cookie_consent_updated', loadAnalytics);
        `}
      </Script>
    </>
  );
}
