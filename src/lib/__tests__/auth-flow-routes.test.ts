import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { bindOAuthFlowIntentToUser, createOAuthFlowIntent, isNewOAuthSignup, readOAuthFlowIntent } from "@/lib/server/oauth-flow-intent";
import { OAUTH_SIGNUP_INTENT_COOKIE } from "@/lib/oauth-signup-intent";
import { buildOAuthSetupRetryPath } from "@/lib/oauth-setup-recovery";

const mocks = vi.hoisted(() => ({
  exchange: vi.fn(), getUser: vi.fn(), rpc: vi.fn(), enqueue: vi.fn(), after: vi.fn(), process: vi.fn(),
  onboard: vi.fn(), memberships: new Set<string>(),
  setupJobs: new Map<string, { companyName: string; completed: boolean }>(),
}));
vi.mock("next/server", async () => ({ ...await vi.importActual<typeof import("next/server")>("next/server"), after: mocks.after }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient: async () => ({ auth: { exchangeCodeForSession: mocks.exchange, getUser: mocks.getUser } }) }));
vi.mock("@/lib/supabase-server", () => ({ createSupabaseServerClient: async () => ({ auth: { exchangeCodeForSession: mocks.exchange } }) }));
vi.mock("@/lib/supabase/admin", () => ({ createSupabaseAdminClient: () => ({ rpc: mocks.rpc }) }));
vi.mock("@/lib/server/auth-followup-jobs", () => ({ enqueueAuthFollowupJobs: mocks.enqueue, processAuthFollowupJobs: mocks.process }));
import { POST } from "@/app/api/auth/oauth-intent/route";
import { GET } from "@/app/auth/callback/route";
import { GET as localizedGET } from "@/app/[locale]/auth/callback/route";

const now = Date.now();
function flow() {
  return createOAuthFlowIntent({ accountType: "business", companyName: "Synthetic Test Co", provider: "google", next: "/ar/dashboard" }, now - 1000)!;
}
function callback(flowValue = flow(), next = "/ar/dashboard", code = "synthetic") {
  return new NextRequest(`https://warrantee.test/auth/callback?code=${code}&next=${encodeURIComponent(next)}&signup_flow=${flowValue.intent.flowId}`, {
    headers: { cookie: `${OAUTH_SIGNUP_INTENT_COOKIE}=${flowValue.value}` },
  });
}
function expectExpired(response: Response) {
  const cookie = response.headers.get("set-cookie") || "";
  expect(cookie).toContain(`${OAUTH_SIGNUP_INTENT_COOKIE}=`);
  expect(cookie).toContain("Path=/auth/callback;");
  expect(cookie).toContain("Max-Age=0");
  // A browser removes only the same name/domain/path tuple, not a root-path cookie.
  expect(cookie).not.toContain("Path=/;");
}
beforeEach(() => {
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "synthetic-test-signing-key");
  vi.clearAllMocks();
  mocks.setupJobs.clear();
  mocks.memberships.clear();
  mocks.exchange.mockResolvedValue({ error: null });
  mocks.getUser.mockResolvedValue({ error: null, data: { user: { id: "synthetic-user", created_at: new Date(now).toISOString(), app_metadata: { provider: "google" } } } });
  mocks.onboard.mockImplementation(async (userId: string) => { mocks.memberships.add(userId); });
  mocks.rpc.mockImplementation((name: string, args: { p_user_id: string; p_company_name?: string }) => ({ abortSignal: async () => {
    const job = mocks.setupJobs.get(args.p_user_id);
    if (name === "register_oauth_signup_setup") {
      if (!job) mocks.setupJobs.set(args.p_user_id, { companyName: args.p_company_name!, completed: false });
      return { error: null, data: "registered" };
    }
    if (name === "resume_oauth_signup_setup") {
      if (!job) return { error: null, data: "absent" };
      if (job.completed) return { error: null, data: "already_completed" };
      try {
        await mocks.onboard(args.p_user_id, job.companyName);
        job.completed = true;
        return { error: null, data: "completed" };
      } catch {
        return { error: { message: "synthetic transient failure" }, data: null };
      }
    }
    throw new Error("Unexpected auth RPC");
  } }));
  mocks.enqueue.mockResolvedValue(undefined);
});
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });

