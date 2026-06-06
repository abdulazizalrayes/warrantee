"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowRight, BadgeCheck, Hash, Search, ShieldCheck } from "lucide-react";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { DIRECTION, getContentLocale, getDictionary, normalizeLocale } from "@/lib/i18n";

type VerificationResult = {
  id: string;
  reference_number?: string | null;
  product_name?: string | null;
  product_name_ar?: string | null;
  serial_number?: string | null;
  status?: string | null;
  end_date?: string | null;
  category?: string | null;
  seller_name?: string | null;
};

const copy = {
  en: {
    title: "Verify a warranty",
    subtitle: "Enter a warranty reference, serial number, or QR code value to confirm authenticity.",
    input: "Warranty reference or serial number",
    placeholder: "WR-2026-0001 or serial number",
    submit: "Verify",
    searching: "Searching...",
    notFound: "No warranty found with this reference or serial number.",
    error: "Verification is unavailable right now. Please try again.",
    verified: "Verified warranty",
    product: "Product",
    serial: "Serial Number",
    seller: "Seller",
    expiry: "Expiry Date",
    openPassport: "Open product passport",
    privacy: "Public verification only shows fields safe for authenticity checks.",
  },
  ar: {
    title: "التحقق من الضمان",
    subtitle: "أدخل مرجع الضمان أو الرقم التسلسلي أو قيمة رمز QR للتأكد من صحة الضمان.",
    input: "مرجع الضمان أو الرقم التسلسلي",
    placeholder: "WR-2026-0001 أو الرقم التسلسلي",
    submit: "تحقق",
    searching: "جاري البحث...",
    notFound: "لم يتم العثور على ضمان بهذا المرجع أو الرقم التسلسلي.",
    error: "خدمة التحقق غير متاحة حالياً. حاول مرة أخرى.",
    verified: "ضمان موثق",
    product: "المنتج",
    serial: "الرقم التسلسلي",
    seller: "البائع",
    expiry: "تاريخ الانتهاء",
    openPassport: "فتح جواز المنتج",
    privacy: "يعرض التحقق العام الحقول الآمنة لفحص صحة الضمان فقط.",
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

export default function VerifyWarrantyPage() {
  const params = useParams() ?? {};
  const locale = normalizeLocale(String(params.locale || "en"));
  const contentLocale = getContentLocale(locale);
  const isRTL = locale === "ar";
  const direction = DIRECTION[locale];
  const dictionary = getDictionary(locale);
  const l = copy[contentLocale];
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleVerify = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(`/api/v1/warranties/verify?q=${encodeURIComponent(query)}`, {
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success && data?.data) {
        setResult(data.data);
      } else {
        setError(l.notFound);
      }
    } catch {
      setError(l.error);
    } finally {
      setLoading(false);
    }
  };

  const productName = isRTL && result?.product_name_ar ? result.product_name_ar : result?.product_name;

  return (
    <div className="min-h-screen bg-[#fbfbfd] text-[#1d1d1f]" dir={direction}>
      <Navbar locale={locale} dictionary={dictionary} />
      <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <section className="text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0071e3]/10">
            <ShieldCheck className="h-7 w-7 text-[#0071e3]" aria-hidden="true" />
          </div>
          <h1 className="text-[40px] font-semibold leading-tight tracking-tight text-[#1d1d1f] sm:text-[52px]">
            {l.title}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-[19px] leading-8 text-[#6e6e73]">{l.subtitle}</p>
        </section>

        <form
          onSubmit={handleVerify}
          className="mt-10 rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm sm:p-6"
        >
          <label htmlFor="verification-query" className="mb-2 block text-sm font-semibold text-[#1d1d1f]">
            {l.input}
          </label>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <div className="relative">
              <Hash
                className={`pointer-events-none absolute top-1/2 h-5 w-5 -translate-y-1/2 text-[#86868b] ${
                  isRTL ? "right-4" : "left-4"
                }`}
                aria-hidden="true"
              />
              <input
                id="verification-query"
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={l.placeholder}
                className={`w-full rounded-full border border-[#d2d2d7] bg-white py-3 text-[#1d1d1f] outline-none transition focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/20 ${
                  isRTL ? "pr-12 pl-4" : "pl-12 pr-4"
                }`}
                dir="ltr"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0071e3] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#0077ed] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              {loading ? l.searching : l.submit}
            </button>
          </div>
          <p className="mt-3 text-xs text-[#6e6e73]">{l.privacy}</p>
        </form>

        {error ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {result ? (
          <section className="mt-6 overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-black/[0.06] bg-[#f5f9ff] px-6 py-4">
              <BadgeCheck className="h-5 w-5 text-[#0071e3]" aria-hidden="true" />
              <h2 className="font-semibold text-[#1d1d1f]">{l.verified}</h2>
            </div>
            <div className="grid gap-4 p-6 sm:grid-cols-2">
              <Field label={l.product} value={productName || "-"} />
              <Field label={l.serial} value={result.serial_number || "-"} />
              <Field label={l.seller} value={result.seller_name || "-"} />
              <Field label={l.expiry} value={formatDate(result.end_date, locale)} />
            </div>
            <div className="border-t border-black/[0.06] px-6 py-5">
              <Link
                href={`/${locale}/verify/${encodeURIComponent(result.id)}`}
                className="inline-flex items-center gap-2 rounded-full bg-[#0071e3] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0077ed]"
              >
                {l.openPassport}
                <ArrowRight className={`h-4 w-4 ${isRTL ? "rotate-180" : ""}`} aria-hidden="true" />
              </Link>
            </div>
          </section>
        ) : null}
      </main>
      <Footer locale={locale} dictionary={dictionary} />
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#f5f5f7] px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#6e6e73]">{label}</p>
      <p className="mt-1 break-words text-sm font-medium text-[#1d1d1f]">{value}</p>
    </div>
  );
}
