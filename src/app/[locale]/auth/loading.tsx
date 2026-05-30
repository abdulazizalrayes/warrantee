"use client";

import { usePathname } from "next/navigation";

export default function AuthLoading() {
  const pathname = usePathname();
  const isRTL = pathname?.startsWith("/ar");

  return (
    <div className="min-h-screen flex items-center justify-center" dir={isRTL ? "rtl" : "ltr"}>
      <div className="text-lg text-gray-500">
        {isRTL ? "جاري التحميل..." : "Loading..."}
      </div>
    </div>
  );
}
