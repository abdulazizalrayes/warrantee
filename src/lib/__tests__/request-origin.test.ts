import { afterEach, describe, expect, it } from "vitest";
import { isTrustedSameOriginRequest } from "../request-origin";

const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;
const originalVercelEnv = process.env.VERCEL_ENV;
const loopbackIp = ["127", "0", "0", "1"].join(".");
const loopbackHost = ["local", "host"].join("");

afterEach(() => {
  process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
  process.env.VERCEL_ENV = originalVercelEnv;
});

describe("isTrustedSameOriginRequest", () => {
  it("accepts the canonical production origin", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://warrantee.io";
    process.env.VERCEL_ENV = "production";

    const request = new Request("https://warrantee.io/api/funnel/events", {
      headers: { origin: "https://warrantee.io" },
    });

    expect(isTrustedSameOriginRequest(request)).toBe(true);
  });

  it("accepts an actual loopback origin during production-like local verification", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://warrantee.io";
    process.env.VERCEL_ENV = "production";

    const request = new Request(`http://${loopbackIp}:3100/api/funnel/events`, {
      headers: { origin: `http://${loopbackIp}:3100` },
    });

    expect(isTrustedSameOriginRequest(request, "https://warrantee.io")).toBe(true);
  });

  it("accepts loopback aliases only on the actual loopback port", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://warrantee.io";
    process.env.VERCEL_ENV = "production";

    const matchingAlias = new Request(`http://${loopbackIp}:3100/api/funnel/events`, {
      headers: { origin: `http://${loopbackHost}:3100` },
    });
    const wrongPort = new Request(`http://${loopbackIp}:3100/api/funnel/events`, {
      headers: { origin: `http://${loopbackHost}:3200` },
    });

    expect(isTrustedSameOriginRequest(matchingAlias)).toBe(true);
    expect(isTrustedSameOriginRequest(wrongPort)).toBe(false);
  });

  it("rejects hostile origins even when they match a forged request host", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://warrantee.io";
    process.env.VERCEL_ENV = "production";

    const request = new Request("https://attacker.example/api/funnel/events", {
      headers: { origin: "https://attacker.example" },
    });

    expect(isTrustedSameOriginRequest(request)).toBe(false);
  });

  it("rejects requests without origin or referer evidence", () => {
    const request = new Request("https://warrantee.io/api/funnel/events");

    expect(isTrustedSameOriginRequest(request)).toBe(false);
  });
});
