import { describe, expect, it } from "vitest";
import { isolatedSupabaseOrigin } from "../isolated-test-origin.mjs";

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
