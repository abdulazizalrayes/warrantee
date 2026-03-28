// @ts-nocheck
import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2024-12-18.acacia",
      typescript: true,
    });
  }
  return _stripe;
}

// Lazy proxy for backward compatibility
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return (getStripe() as any)[prop];
  },
});

export const PLANS = {
  free: {
    id: "free",
    name: "Free",
    name_ar: "مجاني",
    price: 0,
    interval: "month",
    warranty_limit: 10,
    team_limit: 1,
    features_en: [
      "Up to 10 warranties",
      "Basic dashboard",
      "Email support",
      "Single user",
      "30-day history",
    ],
    features_ar: [
      "حتى 10 ضمانات",
      "لوحة معلومات أساسية",
      "دعم البريد الإلكتروني",
      "مستخدم واحد",
      "سجل 30 يوم",
    ],
  },
  pro: {
    id: "pro",
    name: "Professional",
    name_ar: "احترافي",
    price: 1,
    interval: "month",
    warranty_limit: -1,
    team_limit: 5,
    commission_rate: 8.0,
    stripe_price_id: process.env.STRIPE_PRO_PRICE_ID,
    features_en: [
      "Unlimited warranties",
      "Advanced dashboard & analytics",
      "Priority email & chat support",
      "Up to 5 team members",
      "12-month history",
      "Custom approval workflows",
      "Bilingual certificates",
      "8% commission on extensions",
    ],
    features_ar: [
      "ضمانات غير محدودة",
      "لوحة معلومات متقدمة وتحليلات",
      "دعم أولوية بريد وحوار",
      "حتى 5 أعضاء فريق",
      "سجل 12 شهر",
      "سير عمل موافقة مخصص",
      "شهادات ثنائية اللغة",
      "عمولة 8% على التمديدات",
    ],
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    name_ar: "مؤسسي",
    price: -1,
    interval: "month",
    warranty_limit: -1,
    team_limit: -1,
    commission_rate: 5.0,
    features_en: [
      "Everything in Professional",
      "Unlimited team members",
      "Dedicated account manager",
      "Custom integrations",
      "Advanced security & SSO",
      "Unlimited history",
      "SLA guarantee",
      "Negotiable commission rate",
    ],
    features_ar: [
      "كل ما في الاحترافي",
      "أعضاء فريق غير محدودين",
      "مدير حسابات مخصص",
      "تكاملات مخصصة",
      "أمان متقدم و SSO",
      "سجل غير محدود",
      "ضمان اتفاقية الخدمة",
      "نسبة عمولة قابلة للتفاوض",
    ],
  },
} as const;

export type PlanId = keyof typeof PLANS;
