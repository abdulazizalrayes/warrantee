"use client";

import Script from "next/script";

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;

export default function GoogleAnalytics() {
  if (!GA_ID) return null;

  if (GTM_ID) return null;

  return (
    <>
      <Script id="google-analytics" strategy="afterInteractive" src="/agent-bootstrap/analytics/ga.js" />
    </>
  );
}
