import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { load } from "cheerio";
import { chromium, firefox, webkit } from "@playwright/test";

const mocks = vi.hoisted(() => ({
  user: { id: "synthetic-user" } as { id: string } | null,
  row: {} as Record<string, unknown> | null,
  failure: false,
  limited: false,
  calls: [] as Array<[string, ...unknown[]]>,
  create: vi.fn(),
  qr: vi.fn(),
}));

vi.mock("@/lib/supabase-server", () => ({ createSupabaseServerClient: mocks.create }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient: mocks.create }));
vi.mock("@supabase/supabase-js", () => ({ createClient: mocks.create }));
vi.mock("@/lib/warranty-access", () => ({ resolveWarrantyAccessOrClause: vi.fn(async () => "user_id.eq.synthetic-user") }));
vi.mock("qrcode", () => ({ default: { toDataURL: mocks.qr } }));
vi.mock("@/lib/rate-limit", () => ({
  getClientIp: () => "192.0.2.1",
  getRateLimitHeaders: () => ({ "Retry-After": "60" }),
  certificateRateLimit: async () => ({ success: !mocks.limited }),
  publicLookupRateLimit: async () => ({ success: !mocks.limited }),
}));

import { POST } from "../../src/app/api/certificates/generate/route";
import { GET as privateGet } from "../../src/app/api/warranties/[id]/certificate/route";
import { GET as publicGet } from "../../src/app/api/v1/warranties/verify/[id]/certificate/route";

const id = "00000000-0000-4000-8000-000000000001";
const pixel = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=";
const hostile = '<img src="https://invalid.test/probe" onerror="alert(1)"> & "quoted" </style><style>body{display:none}</style><script>alert(1)</script>';
type Locale = "en" | "ar";
type Kind = "generate" | "private" | "public";

function measureLayout() {
  const clipped: string[] = [];
  for (const element of document.querySelectorAll<HTMLElement>("h1,p,.detail-value,.value,.field,#layout-control")) {
    const style = getComputedStyle(element);
    // Font ink may extend beyond tight line-height without being clipped.
    const clipsX = style.overflowX !== "visible" && style.overflowX !== "unset";
    const clipsY = style.overflowY !== "visible" && style.overflowY !== "unset";
    if ((clipsX && element.scrollWidth > element.clientWidth + 1) || (clipsY && element.scrollHeight > element.clientHeight + 1)) clipped.push(element.id || element.className || element.tagName);
  }
  return { overflow: document.documentElement.scrollWidth > innerWidth + 1, clipped };
}

function fixture(locale: Locale) {
  return {
    id, language: locale, status: "active", certificate_number: "SYNTHETIC-CERT-001",
    product_name: "Synthetic industrial pump", product_name_ar: "مضخة صناعية تجريبية",
    reference_number: "SYNTHETIC-REF-001", serial_number: "SYNTHETIC-SECRET-1234",
    start_date: "2026-01-01", end_date: "2099-12-31", category: "Synthetic equipment",
    seller_name: "Synthetic Supplier", companies: { name: "Synthetic Company" },
    customer_name: "SYNTHETIC-PRIVATE-NAME", customer_email: "synthetic-private@example.invalid",
    user_id: "SYNTHETIC-PRIVATE-OWNER", coverage_details: "Synthetic parts and labour coverage",
    internal_notes: "SYNTHETIC-PRIVATE-NOTES",
  };
}

async function render(kind: Kind, locale: Locale) {
  const params = { params: Promise.resolve({ id }) };
  if (kind === "generate") return POST(new Request("https://fixture.invalid/api/certificates/generate", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ warrantyId: id, locale }),
  }));
  const request = new NextRequest(`https://fixture.invalid/api/certificate?locale=${locale}`);
  return kind === "private" ? privateGet(request, params) : publicGet(request, params);
}

