"use client";

import Script from "next/script";

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;

export default function GoogleAnalytics() {
  if (!GA_ID || GTM_ID) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = window.gtag || gtag;
          var consent = { analytics: false, marketing: false };
          try {
            var saved = window.localStorage.getItem('warrantee_cookie_consent');
            if (saved) consent = Object.assign(consent, JSON.parse(saved));
          } catch (e) {}
          window.gtag('consent', 'default', {
            analytics_storage: consent.analytics ? 'granted' : 'denied',
            ad_storage: consent.marketing ? 'granted' : 'denied',
            ad_user_data: consent.marketing ? 'granted' : 'denied',
            ad_personalization: consent.marketing ? 'granted' : 'denied',
          });
          gtag('js', new Date());
          gtag('config', '${GA_ID}', {
            page_title: document.title,
            page_location: window.location.href,
          });
        `}
      </Script>
    </>
  );
}
