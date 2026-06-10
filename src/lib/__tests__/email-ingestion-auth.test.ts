import { describe, expect, it } from "vitest";
import {
  extractEmailAddress,
  getInboundEmailAuthentication,
} from "../ingestion/email-authentication";

describe("email ingestion authentication gates", () => {
  it("extracts plain and display-name email addresses", () => {
    expect(extractEmailAddress("buyer@example.com")).toBe("buyer@example.com");
    expect(extractEmailAddress("Buyer <buyer@example.com>")).toBe("buyer@example.com");
  });

  it("accepts aligned dmarc, dkim, or spf pass results", () => {
    expect(
      getInboundEmailAuthentication(
        { "Authentication-Results": "mx.example; dmarc=pass header.from=example.com" },
        "buyer@example.com"
      )
    ).toMatchObject({ aligned: true, method: "dmarc" });

    expect(
      getInboundEmailAuthentication(
        { "Authentication-Results": "mx.example; dkim=pass header.d=example.com" },
        "buyer@example.com"
      )
    ).toMatchObject({ aligned: true, method: "dkim" });

    expect(
      getInboundEmailAuthentication(
        { "Authentication-Results": "mx.example; spf=pass smtp.mailfrom=example.com" },
        "buyer@example.com"
      )
    ).toMatchObject({ aligned: true, method: "spf" });
  });

  it("rejects missing or unaligned authentication results", () => {
    expect(getInboundEmailAuthentication({}, "buyer@example.com")).toMatchObject({
      aligned: false,
      reason: "missing_authentication_results",
    });

    expect(
      getInboundEmailAuthentication(
        { "Authentication-Results": "mx.example; dkim=pass header.d=attacker.test" },
        "buyer@example.com"
      )
    ).toMatchObject({ aligned: false });
  });
});
