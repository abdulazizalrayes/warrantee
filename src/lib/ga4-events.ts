// GA4 Conversion Event Tracking for Warrantee
// Usage: import { trackSignup, trackUpgrade, trackClaim } from "@/lib/ga4-events";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function gtag(...args: unknown[]) {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag(...args);
  }
}

// Core conversion events
export function trackSignup(method: string = "email") {
  gtag("event", "sign_up", {
    method,
    event_category: "engagement",
    event_label: "user_registration",
  });
}

export function trackUpgrade(plan: string, value: number = 1) {
  gtag("event", "purchase", {
    currency: "USD",
    value,
    items: [{ item_name: plan, item_category: "subscription", price: value }],
    event_category: "conversion",
    event_label: "plan_upgrade",
  });
}

export function trackClaim(warrantyId?: string) {
  gtag("event", "generate_lead", {
    event_category: "conversion",
    event_label: "warranty_claim",
    warranty_id: warrantyId,
  });
}

// Additional tracking events
export function trackWarrantyCreated(source: string = "manual") {
  gtag("event", "add_to_cart", {
    event_category: "engagement",
    event_label: "warranty_created",
    source,
  });
}

export function trackContactForm() {
  gtag("event", "generate_lead", {
    event_category: "engagement",
    event_label: "contact_form_submit",
  });
}

export function trackPricingView(plan?: string) {
  gtag("event", "view_item", {
    event_category: "engagement",
    event_label: "pricing_page_view",
    plan,
  });
}

export function trackFeatureView(feature?: string) {
  gtag("event", "view_item", {
    event_category: "engagement",
    event_label: "feature_page_view",
    feature,
  });
}

export function trackSellerInvite() {
  gtag("event", "share", {
    event_category: "engagement",
    event_label: "seller_invite_sent",
  });
}
