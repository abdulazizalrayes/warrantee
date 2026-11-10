import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";
import type { Session } from "@supabase/supabase-js";
const harness = vi.hoisted(() => ({
  slots: [] as unknown[], cursor: 0, recordEffects: true,
  effects: [] as Array<() => (() => void) | void>,
  session: vi.fn(), profile: vi.fn(), oauth: vi.fn(), signOut: vi.fn(), signup: vi.fn(),
  listener: undefined as undefined | ((event: string, session: Session | null) => void),
}));
vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  const state = (initial: unknown) => {
    const index = harness.cursor++;
    if (index >= harness.slots.length) harness.slots.push(initial);
    return [harness.slots[index], (value: unknown) => {
      harness.slots[index] = typeof value === "function" ? value(harness.slots[index]) : value;
    }];
  };
  return {
    ...actual,
    useState: state,
    useRef: (initial: unknown) => state({ current: initial })[0],
    useCallback: (fn: unknown) => fn,
    useEffect: (effect: () => (() => void) | void) => { if (harness.recordEffects) harness.effects.push(effect); },
  };
});
vi.mock("@/lib/supabase-browser", () => {
  const query = { select: () => query, eq: () => query, abortSignal: () => query, single: harness.profile };
  const client = {
    from: () => query,
    auth: {
      getSession: harness.session, signInWithOAuth: harness.oauth, signOut: harness.signOut, signUp: harness.signup,
      onAuthStateChange: (fn: typeof harness.listener) => { harness.listener = fn; return { data: { subscription: { unsubscribe: vi.fn() } } }; },
    },
  };
  return { createSupabaseBrowserClient: () => client };
});
vi.mock("@/lib/auth-email-guard", () => ({
  buildAuthEmailErrorMessage: () => null,
  normalizeAuthEmail: (email: string) => email.trim().toLowerCase(),
  rememberAuthEmailSend: vi.fn(),
}));
vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://synthetic.supabase.invalid");
vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "synthetic-key");
const { AuthProvider } = await import("@/lib/auth-context");
type Context = ReturnType<typeof import("@/lib/auth-context").useAuth>;
const user = { id: "synthetic-user" };
const session = { user } as Session;
const profile = { id: "synthetic-user", company: "Synthetic Co" };
function render() {
  harness.cursor = 0;
  const element = AuthProvider({ children: null }) as ReactElement<{ value: Context }>;
  harness.recordEffects = false;
  return element.props.value;
}
async function flush() { for (let index = 0; index < 20; index++) await Promise.resolve(); }
function mount() {
  render();
  return harness.effects.map((effect) => effect());
}
beforeEach(() => {
  vi.useRealTimers(); vi.clearAllMocks(); vi.unstubAllGlobals();
  harness.slots = []; harness.cursor = 0; harness.recordEffects = true; harness.effects = [];
  harness.listener = undefined;
  harness.session.mockResolvedValue({ data: { session }, error: null });
  harness.profile.mockResolvedValue({ data: profile, error: null });
  harness.signOut.mockResolvedValue({ error: null });
});
afterAll(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("auth context profile states (deterministic hook harness)", () => {
  it("keeps profile loading separate from initialized authentication", async () => {
    let resolve!: (value: unknown) => void;
    harness.profile.mockReturnValue(new Promise((done) => { resolve = done; }));
    mount(); await flush();
    expect(render()).toMatchObject({ user, loading: false, profile: null, profileLoading: true, profileError: null, authError: null });
    resolve({ data: profile, error: null }); await flush();
    expect(render()).toMatchObject({ profileLoading: false, profileError: null, profile: { company_name: "Synthetic Co" } });
  });
  it("exposes a returned profile error and allows refreshProfile retry", async () => {
    harness.profile.mockResolvedValueOnce({ data: null, error: { message: "synthetic failure" } });
    mount(); await flush();
    expect(render()).toMatchObject({ loading: false, profileLoading: false, profile: null, authError: null });
    expect(render().profileError).toContain("retry");
    await render().refreshProfile();
    expect(render()).toMatchObject({ profileLoading: false, profileError: null, profile: { id: "synthetic-user" } });
  });
  it("exposes session failures instead of silently treating them as signed out", async () => {
    harness.session.mockResolvedValue({ data: { session: null }, error: { message: "synthetic auth failure" } });
    mount(); await flush();
    expect(render()).toMatchObject({ user: null, loading: false, profileLoading: false });
    expect(render().authError).toContain("verify your session");
    expect(harness.profile).not.toHaveBeenCalled();
  });
  it("times out profile loading into an explicit retryable failure", async () => {
    vi.useFakeTimers();
    harness.profile.mockReturnValue(new Promise(() => {}));
    mount(); await flush();
    expect(render().profileLoading).toBe(true);
    await vi.advanceTimersByTimeAsync(8001);
    expect(render().profileLoading).toBe(false);
    expect(render().profileError).toContain("retry");
    vi.useRealTimers();
  });
  it("ignores a profile response arriving after sign-out", async () => {
    let resolve!: (value: unknown) => void;
    harness.profile.mockReturnValue(new Promise((done) => { resolve = done; }));
    mount(); await flush();
    harness.listener!("SIGNED_OUT", null);
    resolve({ data: profile, error: null }); await flush();
    expect(render()).toMatchObject({ user: null, profile: null, profileLoading: false, profileError: null });
  });
  it("ignores a stale session initialization after a newer auth event", async () => {
    let resolve!: (value: unknown) => void;
    harness.session.mockReturnValue(new Promise((done) => { resolve = done; }));
    mount(); await flush();
    harness.listener!("SIGNED_OUT", null);
    resolve({ data: { session }, error: null }); await flush();
    expect(render()).toMatchObject({ user: null, profile: null, loading: false });
  });
  it("bounds a slow OAuth provider without allowing its late redirect", async () => {
    vi.useFakeTimers();
    const assign = vi.fn();
    vi.stubGlobal("window", { location: { origin: "https://warrantee.test", assign } });
    let resolve!: (value: unknown) => void;
    harness.oauth.mockReturnValue(new Promise((done) => { resolve = done; }));
    const pending = render().signInWithGoogle("ar", "/ar/dashboard", "synthetic-flow");
    await vi.advanceTimersByTimeAsync(8001);
    expect((await pending).error).toContain("retry");
    resolve({ data: { url: "https://synthetic-provider.invalid" }, error: null }); await flush();
    expect(assign).not.toHaveBeenCalled();
    expect(harness.oauth).toHaveBeenCalledWith({ provider: "google", options: { redirectTo: "https://warrantee.test/auth/callback?next=%2Far%2Fdashboard&signup_flow=synthetic-flow", skipBrowserRedirect: true } });
    vi.useRealTimers();
  });
  it("returns provider rejection as an actionable error", async () => {
    harness.oauth.mockRejectedValue(new Error("synthetic failure"));
    expect((await render().signInWithApple()).error).toContain("retry");
  });
  it("preserves resumable drafts on initial auth and clears them on sign-out", async () => {
    const removeItem = vi.fn();
    vi.stubGlobal("window", { sessionStorage: { removeItem } });
    mount(); await flush();
    expect(removeItem).not.toHaveBeenCalled();
    harness.listener!("SIGNED_OUT", null);
    expect(removeItem).toHaveBeenCalledWith("warrantee:creation-draft:v1");
  });
  it("clears drafts on explicit signOut even when the provider fails", async () => {
    const removeItem = vi.fn();
    vi.stubGlobal("window", { sessionStorage: { removeItem } });
    harness.signOut.mockRejectedValue(new Error("synthetic failure"));
    mount(); await flush();
    await expect(render().signOut()).rejects.toThrow("retry");
    expect(removeItem).toHaveBeenCalledOnce();
    expect(render().authError).toContain("sign out");
  });
  it("clears drafts on account switches and ignores the previous owner's late profile", async () => {
    const removeItem = vi.fn();
    vi.stubGlobal("window", { sessionStorage: { removeItem } });
    let resolve!: (value: unknown) => void;
    harness.profile.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    mount(); await flush();
    harness.profile.mockResolvedValue({ data: { id: "other-user", company: "Other Co" }, error: null });
    harness.listener!("SIGNED_IN", { user: { id: "other-user" } } as Session); await flush();
    resolve({ data: profile, error: null }); await flush();
    expect(removeItem).toHaveBeenCalledOnce();
    expect(render().profile?.id).toBe("other-user");
  });
  it("does not redirect from an obsolete OAuth request after sign-out", async () => {
    const assign = vi.fn();
    vi.stubGlobal("window", { location: { origin: "https://warrantee.test", assign } });
    harness.session.mockResolvedValue({ data: { session: null }, error: null });
    mount(); await flush();
    let resolve!: (value: unknown) => void;
    harness.oauth.mockReturnValue(new Promise((done) => { resolve = done; }));
    const request = render().signInWithGoogle(); await flush();
    harness.listener!("SIGNED_OUT", null);
    resolve({ data: { url: "https://synthetic-provider.invalid" }, error: null });
    expect((await request).error).toContain("session changed");
    expect(assign).not.toHaveBeenCalled();
  });
  it("reports signup without a session as pending rather than confirmed", async () => {
    harness.signup.mockResolvedValue({ data: { session: null }, error: null });
    const result = await render().signUp("synthetic@example.invalid", "Synthetic-Password-123!");
    expect(result).toEqual({ error: null, confirmed: false });
  });
  it("returns slow and failed signup outcomes without reporting confirmation", async () => {
    harness.signup.mockRejectedValueOnce(new Error("synthetic provider failure"));
    expect((await render().signUp("synthetic@example.invalid", "Synthetic-Password-123!")).error).toContain("retry");
    vi.useFakeTimers();
    harness.signup.mockReturnValue(new Promise(() => {}));
    const pending = render().signUp("synthetic@example.invalid", "Synthetic-Password-123!");
    await vi.advanceTimersByTimeAsync(8001);
    const result = await pending;
    expect(result.error).toContain("retry");
    expect(result.confirmed).not.toBe(true);
    vi.useRealTimers();
  });
  it("never confirms a previous owner's late signup response", async () => {
    mount(); await flush();
    let resolve!: (value: unknown) => void;
    harness.signup.mockReturnValue(new Promise((done) => { resolve = done; }));
    const pending = render().signUp("synthetic@example.invalid", "Synthetic-Password-123!"); await flush();
    harness.listener!("SIGNED_OUT", null);
    resolve({ data: { session }, error: null });
    const result = await pending;
    expect(result.error).toContain("session changed");
    expect(result.confirmed).not.toBe(true);
  });
});
