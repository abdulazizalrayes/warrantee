import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { readFileSync } from "node:fs";

const state = vi.hoisted(() => ({
  auth: vi.fn(), rpc: vi.fn(), profile: { account_type: "consumer" } as { account_type: string } | null,
  profileError: null as unknown, membershipError: null as unknown, companyError: null as unknown,
  memberships: [] as { company_id: string }[], companies: [] as { id: string }[],
  reads: [] as { table: string; method: string; args: unknown[] }[], rateAllowed: true,
}));
const ACTOR = "11111111-1111-4111-8111-111111111111";
const COMPANY = "22222222-2222-4222-8222-222222222222";
const OTHER_COMPANY = "33333333-3333-4333-8333-333333333333";
const RESOURCE = "44444444-4444-4444-8444-444444444444";

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({
    auth: { getUser: state.auth }, rpc: state.rpc,
    from: (table: string) => {
      if (!["profiles", "company_members", "companies"].includes(table)) throw new Error("Direct data writes are forbidden in this test");
      const response = () => table === "profiles"
        ? { data: state.profile, error: state.profileError }
        : table === "company_members" ? { data: state.memberships, error: state.membershipError }
          : { data: state.companies, error: state.companyError };
      const query: Record<string, unknown> = {};
      for (const method of ["select", "eq", "in", "or", "is"]) {
        query[method] = (...args: unknown[]) => {
          state.reads.push({ table, method, args });
          return query;
        };
      }
      query.single = async () => response();
      query.then = (resolve: (result: unknown) => unknown) => Promise.resolve(response()).then(resolve);
      return query;
    },
  }),
}));
vi.mock("@/lib/rate-limit", () => ({
  apiRateLimit: async () => ({ success: state.rateAllowed }), getClientIp: () => "local-test",
  getRateLimitHeaders: () => ({}),
}));
import { POST } from "@/app/api/warranties/route";
import { validateManualIdempotencyKey } from "@/lib/server/warranty-creation";

const valid = { product_name: "Synthetic test product", start_date: "2026-11-10", end_date: "2027-11-10" };
function request(body: unknown = valid, headers: Record<string, string> = {}) {
  return new NextRequest("https://unit-test.invalid/api/warranties", {
    method: "POST", headers: { "content-type": "application/json", "user-agent": "Warrantee-QA/1.0", ...headers },
    body: JSON.stringify(body),
  });
}
function business() {
  state.profile = { account_type: "business" };
  state.memberships = [{ company_id: COMPANY }];
  state.companies = [{ id: COMPANY }];
}
beforeEach(() => {
  vi.clearAllMocks();
  state.rateAllowed = true;
  state.profile = { account_type: "consumer" };
  state.profileError = state.membershipError = state.companyError = null;
  state.memberships = []; state.companies = []; state.reads = [];
  state.auth.mockResolvedValue({ data: { user: { id: ACTOR } }, error: null });
  state.rpc.mockResolvedValue({ data: { data: { id: RESOURCE, status: "active" }, idempotent_replay: false }, error: null });
});

