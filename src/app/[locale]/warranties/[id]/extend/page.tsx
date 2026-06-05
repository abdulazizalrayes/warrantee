"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle } from "lucide-react";
import { SubpageHeroHeader } from "@/components/dashboard/SubpageHeroHeader";
import { getDictionary, DIRECTION } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { formatCurrency } from "@/lib/currency";
import { trackExtensionRequest, trackExtensionWishlist } from "@/lib/ga4-events";
import {
  getExtensionEligibility,
  getExtensionEligibilityMessage,
} from "@/lib/extension-eligibility";

export default function ExtendWarrantyPage() {
  const params = useParams() ?? {};
  const router = useRouter();
  const locale = (params.locale as string) || "en";
  const warrantyId = params.id as string;
  const dict = getDictionary(locale);
  const isRTL = locale === "ar";
  const direction = DIRECTION[locale as Locale];
  const { user } = useAuth();

  const [warranty, setWarranty] = useState<{
    end_date: string;
    product_name: string;
    currency?: string | null;
    terms_and_conditions?: string | null;
    seller_id?: string | null;
    issuer_user_id?: string | null;
    seller_name?: string | null;
    seller_email?: string | null;
    status?: string | null;
  } | null>(null);
  const [availableOffers, setAvailableOffers] = useState<any[]>([]);
  const [extensionMonths, setExtensionMonths] = useState(6);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [successMode, setSuccessMode] = useState<"request" | "offer">("request");
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [wishlistSuccess, setWishlistSuccess] = useState(false);
  const [serverEligibility, setServerEligibility] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const warrantyResponse = await fetch(`/api/warranties/${warrantyId}`);
      if (warrantyResponse.ok) {
        const payload = await warrantyResponse.json();
        const data = payload.data;
        if (data) {
          setWarranty({
            end_date: data.end_date || data.warranty_end_date || "",
            product_name: data.product_name,
            currency: data.currency,
            terms_and_conditions: data.terms_and_conditions,
            seller_id: data.seller_id,
            issuer_user_id: data.issuer_user_id,
            seller_name: data.seller_name,
            seller_email: data.seller_email,
            status: data.status,
          });
        }
      }

      const extensionResponse = await fetch(`/api/warranties/${warrantyId}/extensions`);
      if (extensionResponse.ok) {
        const payload = await extensionResponse.json();
        setAvailableOffers((payload.data || []).filter((offer: any) => !offer.is_purchased));
      }

      const eligibilityResponse = await fetch(`/api/warranties/${warrantyId}/extension-eligibility`);
      if (eligibilityResponse.ok) {
        const payload = await eligibilityResponse.json();
        setServerEligibility(payload.data?.eligibility || null);
      }
    })();
  }, [warrantyId]);

  const calcNewEnd = () => {
    if (!warranty) return "";
    const d = new Date(warranty.end_date);
    if (Number.isNaN(d.getTime())) return "";
    d.setMonth(d.getMonth() + extensionMonths);
    return d.toISOString().split("T")[0];
  };

  const extensionEligibility = serverEligibility || getExtensionEligibility(warranty);

  const selectedOffer = availableOffers.find((offer) => offer.new_end_date === calcNewEnd() && typeof offer.price === "number");
  const pendingRequest = availableOffers.find((offer) => offer.new_end_date === calcNewEnd() && (offer.price == null));
  const inheritedCurrency = warranty?.currency || selectedOffer?.currency || "SAR";
  const inheritedTerms = selectedOffer?.terms || warranty?.terms_and_conditions || null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (!user) {
        setError(isRTL ? "يرجى تسجيل الدخول أولاً." : "Please sign in first.");
        return;
      }

      if (!extensionEligibility.canOpenFlow) {
        setError(getExtensionEligibilityMessage(extensionEligibility, isRTL));
        return;
      }

      if (selectedOffer?.id) {
        trackExtensionRequest({
          locale,
          warranty_id: warrantyId,
          extension_months: extensionMonths,
          mode: "seller_offer_checkout",
        });
        const response = await fetch("/api/payments/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            warrantyId,
            extensionId: selectedOffer.id,
            extensionMonths,
            provider: "stripe",
            locale,
            returnUrl: window.location.origin,
            successUrl: `${window.location.origin}/${locale}/warranties/${warrantyId}?extension=success`,
            cancelUrl: `${window.location.origin}/${locale}/warranties/${warrantyId}?extension=cancelled`,
          }),
        });

        const payload = await response.json();
        if (!response.ok) {
          setError(payload.error || (isRTL ? "تعذر بدء الدفع." : "Unable to start checkout."));
          return;
        }

        if (payload.url) {
          window.location.href = payload.url;
          return;
        }
      }

      if (pendingRequest) {
        setSuccessMode("request");
        setSuccess(true);
        return;
      }

      const newEndDate = calcNewEnd();
      if (!newEndDate) {
        setError(
          isRTL
            ? "تعذر حساب تاريخ التمديد الجديد لأن بيانات تاريخ انتهاء الضمان غير صالحة."
            : "The new extension date could not be calculated because the warranty end date is invalid."
        );
        return;
      }
      const requestResponse = await fetch(`/api/warranties/${warrantyId}/extensions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          extension_months: extensionMonths,
          price: null,
          currency: inheritedCurrency,
          terms: inheritedTerms,
          request_quote: true,
        }),
      });
      const requestPayload = await requestResponse.json().catch(() => ({}));
      if (!requestResponse.ok) {
        setError(requestPayload.error || (isRTL ? "تعذر إرسال طلب التمديد." : "Unable to send extension request."));
        return;
      }
      trackExtensionRequest({
        locale,
        warranty_id: warrantyId,
        extension_months: extensionMonths,
        mode: "seller_quote_request",
        has_on_platform_seller: extensionEligibility.hasOnPlatformSeller,
      });
      setSuccessMode("request");
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleWishlist = async () => {
    setWishlistLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/warranties/${warrantyId}/extension-interest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extensionMonths }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload.error || (isRTL ? "تعذر تسجيل الاهتمام حالياً." : "Could not save wishlist interest right now."));
        return;
      }
      trackExtensionWishlist({
        locale,
        warranty_id: warrantyId,
        extension_months: extensionMonths,
        has_on_platform_seller: extensionEligibility.hasOnPlatformSeller,
      });
      setWishlistSuccess(true);
    } catch {
      setError(isRTL ? "تعذر تسجيل الاهتمام حالياً." : "Could not save wishlist interest right now.");
    } finally {
      setWishlistLoading(false);
    }
  };

  if (success) return (
    <div dir={direction} className="max-w-2xl mx-auto text-center py-16">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle size={40} className="text-green-600" /></div>
      <h2 className="text-2xl font-bold text-[#1A1A2E] mb-2">
        {successMode === "offer"
          ? (isRTL ? "جارٍ تحويلك إلى الدفع..." : "Redirecting to checkout...")
          : (isRTL ? "تم إرسال طلب التمديد!" : "Extension request sent!")}
      </h2>
      <p className="text-sm text-gray-600">
        {successMode === "offer"
          ? (isRTL ? "تم العثور على عرض من البائع للمدة المحددة." : "A seller offer was found for this duration.")
          : (isRTL ? "سيقوم البائع بمراجعة الطلب وتحديد السعر إذا كانت الخدمة متاحة." : "The seller will review the request and decide whether to offer this extension.")}
      </p>
      <button onClick={() => router.push(`/${locale}/warranties/${warrantyId}`)} className="mt-4 bg-[#0071e3] text-white font-semibold py-3 px-6 rounded-lg">{isRTL ? "\u0627\u0644\u0639\u0648\u062f\u0629" : "Back to Warranty"}</button>
    </div>
  );

  return (
    <div dir={direction} className="max-w-2xl mx-auto">
      <SubpageHeroHeader
        fallbackHref={`/${locale}/warranties/${warrantyId}`}
        isRTL={isRTL}
        eyebrow={isRTL ? "إدارة التمديد" : "Extension workflow"}
        title={dict.warranty.actions.extend}
        subtitle={
          extensionEligibility.canOpenFlow
            ? isRTL
              ? "اختر المدة فقط. إذا كان لدى البائع عرض جاهز فسيظهر السعر، وإلا سيتم إرسال طلب له ليراجعه."
              : "Choose the duration only. If the seller has already configured an offer, the price will appear; otherwise a request will be sent for review."
            : getExtensionEligibilityMessage(extensionEligibility, isRTL)
        }
        badge={
          !extensionEligibility.canOpenFlow
            ? (isRTL ? "غير مؤهل للتمديد" : "Not eligible for extension")
            : selectedOffer
            ? (isRTL ? "عرض جاهز من البائع" : "Seller offer available")
            : pendingRequest
              ? (isRTL ? "طلب موجود قيد المراجعة" : "Request already pending")
              : (isRTL ? "طلب جديد للبائع" : "New seller request")
        }
      />
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="mb-5 border-b border-gray-100 pb-4">
          <h2 className="text-xl font-bold text-[#1A1A2E]">
            {isRTL ? "تفاصيل التمديد" : "Extension details"}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {isRTL
              ? "سنحافظ على عملة الشراء الأصلية وشروط الضمان الحالية. المشتري يختار المدة فقط."
              : "The original purchase currency and current warranty terms are preserved. The buyer only chooses the duration."}
          </p>
        </div>
        {warranty && <div className="mb-6 p-4 bg-gray-50 rounded-lg"><p className="text-sm text-gray-600">{isRTL ? "\u0627\u0644\u0636\u0645\u0627\u0646 \u0627\u0644\u062d\u0627\u0644\u064a \u064a\u0646\u062a\u0647\u064a \u0641\u064a" : "Current warranty ends"}</p><p className="font-bold text-[#1A1A2E]">{new Date(warranty.end_date).toLocaleDateString(isRTL ? "ar-SA" : "en-US", { month: "long", day: "numeric", year: "numeric" })}</p></div>}
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">{error}</div>}
        {!extensionEligibility.canOpenFlow ? (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            {getExtensionEligibilityMessage(extensionEligibility, isRTL)}
          </div>
        ) : null}
        {!extensionEligibility.canOpenFlow ? (
          <div className="mb-4 rounded-lg border border-[#d9e7ff] bg-[#f5f9ff] p-4 text-sm text-[#244b8a]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">
                  {isRTL ? "هل تريد أن نوفر هذا التمديد مستقبلاً؟" : "Want us to prioritize this extension in the future?"}
                </p>
                <p className="mt-1 text-xs text-[#4868a2]">
                  {wishlistSuccess
                    ? isRTL
                      ? "تم تسجيل اهتمامك. سنستخدم هذا الطلب لتحديد الأولويات مع الفريق والبائعين أو الشركاء."
                      : "Your interest is recorded. We’ll use it to prioritize seller, Warrantee, or partner-backed coverage."
                    : isRTL
                      ? "أضف هذا المنتج إلى قائمة الاهتمام حتى نعرف أن العملاء يريدون هذا النوع من التمديد."
                      : "Add this product to the wishlist so we can see real demand for this extension."}
                </p>
              </div>
              <button
                type="button"
                onClick={handleWishlist}
                disabled={wishlistLoading || wishlistSuccess}
                className="rounded-full border border-[#244b8a] px-4 py-2 text-sm font-medium text-[#244b8a] hover:bg-[#eaf2ff] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {wishlistLoading
                  ? "..."
                  : wishlistSuccess
                    ? (isRTL ? "تمت الإضافة" : "Added to Wishlist")
                    : (isRTL ? "أضف إلى قائمة الاهتمام" : "Add to Wishlist")}
              </button>
            </div>
          </div>
        ) : null}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="extension-period" className="block text-sm font-medium text-[#1A1A2E] mb-1">{isRTL ? "\u0645\u062f\u0629 \u0627\u0644\u062a\u0645\u062f\u064a\u062f" : "Extension Period"} *</label>
            <select id="extension-period" name="extensionMonths" value={extensionMonths} onChange={e => setExtensionMonths(parseInt(e.target.value))} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3]">
              <option value={3}>{isRTL ? "3 \u0623\u0634\u0647\u0631" : "3 months"}</option>
              <option value={6}>{isRTL ? "6 \u0623\u0634\u0647\u0631" : "6 months"}</option>
              <option value={12}>{isRTL ? "12 \u0634\u0647\u0631" : "12 months"}</option>
              <option value={24}>{isRTL ? "24 \u0634\u0647\u0631" : "24 months"}</option>
            </select>
          </div>
          {warranty && calcNewEnd() ? <div className="p-4 bg-[#0071e3]/10 rounded-lg"><p className="text-sm text-gray-600">{isRTL ? "\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0627\u0646\u062a\u0647\u0627\u0621 \u0627\u0644\u062c\u062f\u064a\u062f" : "New end date"}</p><p className="font-bold text-[#1A1A2E]">{new Date(calcNewEnd()).toLocaleDateString(isRTL ? "ar-SA" : "en-US", { month: "long", day: "numeric", year: "numeric" })}</p></div> : null}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-2">
            {selectedOffer ? (
              <>
                <p className="text-sm text-gray-600">{isRTL ? "السعر المحدد من البائع" : "Seller-set price"}</p>
                <p className="text-2xl font-bold text-[#1A1A2E]">
                  {formatCurrency(selectedOffer.price, inheritedCurrency as any, isRTL ? "ar" : "en")}
                </p>
                <p className="text-sm text-gray-600">
                  {isRTL
                    ? "سيتم تطبيق نفس عملة الشراء ونفس شروط الضمان الحالية عند التمديد."
                    : "The extension will follow the same purchase currency and the same warranty terms already attached to this item."}
                </p>
              </>
            ) : pendingRequest ? (
              <>
                <p className="text-sm font-medium text-[#1A1A2E]">
                  {isRTL ? "تم إرسال طلب سابق لهذه المدة" : "A request already exists for this duration"}
                </p>
                <p className="text-sm text-gray-600">
                  {isRTL
                    ? "البائع لم يحدد سعراً لهذه المدة بعد. سنحافظ على نفس العملة والشروط الحالية عند تجهيز العرض."
                    : "The seller has not priced this duration yet. The offer will use the same currency and terms as the original warranty when issued."}
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-[#1A1A2E]">
                  {extensionEligibility.hasOnPlatformSeller
                    ? (isRTL ? "لا يوجد عرض جاهز لهذه المدة" : "No seller offer is available for this duration yet")
                    : (isRTL ? "لا يوجد بائع نشط على المنصة لهذا المنتج" : "No active on-platform seller is linked to this product")}
                </p>
                <p className="text-sm text-gray-600">
                  {extensionEligibility.canOpenFlow
                    ? isRTL
                      ? "يمكنك إرسال طلب إلى البائع، وسيقرر ما إذا كان يريد توفير خدمة التمديد لهذه المدة بالسعر المناسب."
                      : "You can request this extension from the seller, and they can decide whether to offer it for this duration."
                    : getExtensionEligibilityMessage(extensionEligibility, isRTL)}
                </p>
              </>
            )}
          </div>
          {inheritedTerms && (
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-sm font-medium text-[#1A1A2E] mb-1">
                {isRTL ? "شروط التمديد" : "Extension terms"}
              </p>
              <p className="text-sm text-gray-600">
                {isRTL
                  ? "سيتم اعتماد نفس شروط الضمان الحالية عند التمديد."
                  : "The extension will follow the same terms as the existing warranty."}
              </p>
            </div>
          )}
          <button type="submit" disabled={loading || !extensionEligibility.canOpenFlow || !calcNewEnd()} className="w-full bg-[#0071e3] text-white font-semibold py-3 rounded-lg disabled:opacity-50">
            {loading
              ? "..."
              : selectedOffer
                ? (isRTL ? "متابعة عرض البائع" : "Continue with Seller Offer")
                : pendingRequest
                  ? (isRTL ? "تم إرسال الطلب" : "Request Already Sent")
                  : extensionEligibility.canOpenFlow
                    ? (isRTL ? "طلب التمديد من البائع" : "Request Extension from Seller")
                    : (isRTL ? "التمديد غير متاح" : "Extension unavailable")}
          </button>
        </form>
      </div>
    </div>
  );
}
