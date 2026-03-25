"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { CreditCard, Check, Star, Shield, Zap, Building2, Crown } from "lucide-react";
import { getDictionary, DIRECTION } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

interface SubscriptionInfo { plan_id: string; status: string; current_period_start: string | null; current_period_end: string | null; trial_start: string | null; trial_end: string | null; cancel_at_period_end: boolean; warranty_limit: number; team_limit: number; warranties_used: number; team_members_used: number; }

const plans = [
  { id: "free", icon: Shield, color: "text-gray-600", bgColor: "bg-gray-50", borderColor: "border-gray-200", price: 0, features_en: ["Up to 10 warranties", "Basic dashboard", "Email support", "Single user"], features_ar: ["\u062D\u062A\u0649 10 \u0636\u0645\u0627\u0646\u0627\u062A", "\u0644\u0648\u062D\u0629 \u0623\u0633\u0627\u0633\u064A\u0629", "\u062F\u0639\u0645 \u0628\u0631\u064A\u062F", "\u0645\u0633\u062A\u062E\u062F\u0645 \u0648\u0627\u062D\u062F"], name_en: "Free", name_ar: "\u0645\u062C\u0627\u0646\u064A" },
  { id: "pro", icon: Zap, color: "text-gold", bgColor: "bg-yellow-50", borderColor: "border-gold", price: 99, popular: true, features_en: ["Unlimited warranties", "Advanced analytics", "Priority support", "Up to 5 team members", "Custom workflows", "Bilingual certificates", "8% commission"], features_ar: ["\u0636\u0645\u0627\u0646\u0627\u062A \u063A\u064A\u0631 \u0645\u062D\u062F\u0648\u062F\u0629", "\u062A\u062D\u0644\u064A\u0644\u0627\u062A \u0645\u062A\u0642\u062F\u0645\u0629", "\u062F\u0639\u0645 \u0623\u0648\u0644\u0648\u064A\u0629", "\u062D\u062A\u0649 5 \u0623\u0639\u0636\u0627\u0621", "\u0633\u064A\u0631 \u0639\u0645\u0644 \u0645\u062E\u0635\u0635", "\u0634\u0647\u0627\u062F\u0627\u062A \u062B\u0646\u0627\u0626\u064A\u0629", "\u0639\u0645\u0648\u0644\u0629 8%"], name_en: "Professional", name_ar: "\u0627\u062D\u062A\u0631\u0627\u0641\u064A" },
  { id: "enterprise", icon: Building2, color: "text-navy", bgColor: "bg-blue-50", borderColor: "border-navy", price: -1, features_en: ["Everything in Professional", "Unlimited team members", "Dedicated account manager", "Custom integrations", "SLA guarantee"], features_ar: ["\u0643\u0644 \u0645\u0627 \u0641\u064A \u0627\u0644\u0627\u062D\u062A\u0631\u0627\u0641\u064A", "\u0623\u0639\u0636\u0627\u0621 \u063A\u064A\u0631 \u0645\u062D\u062F\u0648\u062F\u064A\u0646", "\u0645\u062F\u064A\u0631 \u062D\u0633\u0627\u0628 \u0645\u062E\u0635\u0635", "\u062A\u0643\u0627\u0645\u0644\u0627\u062A \u0645\u062E\u0635\u0635\u0629", "\u0636\u0645\u0627\u0646 SLA"], name_en: "Enterprise", name_ar: "\u0645\u0624\u0633\u0633\u064A" }
];

