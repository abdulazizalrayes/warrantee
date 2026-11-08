"use client";

import Script from "next/script";

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;

export default function GoogleTagManager() {
  if (!GTM_ID) return null;

  return (
    <>
      <Script id="gtm-script" strategy="afterInteractive" src="/agent-bootstrap/analytics/gtm.js" />
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