describe("signed OAuth flow binding", () => {
  it("accepts the exact issued flow and rejects mismatched nonce, destination, tampering, and expiry", () => {
    const value = flow();
    expect(readOAuthFlowIntent(value.value, value.intent.flowId, "/ar/dashboard")).toEqual(value.intent);
    expect(readOAuthFlowIntent(value.value, "old-flow", "/ar/dashboard")).toBeNull();
    expect(readOAuthFlowIntent(value.value, value.intent.flowId, "/en/dashboard")).toBeNull();
    expect(readOAuthFlowIntent(`${value.value}x`, value.intent.flowId, "/ar/dashboard")).toBeNull();
    expect(readOAuthFlowIntent(value.value, value.intent.flowId, "/ar/dashboard", now + 600_000)).toBeNull();
  });
  it("never treats an older or wrong-provider account as a new signup", () => {
    const { intent } = flow();
    expect(isNewOAuthSignup({ created_at: new Date(now - 5000).toISOString(), app_metadata: { provider: "google" } }, intent)).toBe(false);
    expect(isNewOAuthSignup({ created_at: new Date(now).toISOString(), app_metadata: { provider: "apple" } }, intent)).toBe(false);
  });
});

describe("intent preparation browser cookie path", () => {
  function post(body: unknown, origin = "https://warrantee.test") {
    return POST(new NextRequest("https://warrantee.test/api/auth/oauth-intent", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body) }));
  }
  it("sets the exact callback path and returns the current nonce", async () => {
    const response = await post({ accountType: "consumer", provider: "google", next: "/ar/dashboard" });
    expect(response.status).toBe(200);
    expect((await response.json()).flowId).toEqual(expect.any(String));
    expect(response.headers.get("set-cookie")).toContain("Path=/auth/callback;");
  });
  it.each([
    [{ accountType: null }, "https://warrantee.test", 200],
    [{ accountType: "business", provider: "google" }, "https://warrantee.test", 400],
    [{ accountType: "consumer", provider: "google" }, "https://other.test", 403],
  ])("expires the exact cookie on rejected/reset preparations", async (body, origin, status) => {
    const response = await post(body, origin);
    expect(response.status).toBe(status);
    expectExpired(response);
  });
  it("fails retryably when signing is unavailable", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    const response = await post({ accountType: "consumer", provider: "google" });
    expect(response.status).toBe(503);
    expectExpired(response);
  });
});