export default function BillingPage() {
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const dict = getDictionary(locale);
  const isRTL = locale === "ar";
  const direction = DIRECTION[locale as Locale];
  const { user, loading: authLoading } = useAuth();
  const supabase = createSupabaseBrowserClient();
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    if (authLoading || !user) return;
    const fetchSub = async () => {
      const { data } = await supabase.rpc("get_user_subscription", { user_uuid: user.id });
      if (data) setSubscription(data as unknown as SubscriptionInfo);
      setLoading(false);
    };
    fetchSub();
  }, [user, authLoading, supabase]);

  const handleUpgrade = async (planId: string) => {
    if (planId === "enterprise") { window.location.href = "mailto:hello@warrantee.io?subject=" + encodeURIComponent(isRTL ? "\u0627\u0633\u062A\u0641\u0633\u0627\u0631 \u0639\u0646 \u062E\u0637\u0629 \u0627\u0644\u0645\u0624\u0633\u0633\u0627\u062A" : "Enterprise Plan Inquiry"); return; }
    setUpgrading(true);
    try { const res = await fetch("/api/stripe/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ planId, locale }) }); const data = await res.json(); if (data.url) window.location.href = data.url; } catch (err) { console.error(err); }
    setUpgrading(false);
  };

  const formatDate = (d: string | null) => { if (!d) return "-"; return new Date(d).toLocaleDateString(isRTL ? "ar-SA" : "en-US", { month: "long", day: "numeric", year: "numeric" }); };

  if (loading || authLoading) return (<div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div></div>);

  const currentPlan = subscription?.plan_id || "free";

  return (
    <div dir={direction}>
      <h1 className="text-2xl font-bold text-navy mb-6">{isRTL ? "\u0627\u0644\u0641\u0648\u0627\u062A\u064A\u0631 \u0648\u0627\u0644\u0627\u0634\u062A\u0631\u0627\u0643" : "Billing & Subscription"}</h1>
      {subscription && (<div className="bg-white rounded-lg border border-gray-200 p-6 mb-8"><div className="flex items-center gap-3 mb-4"><Crown size={24} className="text-gold" /><div><h2 className="font-bold text-navy">{isRTL ? "\u062E\u0637\u062A\u0643 \u0627\u0644\u062D\u0627\u0644\u064A\u0629" : "Current Plan"}</h2><p className="text-sm text-gray-600">{plans.find((p) => p.id === currentPlan)?.[isRTL ? "name_ar" : "name_en"] || currentPlan}{subscription.status === "trialing" && <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">{isRTL ? "\u062A\u062C\u0631\u064A\u0628\u064A" : "Trial"}</span>}</p></div></div><div className="grid grid-cols-2 sm:grid-cols-4 gap-4"><div><p className="text-xs text-gray-500">{isRTL ? "\u0627\u0644\u0636\u0645\u0627\u0646\u0627\u062A" : "Warranties Used"}</p><p className="text-lg font-bold text-navy">{subscription.warranties_used}{subscription.warranty_limit > 0 && <span className="text-sm font-normal text-gray-400"> / {subscription.warranty_limit}</span>}</p></div><div><p className="text-xs text-gray-500">{isRTL ? "\u0627\u0644\u0641\u0631\u064A\u0642" : "Team Members"}</p><p className="text-lg font-bold text-navy">{subscription.team_members_used}{subscription.team_limit > 0 && <span className="text-sm font-normal text-gray-400"> / {subscription.team_limit}</span>}</p></div>{subscription.trial_end && <div><p className="text-xs text-gray-500">{isRTL ? "\u0646\u0647\u0627\u064A\u0629 \u0627\u0644\u062A\u062C\u0631\u0628\u0629" : "Trial Ends"}</p><p className="text-sm font-medium text-navy">{formatDate(subscription.trial_end)}</p></div>}{subscription.current_period_end && <div><p className="text-xs text-gray-500">{isRTL ? "\u0627\u0644\u062A\u062C\u062F\u064A\u062F" : "Next Renewal"}</p><p className="text-sm font-medium text-navy">{formatDate(subscription.current_period_end)}</p></div>}</div></div>)}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">{plans.map((plan) => { const isCurrentPlan = currentPlan === plan.id; const Icon = plan.icon; const features = isRTL ? plan.features_ar : plan.features_en; const name = isRTL ? plan.name_ar : plan.name_en; return (<div key={plan.id} className={`rounded-lg border-2 p-6 relative ${plan.popular ? plan.borderColor : "border-gray-200"} ${isCurrentPlan ? "ring-2 ring-gold ring-offset-2" : ""}`}>{plan.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2"><span className="bg-gold text-navy text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1"><Star size={12} />{isRTL ? "\u0627\u0644\u0623\u0643\u062B\u0631 \u0634\u0639\u0628\u064A\u0629" : "Most Popular"}</span></div>}<div className={`w-12 h-12 ${plan.bgColor} rounded-lg flex items-center justify-center mb-4`}><Icon size={24} className={plan.color} /></div><h3 className="text-lg font-bold text-navy">{name}</h3><div className="mt-2 mb-4">{plan.price === 0 ? <p className="text-3xl font-bold text-navy">{isRTL ? "\u0645\u062C\u0627\u0646\u064A" : "Free"}</p> : plan.price === -1 ? <p className="text-lg font-bold text-navy">{isRTL ? "\u062A\u0648\u0627\u0635\u0644 \u0645\u0639\u0646\u0627" : "Contact Us"}</p> : <div><span className="text-3xl font-bold text-navy">$${plan.price}</span><span className="text-sm text-gray-500">/{isRTL ? "\u0633\u0646\u0629" : "year"}</span>{plan.id === "pro" && <p className="text-xs text-green-600 mt-1">{isRTL ? "\u0627\u0644\u0633\u0646\u0629 \u0627\u0644\u0623\u0648\u0644\u0649 \u0645\u062C\u0627\u0646\u064A\u0629!" : "First year free!"}</p>}</div>}</div><ul className="space-y-2 mb-6">{features.map((f, i) => (<li key={i} className="flex items-start gap-2 text-sm text-gray-700"><Check size={16} className="text-green-500 shrink-0 mt-0.5" />{f}</li>))}</ul>{isCurrentPlan ? <button disabled className="w-full py-2.5 rounded-lg border-2 border-gray-200 text-gray-400 font-medium text-sm cursor-not-allowed">{isRTL ? "\u062E\u0637\u062A\u0643 \u0627\u0644\u062D\u0627\u0644\u064A\u0629" : "Current Plan"}</button> : <button onClick={() => handleUpgrade(plan.id)} disabled={upgrading} className={`w-full py-2.5 rounded-lg font-semibold text-sm transition ${plan.popular ? "bg-gold hover:bg-yellow-500 text-navy" : "border-2 border-gray-300 text-navy hover:bg-gray-50"} disabled:opacity-50`}>{upgrading ? "..." : plan.price === -1 ? (isRTL ? "\u062A\u0648\u0627\u0635\u0644 \u0645\u0639\u0646\u0627" : "Contact Sales") : (isRTL ? "\u062A\u0631\u0642\u064A\u0629" : "Upgrade")}</button>}</div>); })}</div>
    </div>
  );
}
