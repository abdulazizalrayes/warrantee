import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { classifyTrafficUserAgent } from "@/lib/traffic-classification";

describe("production passive scan safety", () => {
  const workflow = readFileSync(".github/workflows/passive-dast.yml", "utf8");

  it("disables form processing and browser spiders", () => {
    expect(workflow).toContain("spider.processform=false");
    expect(workflow).toContain("spider.postform=false");
    expect(workflow).not.toMatch(/(?:^|\s)-j(?:\s|$)/);
    expect(workflow).toContain("target: https://warrantee.io");
  });

  it("labels scan requests with the existing QA identity", () => {
    const agent = workflow.match(/connection\.defaultUserAgent=([^\s"]+)/)?.[1];
    expect(agent).toBe("Warrantee-QA/1.0");
    expect(classifyTrafficUserAgent(agent)).toBe("qa");
  });

  it("classifies server-side contact events without retaining user agents", () => {
    const route = readFileSync("src/app/api/contact/route.ts", "utf8");
    expect(route).toContain('traffic_class: classifyTrafficUserAgent(request.headers.get("user-agent"))');
  });
});
