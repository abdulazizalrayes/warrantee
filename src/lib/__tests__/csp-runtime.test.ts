import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("node:fs", () => ({ readFileSync: vi.fn() }));
import { readFileSync } from "node:fs";

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

describe("final-build document CSP", () => {
  const base = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; script-src-attr 'none'";
  function setup(routes = {}) {
    vi.stubEnv("NODE_ENV", "production");
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ schemaVersion: 1, complete: true, buildId: "test-build", routes }));
  }
  it("uses exact final-build static policy without a nonce", async () => {
    setup({ "/en": { policy: base, htmlSha256: "test" } });
    const { getDocumentCsp } = await import("../csp-runtime");
    expect(getDocumentCsp("/en", base)).toEqual({ policy: base, nonce: null });
  });
  it("creates fresh nonces for dynamic requests without relaxing inline script restrictions", async () => {
    setup();
    const { getDocumentCsp } = await import("../csp-runtime");
    const first = getDocumentCsp("/en/warranties/id", base);
    const second = getDocumentCsp("/en/warranties/id", base);
    expect(first.nonce).not.toBe(second.nonce);
    expect(first.policy).toContain(`'nonce-${first.nonce}'`);
    expect(first.policy).toContain("style-src 'self' 'unsafe-inline'");
    expect(first.policy.split(";").find((part) => part.trim().startsWith("script-src "))).not.toContain("unsafe-inline");
  });
  it("rejects an unfinished build manifest", async () => {
    setup();
    vi.mocked(readFileSync).mockReturnValue('{"schemaVersion":1,"complete":false,"routes":{}}');
    const { getDocumentCsp } = await import("../csp-runtime");
    expect(() => getDocumentCsp("/en", base)).toThrow("unavailable");
  });
  it("does not treat inherited object keys as static routes", async () => {
    setup();
    const { getDocumentCsp } = await import("../csp-runtime");
    expect(getDocumentCsp("__proto__", base).nonce).toBeTruthy();
  });
});
