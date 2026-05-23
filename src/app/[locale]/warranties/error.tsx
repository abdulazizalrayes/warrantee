"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  const params = useParams() ?? {};
  const locale = (params.locale as string) || "en";
  const isRTL = locale === "ar";

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div dir={isRTL ? "rtl" : "ltr"}>
      <DashboardPageShell
        eyebrow={isRTL ? "سلامة الصفحة" : "Page resilience"}
        title={isRTL ? "تعذر تحميل الضمانات" : "Warranties could not load"}
        subtitle={isRTL ? "بقيت واجهة التشغيل متاحة، لكن حدث خطأ أثناء استرجاع القائمة." : "The operating shell stayed available, but the listing hit an error while loading."}
        crumbs={[
          { label: "Dashboard", href: `/${locale}/dashboard` },
          { label: isRTL ? "الضمانات" : "Warranties" },
        ]}
        auditNote={isRTL ? "هذا الخطأ يحتاج متابعة، لكن يجب ألا يفقد المستخدم سياق الصفحة أو أدوات التنقل." : "This failure needs follow-up, but the user should not lose the page context or navigation shell."}
      >
        <div className="rounded-[28px] border border-[#ffd7d3] bg-[#fff5f4] px-6 py-10 text-center text-[#7a271a] shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-semibold text-[#1A1A2E]">
            {isRTL ? "حدث خطأ أثناء تحميل الضمانات" : "Something went wrong while loading warranties"}
          </h2>
          <p className="mt-2 text-sm text-[#8a3b2f]">
            {isRTL ? "يمكنك إعادة المحاولة الآن، وإذا استمر الخطأ فنحتاج مراجعة بيانات الجلسة أو واجهة الـ API." : "You can retry now. If it keeps happening, we need to review the session state or the API response."}
          </p>
          <button
            onClick={reset}
            className="mt-6 inline-flex items-center justify-center rounded-full bg-[#1A1A2E] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2d2d5e]"
          >
            {isRTL ? "إعادة المحاولة" : "Try Again"}
          </button>
        </div>
      </DashboardPageShell>
    </div>
  );
}