describe("manual warranty creation boundary", () => {
  it("leaves personal ownership to the session-bound transaction, ignoring body ownership and source claims", async () => {
    const response = await POST(request({ ...valid, user_id: "victim", created_by: "victim", issuer_user_id: "victim",
      account_type: "business", role: "platform_admin", source: "manual_with_documents", traffic_class: "human", approved_by: "victim" }));
    expect(response.status).toBe(201);
    expect(state.rpc).toHaveBeenCalledWith("create_manual_warranty", {
      p_warranty: { ...valid, issuer_company_id: null, status: "active", coverage_type: "standard" },
      p_idempotency_key: null, p_traffic_class: "qa",
    });
    expect(state.reads.some((read) => read.table === "company_members")).toBe(false);
  });
  it("resolves one authorized company without requiring a selector", async () => {
    business();
    expect((await POST(request())).status).toBe(201);
    expect(state.rpc.mock.calls[0][1].p_warranty.issuer_company_id).toBe(COMPANY);
    expect(state.reads).toContainEqual({ table: "company_members", method: "eq", args: ["is_active", true] });
    expect(state.reads).toContainEqual({ table: "company_members", method: "in", args: ["role", ["creator", "approver", "company_admin", "platform_admin"]] });
    expect(state.reads).toContainEqual({ table: "companies", method: "in", args: ["company_role", ["vendor", "both"]] });
    expect(state.reads).toContainEqual({ table: "companies", method: "or", args: ["is_archived.is.null,is_archived.eq.false"] });
  });
  it("returns a bounded actionable error for ambiguous company membership", async () => {
    business(); state.memberships.push({ company_id: OTHER_COMPANY }); state.companies.push({ id: OTHER_COMPANY });
    const response = await POST(request());
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.code).toBe("COMPANY_SELECTION_REQUIRED");
    expect(body.error).toContain("issuer_company_id");
    expect(JSON.stringify(body)).not.toContain(COMPANY);
    expect(state.rpc).not.toHaveBeenCalled();
  });
  it("validates an explicit issuer against the active membership set", async () => {
    business();
    const response = await POST(request({ ...valid, issuer_company_id: OTHER_COMPANY, role: "company_admin" }));
    expect(response.status).toBe(403);
    expect((await response.json()).code).toBe("ISSUER_MEMBERSHIP_REQUIRED");
    expect(state.rpc).not.toHaveBeenCalled();
  });
  it("allows explicitly selecting an authorized issuer", async () => {
    business(); state.memberships.push({ company_id: OTHER_COMPANY }); state.companies = [{ id: OTHER_COMPANY }];
    expect((await POST(request({ ...valid, issuer_company_id: OTHER_COMPANY }))).status).toBe(201);
    expect(state.rpc.mock.calls[0][1].p_warranty.issuer_company_id).toBe(OTHER_COMPANY);
    expect(state.reads).toContainEqual({ table: "companies", method: "in", args: ["id", [OTHER_COMPANY]] });
  });
  it("does not silently downgrade a business account with no issuer membership to personal", async () => {
    business(); state.memberships = [];
    expect((await POST(request())).status).toBe(403);
    expect(state.rpc).not.toHaveBeenCalled();
  });
  it("rejects a company binding for personal accounts", async () => {
    const response = await POST(request({ ...valid, issuer_company_id: COMPANY }));
    expect(response.status).toBe(403);
    expect((await response.json()).code).toBe("PERSONAL_COMPANY_NOT_ALLOWED");
    expect(state.rpc).not.toHaveBeenCalled();
  });
  it.each([false, 42, "not-a-uuid", {}, []])("rejects malformed issuer ID %j", async (issuer_company_id) => {
    expect((await POST(request({ ...valid, issuer_company_id }))).status).toBe(400);
    expect(state.rpc).not.toHaveBeenCalled();
  });
  it.each(["profile", "membership", "company"])("fails closed on %s lookup errors", async (which) => {
    business();
    if (which === "profile") state.profileError = { message: "private" };
    if (which === "membership") state.membershipError = { message: "private" };
    if (which === "company") state.companyError = { message: "private" };
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain("private");
    expect(state.rpc).not.toHaveBeenCalled();
  });
  it.each([null, [], false, "body"])("rejects non-object JSON %j", async (body) => {
    expect((await POST(request(body))).status).toBe(400);
    expect(state.rpc).not.toHaveBeenCalled();
  });
  it.each(["cancelled", "expired", "claimed", "renewed", "private-status"])("rejects a privileged/terminal creation state %s", async (status) => {
    expect((await POST(request({ ...valid, status }))).status).toBe(400);
    expect(state.rpc).not.toHaveBeenCalled();
  });
  it("retains rate and authentication gates", async () => {
    state.rateAllowed = false;
    expect((await POST(request())).status).toBe(429);
    expect(state.auth).not.toHaveBeenCalled();
    state.rateAllowed = true; state.auth.mockResolvedValue({ data: { user: null }, error: null });
    expect((await POST(request())).status).toBe(401);
    expect(state.rpc).not.toHaveBeenCalled();
  });
});

describe("transactional idempotency transport", () => {
  it.each(["short", "", "contains spaces", "nonascii-\u00e9"])("rejects invalid keys %j", (key) => {
    expect(() => validateManualIdempotencyKey(key)).toThrow("Idempotency-Key");
  });
  it("does not generate a new reference number on each retry and keeps the same key/body", async () => {
    await POST(request(valid, { "Idempotency-Key": "synthetic-retry-key" }));
    await POST(request(valid, { "Idempotency-Key": "synthetic-retry-key" }));
    expect(state.rpc.mock.calls[0]).toEqual(state.rpc.mock.calls[1]);
    expect(state.rpc.mock.calls[0][1].p_warranty).not.toHaveProperty("reference_number");
  });
  it("preserves durable replay status/shape and never generates client success events", async () => {
    state.rpc.mockResolvedValue({ data: { data: { id: RESOURCE, status: "pending_approval" }, idempotent_replay: true }, error: null });
    const response = await POST(request(valid, { "Idempotency-Key": "synthetic-retry-key" }));
    expect(response.status).toBe(201);
    expect(response.headers.get("Idempotency-Replayed")).toBe("true");
    expect(await response.json()).toEqual({ data: { id: RESOURCE, status: "pending_approval" }, idempotent_replay: true });
  });
  it.each(["IDEMPOTENCY_BODY_MISMATCH", "IDEMPOTENCY_IN_PROGRESS"])("maps %s without falling back to insert", async (message) => {
    state.rpc.mockResolvedValue({ data: null, error: { code: "P0001", message } });
    const response = await POST(request(valid, { "Idempotency-Key": "synthetic-retry-key" }));
    expect(response.status).toBe(409);
    expect((await response.json()).code).toBe(message);
    if (message === "IDEMPOTENCY_IN_PROGRESS") expect(response.headers.get("Retry-After")).toBe("5");
  });
  it("fails closed when the migration is not installed, without privileged clients", async () => {
    state.rpc.mockResolvedValue({ data: null, error: { code: "PGRST202", message: "private schema details" } });
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect((await response.json()).code).toBe("WARRANTY_CREATION_UNAVAILABLE");
    expect(state.rpc).toHaveBeenCalledOnce();
  });
  it("preserves quota conflict responses and does not log database contents", async () => {
    state.rpc.mockResolvedValue({ data: null, error: { code: "P0001", message: "warranty_limit_reached", details: "private" } });
    expect((await POST(request())).status).toBe(409);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      state.rpc.mockResolvedValue({ data: null, error: { code: "XX000", message: "private product details" } });
      expect((await POST(request())).status).toBe(500);
      expect(JSON.stringify(warn.mock.calls)).not.toContain("private");
    } finally { warn.mockRestore(); }
  });
  it("fails closed if a transaction returns no durable outcome", async () => {
    state.rpc.mockResolvedValue({ data: null, error: null });
    expect((await POST(request())).status).toBe(503);
  });
});

