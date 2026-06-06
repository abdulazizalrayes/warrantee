"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { normalizeLocale } from "@/lib/i18n";

export default function NotFound() {
  const pathname = usePathname();
  const locale = normalizeLocale(pathname?.split("/").filter(Boolean)[0]);
  const isRTL = locale === "ar";

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]" dir={isRTL ? "rtl" : "ltr"}>
      <div className="text-center px-6">
        <div className="mb-8">
          <svg className="w-32 h-32 mx-auto text-[#4169E1]/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-6xl font-bold text-[#1A1A2E] mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-2">
          {isRTL ? "الصفحة غير موجودة" : "Page Not Found"}
        </p>
        <p className="text-gray-400 mb-8">
          {isRTL
            ? "الصفحة التي تبحث عنها غير موجودة أو تم نقلها."
            : "The page you are looking for does not exist or has been moved."}
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link href={`/${locale}/dashboard`} className="px-6 py-3 bg-[#4169E1] text-white rounded-xl font-medium hover:bg-[#3457c9] transition-all">
            {isRTL ? "الذهاب إلى لوحة التحكم" : "Go to Dashboard"}
          </Link>
          <Link href={`/${locale}`} className="px-6 py-3 bg-white text-gray-700 border border-gray-200 rounded-xl font-medium hover:bg-gray-50 transition-all">
            {isRTL ? "العودة للرئيسية" : "Go Home"}
          </Link>
        </div>
      </div>
    </div>
  );
}
