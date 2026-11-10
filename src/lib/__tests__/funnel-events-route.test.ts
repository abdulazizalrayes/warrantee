import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const state = vi.hoisted(() => ({
  insert: vi.fn(), auth: vi.fn(), createClient: vi.fn(), existing: vi.fn(), rateAllowed: true,
}));
vi.mock("@supabase/supabase-js", () => ({ createClient: state.createClient }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient: async () => ({ auth: { getUser: state.auth } }) }));
vi.mock("@/lib/rate-limit", () => ({
  funnelEventRateLimit: async () => ({ success: state.rateAllowed }), getClientIp: () => "unit-test-ip", getRateLimitHeaders: () => ({}),
}));
import { POST } from "@/app/api/funnel/events/route";

function request(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("https://warrantee.io/api/funnel/events", {
    method: "POST", headers: { origin: "https://warrantee.io", "content-type": "application/json", "user-agent": "Warrantee-QA/1.0 private-user-agent", ...headers },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  state.rateAllowed = true;
  state.insert.mockResolvedValue({ error: null });
  state.auth.mockResolvedValue({ data: { user: { id: "unit-test-authenticated-actor" } } });
  state.createClient.mockReturnValue({ from: (table: string) => {
    expect(table).toBe("activity_log");
    const query = { select: vi.fn(() => query), eq: vi.fn(() => query), maybeSingle: state.existing };
    return { insert: state.insert, select: query.select };
  } });
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://warrantee.io");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://unit-test.invalid");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "unit-test-not-a-real-key");
});
afterEach(() => vi.unstubAllEnvs());

describe("server funnel independent privacy validation", () => {
  it("validates hostile direct requests without trusting browser filtering or supplied classification", async () => {
    const response = await POST(request({ event: "page_view", path: "/en/approval/private-id?email=private#token", referrer: "https://referrer.test/private?token=private#private", metadata: {
      page_name: "approval_detail", page_type: "private", status: "active", view_mode: "buyer",
      warranty_id: "private-id", document_id: "private-id", allowed_domain: "private.example", email: "private@example.test",
      reason: "private text", source: "private", traffic_class: "human", user_agent: "private", send_to: "G-PRIVATE",
      page_location: "https://private.test", page_referrer: "https://private.test", nested: { value: "private" },
      subject: "private", utm_source: "manual_outreach", utm_campaign: "seller_pilot_sep_2026", utm_term: "private",
    } }));
    expect(response.status).toBe(201);
    expect(state.insert).toHaveBeenCalledOnce();
    const row = state.insert.mock.calls[0][0];
    expect(row).toMatchObject({ actor_id: "unit-test-authenticated-actor", action: "page_view", metadata: {
      source: "server_funnel", path: "/en/approval/[id]", referrer: "https://referrer.test", traffic_class: "qa",
      page_name: "approval_detail", page_type: "workflow_detail", status: "active", view_mode: "buyer",
      utm_source: "manual_outreach", utm_campaign: "seller_pilot_sep_2026",
    } });
    expect(JSON.stringify(row.metadata)).not.toContain("private");
    expect(row.metadata).not.toHaveProperty("user_agent");
    expect(row.metadata).not.toHaveProperty("send_to");
  });
  it("accepts the already emitted WhatsApp event with the same strict metadata contract", async () => {
    const response = await POST(request({ event: "whatsapp_click", path: "/ar/contact", metadata: { locale: "ar", location: "footer", destination: "https://wa.me/private", phone: "private", event_label: "private" } }));
    expect(response.status).toBe(201);
    expect(state.insert.mock.calls[0][0].metadata).toEqual({ source: "server_funnel", path: "/ar/contact", referrer: null, event_category: "contact", event_label: "warrantee_whatsapp", locale: "ar", location: "footer", traffic_class: "qa" });
  });
  it("validates subject vocabulary rather than accepting arbitrary allowed-key strings", async () => {
    await POST(request({ event: "contact_form_submit", metadata: { subject: "private@example.test", company: "private" } }));
    expect(state.insert.mock.calls[0][0].metadata).not.toHaveProperty("subject");
    await POST(request({ event: "contact_form_submit", metadata: { subject: "enterprise" } }));
    expect(state.insert.mock.calls[1][0].metadata.subject).toBe("enterprise");
  });
  it("derives classification from the raw transient UA, including content beyond 180 characters", async () => {
    await POST(request({ event: "sign_up", metadata: { method: "email", traffic_class: "human" } }, { "user-agent": `${"x".repeat(190)} Warrantee-QA/1.0` }));
    expect(state.insert.mock.calls[0][0].metadata.traffic_class).toBe("qa");
    expect(state.insert.mock.calls[0][0].metadata).not.toHaveProperty("user_agent");
  });
  it.each([null, [], "not-an-object", { event: "purchase" }, { event: "private-event" }])("rejects unsupported event/body before database clients: %j", async (body) => {
    expect((await POST(request(body))).status).toBe(400);
    expect(state.auth).not.toHaveBeenCalled();
    expect(state.createClient).not.toHaveBeenCalled();
    expect(state.insert).not.toHaveBeenCalled();
  });
  it("retains origin/rate gates without database activity", async () => {
    expect((await POST(request({ event: "page_view" }, { origin: "https://attacker.test" }))).status).toBe(403);
    state.rateAllowed = false;
    expect((await POST(request({ event: "page_view" }))).status).toBe(429);
    expect(state.auth).not.toHaveBeenCalled();
    expect(state.insert).not.toHaveBeenCalled();
  });
  it("reports storage failure truthfully without logging submitted metadata", async () => {
    state.insert.mockResolvedValue({ error: { message: "unit-test storage failure" } });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const response = await POST(request({ event: "page_view", metadata: { email: "private@example.test" } }));
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ accepted: false, retryable: true });
      expect(JSON.stringify(warn.mock.calls)).not.toContain("private");
    } finally { warn.mockRestore(); }
  });
  it("rejects browser-claimed authoritative successes before database access", async () => {
    for (const milestone of ["first_warranty_created", "first_warranty_issued"]) {
      expect((await POST(request({ event: "activation_milestone", metadata: { milestone } }))).status).toBe(400);
    }
    expect((await POST(request({ event: "warranty_created" }))).status).toBe(400);
    expect(state.insert).not.toHaveBeenCalled();
  });
  it("requires a real session for private journey events and bounds request sizes", async () => {
    state.auth.mockResolvedValue({ data: { user: null } });
    expect((await POST(request({ event: "warranty_journey", metadata: { stage: "form_opened" } }))).status).toBe(401);
    expect((await POST(request({ event: "page_view", metadata: { ignored: "x".repeat(17000) } }))).status).toBe(413);
    expect((await POST(request({ event: "page_view", event_id: "invalid" }))).status).toBe(400);
    expect(state.insert).not.toHaveBeenCalled();
  });
  it("deduplicates transport retries only for the same actor and event", async () => {
    state.insert.mockResolvedValue({ error: { code: "23505" } });
    state.existing.mockResolvedValue({ data: { actor_id: "unit-test-authenticated-actor", action: "warranty_journey", entity_type: "funnel_event" } });
    const event = { event: "warranty_journey", event_id: "12345678-1234-4234-8234-123456789abc", metadata: { stage: "save_started" } };
    const replay = await POST(request(event));
    expect(replay.status).toBe(200);
    expect(await replay.json()).toEqual({ accepted: true, duplicate: true });
    state.existing.mockResolvedValue({ data: { actor_id: "another-actor", action: "warranty_journey", entity_type: "funnel_event" } });
    expect((await POST(request(event))).status).toBe(409);
    state.existing.mockResolvedValue({ data: { actor_id: "unit-test-authenticated-actor", action: "sign_up", entity_type: "funnel_event" } });
    expect((await POST(request(event))).status).toBe(409);
  });
});