beforeEach(() => {
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "synthetic-not-a-secret");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://supabase.invalid");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://fixture.invalid");
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Outbound network forbidden in certificate tests"); }));
  mocks.user = { id: "synthetic-user" };
  mocks.row = fixture("en");
  mocks.failure = false;
  mocks.limited = false;
  mocks.calls = [];
  mocks.qr.mockReset().mockResolvedValue(pixel);
  mocks.create.mockReset().mockImplementation(() => {
    if (mocks.failure) throw new Error("SYNTHETIC-SECRET-FAILURE");
    const query: Record<string, unknown> = {};
    for (const method of ["select", "eq", "or", "in", "limit", "ilike"]) {
      query[method] = vi.fn((...args: unknown[]) => { mocks.calls.push([method, ...args]); return query; });
    }
    query.single = query.maybeSingle = async () => ({ data: mocks.row, error: null });
    query.update = () => { throw new Error("Record writes forbidden in certificate tests"); };
    return { auth: { getUser: async () => ({ data: { user: mocks.user }, error: null }) },
      from: (table: string) => { mocks.calls.push(["from", table]); return query; } };
  });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("real certificate handlers with synthetic data only", () => {
  for (const kind of ["generate", "private", "public"] as const) {
    for (const locale of ["en", "ar"] as const) {
      it(`${kind}/${locale}: actual HTML has localized content and a fresh matching nonce`, async () => {
        mocks.row = fixture(locale);
        const response = await render(kind, locale);
        expect(response.status).toBe(200);
        expect(response.headers.get("content-type")).toContain("text/html");
        expect(response.headers.get("cache-control")).toContain("no-store");
        const html = await response.text();
        const $ = load(html);
        expect($("html").attr("lang")).toBe(locale);
        expect($("html").attr("dir")).toBe(locale === "ar" ? "rtl" : "ltr");
        expect($("body").text()).toContain(locale === "ar" ? "شهادة ضمان" : "Warranty Certificate");
        expect($("body").text()).toContain(kind === "public" && locale === "ar" ? "مضخة صناعية تجريبية" : "Synthetic industrial pump");
        expect($("style")).toHaveLength(1);
        const nonce = $("style").attr("nonce");
        expect(nonce).toMatch(/^[A-Za-z0-9+/]{32}$/);
        const policy = response.headers.get("content-security-policy")!;
        expect(policy).toContain(`style-src-elem 'nonce-${nonce}'`);
        expect(policy).toContain("style-src-attr 'unsafe-inline'");
        if (kind === "generate") expect(policy).toContain("sandbox");
        if (kind === "public") expect(policy).toContain("default-src 'none'");
        const second = load(await (await render(kind, locale)).text());
        expect(second("style").attr("nonce")).not.toBe(nonce);
        expect(fetch).not.toHaveBeenCalled();
      });
      it(`${kind}/${locale}: data cannot introduce executable HTML or unauthorized CSS`, async () => {
        mocks.row = { ...fixture(locale), product_name: hostile, product_name_ar: hostile,
          reference_number: hostile, category: hostile, seller_name: hostile,
          customer_name: hostile, coverage_details: hostile, companies: { name: hostile } };
        const $ = load(await (await render(kind, locale)).text());
        expect($("body").text()).toContain(hostile);
        expect($("script, img[onerror], [onerror]")).toHaveLength(0);
        expect($("style")).toHaveLength(1);
        expect($("img[src^='https://invalid.test']")).toHaveLength(0);
      });
    }
    it(`${kind}: errors retain CSP and never return fixture data`, async () => {
      if (kind === "public") mocks.limited = true;
      else mocks.user = null;
      const response = await render(kind, "en");
      expect(response.status).toBe(kind === "public" ? 429 : 401);
      expect(response.headers.get("content-type")).toContain("application/json");
      expect(response.headers.get("content-security-policy")).toContain("script-src-attr 'none'");
      expect(await response.text()).not.toContain("SYNTHETIC-PRIVATE");
      expect(mocks.calls).toEqual([]);
    });
    it(`${kind}: dependency failures retain CSP and do not reflect exception data`, async () => {
      const log = vi.spyOn(console, "error").mockImplementation(() => {});
      mocks.failure = true;
      const response = await render(kind, "en");
      expect(response.status).toBe(500);
      expect(response.headers.get("content-security-policy")).toContain("script-src-attr 'none'");
      expect(await response.text()).not.toContain("SYNTHETIC-SECRET-FAILURE");
      expect({
        noStore: response.headers.get("cache-control")?.includes("no-store") ?? false,
        privateDetailsAbsent: !log.mock.calls.flat().map(value => value instanceof Error ? value.message : JSON.stringify(value)).join(" ").includes("SYNTHETIC-SECRET-FAILURE"),
      }).toEqual({ noStore: true, privateDetailsAbsent: true });
      expect(log).toHaveBeenCalledWith(kind === "generate" ? "Certificate generation failed" : "Certificate response failed", { category: "certificate_unavailable" });
    });
    it(`${kind}: missing warranty returns CSP-bearing 404 without fixture content`, async () => {
      mocks.row = null;
      const response = await render(kind, "ar");
      expect(response.status).toBe(404);
      expect(response.headers.get("content-security-policy")).toContain("style-src-elem 'self'");
      expect(await response.text()).not.toContain("SYNTHETIC");
    });
  }
  it("public certificate masks serials and excludes private fields despite an overcomplete mocked row", async () => {
    const html = await (await render("public", "en")).text();
    expect(html).toContain("********1234");
    for (const value of ["SYNTHETIC-SECRET-1234", "SYNTHETIC-PRIVATE-NAME", "synthetic-private@example.invalid", "SYNTHETIC-PRIVATE-OWNER", "SYNTHETIC-PRIVATE-NOTES"]) expect(html).not.toContain(value);
    const select = mocks.calls.find(([method]) => method === "select")?.[1] as string;
    expect(select).not.toContain("*");
    for (const field of ["customer_email", "customer_name", "user_id", "internal_notes"]) expect(select).not.toContain(field);
    expect(mocks.calls).toContainEqual(["in", "status", ["active", "claimed", "expired", "cancelled", "renewed"]]);
  });
  it("public invalid query is rejected before client creation", async () => {
    const response = await publicGet(new NextRequest("https://fixture.invalid/certificate"), { params: Promise.resolve({ id: "<script>" }) });
    expect(response.status).toBe(400);
    expect(response.headers.get("content-security-policy")).toContain("script-src-attr 'none'");
    expect(mocks.create).not.toHaveBeenCalled();
  });
});

describe("offline real-template browser regressions", () => {
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
    it(`${name}: EN/AR layout and positive/negative nonce controls`, async () => {
      const browser = await engine.launch();
      try {
        for (const kind of ["generate", "private", "public"] as const) {
          for (const locale of ["en", "ar"] as const) {
            mocks.row = fixture(locale);
            const response = await render(kind, locale);
            const html = await response.text();
            const headers = Object.fromEntries(response.headers);
            for (const width of [390, 1280]) {
              const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: "block" });
              try {
                const requests: string[] = [];
                await context.route("**/*", route => {
                  requests.push(route.request().url());
                  if (route.request().url() === "https://fixture.invalid/certificate") return route.fulfill({ status: 200, headers, body: html });
                  return route.abort("blockedbyclient");
                });
                const page = await context.newPage();
                await page.goto("https://fixture.invalid/certificate");
                const root = kind === "generate" ? ".certificate" : kind === "private" ? ".cert" : ".certificate";
                expect(await page.locator(root).evaluate(e => getComputedStyle(e).borderTopStyle), `${name}/${kind}/${locale}/${width}: trusted CSS`).toBe("solid");
                const geometry = await page.evaluate(measureLayout);
                expect(geometry, `${name}/${kind}/${locale}/${width}: layout`).toEqual({ overflow: false, clipped: [] });
                await page.evaluate(() => {
                  const control = document.createElement("div");
                  control.id = "layout-control";
                  control.setAttribute("style", "width:10px;overflow:hidden;white-space:nowrap");
                  control.textContent = "Synthetic clipping detector control";
                  document.body.appendChild(control);
                });
                expect((await page.evaluate(measureLayout)).clipped).toContain("layout-control");
                await page.locator("#layout-control").evaluate(e => e.remove());
                expect(requests).toEqual(["https://fixture.invalid/certificate"]);
                // Remove the actual template nonce: the original CSS must stop applying.
                await context.unroute("**/*");
                await context.route("**/*", route => route.request().url() === "https://fixture.invalid/certificate"
                  ? route.fulfill({ status: 200, headers, body: html.replace(/<style nonce="[^"]+">/, '<style nonce="wrong">') })
                  : route.abort("blockedbyclient"));
                await page.reload();
                expect(await page.locator(root).evaluate(e => getComputedStyle(e).borderTopStyle)).toBe("none");
              } finally { await context.close(); }
            }
          }
        }
      } finally { await browser.close(); }
    }, 60000);
  }
});
