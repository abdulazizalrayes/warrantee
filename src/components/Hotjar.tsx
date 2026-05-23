"use client";

import Script from "next/script";

const HOTJAR_ID = process.env.NEXT_PUBLIC_HOTJAR_ID;

export default function Hotjar() {
  if (!HOTJAR_ID) {
    return null;
  }

  const snippet = [
    "(function(h,o,t,j,a,r){",
    "function isAutomated(){return h.navigator&&(/HeadlessChrome|Chrome-Lighthouse|Lighthouse|PageSpeed/i.test(h.navigator.userAgent)||h.navigator.webdriver);}",
    "function hasMarketingConsent(){",
    "try{var saved=h.localStorage.getItem('warrantee_cookie_consent');if(!saved)return false;return !!JSON.parse(saved).marketing;}catch(e){return false;}",
    "}",
    "function loadHotjar(){",
    "if(h.__warranteeHotjarLoaded||isAutomated()||!hasMarketingConsent())return;",
    "h.__warranteeHotjarLoaded=true;",
    "h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};",
    "h._hjSettings={hjid:" + "HOTJAR_ID" + ",hjsv:6};",
    "a=o.getElementsByTagName('head')[0];",
    "r=o.createElement('script');r.async=1;",
    "r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;",
    "a.appendChild(r);",
    "}",
    "h.warranteeLoadHotjar=loadHotjar;",
    "loadHotjar();",
    "h.addEventListener('warrantee_cookie_consent_updated',loadHotjar);",
    "})(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');",
  ].join("\n").replace("HOTJAR_ID", HOTJAR_ID);

  return (
    <Script
      id="hotjar-script"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{ __html: snippet }}
    />
  );
}
