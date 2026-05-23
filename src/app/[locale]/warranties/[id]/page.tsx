// @ts-nocheck
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { FileText, Mail, ShieldCheck, Clock3, ExternalLink } from "lucide-react";
import { PageBackButton } from "@/components/PageBackButton";
import { buildDocumentDownloadHref } from "@/lib/documents";
import {
  getExtensionEligibility,
  getExtensionEligibilityMessage,
} from "@/lib/extension-eligibility";

function formatDate(value: string | null | undefined, locale: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function WarrantyDetailPage() {
  const params = useParams() ?? {};
  const searchParams = useSearchParams();
  const locale = (params.locale as string) || "en";
  const isRTL = locale === "ar";
  const warrantyId = String(params.id || "");

  const [warranty, setWarranty] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [serverEligibility, setServerEligibility] = useState<any>(null);

  useEffect(() => {
    setFeedback(searchParams?.get("extension"));
  }, [searchParams]);

  useEffect(() => {
    if (!warrantyId) {
      setLoadError("Warranty not found");
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);
      setLoadError("");

      try {
        const response = await fetch(`/api/warranties/${warrantyId}`, { cache: "no-store" });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok || !payload?.data) {
          throw new Error(payload?.error || "Warranty not found");
        }

        if (cancelled) return;

        setWarranty(payload.data);
        setDocuments(Array.isArray(payload.data.warranty_documents) ? payload.data.warranty_documents : []);
        setClaims(Array.isArray(payload.data.warranty_claims) ? payload.data.warranty_claims : []);

        const eligibilityResponse = await fetch(`/api/warranties/${warrantyId}/extension-eligibility`, { cache: "no-store" });
        if (eligibilityResponse.ok) {
          const eligibilityPayload = await eligibilityResponse.json();
          setServerEligibility(eligibilityPayload.data?.eligibility || null);
        }
      } catch (error) {
        if (cancelled) return;
        setWarranty(null);
        setDocuments([]);
        setClaims([]);
        setServerEligibility(null);
        setLoadError(error instanceof Error ? error.message : "Warranty could not load");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [warrantyId]);

  const primaryDocument = useMemo(() => {
    if (!documents.length) return null;
    return documents[0];
  }, [documents]);

  const statusLabel = useMemo(() => {
    const labels = isRTL
      ? {
          active: "نشط",
          pending_approval: "بانتظار الموافقة",
          draft: "مسودة",
          expired: "منتهي",
          claimed: "مطالب به",
        }
      : {
          active: "Active",
          pending_approval: "Pending Approval",
          draft: "Draft",
          expired: "Expired",
          claimed: "Claimed",
        };

    return labels[warranty?.status] || warranty?.status || "—";
  }, [isRTL, warranty?.status]);

  const statusTone = useMemo(() => {
    const tones: Record<string, string> = {
      active: "bg-green-100 text-green-700",
      pending_approval: "bg-amber-100 text-amber-700",
      draft: "bg-gray-100 text-gray-700",
      expired: "bg-red-100 text-red-700",
      claimed: "bg-blue-100 text-blue-700",
    };
    return tones[warranty?.status || ""] || "bg-gray-100 text-gray-700";
  }, [warranty?.status]);

  const daysRemaining = useMemo(() => {
    if (!warranty?.end_date) return null;
    const diff = new Date(warranty.end_date).getTime() - Date.now();
    return Math.ceil(diff / 86400000);
  }, [warranty?.end_date]);

  const extensionEligibility = useMemo(
    () => serverEligibility || getExtensionEligibility(warranty),
    [serverEligibility, warranty]
  );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#1A1A2E] border-t-transparent" />
          <p className="text-sm text-gray-500">{isRTL ? "جارٍ تحميل الضمان..." : "Loading warranty..."}</p>
        </div>
      </div>
    );
  }

  if (loadError || !warranty) {
    return (
      <div dir={isRTL ? "rtl" : "ltr"} className="space-y-6">
        <div className="flex items-center gap-4">
          <PageBackButton fallbackHref={`/${locale}/warranties`} isRTL={isRTL} />
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-gray-400">
              {isRTL ? "الضمانات" : "Warranties"}
            </p>
            <h1 className="text-3xl font-semibold text-[#1A1A2E]">
              {isRTL ? "تعذر تحميل الضمان" : "Warranty could not load"}
            </h1>
          </div>
        </div>

        <div className="rounded-[28px] border border-[#ffd7d3] bg-[#fff5f4] px-6 py-10 text-center text-[#7a271a] shadow-sm">
          <h2 className="text-xl font-semibold text-[#1A1A2E]">
            {isRTL ? "الرابط موجود لكن بيانات الضمان لم تُحمّل" : "The link exists, but the warranty data did not load"}
          </h2>
          <p className="mt-2 text-sm text-[#8a3b2f]">{loadError || "Warranty not found"}</p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link
              href={`/${locale}/documents`}
              className="rounded-full border border-gray-300 px-5 py-2.5 text-sm font-semibold text-[#1A1A2E] hover:bg-gray-50"
            >
              {isRTL ? "العودة إلى المستندات" : "Back to Documents"}
            </Link>
            <Link
              href={`/${locale}/warranties`}
              className="rounded-full bg-[#1A1A2E] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2d2d5e]"
            >
              {isRTL ? "عرض الضمانات" : "View Warranties"}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="space-y-6">
      <div className="flex items-start gap-4">
        <PageBackButton fallbackHref={`/${locale}/documents`} isRTL={isRTL} />
        <div className="min-w-0 flex-1">
          <Link
            href={`/${locale}/warranties`}
            className="mb-2 inline-flex text-sm text-gray-500 hover:text-[#1A1A2E]"
          >
            {isRTL ? "العودة إلى الضمانات" : "Back to Warranties"}
          </Link>
          <h1 className="truncate text-3xl font-semibold text-[#1A1A2E]">
            {isRTL && warranty.product_name_ar ? warranty.product_name_ar : warranty.product_name || "Warranty"}
          </h1>
          <p className="mt-1 text-sm font-mono text-gray-500">{warranty.reference_number || "—"}</p>
        </div>
      </div>

      {feedback ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {feedback === "success"
            ? isRTL
              ? "تم استلام الدفع وسيتم تطبيق التمديد تلقائياً."
              : "Payment was received and the extension will be applied automatically."
            : feedback === "cancelled"
              ? isRTL
                ? "تم إلغاء الدفع ولم يتم تغيير الضمان."
                : "Payment was cancelled and the warranty was not changed."
              : isRTL
                ? "تم تحديث الضمان."
                : "Warranty updated successfully."}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">{isRTL ? "الحالة" : "Status"}</p>
          <div className={`mt-3 inline-flex rounded-full px-3 py-1 text-sm font-medium ${statusTone}`}>
            {statusLabel}
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">{isRTL ? "الانتهاء" : "Warranty End"}</p>
          <p className="mt-3 text-lg font-semibold text-[#1A1A2E]">{formatDate(warranty.end_date, locale)}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">{isRTL ? "الأيام المتبقية" : "Days Remaining"}</p>
          <p className="mt-3 text-lg font-semibold text-[#1A1A2E]">
            {daysRemaining == null ? "—" : daysRemaining}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">{isRTL ? "المطالبات" : "Claims"}</p>
          <p className="mt-3 text-lg font-semibold text-[#1A1A2E]">{claims.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#1A1A2E]">
              {isRTL ? "تفاصيل المنتج" : "Product Details"}
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
              <div>
                <p className="text-gray-500">{isRTL ? "اسم المنتج" : "Product Name"}</p>
                <p className="mt-1 font-medium text-[#1A1A2E]">
                  {isRTL && warranty.product_name_ar ? warranty.product_name_ar : warranty.product_name || "—"}
                </p>
              </div>
              <div>
                <p className="text-gray-500">{isRTL ? "المرجع" : "Reference"}</p>
                <p className="mt-1 font-medium text-[#1A1A2E]">{warranty.reference_number || "—"}</p>
              </div>
              <div>
                <p className="text-gray-500">{isRTL ? "الرقم التسلسلي" : "Serial Number"}</p>
                <p className="mt-1 font-medium text-[#1A1A2E]">{warranty.serial_number || "—"}</p>
              </div>
              <div>
                <p className="text-gray-500">{isRTL ? "الفئة" : "Category"}</p>
                <p className="mt-1 font-medium capitalize text-[#1A1A2E]">{warranty.category || "—"}</p>
              </div>
              <div>
                <p className="text-gray-500">{isRTL ? "تاريخ البداية" : "Start Date"}</p>
                <p className="mt-1 font-medium text-[#1A1A2E]">{formatDate(warranty.start_date, locale)}</p>
              </div>
              <div>
                <p className="text-gray-500">{isRTL ? "تاريخ النهاية" : "End Date"}</p>
                <p className="mt-1 font-medium text-[#1A1A2E]">{formatDate(warranty.end_date, locale)}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-[#1A1A2E]">
                {isRTL ? "المستندات المرتبطة" : "Linked Documents"}
              </h2>
              <Link
                href={`/${locale}/documents`}
                className="text-sm font-medium text-[#0071e3] hover:underline"
              >
                {isRTL ? "فتح المكتبة" : "Open library"}
              </Link>
            </div>

            {documents.length === 0 ? (
              <p className="mt-4 text-sm text-gray-500">
                {isRTL ? "لا توجد مستندات مرتبطة بهذا الضمان." : "No documents are linked to this warranty."}
              </p>
            ) : (
              <div className="mt-4 divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f5f5f7]">
                      <FileText size={18} className="text-[#0071e3]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-[#1A1A2E]">{doc.file_name}</p>
                      <p className="text-xs text-gray-500">{formatDate(doc.created_at, locale)}</p>
                    </div>
                    <a
                      href={buildDocumentDownloadHref(doc.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-3 py-2 text-sm font-medium text-[#1A1A2E] hover:bg-gray-50"
                    >
                      <ExternalLink size={14} />
                      {isRTL ? "فتح" : "Open"}
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-[#1A1A2E]">
                {isRTL ? "المطالبات" : "Claims"}
              </h2>
              {warranty.status === "active" ? (
                <Link
                  href={`/${locale}/warranties/${warranty.id}/claim`}
                  className="text-sm font-medium text-[#0071e3] hover:underline"
                >
                  {isRTL ? "مطالبة جديدة" : "New Claim"}
                </Link>
              ) : null}
            </div>

            {claims.length === 0 ? (
              <p className="mt-4 text-sm text-gray-500">
                {isRTL ? "لا توجد مطالبات على هذا الضمان." : "No claims have been filed for this warranty."}
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {claims.map((claim) => (
                  <div key={claim.id} className="rounded-xl border border-gray-200 px-4 py-3">
                    <p className="font-medium text-[#1A1A2E]">{claim.title || claim.claim_number}</p>
                    <p className="mt-1 text-xs text-gray-500">{formatDate(claim.created_at, locale)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#1A1A2E]">
              {isRTL ? "إجراءات سريعة" : "Quick Actions"}
            </h2>
            <div className="mt-4 space-y-2">
              {extensionEligibility.canOpenFlow ? (
                <>
                  <Link
                    href={`/${locale}/warranties/${warranty.id}/extend`}
                    className="flex w-full items-center gap-2 rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium hover:bg-gray-50"
                  >
                    <Clock3 size={16} />
                    {isRTL ? "تمديد الضمان" : "Extend Warranty"}
                  </Link>
                  <Link
                    href={`/${locale}/warranties/${warranty.id}/claim`}
                    className="flex w-full items-center gap-2 rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium hover:bg-gray-50"
                  >
                    <ShieldCheck size={16} />
                    {isRTL ? "تقديم مطالبة" : "Claim Warranty"}
                  </Link>
                </>
              ) : warranty.status === "active" ? (
                <>
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    {getExtensionEligibilityMessage(extensionEligibility, isRTL)}
                  </div>
                  <Link
                    href={`/${locale}/warranties/${warranty.id}/extend`}
                    className="flex w-full items-center gap-2 rounded-xl border border-[#d9e7ff] bg-[#f5f9ff] px-4 py-3 text-sm font-medium text-[#244b8a] hover:bg-[#eaf2ff]"
                  >
                    <Clock3 size={16} />
                    {isRTL ? "أضف طلب التمديد إلى قائمة الاهتمام" : "Add extension to wishlist"}
                  </Link>
                  <Link
                    href={`/${locale}/warranties/${warranty.id}/claim`}
                    className="flex w-full items-center gap-2 rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium hover:bg-gray-50"
                  >
                    <ShieldCheck size={16} />
                    {isRTL ? "تقديم مطالبة" : "Claim Warranty"}
                  </Link>
                </>
              ) : null}
              {primaryDocument ? (
                <a
                  href={buildDocumentDownloadHref(primaryDocument.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center gap-2 rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium hover:bg-gray-50"
                >
                  <FileText size={16} />
                  {isRTL ? "فتح المستند" : "Open Document"}
                </a>
              ) : null}
              {warranty.seller_email ? (
                <a
                  href={`mailto:${warranty.seller_email}`}
                  className="flex w-full items-center gap-2 rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium hover:bg-gray-50"
                >
                  <Mail size={16} />
                  {isRTL ? "التواصل مع البائع" : "Contact Seller"}
                </a>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#1A1A2E]">
              {isRTL ? "البائع" : "Seller"}
            </h2>
            <div className="mt-4 space-y-2 text-sm">
              <p className="font-medium text-[#1A1A2E]">{warranty.seller_name || "—"}</p>
              <p className="text-gray-500">{warranty.seller_email || "—"}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
