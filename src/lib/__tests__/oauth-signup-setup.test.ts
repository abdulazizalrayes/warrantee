import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createOAuthFlowIntent } from "@/lib/server/oauth-flow-intent";
import { resumeOAuthSignupSetup } from "@/lib/server/oauth-signup-setup";

const now = Date.now();
const user = { id: "synthetic-current-user", created_at: new Date(now).toISOString(), app_metadata: { provider: "google" } };
const rpc = vi.fn();
const admin = { rpc } as unknown as ReturnType<typeof createSupabaseAdminClient>;
function intent() {
  return createOAuthFlowIntent({ accountType: "business", companyName: "Synthetic Co", provider: "google", next: "/en/dashboard" }, now - 1000)!.intent;
}
beforeEach(() => {
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "synthetic-signing-key");
  vi.useFakeTimers();
  vi.setSystemTime(now);
  rpc.mockReset();
  rpc.mockImplementation((name) => ({ abortSignal: () => Promise.resolve({ error: null, data: name === "resume_oauth_signup_setup" ? "absent" : "registered" }) }));
});
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });

describe("user-bound durable OAuth setup", () => {
  it("registers only minimal verified signup fields before attempting setup", async () => {
    const signed = intent();
    await resumeOAuthSignupSetup(admin, user, signed);
    expect(rpc.mock.calls).toEqual([
      ["register_oauth_signup_setup", { p_user_id: user.id, p_company_name: "Synthetic Co", p_provider: "google", p_flow_id: signed.flowId, p_issued_at: new Date(signed.issuedAt).toISOString() }],
      ["resume_oauth_signup_setup", { p_user_id: user.id }],
    ]);
  });
  it.each(["absent", "completed", "already_completed", "skipped"])("accepts durable %s status without a new cookie", async (status) => {
    rpc.mockImplementation(() => ({ abortSignal: () => Promise.resolve({ error: null, data: status }) }));
    expect(await resumeOAuthSignupSetup(admin, user, null)).toBe(status);
    expect(rpc).toHaveBeenCalledExactlyOnceWith("resume_oauth_signup_setup", { p_user_id: user.id });
  });
  it.each(["older", "provider", "consumer", "expired", "future-created", "newer-intent"])("does not register %s intent, but still checks the current owner's pending setup", async (mode) => {
    const signed = intent();
    let actor = user;
    if (mode === "older") actor = { ...user, created_at: new Date(now - 5000).toISOString() };
    if (mode === "provider") actor = { ...user, app_metadata: { provider: "apple" } };
    if (mode === "consumer") { signed.accountType = "consumer"; signed.companyName = null; }
    if (mode === "expired") vi.setSystemTime(signed.expiresAt);
    if (mode === "future-created") actor = { ...user, created_at: new Date(now + 1000).toISOString() };
    if (mode === "newer-intent") signed.issuedAt = now + 1000;
    await resumeOAuthSignupSetup(admin, actor, signed);
    expect(rpc).toHaveBeenCalledExactlyOnceWith("resume_oauth_signup_setup", { p_user_id: user.id });
  });
  it("does not attempt setup when durable registration fails", async () => {
    rpc.mockImplementation(() => ({ abortSignal: () => Promise.resolve({ error: { code: "synthetic" }, data: null }) }));
    await expect(resumeOAuthSignupSetup(admin, user, intent())).rejects.toThrow("oauth_signup_registration_failed");
    expect(rpc).toHaveBeenCalledOnce();
  });
  it.each([null, "queued", {}, { status: "completed" }])("fails closed on unrecognized setup status %j", async (data) => {
    rpc.mockImplementation(() => ({ abortSignal: () => Promise.resolve({ error: null, data }) }));
    await expect(resumeOAuthSignupSetup(admin, user, null)).rejects.toThrow("oauth_signup_setup_failed");
  });
  it("bounds a stalled durable resume and aborts its request", async () => {
    let signal: AbortSignal | undefined;
    rpc.mockImplementation(() => ({ abortSignal: (value: AbortSignal) => { signal = value; return new Promise(() => {}); } }));
    const response = resumeOAuthSignupSetup(admin, user, null);
    const failure = expect(response).rejects.toThrow("timed out");
    await vi.advanceTimersByTimeAsync(8001);
    await failure;
    expect(signal?.aborted).toBe(true);
  });
});
