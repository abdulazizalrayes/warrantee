import { LOCALES } from "@/lib/locales";
import type { TrafficClass } from "@/lib/traffic-classification";

type Payload = Record<string, unknown>;
const record = (value: unknown): Payload => value !== null && typeof value === "object" && !Array.isArray(value)
  ? value as Payload : {};
const member = (value: unknown, values: readonly string[]) => typeof value === "string" && values.includes(value);
const templates = ["equipment_service", "contractor_handover", "electronics_retail", "appliance_retail", "manufacturer", "none"];
const plans = ["personal-free", "business-free", "pro", "enterprise", "free"];
const plan = (value: unknown) => value === "professional" ? "pro" : member(value, plans) ? value as string : undefined;
const statuses = ["draft", "pending_approval", "active", "approved", "rejected", "expired", "claimed", "cancelled"];
const reports = ["warranty_summary", "expiry_forecast", "claims_overview", "supplier_performance"];
const ranges = ["7d", "30d", "90d", "12m", "all"];
const ctas = [
  "hero_create_first_warranty", "hero_live_passport", "passport_proof_demo", "home_pricing_details",
  "bottom_create_first_warranty", "pricing_plan_cta", "pricing_personal", "seller_application_submit_attempt",
  "contact_phone", "contact_whatsapp", "home_pricing_personal-free", "home_pricing_business-free",
  "home_pricing_professional", "home_pricing_enterprise",
];
const locations = ["home_hero", "home_passport", "home_pricing", "home_bottom_cta", "pricing_plan_card", "footer", "contact_page"];
const pageTypes: Record<string, string> = {
  home: "marketing", pricing: "marketing", contact_page: "marketing", auth_portal: "authentication",
  approval_workflow: "workflow", approval_detail: "workflow_detail", documents_library: "operations",
  extensions: "operations", notifications_center: "operations", warranties: "operations",
  account_settings: "account", team_management: "account", reports_hub: "analytics",
  analytics_dashboard: "analytics", seller_registration: "seller_onboarding", seller_application_submitted: "conversion",
};

const staticPaths = new Set([
  "/", "/about", "/auth", "/login", "/signup", "/reset-password", "/forgot-password", "/pricing",
  "/contact", "/support", "/features", "/faq", "/guide", "/api-docs", "/privacy", "/terms", "/cookies",
  "/security", "/blog", "/verify", "/demo/product-passport", "/approval", "/analytics", "/reports",
  "/claims", "/documents", "/extensions", "/onboarding", "/notifications", "/billing", "/settings",
  "/settings/team", "/settings/notifications", "/warranties", "/warranties/new", "/warranties/import",
  "/warranties/bulk", "/warranties/extend", "/warranties/transfer", "/seller", "/seller/register",
  "/seller/invite", "/seller/accept-invite", "/admin", "/admin/login", "/admin/accept-invite",
  "/admin/ingestion", "/dashboard", "/dashboard/provisional", "/dashboard/claims", "/api/seller/applications",
]);

export function sanitizeAnalyticsPath(value: unknown): string | null {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u0020]/.test(value)) return null;
  try {
    const url = new URL(value, "https://warrantee.io");
    const parts = url.pathname.split("/").filter(Boolean).map((part) => decodeURIComponent(part));
    if (parts.some((part) => /[/\\\u0000-\u0020]/.test(part))) return null;
    const prefix = member(parts[0], LOCALES) ? `/${parts.shift()}` : "";
    const pathname = `/${parts.join("/")}`;
    if (staticPaths.has(pathname)) return prefix + (pathname === "/" ? "" : pathname) || "/";
    if (/^\/warranties\/[^/]+(?:\/(?:claim|extend))?$/.test(pathname)) {
      return `${prefix}/warranties/[id]${parts.length === 3 ? `/${parts[2]}` : ""}`;
    }
    if (/^\/(?:approval|verify|documents|claims|resources|compare)\/[^/]+$/.test(pathname)) return `${prefix}/${parts[0]}/[id]`;
    if (/^\/dashboard\/claims\/[^/]+$/.test(pathname)) return `${prefix}/dashboard/claims/[id]`;
    return `${prefix}/[other]`;
  } catch {
    return null;
  }
}

export function sanitizeAnalyticsReferrer(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.origin : null;
  } catch {
    return null;
  }
}

