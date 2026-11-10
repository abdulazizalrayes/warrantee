import { describe, expect, it } from "vitest";
import { resolveSafeAuthRedirect } from "@/lib/auth-redirect";

describe("resolveSafeAuthRedirect", () => {
  const fallback = "/en/dashboard";

  it("keeps clean same-origin application paths", () => {
    expect(resolveSafeAuthRedirect("/ar/dashboard?tab=claims#open", fallback)).toBe(
      "/ar/dashboard?tab=claims#open",
    );
  });

  it.each([
    null,
    "https://attacker.example/path",
    "//attacker.example/path",
    "/\\attacker.example/path",
    "\\\\attacker.example/path",
    "/en/..//attacker.example/path",
    "/en/%2e%2e//attacker.example/path",
    "/ar/a/../../\\attacker.example/path",
  ])("rejects an unsafe callback destination: %s", (value) => {
    expect(resolveSafeAuthRedirect(value, fallback)).toBe(fallback);
  });

  it.each(["/en/../ar/dashboard", "/ar/%2e/settings?tab=profile#top"])("preserves safe normalized paths: %s", value => {
    const destination = resolveSafeAuthRedirect(value, fallback);
    expect(new URL(destination, "https://warrantee.io").origin).toBe("https://warrantee.io");
    expect(destination).not.toBe(fallback);
  });
});
