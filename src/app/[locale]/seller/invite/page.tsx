"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ProtectedRouteNotice } from "@/components/dashboard/ProtectedRouteNotice";

export default function SellerInvitePage() {
  const { locale } = useParams() ?? {};
  const router = useRouter();
  const { user } = useAuth();
  const isRTL = locale === "ar";

  const [form, setForm] = useState({ name: "", email: "", cr_number: "", industry: "", contact_person: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const [deliveryState, setDeliveryState] = useState<"idle" | "sent" | "pending_delivery">("idle");
  const [error, setError] = useState("");

  const submitInvitation = async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/invitations/seller", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seller_name: form.name,
          seller_email: form.email,
          seller_phone: form.phone,
          locale,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (result.status === "sent") {
        setDeliveryState("sent");
      } else if (result.status === "pending_delivery") {
        setDeliveryState("pending_delivery");
      } else {
        setError(result.error || (isRTL ? "تعذر إرسال الدعوة" : "Could not send the invitation"));
      }
    } catch {
      setError(isRTL ? "تعذر الاتصال بالخدمة" : "Could not reach the invitation service");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitInvitation();
  };

  if (deliveryState === "sent") return (
    <div className="max-w-lg mx-auto p-8 text-center">
      <div className="bg-green-50 rounded-xl p-8">
        <h2 className="text-xl font-bold text-green-800 mb-2">{isRTL ? "\u062a\u0645 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u062f\u0639\u0648\u0629" : "Invitation Sent"}</h2>
        <p className="text-green-600">{isRTL ? "\u0633\u064a\u062a\u0645 \u0645\u0631\u0627\u062c\u0639\u0629 \u0627\u0644\u062f\u0639\u0648\u0629 \u0642\u0631\u064a\u0628\u0627\u064b" : "The invitation will be reviewed shortly."}</p>
        <button onClick={() => router.push(`/${locale}/seller`)} className="mt-4 px-4 py-2 bg-[#1A1A2E] text-white rounded-lg">{isRTL ? "\u0639\u0648\u062f\u0629" : "Back"}</button>
      </div>
    </div>
  );

  if (deliveryState === "pending_delivery") return (
    <div className="max-w-lg mx-auto p-8 text-center">
      <div className="bg-amber-50 rounded-xl p-8">
        <h2 className="text-xl font-bold text-amber-900 mb-2">{isRTL ? "الدعوة بانتظار التسليم" : "Invitation Pending Delivery"}</h2>
        <p className="text-amber-700">{isRTL ? "تم حفظ الدعوة، لكن مزود البريد لم يؤكد إرسالها. يمكنك إعادة المحاولة بأمان." : "The invitation is saved, but the email provider did not confirm delivery. It is safe to retry."}</p>
        <button onClick={submitInvitation} disabled={loading} className="mt-4 px-4 py-2 bg-[#1A1A2E] text-white rounded-lg disabled:opacity-50">
          {loading ? "..." : isRTL ? "إعادة المحاولة" : "Retry Delivery"}
        </button>
      </div>
    </div>
  );

  if (!user) {
    return (
      <ProtectedRouteNotice
        locale={(locale as string) || "en"}
        isRTL={isRTL}
        eyebrow={isRTL ? "\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0628\u0627\u0626\u0639\u064a\u0646" : "Seller onboarding"}
        title={isRTL ? "\u062f\u0639\u0648\u0629 \u0628\u0627\u0626\u0639" : "Invite Seller"}
        subtitle={isRTL ? "\u0625\u0631\u0633\u0627\u0644 \u062f\u0639\u0648\u0627\u062a \u0628\u0627\u0626\u0639\u064a\u0646 \u062c\u062f\u062f \u064a\u062a\u0637\u0644\u0628 \u062d\u0633\u0627\u0628\u0627\u064b \u0645\u0633\u062c\u0644\u0627\u064b." : "Sending seller invitations requires an authenticated workspace session."}
        message={isRTL ? "\u0633\u062c\u0644 \u0627\u0644\u062f\u062e\u0648\u0644 \u0623\u0648\u0644\u0627\u064b \u0642\u0628\u0644 \u0625\u0631\u0633\u0627\u0644 \u062f\u0639\u0648\u0629 \u0628\u0627\u0626\u0639 \u062c\u062f\u064a\u062f." : "Sign in before creating or sending a seller invitation."}
        crumbs={[
          { label: "Dashboard", href: `/${locale}/dashboard` },
          { label: isRTL ? "\u0627\u0644\u0628\u0627\u0626\u0639" : "Seller", href: `/${locale}/seller` },
          { label: isRTL ? "\u062f\u0639\u0648\u0629" : "Invite" },
        ]}
      />
    );
  }

  return (
    <div className="max-w-lg mx-auto p-6">
      <h1 className="text-2xl font-bold text-[#1A1A2E] mb-6">{isRTL ? "\u062f\u0639\u0648\u0629 \u0628\u0627\u0626\u0639" : "Invite Seller"}</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        {[["name", isRTL ? "\u0627\u0644\u0627\u0633\u0645" : "Name"], ["email", isRTL ? "\u0627\u0644\u0628\u0631\u064a\u062f" : "Email"], ["cr_number", isRTL ? "\u0631\u0642\u0645 \u0627\u0644\u0633\u062c\u0644" : "CR Number"], ["industry", isRTL ? "\u0627\u0644\u0635\u0646\u0627\u0639\u0629" : "Industry"], ["contact_person", isRTL ? "\u0634\u062e\u0635 \u0627\u0644\u062a\u0648\u0627\u0635\u0644" : "Contact Person"], ["phone", isRTL ? "\u0627\u0644\u0647\u0627\u062a\u0641" : "Phone"]].map(([key, label]) => (
          <div key={key}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <input type={key === "email" ? "email" : "text"} required={key === "name" || key === "email"} value={form[key as keyof typeof form]} onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3] outline-none" />
          </div>
        ))}
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={loading} className="w-full py-3 bg-[#0071e3] text-white font-semibold rounded-lg hover:bg-[#0077ED] disabled:opacity-50">{loading ? "..." : isRTL ? "\u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u062f\u0639\u0648\u0629" : "Send Invitation"}</button>
      </form>
    </div>
  );
}
