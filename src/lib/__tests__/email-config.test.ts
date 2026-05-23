import { describe, expect, it, vi, afterEach } from "vitest";
import { getBusinessInboxBcc, getEmailFromAddress, PRIMARY_BUSINESS_EMAIL } from "@/lib/email-config";

describe("email config", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults all outbound system mail to the approved business inbox", () => {
    vi.stubEnv("EMAIL_FROM", "");
    expect(getEmailFromAddress()).toBe("Warrantee <hello@warrantee.io>");
    expect(getBusinessInboxBcc()).toBe(PRIMARY_BUSINESS_EMAIL);
  });

  it("uses configured EMAIL_FROM when present", () => {
    vi.stubEnv("EMAIL_FROM", "Warrantee Ops <hello@warrantee.io>");
    expect(getEmailFromAddress()).toBe("Warrantee Ops <hello@warrantee.io>");
  });
});
