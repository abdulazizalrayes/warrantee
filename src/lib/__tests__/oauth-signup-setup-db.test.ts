import { beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const isolated = process.env.WARRANTEE_ISOLATED_E2E === "1";
describe.skipIf(!isolated)("isolated durable OAuth signup setup", () => {
  let admin: SupabaseClient;
  let anon: SupabaseClient;
  let url: string;
  let anonKey: string;

  beforeAll(async () => {
    if (process.env.VERCEL || process.env.VERCEL_ENV) throw new Error("Refusing hosted database tests");
    url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const parsed = new URL(url);
    if (parsed.origin !== "http://127.0.0.1:54321" || parsed.pathname !== "/" || parsed.username || parsed.password || parsed.search || parsed.hash) {
      throw new Error("Refusing a non-disposable database target");
    }
    anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    if (!anonKey || !serviceKey || !/^[a-f0-9]{32}$/.test(process.env.ISOLATED_RUN_ID || "")) throw new Error("Missing isolated identity");
    admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    anon = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const marker = await admin.from("isolated_journey_marker").select("run_id");
    if (marker.error || marker.data?.length !== 1 || marker.data[0].run_id !== process.env.ISOLATED_RUN_ID) {
      throw new Error("Disposable backend marker mismatch");
    }
  });

  async function actor() {
    const email = `synthetic-oauth-${randomUUID()}@example.invalid`;
    const password = `Synthetic-${randomUUID()}-test!`;
    const issuedAt = new Date(Date.now() - 1000).toISOString();
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true,
      app_metadata: { provider: "google" }, user_metadata: { full_name: "Synthetic OAuth actor", account_type: "consumer" } });
    expect(created.error).toBeNull();
    const user = created.data.user!;
    const signed = await createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } }).auth.signInWithPassword({ email, password });
    expect(signed.error).toBeNull();
    // Seed only server-owned provider evidence; no external OAuth exchange is implied.
    const seeded = await admin.auth.admin.updateUserById(user.id, { app_metadata: { provider: "google" } });
    expect(seeded.error).toBeNull();
    expect(seeded.data.user!.app_metadata.provider).toBe("google");
    const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${signed.data.session!.access_token}` } } });
    return { id: user.id, createdAt: user.created_at, issuedAt, flowId: randomUUID(), client };
  }
  function register(a: Awaited<ReturnType<typeof actor>>, overrides: Record<string, unknown> = {}, client = admin) {
    return client.rpc("register_oauth_signup_setup", {
      p_user_id: a.id, p_company_name: "Synthetic OAuth Co", p_provider: "google", p_flow_id: a.flowId, p_issued_at: a.issuedAt, ...overrides,
    });
  }
  function resume(userId: string, client = admin) {
    return client.rpc("resume_oauth_signup_setup", { p_user_id: userId });
  }
  async function rows(table: string, ownerColumn: string, userId: string) {
    const result = await admin.from(table).select("*").eq(ownerColumn, userId);
    expect(result.error).toBeNull();
    return result.data!;
  }
  async function setupJob(userId: string) {
    const result = await admin.from("async_jobs").select("*").eq("owner_user_id", userId).eq("job_type", "oauth_signup_setup").single();
    expect(result.error).toBeNull();
    return result.data!;
  }

  it("registers one owner-bound minimal payload and never replaces the initial company or flow", async () => {
    const a = await actor();
    expect((await register(a)).error).toBeNull();
    expect((await register(a, { p_company_name: "Replacement must not apply", p_flow_id: randomUUID() })).error).toBeNull();
    const jobs = await rows("async_jobs", "owner_user_id", a.id);
    expect(jobs).toHaveLength(1);
    expect(jobs[0].job_type).toBe("oauth_signup_setup");
    expect(jobs[0].idempotency_key).toBe(`oauth_signup_setup:${a.id}`);
    expect(jobs[0].payload).toEqual({ company_name: "Synthetic OAuth Co", provider: "google", flow_id: a.flowId });
    expect(jobs[0].status).toBe("queued");
  });
  it("serializes concurrent registration and completion into one company and membership", async () => {
    const a = await actor();
    expect((await Promise.all(Array.from({ length: 6 }, () => register(a)))).every((result) => !result.error)).toBe(true);
    const completions = await Promise.all(Array.from({ length: 6 }, () => resume(a.id)));
    expect(completions.every((result) => !result.error)).toBe(true);
    expect(completions.filter((result) => result.data === "completed")).toHaveLength(1);
    expect(completions.filter((result) => result.data === "already_completed")).toHaveLength(5);
    expect(await rows("companies", "created_by", a.id)).toHaveLength(1);
    expect(await rows("company_members", "user_id", a.id)).toHaveLength(1);
    expect((await setupJob(a.id)).status).toBe("completed");
    // Company deletion cascades company-bound jobs; this terminal guard must survive it.
    expect((await setupJob(a.id)).company_id).toBeNull();
    expect((await rows("profiles", "id", a.id))[0].account_type).toBe("business");
  });
  it("never regrants a revoked or downgraded membership after completed-flow replay", async () => {
    const a = await actor();
    expect((await register(a)).error).toBeNull();
    expect((await resume(a.id)).data).toBe("completed");
    const membership = (await rows("company_members", "user_id", a.id))[0];
    expect((await admin.from("company_members").update({ is_active: false, role: "viewer" }).eq("id", membership.id)).error).toBeNull();
    expect((await admin.from("profiles").update({ account_type: "consumer", company: null }).eq("id", a.id)).error).toBeNull();
    expect((await register(a)).error).toBeNull();
    expect((await resume(a.id)).data).toBe("already_completed");
    expect((await rows("company_members", "user_id", a.id))[0]).toMatchObject({ is_active: false, role: "viewer" });
    expect((await rows("profiles", "id", a.id))[0].account_type).toBe("consumer");
    expect(await rows("companies", "created_by", a.id)).toHaveLength(1);
  });
  it("keeps the pending marker on transient failure and resumes after the original cookie would expire", async () => {
    const a = await actor();
    expect((await register(a)).error).toBeNull();
    const profile = (await rows("profiles", "id", a.id))[0];
    expect((await admin.from("profiles").delete().eq("id", a.id)).error).toBeNull();
    expect((await resume(a.id)).error).not.toBeNull();
    expect((await setupJob(a.id)).status).toBe("queued");
    expect(await rows("companies", "created_by", a.id)).toHaveLength(0);
    expect(await rows("company_members", "user_id", a.id)).toHaveLength(0);
    expect((await admin.from("profiles").insert(profile)).error).toBeNull();
    expect((await admin.from("async_jobs").update({ created_at: new Date(Date.now() - 3600_000).toISOString() }).eq("owner_user_id", a.id).eq("job_type", "oauth_signup_setup")).error).toBeNull();
    expect((await resume(a.id)).data).toBe("completed");
    expect((await setupJob(a.id)).status).toBe("completed");
    expect(await rows("company_members", "user_id", a.id)).toHaveLength(1);
  });
  it("does not convert an existing account that has no registered initial signup", async () => {
    const a = await actor();
    expect((await resume(a.id)).data).toBe("absent");
    expect((await rows("profiles", "id", a.id))[0].account_type).toBe("consumer");
    expect(await rows("companies", "created_by", a.id)).toHaveLength(0);
  });
  it.each(["business", "inactive-membership"])("does not regrant privileges for a pending owner with %s state", async (mode) => {
    const a = await actor();
    expect((await register(a)).error).toBeNull();
    if (mode === "business") {
      expect((await admin.from("profiles").update({ account_type: "business" }).eq("id", a.id)).error).toBeNull();
    } else {
      const company = await admin.from("companies").insert({ name: "Synthetic prior company", company_role: "both", created_by: a.id }).select("id").single();
      expect(company.error).toBeNull();
      expect((await admin.from("company_members").insert({ user_id: a.id, company_id: company.data!.id, role: "viewer", is_active: false })).error).toBeNull();
    }
    expect((await resume(a.id)).data).toBe("skipped");
    expect((await setupJob(a.id)).status).toBe("completed");
    expect((await rows("company_members", "user_id", a.id)).every((row) => row.is_active === false && row.role === "viewer")).toBe(true);
    expect((await rows("companies", "created_by", a.id)).filter((row) => row.name === "Synthetic OAuth Co")).toHaveLength(0);
  });
  it("denies anonymous and authenticated registration, resume, and marker access", async () => {
    const a = await actor();
    expect((await register(a)).error).toBeNull();
    for (const client of [anon, a.client]) {
      expect((await register(a, {}, client)).error).not.toBeNull();
      expect((await resume(a.id, client)).error).not.toBeNull();
      expect((await client.from("async_jobs").select("*")).error).not.toBeNull();
      expect((await client.from("async_jobs").update({ status: "completed" }).eq("owner_user_id", a.id)).error).not.toBeNull();
    }
    expect((await setupJob(a.id)).status).toBe("queued");
  });
  it.each(["wrong-provider", "expired", "future", "existing-account"])("rejects registration with %s evidence", async (mode) => {
    const a = await actor();
    const override: Record<string, unknown> = {};
    if (mode === "wrong-provider") override.p_provider = "apple";
    if (mode === "expired") override.p_issued_at = new Date(Date.now() - 601_000).toISOString();
    if (mode === "future") override.p_issued_at = new Date(Date.now() + 60_000).toISOString();
    if (mode === "existing-account") {
      await new Promise((resolve) => setTimeout(resolve, 10));
      override.p_issued_at = new Date(Date.parse(a.createdAt) + 1).toISOString();
    }
    expect((await register(a, override)).error).not.toBeNull();
    expect(await rows("async_jobs", "owner_user_id", a.id)).toHaveLength(0);
    expect(await rows("company_members", "user_id", a.id)).toHaveLength(0);
  });
  it("keeps the owner unique across terminal states and never restarts failed setup", async () => {
    const a = await actor();
    expect((await register(a)).error).toBeNull();
    expect((await admin.from("async_jobs").update({ status: "failed" }).eq("owner_user_id", a.id).eq("job_type", "oauth_signup_setup")).error).toBeNull();
    expect((await register(a, { p_company_name: "Do not replace failed job", p_flow_id: randomUUID() })).error).toBeNull();
    expect(await rows("async_jobs", "owner_user_id", a.id)).toHaveLength(1);
    expect((await setupJob(a.id)).status).toBe("failed");
    const resumed = await resume(a.id);
    expect(resumed.data).not.toBe("completed");
    expect(await rows("company_members", "user_id", a.id)).toHaveLength(0);
  });
});
