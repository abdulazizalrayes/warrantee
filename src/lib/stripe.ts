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
    name_ar: "\u0645\u062C\u0627\u0646\u064A",
    price: 0,
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
      "\u062D\u062A\u0649 10 \u0636\u0645\u0627\u0646\u0627\u062A",
      "\u0644\u0648\u062D\u0629 \u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0623\u0633\u0627\u0633\u064A\u0629",
      "\u062F\u0639\u0645 \u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A",
      "\u0645\u0633\u062A\u062E\u062F\u0645 \u0648\u0627\u062D\u062F",
      "\u0633\u062C\u0644 30 \u064A\u0648\u0645",
    ],
  },
  pro: {
    id: "pro",
    name: "Professional",
    name_ar: "\u0627\u062D\u062A\u0631\u0627\u0641\u064A",
    price: 99,
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
      "\u0636\u0645\u0627\u0646\u0627\u062A \u063A\u064A\u0631 \u0645\u062D\u062F\u0648\u062F\u0629",
      "\u0644\u0648\u062D\u0629 \u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0645\u062A\u0642\u062F\u0645\u0629 \u0648\u062A\u062D\u0644\u064A\u0644\u0627\u062A",
      "\u062F\u0639\u0645 \u0623\u0648\u0644\u0648\u064A\u0629 \u0628\u0631\u064A\u062F \u0648\u062D\u0648\u0627\u0631",
      "\u062D\u062A\u0649 5 \u0623\u0639\u0636\u0627\u0621 \u0641\u0631\u064A\u0642",
      "\u0633\u062C\u0644 12 \u0634\u0647\u0631",
      "\u0633\u064A\u0631 \u0639\u0645\u0644 \u0645\u0648\u0627\u0641\u0642\u0629 \u0645\u062E\u0635\u0635",
      "\u0634\u0647\u0627\u062F\u0627\u062A \u062B\u0646\u0627\u0626\u064A\u0629 \u0627\u0644\u0644\u063A\u0629",
      "\u0639\u0645\u0648\u0644\u0629 8% \u0639\u0644\u0649 \u0627\u0644\u062A\u0645\u062F\u064A\u062F\u0627\u062A",
    ],
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    name_ar: "\u0645\u0624\u0633\u0633\u064A",
    price: -1,
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
      "\u0643\u0644 \u0645\u0627 \u0641\u064A \u0627\u0644\u0627\u062D\u062A\u0631\u0627\u0641\u064A",
      "\u0623\u0639\u0636\u0627\u0621 \u0641\u0631\u064A\u0642 \u063A\u064A\u0631 \u0645\u062D\u062F\u0648\u062F\u064A\u0646",
      "\u0645\u062F\u064A\u0631 \u062D\u0633\u0627\u0628\u0627\u062A \u0645\u062E\u0635\u0635",
      "\u062A\u0643\u0627\u0645\u0644\u0627\u062A \u0645\u062E\u0635\u0635\u0629",
      "\u0623\u0645\u0627\u0646 \u0645\u062A\u0642\u062F\u0645 \u0648 SSO",
      "\u0633\u062C\u0644 \u063A\u064A\u0631 \u0645\u062D\u062F\u0648\u062F",
      "\u0636\u0645\u0627\u0646 \u0627\u062A\u0641\u0627\u0642\u064A\u0629 \u0627\u0644\u062E\u062F\u0645\u0629",
      "\u0646\u0633\u0628\u0629 \u0639\u0645\u0648\u0644\u0629 \u0642\u0627\u0628\u0644\u0629 \u0644\u0644\u062A\u0641\u0627\u0648\u0636",
    ],
  },
} as const;

export type PlanId = keyof typeof PLANS;
