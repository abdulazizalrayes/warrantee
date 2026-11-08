import { describe, expect, it } from "vitest";
import config from "../../../next.config";
import { documentCspHeaderSource } from "../csp-styles.mjs";

describe("application security headers", () => {
  it("blocks inline event attributes without disabling framework script elements", async () => {
    const rules = await config.headers!();
    const cspRules = rules.filter((rule) => rule.headers.some((header) => header.key === "Content-Security-Policy"));
    expect(cspRules).toHaveLength(1);
    expect(cspRules[0].source).toBe(documentCspHeaderSource);
    const policy = cspRules[0].headers.find((header) => header.key === "Content-Security-Policy")?.value;
    expect(policy).toBeDefined();
    const directives = new Map(policy!.split(";").map((part) => {
      const [name, ...values] = part.trim().split(/\s+/);
      return [name, values.join(" ")];
    }));
    expect(directives.get("script-src-attr")).toBe("'none'");
    expect(directives.get("script-src")).toContain("'self'");
    expect(directives.get("script-src")).not.toContain("'unsafe-inline'");
    expect(directives.get("script-src")).not.toContain("'unsafe-hashes'");
    expect(directives.get("object-src")).toBe("'none'");
    expect(directives.get("frame-ancestors")).toBe("'none'");
    expect(directives.get("base-uri")).toBe("'self'");
    expect(directives.get("style-src-attr")).toBe("'unsafe-inline'");
    expect(directives.get("style-src-elem")).not.toContain("'unsafe-inline'");
    expect(directives.get("style-src-elem")).toContain("'self'");
    expect(directives.get("style-src-elem")).toContain("'sha256-");
  });
});
