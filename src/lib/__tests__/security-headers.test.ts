import { describe, expect, it } from "vitest";
import config from "../../../next.config";

describe("application security headers", () => {
  it("blocks inline event attributes without disabling framework script elements", async () => {
    const rules = await config.headers!();
    const global = rules.find((rule) => rule.source === "/:path*");
    const policy = global?.headers.find((header) => header.key === "Content-Security-Policy")?.value;
    expect(policy).toBeDefined();
    const directives = new Map(policy!.split(";").map((part) => {
      const [name, ...values] = part.trim().split(/\s+/);
      return [name, values.join(" ")];
    }));
    expect(directives.get("script-src-attr")).toBe("'none'");
    expect(directives.get("script-src")).toContain("'self'");
    expect(directives.get("script-src")).toContain("'unsafe-inline'");
    expect(directives.get("script-src")).not.toContain("'unsafe-hashes'");
    expect(directives.get("object-src")).toBe("'none'");
    expect(directives.get("frame-ancestors")).toBe("'none'");
    expect(directives.get("base-uri")).toBe("'self'");
  });
});
