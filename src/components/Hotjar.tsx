"use client";

import Script from "next/script";

const HOTJAR_ID = process.env.NEXT_PUBLIC_HOTJAR_ID;

export default function Hotjar() {
  if (!HOTJAR_ID) {
    return null;
  }

  const snippet = [
    "(function(h,o,t,j,a,r){",
    "h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};",
    "h._hjSettings={hjid:" + "HOTJAR_ID" + ",hjsv:6};",
    "a=o.getElementsByTagName('head')[0];",
    "r=o.createElement('script');r.async=1;",
    "r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;",
    "a.appendChild(r);",
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
