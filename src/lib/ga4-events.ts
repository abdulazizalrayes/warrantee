// GA4 Conversion Event Tracking for Warrantee
// Usage: import { trackSignup, trackUpgrade, trackClaim } from "@/lib/ga4-events";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

function gtag(...args: unknown[]) {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag(...args);
  }
}

function pushDataLayer(event: string, payload: Record<string, unknown>) {
  if (typeof window !== "undefined" && Array.isArray(window.dataLayer)) {
    window.dataLayer.push({ event, ...payload });
  }
}

function emitEvent(event: string, payload: Record<string, unknown>) {
  gtag("event", event, payload);
  pushDataLayer(event, payload);
}

export function trackPageView(pageName: string, metadata: Record<string, unknown> = {}) {
  emitEvent("page_view", {
    page_name: pageName,
    ...metadata,
  });
}

export function trackAuthIntent(
  action: "login" | "signup" | "oauth_start" | "magic_link_start" | "password_start",
  method: "email" | "password" | "google" | "apple",
  metadata: Record<string, unknown> = {}
) {
  emitEvent("auth_intent", {
    action,
    method,
    event_category: "authentication",
    ...metadata,
  });
}

// Core conversion events
export function trackSignup(method: string = "email") {
  emitEvent("sign_up", {
    method,
    event_category: "engagement",
    event_label: "user_registration",
  });
}

export function trackUpgrade(plan: string, value: number = 1) {
  emitEvent("purchase", {
    currency: "USD",
    value,
    items: [{ item_name: plan, item_category: "subscription", price: value }],
    event_category: "conversion",
    event_label: "plan_upgrade",
  });
}

export function trackClaim(warrantyId?: string) {
  emitEvent("generate_lead", {
    event_category: "conversion",
    event_label: "warranty_claim",
    warranty_id: warrantyId,
  });
}

// Additional tracking events
export function trackWarrantyCreated(source: string = "manual") {
  emitEvent("add_to_cart", {
    event_category: "engagement",
    event_label: "warranty_created",
    source,
  });
}

export function trackContactForm(subject?: string) {
  emitEvent("generate_lead", {
    event_category: "engagement",
    event_label: "contact_form_submit",
    subject,
  });
}

export function trackPricingView(plan?: string) {
  emitEvent("view_item", {
    event_category: "engagement",
    event_label: "pricing_page_view",
    plan,
  });
}

export function trackFeatureView(feature?: string) {
  emitEvent("view_item", {
    event_category: "engagement",
    event_label: "feature_page_view",
    feature,
  });
}

export function trackSellerInvite() {
  emitEvent("share", {
    event_category: "engagement",
    event_label: "seller_invite_sent",
  });
}

export function trackApprovalAction(action: "approve" | "reject" | "submit", metadata: Record<string, unknown> = {}) {
  emitEvent("approval_action", {
    action,
    event_category: "workflow",
    ...metadata,
  });
}

export function trackReportExport(metadata: Record<string, unknown> = {}) {
  emitEvent("report_export_requested", {
    event_category: "analytics",
    ...metadata,
  });
}
