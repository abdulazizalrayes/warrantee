import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultCookieConsent } from "../cookie-consent";
import { buildGaBootstrap, buildGtmBootstrap } from "../analytics-bootstrap.mjs";

vi.mock("next/script", () => ({ default: () => null }));

describe("external analytics component selection", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("uses only a self-hosted GA Script with the original id and strategy", async () => {
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "G-ZQJ4LRG4GN");
    vi.stubEnv("NEXT_PUBLIC_GTM_ID", "");
    const { default: GoogleAnalytics } = await import("../../components/GoogleAnalytics");
    expect(GoogleAnalytics()!.props.children.props).toEqual({
      id: "google-analytics", strategy: "afterInteractive", src: "/agent-bootstrap/analytics/ga.js",
    });
  });

  it("keeps GTM as the sole bootstrap and preserves its noscript iframe", async () => {
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "G-ZQJ4LRG4GN");
    vi.stubEnv("NEXT_PUBLIC_GTM_ID", "GTM-WFLBH83M");
    const { default: GoogleAnalytics } = await import("../../components/GoogleAnalytics");
    const { default: GoogleTagManager } = await import("../../components/GoogleTagManager");
    expect(GoogleAnalytics()).toBeNull();
    const children = GoogleTagManager()!.props.children;
    expect(children[0].props).toEqual({
      id: "gtm-script", strategy: "afterInteractive", src: "/agent-bootstrap/analytics/gtm.js",
    });
    expect(children[1].type).toBe("noscript");
    expect(children[1].props.children.props).toEqual({
      src: "https://www.googletagmanager.com/ns.html?id=GTM-WFLBH83M",
      height: "0", width: "0", style: { display: "none", visibility: "hidden" },
    });
  });

  it("renders neither bootstrap when identifiers are absent", async () => {
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "");
    vi.stubEnv("NEXT_PUBLIC_GTM_ID", "");
    const { default: GoogleAnalytics } = await import("../../components/GoogleAnalytics");
    const { default: GoogleTagManager } = await import("../../components/GoogleTagManager");
    expect(GoogleAnalytics()).toBeNull();
    expect(GoogleTagManager()).toBeNull();
  });

  it("keeps generated defaults aligned with the application consent defaults", () => {
    expect(defaultCookieConsent.analytics).toBe(false);
    expect(defaultCookieConsent.marketing).toBe(false);
    expect(buildGaBootstrap("G-ZQJ4LRG4GN")).toContain("analytics: false, marketing: false");
    expect(buildGtmBootstrap("GTM-WFLBH83M")).toContain("analytics:false,marketing:false");
  });
});
