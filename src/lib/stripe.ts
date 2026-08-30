import Stripe from "stripe";
import {
  PERSONAL_FREE_WARRANTY_LIMIT,
  PROFESSIONAL_PRICE_SAR,
  PROFESSIONAL_TEAM_LIMIT,
  PROFESSIONAL_WARRANTY_LIMIT,
} from "@/lib/plan-config";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2026-04-22.dahlia",
      typescript: true,
    });
  }
  return _stripe;
}

// Lazy proxy for backward compatibility
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return getStripe()[prop as keyof Stripe];
  },
});

export const PLANS = {
  free: {
    id: "free",
    name: "Free",
    name_ar: "مجاني",
    price: 0,
    interval: "month",
    warranty_limit: PERSONAL_FREE_WARRANTY_LIMIT,
    team_limit: 1,
    features_en: [
      "Up to 10 personal warranties",
      "Receipts and supporting documents",
      "Expiry reminders",
      "Single user",
      "Full warranty history",
    ],
    features_ar: [
      "حتى 10 ضمانات شخصية",
      "الفواتير والمستندات الداعمة",
      "تنبيهات انتهاء الضمان",
      "مستخدم واحد",
      "سجل ضمانات كامل",
    ],
  },
  pro: {
    id: "pro",
    name: "Professional",
    name_ar: "احترافي",
    price: PROFESSIONAL_PRICE_SAR,
    currency: "SAR",
    interval: "month",
    warranty_limit: PROFESSIONAL_WARRANTY_LIMIT,
    team_limit: PROFESSIONAL_TEAM_LIMIT,
    commission_rate: 8.0,
    stripe_price_id: process.env.STRIPE_PRO_PRICE_ID,
    features_en: [
      "Up to 1,000 issued warranties",
      "Advanced dashboard & analytics",
      "Priority email support",
      "Up to 3 team members",
      "Full warranty history",
      "Custom approval workflows",
      "Bilingual certificates",
    ],
    features_ar: [
      "حتى 1,000 ضمان مُصدر",
      "لوحة معلومات متقدمة وتحليلات",
      "دعم بريد إلكتروني بأولوية",
      "حتى 3 أعضاء فريق",
      "سجل ضمانات كامل",
      "سير عمل موافقة مخصص",
      "شهادات ثنائية اللغة",
    ],
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    name_ar: "مؤسسي",
    price: -1,
    interval: "month",
    warranty_limit: null,
    team_limit: null,
    commission_rate: 5.0,
    features_en: [
      "Everything in Professional",
      "Team limits confirmed by agreement",
      "Enterprise onboarding by agreement",
      "Custom integrations by agreement",
      "Enterprise security requirements review",
      "Data retention terms by agreement",
      "Service levels by agreement",
      "Commercial terms by agreement",
    ],
    features_ar: [
      "كل ما في الاحترافي",
      "حدود الفريق حسب الاتفاق",
      "تهيئة المؤسسات حسب الاتفاق",
      "تكاملات مخصصة حسب الاتفاق",
      "مراجعة متطلبات أمان المؤسسة",
      "شروط الاحتفاظ بالبيانات حسب الاتفاق",
      "مستويات الخدمة حسب الاتفاق",
      "الشروط التجارية حسب الاتفاق",
    ],
  },
} as const;

export type PlanId = keyof typeof PLANS;
