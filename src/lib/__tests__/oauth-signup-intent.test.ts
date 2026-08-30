import { describe, expect, it } from "vitest";
import {
  buildOAuthSignupIntent,
  parseOAuthSignupIntent,
  serializeOAuthSignupIntent,
} from "@/lib/oauth-signup-intent";

describe("OAuth signup intent", () => {
  it("preserves a valid Business signup selection", () => {
    const now = Date.UTC(2026, 7, 30);
    const intent = buildOAuthSignupIntent({
      accountType: "business",
      companyName: "  Acme Saudi  ",
      now,
    });

    expect(intent).toMatchObject({
      accountType: "business",
      companyName: "Acme Saudi",
    });
    expect(parseOAuthSignupIntent(serializeOAuthSignupIntent(intent!), now)).toEqual(intent);
  });

  it("requires a company name for Business signup", () => {
    expect(buildOAuthSignupIntent({ accountType: "business", companyName: " " })).toBeNull();
  });

  it("rejects expired or malformed intent cookies", () => {
    const now = Date.UTC(2026, 7, 30);
    const intent = buildOAuthSignupIntent({ accountType: "consumer", now });
    expect(parseOAuthSignupIntent(serializeOAuthSignupIntent(intent!), now + 11 * 60 * 1_000)).toBeNull();
    expect(parseOAuthSignupIntent("not-an-intent", now)).toBeNull();
  });
});
