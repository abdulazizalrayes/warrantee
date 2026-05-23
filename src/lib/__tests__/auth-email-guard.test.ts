import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  buildAuthEmailErrorMessage,
  getAuthEmailSafetyError,
  normalizeAuthEmail,
  rememberAuthEmailSend,
} from "../auth-email-guard";

describe("normalizeAuthEmail", () => {
  it("trims and lowercases email input", () => {
    expect(normalizeAuthEmail("  USER@Example.COM  ")).toBe("user@example.com");
  });
});

describe("getAuthEmailSafetyError", () => {
  it("rejects invalid email formats", () => {
    expect(getAuthEmailSafetyError("not-an-email")).toBe("Please enter a valid email address.");
  });

  it("rejects reserved and disposable domains", () => {
    expect(getAuthEmailSafetyError("test@example.com")).toBe("Please use your real email address to continue.");
    expect(getAuthEmailSafetyError("user@mailinator.com")).toBe("Please use your real email address to continue.");
  });

  it("enforces allowed email lists when provided", () => {
    expect(
      getAuthEmailSafetyError("other@warrantee.io", {
        allowedEmails: ["hello@warrantee.io"],
      })
    ).toBe("This email is not authorized for this access path.");
  });

  it("accepts normal business emails", () => {
    expect(getAuthEmailSafetyError("hello@warrantee.io")).toBeNull();
  });
});

describe("buildAuthEmailErrorMessage", () => {
  beforeEach(() => {
    vi.useRealTimers();
    const storage = new Map<string, string>();
    Object.defineProperty(globalThis, "window", {
      value: {
        localStorage: {
          getItem: (key: string) => storage.get(key) ?? null,
          setItem: (key: string, value: string) => {
            storage.set(key, value);
          },
          clear: () => storage.clear(),
        },
      },
      configurable: true,
    });
  });

  it("enforces a resend cooldown for auth emails", () => {
    rememberAuthEmailSend("hello@warrantee.io", "magic-link");
    expect(buildAuthEmailErrorMessage("hello@warrantee.io", "magic-link")).toMatch(
      /Please wait \d+ seconds/
    );
  });
});
