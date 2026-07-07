import { afterEach, describe, expect, it, vi } from "vitest";
import { appendCampaignParams } from "../ga4-events";

describe("campaign attribution helpers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function stubWindow(search: string) {
    vi.stubGlobal("window", {
      location: {
        origin: "https://warrantee.io",
        search,
      },
    });
  }

  it("preserves current campaign params when routing to internal conversion paths", () => {
    stubWindow("?utm_source=manual_outreach&utm_medium=direct&utm_campaign=seller_pilot_july_2026&ref=founder");

    expect(appendCampaignParams("/en/auth?tab=signup")).toBe(
      "/en/auth?tab=signup&utm_source=manual_outreach&utm_medium=direct&utm_campaign=seller_pilot_july_2026&ref=founder"
    );
  });

  it("does not overwrite explicit campaign params or modify external/hash destinations", () => {
    stubWindow("?utm_source=manual_outreach&utm_campaign=business_pilot_july_2026");

    expect(appendCampaignParams("/en/pricing?utm_source=partner")).toBe(
      "/en/pricing?utm_source=partner&utm_campaign=business_pilot_july_2026"
    );
    expect(appendCampaignParams("https://example.com/en/auth")).toBe("https://example.com/en/auth");
    expect(appendCampaignParams("#contact")).toBe("#contact");
  });
});
