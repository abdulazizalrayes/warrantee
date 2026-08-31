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
  ])("rejects an unsafe callback destination: %s", (value) => {
    expect(resolveSafeAuthRedirect(value, fallback)).toBe(fallback);
  });
});
