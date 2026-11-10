import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { createSupabaseAdminClient } from "@/lib/supabase/admin";
const mocks = vi.hoisted(() => ({ crm: vi.fn() }));
vi.mock("@/lib/crm", () => ({ upsertCrmContact: mocks.crm }));
import { enqueueAuthFollowupJobs, processAuthFollowupJobs } from "@/lib/server/auth-followup-jobs";

type Row = Record<string, unknown>;
function database(jobs: Row[] = []) {
  const rows = { async_jobs: jobs, profiles: [{ id: "synthetic-user", email: "synthetic@example.invalid", full_name: "Synthetic <Test>" }] };
  const calls: string[] = [];
  let inserts = 0;
  const from = (table: keyof typeof rows) => {
    calls.push(table);
    let mutation: Row | undefined;
    let inserted: Row[] | undefined;
    let limit = Infinity;
    let single = false;
    const filters: Array<(row: Row) => boolean> = [];
    const query = {
      select: () => query,
      eq: (key: string, value: unknown) => { filters.push((row) => row[key] === value); return query; },
      in: (key: string, values: unknown[]) => { filters.push((row) => values.includes(row[key])); return query; },
      lte: (key: string, value: string) => { filters.push((row) => String(row[key]) <= value); return query; },
      order: () => query,
      limit: (value: number) => { limit = value; return query; },
      abortSignal: () => query,
      single: () => { single = true; return query; },
      maybeSingle: () => { single = true; return query; },
      update: (value: Row) => { mutation = value; return query; },
      insert: (value: Row[]) => { inserted = value; inserts += 1; return query; },
      then: (resolve: (value: { data: Row | Row[] | null; error: null }) => unknown) => {
        if (inserted) jobs.push(...inserted.map((row, index) => ({ id: `insert-${inserts}-${index}`, status: "queued", attempts: 0, available_at: new Date(0).toISOString(), ...row })));
        const selected: Row[] = rows[table].filter((row) => filters.every((filter) => filter(row))).slice(0, limit);
        if (mutation) selected.forEach((row) => Object.assign(row, mutation));
        return Promise.resolve(resolve({ data: single ? selected[0] || null : selected.map((row) => ({ ...row })), error: null }));
      },
    };
    return query;
  };
  return { admin: { from } as unknown as ReturnType<typeof createSupabaseAdminClient>, jobs, calls, inserts: () => inserts };
}
function job(type = "auth_signup_welcome", overrides: Row = {}) {
  return { id: "synthetic-job", owner_user_id: "synthetic-user", job_type: type, idempotency_key: `${type}:synthetic-user`, status: "queued", attempts: 0, max_attempts: 5, available_at: new Date(0).toISOString(), payload: { locale: "en" }, ...overrides };
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("REAL NETWORK DENIED IN AUTH TESTS"); }));
  vi.stubEnv("RESEND_API_KEY", "synthetic-test-key");
  mocks.crm.mockResolvedValue({ enabled: true, provider: "twenty", contactId: "synthetic" });
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers(); });

