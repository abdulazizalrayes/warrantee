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

  it("queues GTM context and the GA4 event when GTM is configured", async () => {
    process.env.NEXT_PUBLIC_GTM_ID = "GTM-TEST";
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = "G-TEST";
    const { dataLayer, gtag } = stubAnalyticsGlobals();
    const { trackSignup } = await import("../ga4-events");

    trackSignup("email");

    expect(gtag).toHaveBeenCalledWith(
      "event",
      "sign_up",
      expect.objectContaining({
        method: "email",
        traffic_class: "human",
        send_to: "G-TEST",
      })
    );
    expect(dataLayer).toContainEqual(
      expect.objectContaining({
        event: "sign_up",
        method: "email",
        traffic_class: "human",
      })
    );
    expect(dataLayer).toHaveLength(1);
  });

  it("routes one QA pricing CTA to the configured property without adding private data", async () => {
    process.env.NEXT_PUBLIC_GTM_ID = "GTM-WFLBH83M";
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = "G-ZQJ4LRG4GN";
    const { dataLayer, gtag, sendBeacon } = stubAnalyticsGlobals();
    vi.stubGlobal("navigator", { webdriver: true, sendBeacon });
    const { trackFunnelCtaClick } = await import("../ga4-events");

    trackFunnelCtaClick("pricing_personal", "/en/auth?tab=signup", { locale: "en" });

    expect(gtag).toHaveBeenCalledExactlyOnceWith("event", "funnel_cta_click", {
      cta: "pricing_personal",
      destination: "/en/auth",
      event_category: "conversion_path",
      event_label: "pricing_personal",
      locale: "en",
      traffic_class: "qa",
      page_location: "https://warrantee.io/en/auth",
      page_referrer: "",
      send_to: "G-ZQJ4LRG4GN",
    });
    expect(dataLayer).toHaveLength(1);
    expect(dataLayer[0]).not.toHaveProperty("send_to");
    expect(sendBeacon).toHaveBeenCalledOnce();
    const body = JSON.parse(await (sendBeacon.mock.calls[0] as unknown as [string, Blob])[1].text());
    expect(body.metadata.traffic_class).toBe("qa");
    expect(body.metadata).not.toHaveProperty("send_to");
    expect(body.metadata).not.toHaveProperty("page_location");
    expect(body.metadata).not.toHaveProperty("page_referrer");
  });

  it("does not invent a destination when only GTM is configured", async () => {
    process.env.NEXT_PUBLIC_GTM_ID = "GTM-TEST";
    const { gtag } = stubAnalyticsGlobals();
    const { trackSignup } = await import("../ga4-events");
    trackSignup();
    expect(gtag.mock.calls[0][2]).not.toHaveProperty("send_to");
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
    expect(gtag).toHaveBeenCalledOnce();
    expect(gtag.mock.calls[0][2]).not.toHaveProperty("send_to");
  });

  it("does not duplicate GTM's automatic GA4 page view", async () => {
    process.env.NEXT_PUBLIC_GTM_ID = "GTM-TEST";
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = "G-TEST";
    const { dataLayer, gtag } = stubAnalyticsGlobals();
    const { trackPageView } = await import("../ga4-events");

    trackPageView("home", { locale: "en" });

    expect(gtag).not.toHaveBeenCalled();
    expect(dataLayer).toContainEqual(
      expect.objectContaining({
        event: "page_view",
        page_name: "home",
        traffic_class: "human",
      })
    );
  });

  it("emits a dedicated privacy-safe WhatsApp click event", async () => {
    process.env.NEXT_PUBLIC_GTM_ID = "GTM-TEST";
    const { dataLayer, gtag, sendBeacon } = stubAnalyticsGlobals();
    const { trackWhatsappClick } = await import("../ga4-events");

    trackWhatsappClick("footer", { locale: "en" });

    expect(gtag).not.toHaveBeenCalled();
    expect(dataLayer).toContainEqual(
      expect.objectContaining({
        event: "whatsapp_click",
        event_category: "contact",
        event_label: "warrantee_whatsapp",
        location: "footer",
        locale: "en",
        traffic_class: "human",
      })
    );
    expect(sendBeacon).toHaveBeenCalledOnce();
  });

  it.each([true, false])("uses authoritative private-path and referrer normalization for direct events (GTM=%s)", async (withGtm) => {
    if (withGtm) process.env.NEXT_PUBLIC_GTM_ID = "GTM-TEST";
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = "G-TEST";
    const { dataLayer, gtag, sendBeacon } = stubAnalyticsGlobals();
    window.location.pathname = "/en/approval/private-warranty-id";
    window.location.search = "?email=private@example.test&token=private-token";
    vi.stubGlobal("document", { referrer: "https://referrer.test/private-person?token=private-token#private" });
    vi.stubGlobal("navigator", { webdriver: true, sendBeacon });
    const { trackPageView, trackFunnelCtaClick } = await import("../ga4-events");
    trackFunnelCtaClick("pricing_plan_cta", "/en/auth?email=private@example.test#private", {
      traffic_class: "human", send_to: "G-PRIVATE", page_location: "https://private.example", page_referrer: "https://private.example",
      warranty_id: "private-id", reason: "private reason", email: "private@example.test", nested: { name: "private" },
      utm_source: "manual_outreach", utm_campaign: "private_person_123", utm_content: "private",
    });
    expect(gtag).toHaveBeenCalledOnce();
    const params = gtag.mock.calls[0][2];
    expect(params).toMatchObject({ destination: "/en/auth", traffic_class: "qa", page_location: "https://warrantee.io/en/approval/[id]", page_referrer: "https://referrer.test", utm_source: "manual_outreach" });
    expect(params.send_to).toBe(withGtm ? "G-TEST" : undefined);
    expect(JSON.stringify(params)).not.toContain("private");
    if (withGtm) {
      expect(dataLayer).toHaveLength(1);
      expect(dataLayer[0]).not.toHaveProperty("page_location");
      expect(dataLayer[0]).not.toHaveProperty("page_referrer");
      expect(JSON.stringify(dataLayer)).not.toContain("private");
    }
    const body = JSON.parse(await (sendBeacon.mock.calls[0] as unknown as [string, Blob])[1].text());
    expect(body).toMatchObject({ path: "/en/approval/[id]", referrer: "https://referrer.test" });
    expect(body.metadata).not.toHaveProperty("page_location");
    expect(body.metadata).not.toHaveProperty("page_referrer");
    expect(JSON.stringify(body)).not.toContain("private");
    if (withGtm) {
      trackPageView("home");
      expect(gtag).toHaveBeenCalledOnce();
    }
  });

  it("drops positional IDs, domains and OCR errors from every custom browser sink", async () => {
    process.env.NEXT_PUBLIC_GTM_ID = "GTM-TEST";
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = "G-TEST";
    const { dataLayer, gtag, sendBeacon } = stubAnalyticsGlobals();
    const { trackClaim, trackDocumentView, trackTeamInvite, trackWarrantyScan, trackContactForm } = await import("../ga4-events");
    trackClaim("private-warranty-id");
    trackDocumentView({ document_id: "private-doc", warranty_id: "private-warranty", file_type: "application/pdf" });
    trackTeamInvite({ role: "viewer", allowed_domain: "private.example" });
    trackWarrantyScan("failed", { reason: "private OCR text and path" });
    trackContactForm("private subject");
    expect(gtag).toHaveBeenCalledTimes(5);
    expect(dataLayer).toHaveLength(5);
    expect(JSON.stringify(dataLayer)).not.toContain("private");
    expect(JSON.stringify(gtag.mock.calls)).not.toContain("private");
    expect(sendBeacon).toHaveBeenCalledOnce();
    expect(await (sendBeacon.mock.calls[0] as unknown as [string, Blob])[1].text()).not.toContain("private");
  });

  it("keeps the sanitized envelope when sendBeacon falls back to fetch", async () => {
    process.env.NEXT_PUBLIC_GTM_ID = "GTM-TEST";
    const { sendBeacon } = stubAnalyticsGlobals();
    sendBeacon.mockReturnValue(false);
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    window.location.pathname = "/en/warranties/private-id/claim";
    vi.stubGlobal("document", { referrer: "https://referrer.test/private?token=private" });
    const { trackAuthIntent } = await import("../ga4-events");
    trackAuthIntent("magic_link_start", "email", { email: "private@example.test", account_type: "consumer" });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toBe("/api/funnel/events");
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toMatchObject({ path: "/en/warranties/[id]/claim", referrer: "https://referrer.test", metadata: { action: "magic_link_start", method: "email", account_type: "consumer" } });
    expect(JSON.stringify(body)).not.toContain("private");
    expect(body.metadata).not.toHaveProperty("page_location");
    expect(body.metadata).not.toHaveProperty("send_to");
  });
});
