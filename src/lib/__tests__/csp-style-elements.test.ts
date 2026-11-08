import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi, afterEach } from "vitest";
import { createCertificateStyleCsp, withCertificateCsp } from "../certificate-style-csp";
import { documentCspHeaderSource, trustedStyleHashes } from "../csp-styles.mjs";
import { trustedInlineStyleHashes } from "../../../scripts/csp-finalize-build.mjs";

const require = createRequire(import.meta.url);
const { pathToRegexp } = require("next/dist/compiled/path-to-regexp");
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

describe("style element CSP", () => {
  it("keeps attribute compatibility while restricting production style elements", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { contentSecurityPolicy } = await import("../csp-policy.mjs");
    const elements = contentSecurityPolicy.split("; ").find((d: string) => d.startsWith("style-src-elem "))!;
    expect(contentSecurityPolicy).toContain("style-src-attr 'unsafe-inline'");
    expect(elements).not.toContain("unsafe-inline");
    expect(elements).toContain("'self'");
    for (const hash of trustedStyleHashes) expect(elements).toContain(hash);
  });
  it("accepts exact fixed admin CSS, not attacker CSS or modified trusted CSS", () => {
    const css = "@keyframes spin { to { transform: rotate(360deg); } }";
    const hash = `'sha256-${createHash("sha256").update(css).digest("base64")}'`;
    expect(trustedInlineStyleHashes(`<style>${css}</style>`)).toEqual([hash]);
    expect(() => trustedInlineStyleHashes(`<style>${css}body{display:none}</style>`)).toThrow("Unreviewed");
    expect(() => trustedInlineStyleHashes('<style nonce="anything">body{display:none}</style>')).toThrow("Unreviewed");
    expect(() => trustedInlineStyleHashes("<style>unclosed")).toThrow();
    expect(trustedInlineStyleHashes('<div style="width:50%"></div>')).toEqual([]);
    const admin = readFileSync("src/app/[locale]/admin/login/page.tsx", "utf8");
    const literal = admin.match(/<style>\{`([^`]+)`\}<\/style>/)?.[1];
    expect(literal).toBe(css);
    expect(`'sha256-${createHash("sha256").update(literal!).digest("base64")}'`).toBe(trustedStyleHashes[2]);
  });
  it("pins the exact framework not-found CSS", () => {
    const css = "body{color:#000;background:#fff;margin:0}.next-error-h1{border-right:1px solid rgba(0,0,0,.3)}@media (prefers-color-scheme:dark){body{color:#fff;background:#000}.next-error-h1{border-right:1px solid rgba(255,255,255,.3)}}";
    expect(trustedInlineStyleHashes(`<style>${css}</style>`)).toEqual([trustedStyleHashes[1]]);
  });
  it("excludes only the three exact certificate endpoints from configured CSP", () => {
    const match = pathToRegexp(documentCspHeaderSource);
    for (const url of ["/api/certificates/generate", "/api/warranties/fixture/certificate", "/api/v1/warranties/verify/fixture/certificate"]) {
      expect(match.test(url)).toBe(false);
      expect(match.test(`${url}/`)).toBe(false);
      expect(match.test(`${url}/extra`)).toBe(true);
    }
    for (const url of ["/en", "/ar/admin/login", "/api/health", "/api/contact", "/api/certificates/generate-other", "/api/warranties/certificate"]) expect(match.test(url)).toBe(true);
  });
  it("creates fresh certificate nonces without relaxing the existing sandbox or default policy", () => {
    const base = "default-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox";
    const a = createCertificateStyleCsp(base);
    const b = createCertificateStyleCsp(base);
    expect(a.nonce).not.toBe(b.nonce);
    expect(a.nonce).toMatch(/^[A-Za-z0-9+/]{32}$/);
    expect(a.policy).toContain(`style-src-elem 'nonce-${a.nonce}'`);
    expect(a.policy).toContain("style-src-attr 'unsafe-inline'");
    expect(a.policy).toContain("default-src 'none'");
    expect(a.policy).toContain("sandbox");
    expect(a.policy.split("; ").find(d => d.startsWith("style-src-elem"))).not.toContain("unsafe-inline");
  });
  it("uses the real Next response sender to prove configured CSP must be absent", async () => {
    const { sendResponse } = require("next/dist/server/send-response.js");
    for (const configured of [true, false]) {
      const headers = new Map<string, string>(configured ? [["content-security-policy", "configured"]] : []);
      const response = { getHeader: (name: string) => headers.get(name), appendHeader: (name: string, value: string) => headers.set(name, value), originalResponse: { end: vi.fn() } };
      await sendResponse({ method: "HEAD" }, response, new Response(null, { headers: { "Content-Security-Policy": "certificate" } }));
      expect(headers.get("content-security-policy")).toBe(configured ? "configured" : "certificate");
    }
  });
  it("retains CSP on non-HTML certificate responses and preserves owned HTML policies", async () => {
    const json = await withCertificateCsp(async () => Response.json({ error: "Unauthorized" }, { status: 401 }))();
    expect(json.headers.get("Content-Security-Policy")).toContain("script-src-attr 'none'");
    const owned = createCertificateStyleCsp("default-src 'none'; sandbox");
    const html = await withCertificateCsp(async () => new Response("fixture", { headers: { "Content-Security-Policy": owned.policy } }))();
    expect(html.headers.get("Content-Security-Policy")).toBe(owned.policy);
  });
  it("contains thrown certificate failures without reflecting error text or losing CSP", async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const response = await withCertificateCsp(async () => { throw new Error('private-token'); })();
      expect(response.status).toBe(500);
      expect(response.headers.get('Content-Security-Policy')).toContain("script-src-attr 'none'");
      expect(response.headers.get('Cache-Control')).toContain('no-store');
      expect(await response.text()).not.toContain('private-token');
      expect(JSON.stringify(log.mock.calls)).not.toContain('private-token');
    } finally { log.mockRestore(); }
  });
});