function destination(value: unknown): string | null {
  if (value === "phone" || value === "whatsapp") return value;
  if (typeof value !== "string") return null;
  if (value.startsWith("/") && !value.startsWith("//")) return sanitizeAnalyticsPath(value);
  try {
    const url = new URL(value);
    return url.origin === "https://warrantee.io" && !url.username && !url.password
      ? sanitizeAnalyticsPath(url.pathname) : null;
  } catch {
    return null;
  }
}

// Registered codes, not arbitrary slugs: syntactically valid UTM values can still identify people.
const campaignValues: Record<string, readonly string[]> = {
  utm_source: ["manual_outreach", "partner_outreach", "partner", "linkedin", "codex_qa", "qa", "monitoring"],
  utm_medium: ["direct"],
  utm_campaign: ["seller_pilot_sep_2026", "business_pilot_sep_2026", "integration_pilot_sep_2026", "seller_pilot_july_2026", "business_pilot_july_2026", "seller_outreach", "codex_qa"],
  ref: ["founder", "codex_qa", "qa", "monitoring"],
};

export const serverFunnelEvents = new Set([
  "page_view", "auth_intent", "funnel_cta_click", "whatsapp_click", "signup_submit", "sign_up",
  "contact_form_submit", "seller_application_submit", "onboarding_completed", "activation_started",
  "activation_milestone", "onboarding_template_selected",
]);

function industry(value: unknown): string | undefined {
  const labels = [
    ["Electronics", "إلكترونيات", "electronics"], ["Home Appliances", "أجهزة منزلية", "home_appliances"],
    ["Automotive", "سيارات", "automotive"], ["Furniture", "أثاث", "furniture"],
    ["Jewelry", "مجوهرات", "jewelry"], ["Other", "أخرى", "other"],
  ];
  return labels.find((choices) => choices.includes(value as string))?.[2];
}

const mimeTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif", "image/gif", "image/tiff", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "unknown"];

