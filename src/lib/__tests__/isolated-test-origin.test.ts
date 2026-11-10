import { describe, expect, it } from "vitest";
import { authRedirectOrigin, isolatedSupabaseOrigin } from "../isolated-test-origin.mjs";
import { NextRequest } from "next/server";

const isolated = {
  WARRANTEE_ISOLATED_E2E: "1", NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3100",
};

describe("disposable Supabase CSP origin", () => {
  it("does not change production policy without the isolated flag", () => {
    expect(isolatedSupabaseOrigin({})).toBeNull();
  });
  it("accepts only the explicit local disposable stack", () => {
    expect(isolatedSupabaseOrigin(isolated)).toBe(isolated.NEXT_PUBLIC_SUPABASE_URL);
  });
  it("preserves the verified IP cookie origin when NextURL normalizes its hostname", () => {
    const request = new NextRequest(`${isolated.NEXT_PUBLIC_APP_URL}/auth/callback?code=synthetic`);
    expect(new URL(request.url).origin).not.toBe(isolated.NEXT_PUBLIC_APP_URL);
    expect(authRedirectOrigin(request.url, isolated)).toBe(isolated.NEXT_PUBLIC_APP_URL);
  });
  it("does not replace production or preview origins with an app configuration value", () => {
    const env = { NEXT_PUBLIC_APP_URL: 'https://warrantee.io' };
    expect(authRedirectOrigin('https://warrantee.io/auth/callback', env)).toBe('https://warrantee.io');
    expect(authRedirectOrigin('https://synthetic-preview.vercel.app/auth/callback', env)).toBe('https://synthetic-preview.vercel.app');
    expect(() => authRedirectOrigin('https://warrantee.io/auth/callback', { ...isolated, VERCEL: '1' })).toThrow();
  });
  it.each([
    { VERCEL: "1" }, { VERCEL_ENV: "production" },
    { NEXT_PUBLIC_SUPABASE_URL: "https://erptubrslnfmkuouczgn.supabase.co" },
    { NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1.attacker.test:54321" },
    { NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321?token=test" },
    { NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54322" },
    { NEXT_PUBLIC_APP_URL: "https://warrantee.io" },
    { NEXT_PUBLIC_APP_URL: "http://user:pass@127.0.0.1:3100" },
  ])("fails closed for hosted, remote or ambiguous test targets: %j", (override) => {
    expect(() => isolatedSupabaseOrigin({ ...isolated, ...override })).toThrow();
  });
});
