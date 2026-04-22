// @ts-nocheck
"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";

export function PageBackButton({
  fallbackHref,
  isRTL = false,
  className = "",
}: {
  fallbackHref: string;
  isRTL?: boolean;
  className?: string;
}) {
  const router = useRouter();

  const handleClick = () => {
    if (typeof window !== "undefined") {
      const referrer = document.referrer;
      const currentUrl = new URL(window.location.href);

      if (referrer) {
        try {
          const referrerUrl = new URL(referrer);
          const sameOrigin = referrerUrl.origin === currentUrl.origin;
          const samePath = referrerUrl.pathname === currentUrl.pathname;
          const notLandingPage = !/^\/(en|ar)?\/?$/.test(referrerUrl.pathname);

          if (sameOrigin && !samePath && notLandingPage) {
            router.back();
            return;
          }
        } catch {
          // Fall through to deterministic fallback.
        }
      }
    }

    router.push(fallbackHref);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={isRTL ? "العودة" : "Go back"}
      className={`p-2 hover:bg-gray-100 rounded-lg transition ${className}`.trim()}
    >
      {isRTL ? <ArrowRight size={20} /> : <ArrowLeft size={20} />}
    </button>
  );
}
