import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

const state = vi.hoisted(() => ({ urls: [] as URL[], authorized: true }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient: async () => {
  const client = createClient("https://warrantee-test.supabase.co", "test-only", {
    global: { fetch: async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      state.urls.push(url);
      return new Response(JSON.stringify([{ id: "document-after-warranty-500", warranties: { product_name: "Test" } }]), {
        status: 200, headers: { "Content-Type": "application/json" },
      });
    } },
  });
  client.auth.getUser = vi.fn().mockResolvedValue({ data: { user: state.authorized ? { id: "test-user" } : null }, error: null });
  return client;
} }));
vi.mock("@/lib/warranty-access", () => ({ resolveWarrantyAccessOrClause: async () => "user_id.eq.test-user,issuer_company_id.in.(test-company)" }));
vi.mock("@/lib/rate-limit", () => ({
  apiRateLimit: async () => ({ success: true }), getClientIp: () => "test-ip", getRateLimitHeaders: () => ({}),
}));
import { GET as documents } from "@/app/api/documents/route";
import { GET as claims } from "@/app/api/claims/route";

describe("authorized collection queries", () => {
  beforeEach(() => { state.urls = []; state.authorized = true; });
  for (const [name, get, path] of [["documents", documents, "/api/documents"], ["claims", claims, "/api/claims"]] as const) {
    it(`${name} filters on an inner warranty join without a truncated ID prefetch`, async () => {
      const response = await get(new NextRequest(`https://warrantee.io${path}?offset=200&limit=25&q=receipt`));
      expect(response.status).toBe(200);
      expect(state.urls).toHaveLength(1);
      const params = state.urls[0].searchParams;
      expect(params.get("select")).toContain("warranties!inner");
      expect(params.get("warranties.or")).toContain("issuer_company_id.in.(test-company)");
      expect(params.has("warranty_id")).toBe(false);
      expect(params.get("offset")).toBe("200");
      expect(params.get("limit")).toBe("25");
      expect(params.get("order")).toBe("created_at.desc,id.desc");
      if (name === "documents") expect(params.get("file_name")).toBe("ilike.%receipt%");
    });
    it(`${name} denies anonymous users before querying records`, async () => {
      state.authorized = false;
      expect((await get(new NextRequest(`https://warrantee.io${path}`))).status).toBe(401);
      expect(state.urls).toHaveLength(0);
    });
    it(`${name} bounds invalid pagination`, async () => {
      await get(new NextRequest(`https://warrantee.io${path}?offset=-1&limit=99999`));
      expect(state.urls[0].searchParams.get("offset")).toBe("0");
      expect(state.urls[0].searchParams.get("limit")).toBe(name === "documents" ? "200" : "1000");
    });
  }
});
