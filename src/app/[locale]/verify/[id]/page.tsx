"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  Calendar,
  Clock3,
  Download,
  FileCheck,
  Hash,
  Package,
  Shield,
  ShieldCheck,
  Store,
  XCircle,
} from "lucide-react";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import WarrantyQRCode from "@/components/WarrantyQRCode";
import { DIRECTION, getDictionary, type Locale } from "@/lib/i18n";

type PublicWarranty = {
  id: string;
  reference_number?: string | null;
  product_name?: string | null;
  product_name_ar?: string | null;
  serial_number?: string | null;
  status?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  category?: string | null;
  seller_name?: string | null;
  certificate_url?: string | null;
  created_at?: string | null;
};

const copy = {
  en: {
    title: "Verified product passport",
    subtitle: "This warranty record is checked against Warrantee's protected warranty ledger.",
    loading: "Verifying warranty...",
    notFound: "Warranty not found",
    notFoundDesc: "We could not match this reference. Check the QR code or enter the reference again.",
    verified: "Verified warranty",
    expired: "Expired warranty",
    daysLeft: "days remaining",
    product: "Product",
    reference: "Reference",
    serial: "Serial Number",
    category: "Category",
    startDate: "Start Date",
    endDate: "End Date",
    seller: "Seller",
    status: "Status",
    proof: "Proof signals",
    proofItems: [
      "Public-safe record resolved from Warrantee",
      "QR code points back to this verification page",
      "Certificate can be opened without exposing private account data",
    ],
    certificate: "Open certificate",
    claim: "Start a claim",
    extension: "Request extension",
    sellerCta: "Issue warranties for your customers",
    scan: "Scan to reopen this product passport",
    issuedBy: "Issued via Warrantee Platform",
    privacy: "Only verification-safe fields are shown publicly.",
  },
  ar: {
    title: "جواز منتج موثق",
    subtitle: "يتم التحقق من سجل الضمان من خلال سجل الضمانات المحمي في Warrantee.",
    loading: "جاري التحقق من الضمان...",
    notFound: "لم يتم العثور على الضمان",
    notFoundDesc: "لم نتمكن من مطابقة هذا المرجع. تحقق من رمز QR أو أدخل المرجع مرة أخرى.",
    verified: "ضمان موثق",
    expired: "ضمان منتهي",
    daysLeft: "يوم متبقي",
    product: "المنتج",
    reference: "المرجع",
    serial: "الرقم التسلسلي",
    category: "الفئة",
    startDate: "تاريخ البداية",
    endDate: "تاريخ الانتهاء",
    seller: "البائع",
    status: "الحالة",
    proof: "إشارات الثقة",
    proofItems: [
      "سجل آمن للعرض العام من Warrantee",
      "رمز QR يعيدك إلى صفحة التحقق نفسها",
      "يمكن فتح الشهادة دون كشف بيانات الحساب الخاصة",
    ],
    certificate: "فتح الشهادة",
    claim: "بدء مطالبة",
    extension: "طلب تمديد",
    sellerCta: "أصدر ضمانات لعملائك",
    scan: "امسح لإعادة فتح جواز المنتج",
    issuedBy: "صادر عبر منصة Warrantee",
    privacy: "تظهر الحقول الآمنة للتحقق فقط للعامة.",
  },
};

