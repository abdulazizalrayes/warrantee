import { describe, expect, it } from "vitest";
import { sanitizeAnalyticsPath, sanitizeAnalyticsPayload, sanitizeAnalyticsReferrer, serverFunnelEvents } from "../analytics-payload";

const privateFields = {
  warranty_id: "private-warranty", document_id: "private-document", allowed_domain: "private-company.example",
  email: "private@example.test", reason: "private OCR text", name: "Private Person", phone: "+966555123456",
  message: "private message", nested: { email: "nested@example.test" }, send_to: "G-ATTACKER",
  event: "untrusted_event", traffic_class: "human", event_category: "private category", event_label: "private label",
};

describe("event-specific analytics payloads", () => {
  const cases: Array<[string, Record<string, unknown>, Record<string, unknown>]> = [
    ["page_view", { page_name: "approval_detail", status: "active", view_mode: "buyer", page_type: "private" }, { page_name: "approval_detail", page_type: "workflow_detail", status: "active", view_mode: "buyer" }],
    ["auth_intent", { action: "oauth_start", method: "apple", account_type: "business", tab: "signup" }, { action: "oauth_start", method: "apple", account_type: "business", tab: "signup" }],
    ["signup_submit", { account_type: "consumer", has_company_name: false }, { account_type: "consumer", has_company_name: false }],
    ["sign_up", { method: "business_email" }, { method: "business_email" }],
    ["funnel_cta_click", { cta: "pricing_plan_cta", destination: "/en/auth?email=private#token", plan: "professional", location: "pricing_plan_card" }, { cta: "pricing_plan_cta", destination: "/en/auth", plan: "pro", location: "pricing_plan_card" }],
    ["whatsapp_click", { location: "footer" }, { location: "footer" }],
    ["onboarding_completed", { template: "electronics_retail", notifications_enabled: true }, { template: "electronics_retail", notifications_enabled: true }],
    ["activation_started", { template: "equipment_service", source: "onboarding" }, { template: "equipment_service", source: "onboarding" }],
    ["activation_milestone", { milestone: "template_selected", template: "none", source: "onboarding" }, { milestone: "template_selected", template: "none", source: "onboarding" }],
    ["onboarding_template_selected", { template: "manufacturer" }, { template: "manufacturer" }],
    ["purchase", { value: 15, currency: "private", items: [{ item_name: "pro", price: 15, item_category: "private", item_id: "private-item", extra: { email: "private" } }] }, { currency: "SAR", value: 15, items: [{ item_name: "pro", item_category: "subscription", price: 15 }] }],
    ["claim_submitted", {}, { event_category: "conversion", event_label: "warranty_claim" }],
    ["warranty_created", { source: "manual_with_documents" }, { source: "manual_with_documents" }],
    ["warranty_scan", { status: "completed", file_type: "image/png", fields_found: 7 }, { status: "completed", file_type: "image/png", fields_found: 7 }],
    ["extension_request", { extension_months: 12, mode: "seller_quote_request", has_on_platform_seller: true }, { extension_months: 12, mode: "seller_quote_request", has_on_platform_seller: true }],
    ["extension_wishlist", { extension_months: 3, has_on_platform_seller: false }, { extension_months: 3, has_on_platform_seller: false }],
    ["document_view", { file_type: "application/pdf" }, { file_type: "application/pdf" }],
    ["contact_form_submit", { subject: "partnership" }, { subject: "partnership" }],
    ["view_item", { event_label: "pricing_page_view", plan: "enterprise" }, { event_label: "pricing_page_view", plan: "enterprise" }],
    ["seller_invite_sent", {}, { event_label: "seller_invite_sent" }],
    ["seller_application_submit", { industry: "Home Appliances", has_website: true }, { industry: "home_appliances", has_website: true }],
    ["team_invite", { role: "manager" }, { role: "manager" }],
    ["approval_action", { action: "reject", status_before: "pending_approval", view_mode: "seller" }, { action: "reject", status_before: "pending_approval", view_mode: "seller" }],
    ["report_export_requested", { source: "reports_hub", report_type: "supplier_performance", time_range: "12m" }, { source: "reports_hub", report_type: "supplier_performance", time_range: "12m" }],
  ];

  it.each(cases)("keeps legitimate %s fields and drops unrelated private metadata", (event, input, expected) => {
    const output = sanitizeAnalyticsPayload(event, { ...privateFields, ...input, locale: "ar" }, "qa")!;
    expect(output).toMatchObject({ ...expected, locale: "ar", traffic_class: "qa" });
    for (const key of ["warranty_id", "document_id", "allowed_domain", "email", "reason", "name", "phone", "message", "nested", "send_to", "event"]) expect(output).not.toHaveProperty(key);
    expect(JSON.stringify(output)).not.toContain("private");
  });

  it("never accepts fields solely because they are valid for another event", () => {
    expect(sanitizeAnalyticsPayload("claim_submitted", { subject: "general", action: "approve", template: "manufacturer", items: [] }, "human"))
      .toEqual({ event_category: "conversion", event_label: "warranty_claim", traffic_class: "human" });
  });
  it("records bounded journey stages without private text or client-claimed activation", () => {
    expect(sanitizeAnalyticsPayload("warranty_journey", {
      stage: "save_failed", step: 3, outcome: "failure", reason: "network", account_type: "consumer",
      product_name: "private product", email: "private@example.test", error: "private error",
    }, "qa")).toEqual({ event_category: "activation", stage: "save_failed", step: 3, outcome: "failure", reason: "network", account_type: "consumer", traffic_class: "qa" });
    expect(sanitizeAnalyticsPayload("warranty_journey", { reason: "private error", stage: "private" }, "human"))
      .toEqual({ event_category: "activation", traffic_class: "human" });
    expect(sanitizeAnalyticsPayload("onboarding_completed", { completion_mode: "skipped", template: "personal_purchase" }, "human"))
      .toMatchObject({ completion_mode: "skipped", template: "personal_purchase" });
    expect(sanitizeAnalyticsPayload("activation_milestone", { milestone: "first_warranty_created" }, "human"))
      .not.toHaveProperty("milestone");
  });
  it("rejects free-text subjects, domains, OCR errors, query templates and malformed enum values", () => {
    for (const [event, input] of [
      ["contact_form_submit", { subject: "email me at private@example.test" }],
      ["activation_milestone", { template: "private-person-123", milestone: "private" }],
      ["warranty_scan", { status: "private", file_type: "private", fields_found: 1.5, reason: "private" }],
      ["team_invite", { role: "private", allowed_domain: "private" }],
      ["signup_submit", { has_company_name: "true", account_type: { value: "business" } }],
      ["page_view", { page_name: "__proto__", page_type: "private", total: 100, member_count: 3 }],
    ] as const) {
      expect(JSON.stringify(sanitizeAnalyticsPayload(event, input, "human"))).not.toContain("private");
    }
    expect(sanitizeAnalyticsPayload("warranty_scan", { fields_found: 8 }, "human")).not.toHaveProperty("fields_found");
    expect(sanitizeAnalyticsPayload("extension_request", { extension_months: "12" }, "human")).not.toHaveProperty("extension_months");
  });
  it("registers campaign values rather than permitting arbitrary well-formed identifiers", () => {
    const output = sanitizeAnalyticsPayload("page_view", {
      utm_source: "manual_outreach", utm_medium: "direct", utm_campaign: "seller_pilot_sep_2026",
      utm_content: "person_12345", utm_term: "private query", ref: "private_person", locale: "ja",
    }, "monitoring");
    expect(output).toEqual({ utm_source: "manual_outreach", utm_medium: "direct", utm_campaign: "seller_pilot_sep_2026", locale: "ja", traffic_class: "monitoring" });
    expect(sanitizeAnalyticsPayload("sign_up", { utm_source: "codex_qa", ref: "founder" }, "qa")).toMatchObject({ utm_source: "codex_qa", ref: "founder" });
  });
  it("normalizes both Arabic industry labels and already sanitized payloads", () => {
    const output = sanitizeAnalyticsPayload("seller_application_submit", { industry: "أجهزة منزلية", has_website: false }, "human");
    expect(output).toMatchObject({ industry: "home_appliances", has_website: false });
    expect(sanitizeAnalyticsPayload("seller_application_submit", output, "human")).toEqual(output);
  });
  it("preserves all supported page categories and only page-specific extras", () => {
    const pages = ["home", "pricing", "contact_page", "auth_portal", "approval_workflow", "approval_detail", "documents_library", "extensions", "notifications_center", "warranties", "account_settings", "team_management", "reports_hub", "analytics_dashboard", "seller_registration", "seller_application_submitted"];
    for (const page_name of pages) {
      const output = sanitizeAnalyticsPayload("page_view", { page_name, document_count: 12, allowed_domain: "private", member_count: 3, warranty_id: "private" }, "human");
      expect(output).toMatchObject({ page_name });
      expect(JSON.stringify(output)).not.toContain("private");
      expect(output).not.toHaveProperty("member_count");
      expect(output).not.toHaveProperty("document_count");
    }
    expect(sanitizeAnalyticsPayload("page_view", { page_name: "reports_hub", report_type: "claims_overview", time_range: "7d", step: 2 }, "human"))
      .toMatchObject({ report_type: "claims_overview", time_range: "7d" });
    expect(sanitizeAnalyticsPayload("page_view", { page_name: "home", report_type: "claims_overview" }, "human")).not.toHaveProperty("report_type");
  });
  it("rejects invalid purchase values and rebuilds only registered item fields", () => {
    const output = sanitizeAnalyticsPayload("purchase", { value: NaN, items: [
      { item_name: "private", price: 15 }, { item_name: "pro", price: Infinity },
      { item_name: "pro", price: -1 }, { item_name: "professional", price: 0, item_brand: "private" },
    ] }, "human");
    expect(output).not.toHaveProperty("value");
    expect(output).toMatchObject({ items: [{ item_name: "pro", item_category: "subscription", price: 0 }] });
  });
  it("handles malformed metadata and unsupported events without forwarding raw values", () => {
    expect(sanitizeAnalyticsPayload("private-event", {}, "human")).toBeNull();
    for (const value of [null, [], "private", 5]) expect(sanitizeAnalyticsPayload("claim_submitted", value, "human")).toMatchObject({ traffic_class: "human" });
    expect(serverFunnelEvents.has("whatsapp_click")).toBe(true);
    expect(serverFunnelEvents.has("purchase")).toBe(false);
  });
});