describe("callback outcomes", () => {
  it("onboards only a newly created approved business flow and durably enqueues", async () => {
    const response = await GET(callback());
    expect(response.headers.get("location")).toBe("https://warrantee.test/ar/dashboard");
    expect(mocks.rpc).toHaveBeenCalledWith("register_oauth_signup_setup", {
      p_user_id: "synthetic-user", p_company_name: "Synthetic Test Co", p_provider: "google",
      p_flow_id: expect.any(String), p_issued_at: expect.any(String),
    });
    expect(mocks.rpc).toHaveBeenCalledWith("resume_oauth_signup_setup", { p_user_id: "synthetic-user" });
    expect(mocks.onboard).toHaveBeenCalledWith("synthetic-user", "Synthetic Test Co");
    expect(mocks.rpc).not.toHaveBeenCalledWith("complete_business_onboarding", expect.anything());
    expect(mocks.enqueue).toHaveBeenCalledOnce();
    expectExpired(response);
  });
  it("ignores stale signup intent for an existing account", async () => {
    mocks.getUser.mockResolvedValue({ error: null, data: { user: { id: "existing", created_at: "2020-01-01T00:00:00Z", app_metadata: { provider: "google" } } } });
    const response = await GET(callback());
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("resume_oauth_signup_setup", { p_user_id: "existing" });
    expect(mocks.onboard).not.toHaveBeenCalled();
    expect(mocks.enqueue).not.toHaveBeenCalled();
    expectExpired(response);
  });
  it("rejects a mismatched signup destination without onboarding", async () => {
    const response = await GET(callback(flow(), "/en/dashboard"));
    expect(response.headers.get("location")).toContain("signup_intent_error");
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("resume_oauth_signup_setup", { p_user_id: "synthetic-user" });
    expect(mocks.onboard).not.toHaveBeenCalled();
    expectExpired(response);
  });
  it.each(["missing", "exchange", "throw", "user", "onboarding"])("expires on %s failure", async (mode) => {
    if (mode === "exchange") mocks.exchange.mockResolvedValue({ error: { message: "synthetic" } });
    if (mode === "throw") mocks.exchange.mockRejectedValue(new Error("synthetic"));
    if (mode === "user") mocks.getUser.mockResolvedValue({ error: { message: "synthetic" }, data: { user: null } });
    if (mode === "onboarding") mocks.onboard.mockRejectedValue(new Error("synthetic"));
    const request = mode === "missing" ? new NextRequest("https://warrantee.test/auth/callback") : callback();
    const response = await GET(request);
    expect(response.headers.get("location")).toContain(mode === "onboarding" ? "business_setup_error" : "auth_callback_error");
    expectExpired(response);
  });
  it("bounds a slow provider exchange and clears intent", async () => {
    vi.useFakeTimers();
    mocks.exchange.mockReturnValue(new Promise(() => {}));
    const response = GET(callback());
    await vi.advanceTimersByTimeAsync(8001);
    expectExpired(await response);
    expect((await response).headers.get("location")).toContain("auth_callback_error");
  });
  it("does not fail authentication when durable enqueue is unavailable", async () => {
    mocks.enqueue.mockRejectedValue(new Error("synthetic queue failure"));
    const response = await GET(callback());
    expect(response.headers.get("location")).toBe("https://warrantee.test/ar/dashboard");
    expectExpired(response);
    expect(mocks.after).not.toHaveBeenCalled();
  });
  it("redirects before a stalled follow-up provider and schedules only the current user", async () => {
    mocks.process.mockReturnValue(new Promise(() => {}));
    const response = await GET(callback());
    expect(response.headers.get("location")).toBe("https://warrantee.test/ar/dashboard");
    expect(mocks.process).not.toHaveBeenCalled();
    expect(mocks.after).toHaveBeenCalledOnce();
    const work = mocks.after.mock.calls[0][0] as () => Promise<void>;
    void work();
    expect(mocks.process).toHaveBeenCalledWith(expect.anything(), "synthetic-user");
  });
  it("never restores a revoked membership when a retained signed flow is replayed with a fresh code", async () => {
    const retained = flow();
    expect((await GET(callback(retained))).headers.get("location")).toBe("https://warrantee.test/ar/dashboard");
    expect(mocks.memberships.has("synthetic-user")).toBe(true);
    mocks.memberships.delete("synthetic-user");
    const replay = await GET(callback(retained, "/ar/dashboard", "fresh-synthetic-code"));
    expect(replay.headers.get("location")).toBe("https://warrantee.test/ar/dashboard");
    expect(mocks.onboard).toHaveBeenCalledOnce();
    expect(mocks.memberships.has("synthetic-user")).toBe(false);
    expectExpired(replay);
  });
  it("retains the signed cookie if initial durable registration is unavailable", async () => {
    const retained = flow();
    const implementation = mocks.rpc.getMockImplementation()!;
    mocks.rpc.mockImplementationOnce(() => ({ abortSignal: () => Promise.resolve({ error: { code: "synthetic" }, data: null }) }));
    const failed = await GET(callback(retained));
    expect(failed.headers.get("location")).toContain("business_setup_error");
    const recoveryCookie = failed.cookies.get(OAUTH_SIGNUP_INTENT_COOKIE)!.value;
    const recoveryIntent = readOAuthFlowIntent(recoveryCookie, retained.intent.flowId, "/ar/dashboard")!;
    expect(recoveryIntent.userId).toBe("synthetic-user");
    expect(recoveryIntent.expiresAt).toBe(retained.intent.expiresAt);
    expect(failed.headers.get("set-cookie")).not.toContain("Max-Age=600");
    expect(mocks.setupJobs.size).toBe(0);
    expect(mocks.onboard).not.toHaveBeenCalled();
    mocks.rpc.mockImplementation(implementation);
    const errorURL = new URL(failed.headers.get("location")!);
    expect(errorURL.searchParams.get("signup_flow")).toBe(retained.intent.flowId);
    const recovery = new NextRequest(`https://warrantee.test${buildOAuthSetupRetryPath(errorURL.searchParams.get("redirect")!, errorURL.searchParams.get("signup_flow"))}`, {
      headers: { cookie: `${OAUTH_SIGNUP_INTENT_COOKIE}=${recoveryCookie}` },
    });
    expect(recovery.nextUrl.searchParams.has("code")).toBe(false);
    mocks.exchange.mockClear();
    expect((await GET(recovery)).headers.get("location")).toBe("https://warrantee.test/ar/dashboard");
    expect(mocks.exchange).not.toHaveBeenCalled();
    expect(mocks.setupJobs.get("synthetic-user")?.completed).toBe(true);
  });
  it.each(["missing", "newer", "invalid"])("resumes durable setup after transient failure with %s intent", async (mode) => {
    const original = flow();
    mocks.onboard.mockRejectedValueOnce(new Error("synthetic temporary database failure"));
    const failed = await GET(callback(original));
    expect(failed.headers.get("location")).toContain("business_setup_error");
    expectExpired(failed);
    expect(mocks.setupJobs.get("synthetic-user")?.completed).toBe(false);
    expect(mocks.enqueue).not.toHaveBeenCalled();

    const newer = createOAuthFlowIntent({ accountType: "business", companyName: "Replacement must not apply", provider: "google", next: "/ar/dashboard" }, now + 1000)!;
    vi.useFakeTimers();
    vi.setSystemTime(now + 2000);
    const retry = mode === "missing"
      ? new NextRequest("https://warrantee.test/auth/callback?code=fresh&next=%2Far%2Fdashboard")
      : callback(mode === "newer" ? newer : original, mode === "invalid" ? "/en/dashboard" : "/ar/dashboard", "fresh");
    const resumed = await GET(retry);
    expect(resumed.headers.get("location")).toBe(`https://warrantee.test/${mode === "invalid" ? "en" : "ar"}/dashboard`);
    expect(mocks.rpc.mock.calls.filter(([name]) => name === "register_oauth_signup_setup")).toHaveLength(1);
    expect(mocks.onboard).toHaveBeenLastCalledWith("synthetic-user", "Synthetic Test Co");
    expect(mocks.setupJobs.get("synthetic-user")?.completed).toBe(true);
    expect(mocks.enqueue).toHaveBeenCalledOnce();
    expectExpired(resumed);
  });
  it("resumes only the authenticated owner, never another user's pending setup", async () => {
    mocks.setupJobs.set("other-user", { companyName: "Other Synthetic Co", completed: false });
    const response = await GET(new NextRequest("https://warrantee.test/auth/callback?code=fresh&next=%2Far%2Fdashboard"));
    expect(response.headers.get("location")).toBe("https://warrantee.test/ar/dashboard");
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("resume_oauth_signup_setup", { p_user_id: "synthetic-user" });
    expect(mocks.onboard).not.toHaveBeenCalled();
    expect(mocks.setupJobs.get("other-user")?.completed).toBe(false);
  });
  it("lets the current authenticated user resume pending setup without another provider exchange", async () => {
    mocks.setupJobs.set("synthetic-user", { companyName: "Original pending company", completed: false });
    const response = await GET(new NextRequest("https://warrantee.test/auth/callback?retry_setup=1&next=%2Far%2Fdashboard"));
    expect(response.headers.get("location")).toBe("https://warrantee.test/ar/dashboard");
    expect(mocks.exchange).not.toHaveBeenCalled();
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("resume_oauth_signup_setup", { p_user_id: "synthetic-user" });
    expect(mocks.onboard).toHaveBeenCalledExactlyOnceWith("synthetic-user", "Original pending company");
    expectExpired(response);
  });
  it("cannot register a signed intent using only an existing session and no exchanged code", async () => {
    const signed = flow();
    const response = await GET(new NextRequest(`https://warrantee.test/auth/callback?next=%2Far%2Fdashboard&signup_flow=${signed.intent.flowId}`, {
      headers: { cookie: `${OAUTH_SIGNUP_INTENT_COOKIE}=${signed.value}` },
    }));
    expect(response.headers.get("location")).toContain("auth_callback_error");
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.onboard).not.toHaveBeenCalled();
    expectExpired(response);
  });
  it("recovers a transient setup failure through the actual setup-error retry URL without a cookie or new code", async () => {
    mocks.onboard.mockRejectedValueOnce(new Error("synthetic transient"));
    const failed = await GET(callback());
    expectExpired(failed);
    const errorURL = new URL(failed.headers.get("location")!);
    const recovery = new NextRequest(`https://warrantee.test${buildOAuthSetupRetryPath(errorURL.searchParams.get("redirect")!, errorURL.searchParams.get("signup_flow"))}`);
    mocks.exchange.mockClear();
    const response = await GET(recovery);
    expect(response.headers.get("location")).toBe("https://warrantee.test/ar/dashboard");
    expect(mocks.exchange).not.toHaveBeenCalled();
    expect(mocks.onboard).toHaveBeenCalledTimes(2);
    expect(mocks.rpc.mock.calls.filter(([name]) => name === "register_oauth_signup_setup")).toHaveLength(1);
  });
  it.each(["expired", "existing-user", "wrong-provider", "missing-cookie", "switched-user", "unbound-intent"])("clears terminal %s registration recovery without converting an arbitrary account", async (mode) => {
    const retained = flow();
    if (mode === "expired") { vi.useFakeTimers(); vi.setSystemTime(retained.intent.expiresAt + 1); }
    if (mode === "existing-user") mocks.getUser.mockResolvedValue({ error: null, data: { user: { id: "existing", created_at: "2020-01-01T00:00:00Z", app_metadata: { provider: "google" } } } });
    if (mode === "wrong-provider") mocks.getUser.mockResolvedValue({ error: null, data: { user: { id: "synthetic-user", created_at: new Date(now).toISOString(), app_metadata: { provider: "apple" } } } });
    if (mode === "switched-user") mocks.getUser.mockResolvedValue({ error: null, data: { user: { id: "other-new-user", created_at: new Date(now).toISOString(), app_metadata: { provider: "google" } } } });
    const request = new NextRequest(`https://warrantee.test${buildOAuthSetupRetryPath("/ar/dashboard", retained.intent.flowId)}`, {
      headers: mode === "missing-cookie" ? {} : { cookie: `${OAUTH_SIGNUP_INTENT_COOKIE}=${mode === "unbound-intent" ? retained.value : bindOAuthFlowIntentToUser(retained.intent, "synthetic-user")}` },
    });
    const response = await GET(request);
    expect(response.headers.get("location")).toContain("business_setup_expired");
    expectExpired(response);
    expect(mocks.onboard).not.toHaveBeenCalled();
    expect(mocks.rpc.mock.calls.filter(([name]) => name === "register_oauth_signup_setup")).toHaveLength(0);
  });
  it("resumes a durable pending job through explicit recovery even after the signed cookie expires", async () => {
    const retained = flow();
    mocks.setupJobs.set("synthetic-user", { companyName: "Original expired-cookie company", completed: false });
    vi.useFakeTimers();
    vi.setSystemTime(retained.intent.expiresAt + 1);
    const response = await GET(new NextRequest(`https://warrantee.test${buildOAuthSetupRetryPath("/ar/dashboard", retained.intent.flowId)}`, {
      headers: { cookie: `${OAUTH_SIGNUP_INTENT_COOKIE}=${retained.value}` },
    }));
    expect(response.headers.get("location")).toBe("https://warrantee.test/ar/dashboard");
    expect(mocks.exchange).not.toHaveBeenCalled();
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("resume_oauth_signup_setup", { p_user_id: "synthetic-user" });
    expect(mocks.onboard).toHaveBeenCalledExactlyOnceWith("synthetic-user", "Original expired-cookie company");
    expectExpired(response);
  });
  it("clears the original cookie when a failed registration request outlasts its signed expiry", async () => {
    const retained = flow();
    vi.useFakeTimers();
    vi.setSystemTime(now);
    mocks.rpc.mockImplementationOnce(() => ({ abortSignal: async () => {
      vi.setSystemTime(retained.intent.expiresAt + 1);
      return { error: { code: "synthetic" }, data: null };
    } }));
    const response = await GET(callback(retained));
    expect(response.headers.get("location")).toContain("business_setup_expired");
    expectExpired(response);
    expect(mocks.onboard).not.toHaveBeenCalled();
  });
  it("requires a live authenticated user before any explicit setup retry", async () => {
    mocks.getUser.mockResolvedValue({ error: { code: "synthetic" }, data: { user: null } });
    const response = await GET(new NextRequest(`https://warrantee.test${buildOAuthSetupRetryPath("/ar/dashboard")}`));
    expect(response.headers.get("location")).toContain("auth_callback_error");
    expect(mocks.rpc).not.toHaveBeenCalled();
    expectExpired(response);
  });
});

describe("localized callback safe redirect", () => {
  it.each(["https://attacker.test", "//attacker.test", "/\\attacker.test", "\\\\attacker.test"])("rejects %s", async (next) => {
    const response = await localizedGET(new Request(`https://warrantee.test/ar/auth/callback?code=synthetic&next=${encodeURIComponent(next)}`));
    expect(new URL(response.headers.get("location")!).origin).toBe("https://warrantee.test");
    expectExpired(response);
  });
  it("preserves safe localized query/hash", async () => {
    const response = await localizedGET(new Request("https://warrantee.test/ar/auth/callback?code=synthetic&next=%2Far%2Fdashboard%3Ftab%3Dclaims%23open"));
    expect(response.headers.get("location")).toBe("https://warrantee.test/ar/dashboard?tab=claims#open");
    expectExpired(response);
  });
});