describe("durable auth enqueue", () => {
  it("batch inserts only owner references and locale, and dedupes subsequent login attempts", async () => {
    const db = database();
    await enqueueAuthFollowupJobs(db.admin, "synthetic-user", "ar");
    expect(db.inserts()).toBe(1);
    expect(db.jobs).toHaveLength(2);
    expect(db.jobs.map((row) => row.payload)).toEqual([{ locale: "ar" }, { locale: "ar" }]);
    expect(JSON.stringify(db.jobs)).not.toContain("@example");
    expect(JSON.stringify(db.jobs)).not.toContain("token");
    await enqueueAuthFollowupJobs(db.admin, "synthetic-user", "en");
    expect(db.inserts()).toBe(1);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("does not resurrect completed or failed uncertain sends", async () => {
    const db = database([job("auth_signup_welcome", { status: "failed" }), job("auth_signup_crm", { status: "completed" })]);
    await enqueueAuthFollowupJobs(db.admin, "synthetic-user", "en");
    expect(db.inserts()).toBe(0);
  });
  it("bounds the entire enqueue under three seconds", async () => {
    vi.useFakeTimers();
    const query = { eq: () => query, in: () => query, abortSignal: () => new Promise(() => {}) };
    const admin = { from: () => ({ select: () => query }) } as unknown as ReturnType<typeof createSupabaseAdminClient>;
    const pending = enqueueAuthFollowupJobs(admin, "synthetic-user", "en");
    const rejection = expect(pending).rejects.toThrow("timed out");
    await vi.advanceTimersByTimeAsync(2501);
    await rejection;
  });
});

describe("bounded auth job processor", () => {
  it("accepts welcome once with provider idempotency and owner lookup", async () => {
    const db = database([job()]);
    vi.mocked(fetch).mockResolvedValue(Response.json({ id: "synthetic-receipt" }));
    expect(await processAuthFollowupJobs(db.admin)).toEqual({ completed: 1, retried: 0, failed: 0 });
    expect(db.jobs[0].result).toEqual({ provider_accepted: true });
    const call = vi.mocked(fetch).mock.calls[0];
    expect(call[0]).toBe("https://api.resend.com/emails");
    expect(call[1]?.headers).toMatchObject({ "Idempotency-Key": "auth_signup_welcome:synthetic-user" });
    expect(call[1]?.body).toContain("Synthetic &lt;Test&gt;");
    await processAuthFollowupJobs(db.admin);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("retries unavailable CRM without invoking mail", async () => {
    const db = database([job("auth_signup_crm")]);
    mocks.crm.mockResolvedValue({ enabled: false, reason: "missing_api_key" });
    expect(await processAuthFollowupJobs(db.admin)).toEqual({ completed: 0, retried: 1, failed: 0 });
    expect(db.jobs[0].status).toBe("retry");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("records missing email config as retry without dispatching", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const db = database([job()]);
    expect(await processAuthFollowupJobs(db.admin)).toEqual({ completed: 0, retried: 1, failed: 0 });
    expect(db.jobs[0].result).toBeUndefined();
    expect(fetch).not.toHaveBeenCalled();
  });
  it("quarantines uncertain provider sends and never sends again", async () => {
    const db = database([job()]);
    vi.mocked(fetch).mockRejectedValue(new Error("synthetic lost response"));
    expect(await processAuthFollowupJobs(db.admin)).toEqual({ completed: 0, retried: 0, failed: 1 });
    expect(db.jobs[0].last_error_code).toBe("welcome_delivery_uncertain");
    expect(db.jobs[0].result).toEqual({ dispatch_started: true });
    await processAuthFollowupJobs(db.admin);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("does not resend a recovered stale dispatch", async () => {
    const db = database([job("auth_signup_welcome", { result: { dispatch_started: true }, status: "retry" })]);
    expect(await processAuthFollowupJobs(db.admin)).toEqual({ completed: 0, retried: 0, failed: 1 });
    expect(fetch).not.toHaveBeenCalled();
  });
  it("ignores unrelated jobs and caps each batch", async () => {
    const db = database([job("other_workflow", { id: "unrelated" }), job("auth_signup_crm"), job("auth_signup_crm", { id: "two" }), job("auth_signup_crm", { id: "three" })]);
    await processAuthFollowupJobs(db.admin);
    expect(mocks.crm).toHaveBeenCalledTimes(2);
    expect(db.jobs[0].status).toBe("queued");
    expect(db.jobs[3].status).toBe("queued");
  });
  it("claims atomically against another worker", async () => {
    const db = database([job("auth_signup_crm")]);
    await Promise.all([processAuthFollowupJobs(db.admin), processAuthFollowupJobs(db.admin)]);
    expect(mocks.crm).toHaveBeenCalledTimes(1);
  });
  it("scopes callback processing to the newly signed-up owner", async () => {
    const db = database([job("auth_signup_crm", { id: "unrelated", owner_user_id: "other-user" }), job("auth_signup_crm")]);
    await processAuthFollowupJobs(db.admin, "synthetic-user");
    expect(mocks.crm).toHaveBeenCalledTimes(1);
    expect(db.jobs[0].status).toBe("queued");
  });
  it("never consumes the durable OAuth setup marker as a provider follow-up job", async () => {
    const db = database([job("oauth_signup_setup"), job("auth_signup_crm", { id: "crm" })]);
    expect(await processAuthFollowupJobs(db.admin, "synthetic-user")).toEqual({ completed: 1, retried: 0, failed: 0 });
    expect(db.jobs[0].status).toBe("queued");
    expect(mocks.crm).toHaveBeenCalledOnce();
    expect(fetch).not.toHaveBeenCalled();
  });
});