function formatDate(value: string | null | undefined, locale: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function VerifyPage() {
  const params = useParams() ?? {};
  const locale = ((params.locale as string) === "ar" ? "ar" : "en") as Locale;
  const id = String(params.id || "");
  const l = copy[locale];
  const dictionary = getDictionary(locale);
  const direction = DIRECTION[locale];
  const isRTL = locale === "ar";
  const [warranty, setWarranty] = useState<PublicWarranty | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setNotFound(false);
      const res = await fetch(`/api/v1/warranties/verify?q=${encodeURIComponent(id)}`, {
        cache: "no-store",
      });
      const payload = await res.json().catch(() => null);
      if (cancelled) return;

      if (!res.ok || !payload?.success || !payload?.data) {
        setWarranty(null);
        setNotFound(true);
      } else {
        setWarranty(payload.data);
      }
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const computed = useMemo(() => {
    const endDate = warranty?.end_date ? new Date(warranty.end_date) : null;
    const endTime = endDate?.getTime();
    const isEndDateValid = typeof endTime === "number" && !Number.isNaN(endTime);
    const isActive =
      isEndDateValid &&
      endTime > Date.now() &&
      (warranty?.status === "active" || warranty?.status === "renewed");
    const daysRemaining = isEndDateValid
      ? Math.max(0, Math.ceil((endTime - Date.now()) / 86400000))
      : 0;

    return { isActive, daysRemaining };
  }, [warranty]);

  const displayProductName =
    isRTL && warranty?.product_name_ar ? warranty.product_name_ar : warranty?.product_name;
  const certificateKey = warranty?.reference_number || warranty?.serial_number || warranty?.id || id;
  const certificateHref = `/api/v1/warranties/verify/${encodeURIComponent(certificateKey)}/certificate?locale=${locale}`;
  const claimHref = `/${locale}/auth?redirect=${encodeURIComponent(
    `/${locale}/warranties/${warranty?.id || id}/claim`,
  )}`;
  const extensionHref = `/${locale}/auth?redirect=${encodeURIComponent(
    `/${locale}/warranties/${warranty?.id || id}/extend`,
  )}`;

  if (loading) {
    return (
      <div dir={direction} className="min-h-screen bg-[#fbfbfd] text-[#1d1d1f]">
        <Navbar locale={locale} dictionary={dictionary} />
        <main className="flex min-h-[68vh] items-center justify-center px-6">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-[#0071e3] border-t-transparent" />
            <p className="mt-4 text-sm text-[#6e6e73]">{l.loading}</p>
          </div>
        </main>
        <Footer locale={locale} dictionary={dictionary} />
      </div>
    );
  }

  if (notFound || !warranty) {
    return (
      <div dir={direction} className="min-h-screen bg-[#fbfbfd] text-[#1d1d1f]">
        <Navbar locale={locale} dictionary={dictionary} />
        <main className="mx-auto flex min-h-[68vh] max-w-xl items-center justify-center px-6 py-16">
          <div className="text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
              <XCircle className="h-9 w-9 text-red-500" aria-hidden="true" />
            </div>
            <h1 className="text-[32px] font-semibold tracking-tight text-[#1d1d1f]">{l.notFound}</h1>
            <p className="mt-3 text-[17px] leading-7 text-[#6e6e73]">{l.notFoundDesc}</p>
            <Link
              href={`/${locale}/verify`}
              className="mt-8 inline-flex rounded-full bg-[#0071e3] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#0077ed]"
            >
              {locale === "ar" ? "البحث مرة أخرى" : "Search again"}
            </Link>
          </div>
        </main>
        <Footer locale={locale} dictionary={dictionary} />
      </div>
    );
  }

  const passportRows = [
    { icon: Package, label: l.product, value: displayProductName || "-" },
    { icon: Hash, label: l.reference, value: warranty.reference_number || "-" },
    { icon: Hash, label: l.serial, value: warranty.serial_number || "-" },
    { icon: Package, label: l.category, value: warranty.category || "-" },
    { icon: Calendar, label: l.startDate, value: formatDate(warranty.start_date, locale) },
    { icon: Calendar, label: l.endDate, value: formatDate(warranty.end_date, locale) },
    { icon: Store, label: l.seller, value: warranty.seller_name || "-" },
  ];

  return (
    <div dir={direction} className="min-h-screen bg-[#fbfbfd] text-[#1d1d1f]">
      <Navbar locale={locale} dictionary={dictionary} />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#d9e7ff] bg-[#f5f9ff] px-3 py-1 text-xs font-semibold text-[#244b8a]">
              <BadgeCheck className="h-4 w-4" aria-hidden="true" />
              {computed.isActive ? l.verified : l.expired}
            </div>
            <h1 className="mt-5 text-[40px] font-semibold leading-tight tracking-tight text-[#1d1d1f] sm:text-[56px]">
              {l.title}
            </h1>
            <p className="mt-4 max-w-2xl text-[19px] leading-8 text-[#6e6e73]">{l.subtitle}</p>
          </div>

          <div className="rounded-2xl border border-black/[0.06] bg-white p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${
                  computed.isActive ? "bg-emerald-50" : "bg-red-50"
                }`}
              >
                {computed.isActive ? (
                  <ShieldCheck className="h-7 w-7 text-emerald-600" aria-hidden="true" />
                ) : (
                  <XCircle className="h-7 w-7 text-red-500" aria-hidden="true" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-[#6e6e73]">{l.status}</p>
                <h2 className="mt-1 text-2xl font-semibold text-[#1d1d1f]">
                  {computed.isActive ? l.verified : l.expired}
                </h2>
                {computed.isActive ? (
                  <p className="mt-1 text-sm text-emerald-700">
                    {computed.daysRemaining} {l.daysLeft}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="rounded-2xl border border-black/[0.06] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[#1d1d1f]">{displayProductName || l.product}</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {passportRows.map((row) => (
                <div key={row.label} className="flex items-start gap-3 rounded-xl bg-[#f5f5f7] px-4 py-3">
                  <row.icon className="mt-0.5 h-5 w-5 shrink-0 text-[#0071e3]" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#6e6e73]">{row.label}</p>
                    <p className="mt-1 break-words text-sm font-medium text-[#1d1d1f]">{row.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-black/[0.06] bg-white p-6 text-center shadow-sm">
              <WarrantyQRCode warrantyId={warranty.id || id} size={188} showDownload={false} />
              <p className="mt-3 text-xs text-[#6e6e73]">{l.scan}</p>
            </div>

            <div className="rounded-2xl border border-black/[0.06] bg-white p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-[#1d1d1f]">
                <Shield className="h-5 w-5 text-[#0071e3]" aria-hidden="true" />
                {l.proof}
              </h2>
              <div className="mt-4 space-y-3">
                {l.proofItems.map((item) => (
                  <div key={item} className="flex items-start gap-3 text-sm text-[#1d1d1f]">
                    <FileCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-[#6e6e73]">{l.privacy}</p>
            </div>

            <div className="grid gap-3">
              <a
                href={certificateHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0071e3] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0077ed]"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                {l.certificate}
              </a>
              <Link
                href={claimHref}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[#d2d2d7] px-5 py-3 text-sm font-semibold text-[#1d1d1f] transition hover:bg-[#f5f5f7]"
              >
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                {l.claim}
              </Link>
              <Link
                href={extensionHref}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[#d2d2d7] px-5 py-3 text-sm font-semibold text-[#1d1d1f] transition hover:bg-[#f5f5f7]"
              >
                <Clock3 className="h-4 w-4" aria-hidden="true" />
                {l.extension}
              </Link>
              <Link
                href={`/${locale}/seller/register`}
                className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-[#0071e3] hover:text-[#0077ed]"
              >
                {l.sellerCta}
                <ArrowRight className={`h-4 w-4 ${isRTL ? "rotate-180" : ""}`} aria-hidden="true" />
              </Link>
            </div>
          </aside>
        </section>
        <p className="mt-8 text-center text-xs text-[#6e6e73]">{l.issuedBy}</p>
      </main>
      <Footer locale={locale} dictionary={dictionary} />
    </div>
  );
}