describe("migration contract (not a database concurrency proof)", () => {
  const sql = readFileSync(new URL("../../../supabase/migrations/20261110151140_manual_warranty_creation_transaction.sql", import.meta.url), "utf8");
  it("keeps warranty writes invoker-bound and the idempotency bridge private", () => {
    expect(sql).toMatch(/function public\.create_manual_warranty[\s\S]+?security invoker/);
    expect(sql).toContain("revoke all on function private.manual_warranty_idempotency");
    expect(sql).not.toMatch(/grant (all|insert|update|select).*api_idempotency_records/i);
    expect(sql).toContain("add column if not exists response_body jsonb");
    expect(sql).toContain("on public.activity_log as restrictive for insert to authenticated");
    expect(sql).toContain("with check (entity_type <> 'funnel_event')");
  });
  it("serializes before quota and retains hash/outcome/revocation checks", () => {
    expect(sql).toContain("create trigger aa_lock_warranty_creation_account");
    expect(sql).toContain("idempotency_row.request_hash <> p_hash");
    expect(sql).toContain("and w.deleted_at is null");
    expect(sql).toContain("cm.user_id = actor and cm.company_id = p_company_id and cm.is_active");
    expect(sql).toContain("actor_company_id uuid := new.issuer_company_id");
  });
  it("deduplicates milestones, excludes drafts/synthetic, and emits minimized metadata", () => {
    expect(sql).toContain("warranty_activation_milestone_once_idx");
    expect(sql).toContain("'server_warranty_creation', 'milestone', milestone");
    expect(sql).toContain("if traffic <> 'human' or new.status = 'draft' then return new");
    expect(sql).toContain("first_warranty_issued");
    expect(sql).toContain("then 'pending_approval'");
    expect(sql).not.toContain("'product_name', new.product_name");
  });
  it("guards every company write after issuer resolution without expanding approval roles", () => {
    expect(sql).toContain("create trigger zz_enforce_company_warranty_approval\nbefore insert or update on public.warranties");
    expect(sql).toContain("old.issuer_company_id is not null and new.issuer_company_id is distinct from old.issuer_company_id");
    expect(sql).toContain("new.status := 'pending_approval'");
    expect(sql).toContain("WARRANTY_APPROVAL_REQUIRED");
    expect(sql).toContain("WARRANTY_APPROVAL_FORBIDDEN");
    expect(sql).toContain("actor is distinct from approver");
    expect(sql).toContain("select p.role into platform_role from public.profiles p where p.id = approver for share");
    expect(sql).toContain("cm.role in ('approver', 'company_admin', 'platform_admin') for share");
    expect(sql).toContain("revoke all on function private.enforce_company_warranty_approval() from public, anon, authenticated");
  });
  it("keeps attachment finalization invoker-bound and serializes one insert plus audit", () => {
    const finalize = sql.slice(sql.indexOf("create or replace function public.finalize_warranty_document"));
    expect(finalize).toContain("returns jsonb language plpgsql security invoker set search_path = ''");
    expect(finalize.indexOf("pg_advisory_xact_lock")).toBeLessThan(finalize.indexOf("select * into document"));
    expect(finalize).toContain("from storage.objects o where o.bucket_id = 'warranty-documents' and o.name = path");
    expect(finalize).toContain("DOCUMENT_BODY_MISMATCH");
    expect(finalize).toContain("return jsonb_build_object('data', to_jsonb(document), 'idempotent_replay', true)");
    expect(finalize).toContain("insert into public.activity_log");
    expect(finalize).not.toMatch(/create unique index|security definer/i);
  });
});
