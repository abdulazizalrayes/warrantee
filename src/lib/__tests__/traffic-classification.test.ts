import { describe, expect, it } from "vitest";
import { classifyTrafficUserAgent } from "@/lib/traffic-classification";

describe("traffic classification", () => {
  it("keeps ordinary browsers in the human funnel", () => {
    expect(
      classifyTrafficUserAgent(
        "Mozilla/5.0 AppleWebKit/537.36 Chrome/140.1.2.3 Safari/537.36",
      ),
    ).toBe("human");
  });

  it("separates QA and operational monitoring", () => {
    expect(classifyTrafficUserAgent("Warrantee-QA/1.0 HeadlessChrome/140")).toBe("qa");
    expect(classifyTrafficUserAgent("warrantee-production-smoke/1.0")).toBe("monitoring");
    expect(classifyTrafficUserAgent("curl/8.7.1")).toBe("monitoring");
  });

  it("separates search and AI crawlers", () => {
    expect(classifyTrafficUserAgent("Mozilla/5.0 (compatible; Googlebot/2.1)")).toBe("crawler");
    expect(classifyTrafficUserAgent("OAI-SearchBot/1.0")).toBe("crawler");
    expect(classifyTrafficUserAgent("ClaudeBot/1.0")).toBe("crawler");
  });
});