describe("analytics URL normalization", () => {
  it.each([
    ["/en/auth?email=private@example.test#token", "/en/auth"],
    ["/ar/warranties/private-id/extend?secret=1#private", "/ar/warranties/[id]/extend"],
    ["/en/warranties/new?template=private", "/en/warranties/new"],
    ["/ja/dashboard/claims/private", "/ja/dashboard/claims/[id]"],
    ["/en/approval/private", "/en/approval/[id]"],
    ["/en/verify/private", "/en/verify/[id]"],
    ["/en/private-person/unregistered", "/en/[other]"],
    ["/en/%61uth?token=private", "/en/auth"],
    ["/en/approval/private%40example.test", "/en/approval/[id]"],
    ["/en/approval/%2Fprivate", null], ["//private.example/path", null],
    ["/en/%invalid", null], ["javascript:private", null], ["/en/\\private", null],
  ])("normalizes %s without carrying identifiers", (input, expected) => {
    expect(sanitizeAnalyticsPath(input)).toBe(expected);
    if (expected) expect(sanitizeAnalyticsPath(expected)).toBe(expected);
  });
  it("keeps only HTTP(S) referrer origins and rejects credentials and opaque schemes", () => {
    expect(sanitizeAnalyticsReferrer("https://example.test/private?email=private#token")).toBe("https://example.test");
    expect(sanitizeAnalyticsReferrer("http://example.test/private")).toBe("http://example.test");
    for (const input of ["https://private:password@example.test/path", "mailto:private@example.test", "file:///private", "data:text/plain,private", "/relative", null]) expect(sanitizeAnalyticsReferrer(input)).toBeNull();
  });
  it("keeps only same-origin HTTP destinations or registered contact categories", () => {
    for (const input of ["https://private.example/path", "https://private:password@warrantee.io/en/auth", "tel:+966555123456", "mailto:private@example.test", "javascript:private"]) {
      expect(sanitizeAnalyticsPayload("funnel_cta_click", { destination: input }, "human")).not.toHaveProperty("destination");
    }
    for (const input of ["phone", "whatsapp", "https://warrantee.io/en/auth?token=private"]) {
      expect(sanitizeAnalyticsPayload("funnel_cta_click", { destination: input }, "human"))
        .toMatchObject({ destination: input.startsWith("https:") ? "/en/auth" : input });
    }
  });
});
