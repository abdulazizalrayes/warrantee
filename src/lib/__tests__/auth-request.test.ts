import { afterEach, describe, expect, it, vi } from "vitest";
import { boundedAuthRequest, prepareOAuthSignup } from "@/lib/auth-request";

const signup = { accountType: "consumer" as const, companyName: null, provider: "google" as const, next: "/en/dashboard" };
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
describe("retryable OAuth preparation", () => {
  it("can retry after network failure", async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(Response.json({ flowId: "current" }));
    vi.stubGlobal("fetch", fetcher);
    await expect(prepareOAuthSignup(signup)).rejects.toThrow("offline");
    await expect(prepareOAuthSignup(signup)).resolves.toBe("current");
    expect(fetcher.mock.calls[1][1].signal.aborted).toBe(false);
  });
  it.each([Response.json({ error: "synthetic" }, { status: 503 }), Response.json({ ok: true })])("rejects unsuccessful preparation", async (response) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
    await expect(prepareOAuthSignup(signup)).rejects.toThrow("Please retry");
  });
  it("bounds hung fetch and aborts its signal", async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    vi.stubGlobal("fetch", vi.fn((_url, init) => { signal = init.signal; return new Promise(() => {}); }));
    const request = prepareOAuthSignup(signup);
    const rejected = expect(request).rejects.toThrow("timed out");
    await vi.advanceTimersByTimeAsync(8001);
    await rejected;
    expect(signal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("cleans timer on rejection and success", async () => {
    vi.useFakeTimers();
    await expect(boundedAuthRequest(() => Promise.resolve("ok"))).resolves.toBe("ok");
    await expect(boundedAuthRequest(() => Promise.reject(new Error("failed")))).rejects.toThrow("failed");
    expect(vi.getTimerCount()).toBe(0);
  });
});
