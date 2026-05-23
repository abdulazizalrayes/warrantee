"use client";
import { useEffect } from "react";
import { useParams } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  const params = useParams() ?? {};
  const locale = (params.locale as string) || "en";
  const isRTL = locale === "ar";

  useEffect(() => { console.error(error); }, [error]);

  return (
    <DashboardPageShell
      eyebrow={isRTL ? "سلامة الصفحة" : "Page resilience"}
      title={isRTL ? "تعذر تحميل لوحة التحكم" : "Dashboard could not load"}
      subtitle={isRTL ? "بقيت واجهة التشغيل متاحة، لكن حدث خطأ في محتوى اللوحة." : "The operating shell stayed available, but the dashboard content hit an error."}
      crumbs={[{ label: "Dashboard", href: `/${locale}/dashboard` }]}
      auditNote={isRTL ? "لا يجب أن يفقد المستخدم الشريط الجانبي عند حدوث خطأ." : "Users should not lose dashboard navigation when a page fails."}
    >
      <div className="rounded-[28px] border border-[#ffd7d3] bg-[#fff5f4] px-6 py-10 text-center text-[#7a271a] shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-semibold text-[#1A1A2E]">{isRTL ? "حدث خطأ أثناء تحميل اللوحة" : "Something went wrong while loading the dashboard"}</h2>
        <button onClick={reset} className="mt-6 inline-flex items-center justify-center rounded-full bg-[#1A1A2E] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2d2d5e]">
          {isRTL ? "إعادة المحاولة" : "Try Again"}
        </button>
      </div>
    </DashboardPageShell>
  );
}
