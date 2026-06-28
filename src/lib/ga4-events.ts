// GA4 Conversion Event Tracking for Warrantee
// Usage: import { trackSignup, trackUpgrade, trackClaim } from "@/lib/ga4-events";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
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

const metaEventMap: Record<string, string> = {
  sign_up: "CompleteRegistration",
  purchase: "Purchase",
  contact_form_submit: "Lead",
  seller_application_submit: "Lead",
  seller_invite_sent: "Lead",
  team_invite: "Lead",
  warranty_created: "WarrantyCreated",
  warranty_scan: "WarrantyScan",
  claim_submitted: "WarrantyClaimSubmitted",
  extension_request: "WarrantyExtensionRequest",
  extension_wishlist: "WarrantyExtensionWishlist",
  document_view: "WarrantyDocumentView",
  report_export_requested: "ReportExportRequested",
};

function pushMetaPixel(event: string, payload: Record<string, unknown>) {
  if (typeof window === "undefined" || !window.fbq) return;
  const metaEvent = metaEventMap[event];
  if (!metaEvent) return;

  const method = ["CompleteRegistration", "Purchase", "Lead"].includes(metaEvent)
    ? "track"
    : "trackCustom";

  window.fbq(method, metaEvent, payload);
}

const serverTrackedEvents = new Set([
  "page_view",
  "auth_intent",
  "funnel_cta_click",
  "signup_submit",
  "sign_up",
  "contact_form_submit",
  "seller_application_submit",
  "onboarding_completed",
]);

function sanitizeServerPayload(payload: Record<string, unknown>) {
  const sanitized: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value === null || typeof value === "boolean" || typeof value === "number") {
      sanitized[key] = value;
    } else if (typeof value === "string") {
      sanitized[key] = value.slice(0, 160);
    }
  }
  return sanitized;
}

function sendServerFunnelEvent(event: string, payload: Record<string, unknown>) {
  if (typeof window === "undefined" || !serverTrackedEvents.has(event)) return;

  const body = JSON.stringify({
    event,
    path: window.location.pathname,
    referrer: document.referrer || null,
    metadata: sanitizeServerPayload(payload),
  });

  try {
    if (navigator.sendBeacon) {
      const sent = navigator.sendBeacon("/api/funnel/events", new Blob([body], { type: "application/json" }));
      if (sent) return;
    }

    void fetch("/api/funnel/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    });
  } catch {
    // Client analytics should never block the user journey.
  }
}

function emitEvent(event: string, payload: Record<string, unknown>) {
  gtag("event", event, payload);
  pushDataLayer(event, payload);
  pushMetaPixel(event, payload);
  sendServerFunnelEvent(event, payload);
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

export function trackFunnelCtaClick(
  cta: string,
  destination: string,
  metadata: Record<string, unknown> = {}
) {
  emitEvent("funnel_cta_click", {
    cta,
    destination,
    event_category: "conversion_path",
    event_label: cta,
    ...metadata,
  });
}

export function trackSignupSubmit(metadata: Record<string, unknown> = {}) {
  emitEvent("signup_submit", {
    event_category: "authentication",
    event_label: "signup_form_submit",
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

export function trackOnboardingCompleted(metadata: Record<string, unknown> = {}) {
  emitEvent("onboarding_completed", {
    event_category: "activation",
    event_label: "first_run_onboarding_completed",
    ...metadata,
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
  emitEvent("claim_submitted", {
    event_category: "conversion",
    event_label: "warranty_claim",
    warranty_id: warrantyId,
  });
}

// Additional tracking events
export function trackWarrantyCreated(source: string = "manual") {
  emitEvent("warranty_created", {
    event_category: "engagement",
    event_label: "warranty_created",
    source,
  });
}

export function trackWarrantyScan(status: "started" | "completed" | "failed", metadata: Record<string, unknown> = {}) {
  emitEvent("warranty_scan", {
    status,
    event_category: "warranty",
    ...metadata,
  });
}

export function trackExtensionRequest(metadata: Record<string, unknown> = {}) {
  emitEvent("extension_request", {
    event_category: "conversion",
    event_label: "warranty_extension_request",
    ...metadata,
  });
}

export function trackExtensionWishlist(metadata: Record<string, unknown> = {}) {
  emitEvent("extension_wishlist", {
    event_category: "demand_signal",
    event_label: "extension_interest",
    ...metadata,
  });
}

export function trackDocumentView(metadata: Record<string, unknown> = {}) {
  emitEvent("document_view", {
    event_category: "evidence",
    event_label: "warranty_document_opened",
    ...metadata,
  });
}

export function trackContactForm(subject?: string) {
  emitEvent("contact_form_submit", {
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
  emitEvent("seller_invite_sent", {
    event_category: "engagement",
    event_label: "seller_invite_sent",
  });
}

export function trackSellerApplication(metadata: Record<string, unknown> = {}) {
  emitEvent("seller_application_submit", {
    event_category: "conversion",
    event_label: "seller_application_submit",
    ...metadata,
  });
}

export function trackTeamInvite(metadata: Record<string, unknown> = {}) {
  emitEvent("team_invite", {
    event_category: "account",
    event_label: "team_member_invited",
    ...metadata,
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
