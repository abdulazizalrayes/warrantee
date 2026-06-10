import { describe, expect, it } from "vitest";
import {
  buildIdempotencyReference,
  createApiIntegrationToken,
  hashApiToken,
  normalizeApiRateLimit,
  normalizeApiScopes,
  timingSafeStringEqual,
} from "../api-v1";
import fs from "node:fs";
import path from "node:path";

describe("api v1 helpers", () => {
  it("compares integration tokens with a constant-length hash", () => {
    expect(timingSafeStringEqual("secret-token", "secret-token")).toBe(true);
    expect(timingSafeStringEqual("secret-token", "wrong-token")).toBe(false);
    expect(timingSafeStringEqual("secret-token", "s")).toBe(false);
  });

  it("derives stable idempotency references", () => {
    expect(buildIdempotencyReference("request-1")).toMatch(/^API-[a-f0-9]{24}$/);
    expect(buildIdempotencyReference("request-1")).toBe(buildIdempotencyReference("request-1"));
    expect(buildIdempotencyReference("request-1")).not.toBe(buildIdempotencyReference("request-2"));
  });

  it("creates one-time API integration tokens with stored hashes", () => {
    const generated = createApiIntegrationToken();

    expect(generated.token).toMatch(/^wrt_[A-Za-z0-9]{12}_[A-Za-z0-9_-]{32,}$/);
    expect(generated.prefix).toHaveLength(12);
    expect(generated.hash).toBe(hashApiToken(generated.token));
    expect(generated.hash).not.toContain(generated.token);
  });

  it("normalizes API scopes to allowed warranty scopes only", () => {
    expect(normalizeApiScopes(["warranties:read", "admin:all", "warranties:read"])).toEqual([
      "warranties:read",
    ]);
    expect(normalizeApiScopes([])).toEqual(["warranties:read", "warranties:write"]);
    expect(normalizeApiScopes("warranties:read")).toEqual(["warranties:read", "warranties:write"]);
  });

  it("bounds per-token API rate limits", () => {
    expect(normalizeApiRateLimit(50)).toBe(50);
    expect(normalizeApiRateLimit(0)).toBe(1);
    expect(normalizeApiRateLimit(999)).toBe(300);
    expect(normalizeApiRateLimit("not-a-number")).toBe(100);
  });

  it("does not allow the retired static integration token path", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/lib/api-v1.ts"), "utf8");

    expect(source).not.toContain("WARRANTEE_API_INTEGRATION_TOKEN");
    expect(source).not.toContain("legacy_integration");
  });

  it("centralizes API v1 authorization and usage metering helpers", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/lib/api-v1.ts"), "utf8");

    expect(source).toContain("authorizeApiV1Request");
    expect(source).toContain("recordApiV1Usage");
    expect(source).toContain("api_usage_events");
    expect(source).toContain("X-RateLimit-Limit");
  });
});
