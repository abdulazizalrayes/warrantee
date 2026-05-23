"use client";

import Script from "next/script";
import { defaultCookieConsent } from "@/lib/cookie-consent";

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;

export default function GoogleTagManager() {
  if (!GTM_ID) return null;

  return (
    <>
      <Script id="gtm-script" strategy="afterInteractive">
        {`(function(w,d,s,l,i){w[l]=w[l]||[];
        function gtag(){w[l].push(arguments);}
        w.gtag=w.gtag||gtag;
        function readConsent(){
          var consent={analytics:${defaultCookieConsent.analytics},marketing:${defaultCookieConsent.marketing}};
          try{
            var saved=w.localStorage.getItem('warrantee_cookie_consent');
            if(saved){
              var parsed=JSON.parse(saved);
              consent.analytics=!!parsed.analytics;
              consent.marketing=!!parsed.marketing;
            }
          }catch(e){}
          return consent;
        }
        function applyConsent(consent,mode){
          gtag('consent',mode||'default',{
            analytics_storage: consent.analytics ? 'granted' : 'denied',
            ad_storage: consent.marketing ? 'granted' : 'denied',
            ad_user_data: consent.marketing ? 'granted' : 'denied',
            ad_personalization: consent.marketing ? 'granted' : 'denied'
          });
        }
        function shouldLoad(consent){return !!(consent.analytics||consent.marketing);}
        function loadGtm(){
          var consent=readConsent();
          applyConsent(consent,w.__warranteeGtmConsentSet?'update':'default');
          w.__warranteeGtmConsentSet=true;
          if(w.__warranteeGtmLoaded||!shouldLoad(consent)) return;
          w.__warranteeGtmLoaded=true;
          w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
          var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
          j.async=true;
          j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;
          f.parentNode.insertBefore(j,f);
        }
        w.warranteeLoadGtm=loadGtm;
        loadGtm();
        w.addEventListener('warrantee_cookie_consent_updated',loadGtm);
        })(window,document,'script','dataLayer','${GTM_ID}');`}
      </Script>
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
          height="0"
          width="0"
          style={{ display: "none", visibility: "hidden" }}
        />
      </noscript>
    </>
  );
}