// Custom-event payloads only. Automatic GA/GTM pageview URLs are a separate, unverified boundary.
export function sanitizeAnalyticsPayload(event: string, value: unknown, trafficClass: TrafficClass): Payload | null {
  const input = record(value);
  const output: Payload = {};
  const enumField = (key: string, choices: readonly string[]) => {
    if (member(input[key], choices)) output[key] = input[key];
  };
  const booleanField = (key: string) => { if (typeof input[key] === "boolean") output[key] = input[key]; };
  const integerField = (key: string, min: number, max: number) => {
    const n = input[key];
    if (typeof n === "number" && Number.isInteger(n) && n >= min && n <= max) output[key] = n;
  };
  const fixed = (category: string, label?: string) => {
    output.event_category = category;
    if (label) output.event_label = label;
  };
  const template = () => enumField("template", templates);
  const report = () => { enumField("report_type", reports); enumField("time_range", ranges); };
  const seller = () => {
    booleanField("has_website");
    const category = industry(input.industry);
    if (category) output.industry = category;
  };
  switch (event) {
    case "page_view": {
      if (typeof input.page_name === "string" && Object.prototype.hasOwnProperty.call(pageTypes, input.page_name)) {
        output.page_name = input.page_name;
        output.page_type = pageTypes[input.page_name];
      }
      switch (output.page_name) {
        case "auth_portal": enumField("tab", ["login", "signup"]); enumField("auth_mode", ["magic", "password"]); break;
        case "approval_workflow": booleanField("can_approve"); enumField("view_mode", ["buyer", "seller"]); break;
        case "approval_detail": enumField("status", statuses); enumField("view_mode", ["buyer", "seller"]); break;
        case "warranties": enumField("view_mode", ["buyer", "seller"]); enumField("status_filter", ["all", "active", "pending_approval", "draft", "expired", "claimed"]); break;
        case "extensions": enumField("filter", ["all", "purchased", "available"]); break;
        case "reports_hub": report(); break;
        case "seller_registration": integerField("step", 1, 3); break;
        case "team_management": booleanField("can_manage"); booleanField("access_denied"); break;
        case "account_settings": enumField("active_section", ["profile", "notifications", "team", "integrations", "language", "subscription", "security"]); break;
      }
      break;
    }
    case "auth_intent":
      fixed("authentication");
      enumField("action", ["login", "signup", "oauth_start", "magic_link_start", "password_start"]);
      enumField("method", ["email", "password", "google", "apple"]);
      enumField("tab", ["login", "signup"]); enumField("account_type", ["consumer", "business"]);
      break;
    case "signup_submit": fixed("authentication", "signup_form_submit"); enumField("account_type", ["consumer", "business"]); booleanField("has_company_name"); break;
    case "sign_up": fixed("engagement", "user_registration"); enumField("method", ["email", "business_email", "consumer_email", "password", "google", "apple"]); break;
    case "funnel_cta_click": {
      fixed("conversion_path"); enumField("cta", ctas); enumField("location", locations);
      if (output.cta) output.event_label = output.cta;
      const target = destination(input.destination);
      if (target) output.destination = target;
      const selected = plan(input.plan);
      if (selected) output.plan = selected;
      if (output.cta === "seller_application_submit_attempt") { integerField("step", 1, 3); seller(); }
      break;
    }
    case "whatsapp_click": fixed("contact", "warrantee_whatsapp"); enumField("location", ["footer", "contact_page"]); break;
    case "onboarding_completed": fixed("activation", "first_run_onboarding_completed"); template(); booleanField("notifications_enabled"); break;
    case "activation_started": fixed("activation", "first_warranty_path_started"); template(); enumField("source", ["onboarding"]); break;
    case "activation_milestone":
      fixed("activation"); enumField("milestone", ["template_selected", "first_warranty_created", "certificate_opened", "passport_opened"]);
      if (output.milestone) output.event_label = output.milestone;
      template(); enumField("source", ["onboarding"]); break;
    case "onboarding_template_selected": fixed("activation", "industry_template_selected"); template(); break;
    case "purchase": {
      fixed("conversion", "plan_upgrade"); output.currency = "SAR";
      if (typeof input.value === "number" && Number.isFinite(input.value) && input.value >= 0 && input.value <= 1e9) output.value = input.value;
      if (Array.isArray(input.items)) {
        output.items = input.items.slice(0, 20).flatMap((item) => {
          const source = record(item);
          const name = plan(source.item_name);
          const price = source.price;
          return name && typeof price === "number" && Number.isFinite(price) && price >= 0 && price <= 1e9
            ? [{ item_name: name, item_category: "subscription", price }] : [];
        });
      }
      break;
    }
    case "claim_submitted": fixed("conversion", "warranty_claim"); break;
    case "warranty_created": fixed("engagement", "warranty_created"); enumField("source", ["manual", "manual_draft", "manual_with_documents"]); break;
    case "warranty_scan": fixed("warranty"); enumField("status", ["started", "completed", "failed"]); enumField("file_type", mimeTypes); integerField("fields_found", 0, 7); break;
    case "extension_request":
    case "extension_wishlist":
      fixed(event === "extension_request" ? "conversion" : "demand_signal", event === "extension_request" ? "warranty_extension_request" : "extension_interest");
      if ([3, 6, 12, 24].includes(input.extension_months as number)) output.extension_months = input.extension_months;
      booleanField("has_on_platform_seller");
      if (event === "extension_request") enumField("mode", ["seller_offer_checkout", "seller_quote_request"]);
      break;
    case "document_view": fixed("evidence", "warranty_document_opened"); enumField("file_type", mimeTypes); break;
    case "contact_form_submit": fixed("engagement", "contact_form_submit"); enumField("subject", ["general", "support", "partnership", "enterprise", "api", "press"]); break;
    case "view_item": {
      fixed("engagement"); enumField("event_label", ["pricing_page_view", "feature_page_view"]);
      if (output.event_label === "pricing_page_view") { const selected = plan(input.plan); if (selected) output.plan = selected; }
      // No feature_view callsite registers a feature vocabulary yet.
      break;
    }
    case "seller_invite_sent": fixed("engagement", "seller_invite_sent"); break;
    case "seller_application_submit": fixed("conversion", "seller_application_submit"); seller(); break;
    case "team_invite": fixed("account", "team_member_invited"); enumField("role", ["superadmin", "manager", "viewer"]); break;
    case "approval_action": fixed("workflow"); enumField("action", ["approve", "reject", "submit"]); enumField("view_mode", ["buyer", "seller"]); enumField("status_before", statuses); break;
    case "report_export_requested": fixed("analytics"); enumField("source", ["reports_hub", "analytics_dashboard"]); report(); break;
    default: return null;
  }
  enumField("locale", LOCALES);
  for (const [key, choices] of Object.entries(campaignValues)) enumField(key, choices);
  output.traffic_class = trafficClass;
  return output;
}
