import {
  BadgeCheck,
  Bell,
  CheckCircle2,
  FileCheck2,
  FileText,
  QrCode,
} from "lucide-react";

interface WarrantyProofPreviewProps {
  isRTL: boolean;
}

export function WarrantyProofPreview({ isRTL }: WarrantyProofPreviewProps) {
  const copy = isRTL
    ? {
        aria: "معاينة لسجل ضمان تشغيلي وجواز منتج موثق",
        workspace: "مساحة عمل الضمانات",
        sample: "سجل تجريبي",
        product: "وحدة تكييف تجارية",
        reference: "WR-SAMPLE-2026",
        active: "نشط",
        coverage: "التغطية",
        until: "حتى 31 ديسمبر 2027",
        owner: "الجهة المصدرة",
        registered: "شركة مسجلة",
        evidence: "الإثبات",
        attached: "فاتورة وشهادة",
        timeline: "سجل الضمان",
        issued: "تم إصدار الضمان",
        certificate: "تم إنشاء الشهادة الثنائية",
        verified: "تحقق المشتري عبر QR",
        passport: "جواز المنتج",
        proof: "إثبات مباشر قابل للتحقق",
        reminder: "تنبيه قبل الانتهاء بـ 30 يومًا",
      }
    : {
        aria: "Preview of an operational warranty record and verified product passport",
        workspace: "Warranty workspace",
        sample: "Sample record",
        product: "Commercial HVAC Unit",
        reference: "WR-SAMPLE-2026",
        active: "Active",
        coverage: "Coverage",
        until: "Until 31 Dec 2027",
        owner: "Issuer",
        registered: "Registered business",
        evidence: "Evidence",
        attached: "Invoice + certificate",
        timeline: "Warranty record",
        issued: "Warranty issued",
        certificate: "Bilingual certificate generated",
        verified: "Buyer verified via QR",
        passport: "Product passport",
        proof: "Live, verifiable proof",
        reminder: "Expiry reminder set for 30 days before",
      };

  const timeline = [
    { icon: FileText, label: copy.issued },
    { icon: FileCheck2, label: copy.certificate },
    { icon: BadgeCheck, label: copy.verified },
  ];

  return (
    <div
      aria-label={copy.aria}
      className="overflow-hidden rounded-[28px] border border-black/[0.08] bg-white text-start shadow-[0_30px_90px_rgba(29,29,31,0.12)]"
    >
      <div className="flex items-center justify-between border-b border-black/[0.06] bg-[#fbfbfd] px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          </div>
          <span className="hidden text-[12px] font-medium text-[#6e6e73] sm:inline">{copy.workspace}</span>
        </div>
        <span className="rounded-full bg-[#0071e3]/10 px-3 py-1 text-[11px] font-semibold text-[#0071e3]">
          {copy.sample}
        </span>
      </div>

      <div className="grid lg:grid-cols-[1.35fr_0.65fr]">
        <div className="p-5 sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#30d158]/10 px-2.5 py-1 text-[11px] font-semibold text-[#248a3d]">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  {copy.active}
                </span>
                <span className="font-mono text-[11px] text-[#86868b]">{copy.reference}</span>
              </div>
              <h2 className="text-[23px] font-semibold tracking-tight text-[#1d1d1f] sm:text-[28px]">
                {copy.product}
              </h2>
            </div>
          </div>

          <dl className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              [copy.coverage, copy.until],
              [copy.owner, copy.registered],
              [copy.evidence, copy.attached],
            ].map(([term, value]) => (
              <div key={term} className="border-s-2 border-[#0071e3] ps-3">
                <dt className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#86868b]">{term}</dt>
                <dd className="mt-1 text-[13px] font-semibold text-[#1d1d1f]">{value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-7 border-t border-black/[0.06] pt-5">
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#6e6e73]">{copy.timeline}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {timeline.map(({ icon: Icon, label }, index) => (
                <div key={label} className="flex items-start gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0071e3]/10 text-[#0071e3]">
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-[12px] font-medium leading-5 text-[#1d1d1f]">{label}</p>
                    <p className="text-[10px] text-[#86868b]">0{index + 1}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="m-3 flex min-h-[290px] flex-col justify-between rounded-[22px] bg-[#1d1d1f] p-5 text-white sm:m-4 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">{copy.passport}</p>
              <p className="mt-2 max-w-[180px] text-[20px] font-semibold leading-tight">{copy.proof}</p>
            </div>
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white text-[#1d1d1f]">
              <QrCode className="h-9 w-9" aria-hidden="true" />
            </div>
          </div>
          <div>
            <div className="mb-3 flex items-center gap-2 text-[12px] text-white/75">
              <Bell className="h-4 w-4 text-[#5ac8fa]" aria-hidden="true" />
              <span>{copy.reminder}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-3/4 rounded-full bg-[#5ac8fa]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
