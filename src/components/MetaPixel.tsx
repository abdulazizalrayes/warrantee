"use client";

import Script from "next/script";
import { defaultCookieConsent } from "@/lib/cookie-consent";

const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

export default function MetaPixel() {
  if (!META_PIXEL_ID) return null;

  return (
    <Script id="meta-pixel" strategy="afterInteractive">
      {`
        (function(w,d,s,id){
          function readConsent(){
            var consent={marketing:${defaultCookieConsent.marketing}};
            try{
              var saved=w.localStorage.getItem('warrantee_cookie_consent');
              if(saved){
                var parsed=JSON.parse(saved);
                consent.marketing=!!parsed.marketing;
              }
            }catch(e){}
            return consent;
          }
          function loadPixel(){
            if(w.fbq && w.fbq.loaded) return;
            !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
            n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
            (w,d,s,'https://connect.facebook.net/en_US/fbevents.js');
            w.fbq('init',id);
            w.fbq('track','PageView');
          }
          function applyConsent(){
            var consent=readConsent();
            if(consent.marketing){
              loadPixel();
              if(w.fbq) w.fbq('consent','grant');
            }else if(w.fbq){
              w.fbq('consent','revoke');
            }
          }
          w.warranteeLoadMetaPixel=applyConsent;
          applyConsent();
          w.addEventListener('warrantee_cookie_consent_updated', applyConsent);
        })(window,document,'script','${META_PIXEL_ID}');
      `}
    </Script>
  );
}
