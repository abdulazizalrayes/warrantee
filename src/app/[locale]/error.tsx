"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Error:", error);
  }, [error]);

  const pathname = usePathname();
  const locale = pathname?.startsWith("/ar") ? "ar" : "en";
  const isRTL = locale === "ar";

  return (
    <div className="min-h-[50vh] flex items-center justify-center" dir={isRTL ? "rtl" : "ltr"}>
      <div className="text-center px-6 max-w-md">
        <div className="mb-6">
          <svg className="w-20 h-20 mx-auto text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-[#1A1A2E] mb-2">
          {isRTL ? "حدث خطأ" : "Something went wrong"}
        </h2>
        <p className="text-gray-500 mb-6">
          {isRTL ? "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى." : "An unexpected error occurred. Please try again."}
        </p>
        <button
          onClick={reset}
          className="px-6 py-3 bg-[#4169E1] text-white rounded-xl font-medium hover:bg-[#3457c9] transition-all"
        >
          {isRTL ? "حاول مرة أخرى" : "Try Again"}
        </button>
      </div>
    </div>
  );
}
