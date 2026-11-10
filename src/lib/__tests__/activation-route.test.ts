import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const state = vi.hoisted(() => ({ auth: vi.fn(), single: vi.fn(), admin: vi.fn(), report: vi.fn(), rate: true }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient: async () => ({
  auth: { getUser: state.auth }, from: () => ({ select: () => ({ eq: () => ({ single: state.single }) }) }),
}) }));
vi.mock("@/lib/supabase/admin", () => ({ createSupabaseAdminClient: state.admin }));
vi.mock("@/lib/server/activation-report", () => ({ buildActivationReport: state.report }));
vi.mock("@/lib/rate-limit", () => ({ apiRateLimit: async () => ({ success: state.rate }), getClientIp: () => "test-ip", getRateLimitHeaders: () => ({}) }));
import { GET } from "@/app/api/admin/activation/route";

const request = (headers: Record<string, string> = { referer: "https://warrantee.io/en/admin" }) =>
  new NextRequest("https://warrantee.io/api/admin/activation", { headers });

beforeEach(() => {
  vi.clearAllMocks();
  state.rate = true;
  state.auth.mockResolvedValue({ data: { user: { id: "requester" } }, error: null });
  state.single.mockResolvedValue({ data: { role: "admin" }, error: null });
  state.admin.mockReturnValue({});
  state.report.mockResolvedValue({ complete: true, verified: { firstWarrantyCreatedScopes: 1 } });
});

describe("admin activation aggregate boundary", () => {
  it.each(["admin", "super_admin"])("allows exact live role %s and disables caching", async (role) => {
    state.single.mockResolvedValue({ data: { role }, error: null });
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(state.auth).toHaveBeenCalledOnce();
    expect(state.admin).toHaveBeenCalledOnce();
    expect(state.report).toHaveBeenCalledWith({});
  });
  it.each(["user", "support", "company_admin", "platform_admin", "Admin", "super_admin ", null])("denies wrong role %s before service role construction", async (role) => {
    state.single.mockResolvedValue({ data: { role }, error: null });
    expect((await GET(request())).status).toBe(403);
    expect(state.admin).not.toHaveBeenCalled();
    expect(state.report).not.toHaveBeenCalled();
  });
  it("denies missing user, auth failure and failed live role lookup", async () => {
    state.auth.mockResolvedValueOnce({ data: { user: null }, error: null });
    expect((await GET(request())).status).toBe(401);
    state.auth.mockResolvedValueOnce({ data: { user: { id: "requester" } }, error: { message: "failed" } });
    expect((await GET(request())).status).toBe(401);
    state.single.mockResolvedValue({ data: { role: "admin" }, error: { message: "failed" } });
    expect((await GET(request())).status).toBe(403);
    expect(state.admin).not.toHaveBeenCalled();
  });
  it("gates cross-origin/originless and rate-limited reads", async () => {
    expect((await GET(request({ origin: "https://attacker.invalid" }))).status).toBe(403);
    expect((await GET(request({}))).status).toBe(403);
    state.rate = false;
    expect((await GET(request())).status).toBe(429);
    expect(state.auth).not.toHaveBeenCalled();
    expect(state.admin).not.toHaveBeenCalled();
  });
  it("returns no partial counts or private error details on report failure", async () => {
    state.report.mockRejectedValue(new Error("private-user@example.invalid database details"));
    const response = await GET(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ complete: false, error: "Activation report unavailable; no complete counts returned" });
  });
});
