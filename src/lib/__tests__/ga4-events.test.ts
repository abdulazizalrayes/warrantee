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

describe("browser analytics dispatch", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_GTM_ID;
    delete process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  });

  function stubAnalyticsGlobals() {
    const dataLayer: unknown[] = [];
    const gtag = vi.fn();
    const sendBeacon = vi.fn(() => true);

    vi.stubGlobal("window", {
      location: {
        origin: "https://warrantee.io",
        pathname: "/en/auth",
        search: "",
      },
      dataLayer,
      gtag,
    });
    vi.stubGlobal("document", {
      referrer: "",
    });
    vi.stubGlobal("navigator", {
      sendBeacon,
    });

    return { dataLayer, gtag, sendBeacon };
  }

  it("uses GTM dataLayer as the single GA browser path when GTM is configured", async () => {
    process.env.NEXT_PUBLIC_GTM_ID = "GTM-TEST";
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = "G-TEST";
    const { dataLayer, gtag } = stubAnalyticsGlobals();
    const { trackSignup } = await import("../ga4-events");

    trackSignup("email");

    expect(gtag).not.toHaveBeenCalled();
    expect(dataLayer).toContainEqual(
      expect.objectContaining({
        event: "sign_up",
        method: "email",
      })
    );
    expect(dataLayer).toHaveLength(1);
  });

  it("falls back to direct GA events when GTM is not configured", async () => {
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = "G-TEST";
    const { dataLayer, gtag } = stubAnalyticsGlobals();
    const { trackSignup } = await import("../ga4-events");

    trackSignup("email");

    expect(gtag).toHaveBeenCalledWith(
      "event",
      "sign_up",
      expect.objectContaining({
        method: "email",
      })
    );
    expect(dataLayer).toEqual([]);
  });
});
