"use client";

import { usePathname } from "next/navigation";
import { normalizeLocale } from "@/lib/i18n";

export default function AuthLoading() {
  const pathname = usePathname();
  const locale = normalizeLocale(pathname?.split("/").filter(Boolean)[0]);
  const isRTL = locale === "ar";

  return (
    <div className="min-h-screen flex items-center justify-center" dir={isRTL ? "rtl" : "ltr"}>
      <div className="text-lg text-gray-500">
        {isRTL ? "جاري التحميل..." : "Loading..."}
      </div>
    </div>
  );
}
