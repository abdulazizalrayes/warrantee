import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("env validation", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("getClientEnv throws on missing NEXT_PUBLIC_SUPABASE_URL", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    delete process.env.NEXT_PUBLIC_APP_URL;

    const { getClientEnv } = await import("../env");
    expect(() => getClientEnv()).toThrow("Missing or invalid client environment variables");
  });

  it("getClientEnv succeeds with valid env vars", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_test_123";
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "vapid-key";
    process.env.NEXT_PUBLIC_APP_URL = "https://warrantee.io";

    const { getClientEnv } = await import("../env");
    const env = getClientEnv();
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe("https://test.supabase.co");
    expect(env.NEXT_PUBLIC_APP_URL).toBe("https://warrantee.io");
  });

  it("getClientEnv rejects invalid URL", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "not-a-url";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_test_123";
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "vapid-key";
    process.env.NEXT_PUBLIC_APP_URL = "https://warrantee.io";

    const { getClientEnv } = await import("../env");
    expect(() => getClientEnv()).toThrow("must be a valid URL");
  });

  it("getServerEnv throws on missing required vars", async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.STRIPE_SECRET_KEY;

    const { getServerEnv } = await import("../env");
    expect(() => getServerEnv()).toThrow("Missing or invalid server environment variables");
  });
});
