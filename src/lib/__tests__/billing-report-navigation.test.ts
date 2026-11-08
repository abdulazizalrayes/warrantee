import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";

// Execute the actual handlers without mounting protected pages or requesting private data.
function declarations(page: "billing" | "reports", names: string[]) {
  const source = readFileSync(`src/app/[locale]/${page}/page.tsx`, "utf8");
  const ast = ts.createSourceFile("page.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const found = new Map<string, string>();
  function visit(node: ts.Node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && names.includes(node.name.text)) {
      found.set(node.name.text, `const ${node.getText(ast)};`);
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  return names.map((name) => {
    expect(found.has(name), `Missing ${name} in ${page}`).toBe(true);
    return found.get(name)!;
  }).join("\n");
}

describe("billing contact navigation", () => {
  it.each(["en", "ar"])("preserves both plan intents through the %s router", (locale) => {
    const router = { push: vi.fn() };
    const location = {};
    const code = declarations("billing", ["handlePlanRequest"]);
    runInNewContext(ts.transpileModule(`${code}\nhandlePlanRequest('pro'); handlePlanRequest('enterprise');`, {}).outputText,
      { locale, router, window: { location } });
    expect(router.push.mock.calls).toEqual([
      [`/${locale}/contact?intent=professional-access`],
      [`/${locale}/contact?intent=enterprise`],
    ]);
    expect(location).toEqual({});
  });
});

describe("native reports CSV download contract", () => {
  const code = declarations("reports", ["exportType", "hasExportableData", "handleCsvExport"]);

  function invoke({ activeReport = "warranty_status", user = {}, loading = false, total = 1, claimCount = 1 }: {
    activeReport?: string; user?: object | null; loading?: boolean; total?: number; claimCount?: number;
  } = {}) {
    const calls: unknown[] = [];
    const trackReportExport = vi.fn((payload: unknown) => calls.push(payload));
    const navigate = vi.fn((href: string) => calls.push(href));
    const location = Object.defineProperty({}, "href", { set: navigate });
    const router = { push: vi.fn(), replace: vi.fn() };
    const fetch = vi.fn();
    runInNewContext(`${code}\nhandleCsvExport();`, {
      user, loading, activeReport, claims: Array(claimCount), stats: { total },
      locale: "ar", timeRange: "30d", trackReportExport, window: { location }, router, fetch,
    });
    expect(router.push).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    return { calls, navigate, trackReportExport };
  }

  it.each([
    ["warranty_status", "warranties"],
    ["expiry_forecast", "warranties"],
    ["supplier_performance", "warranties"],
    ["claims_overview", "claims"],
  ])("uses native same-origin attachment navigation for %s, tracking once before navigation", (activeReport, type) => {
    const { calls, navigate, trackReportExport } = invoke({ activeReport });
    expect(trackReportExport).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledExactlyOnceWith(`/api/export?format=csv&type=${type}`);
    expect(calls).toEqual([
      { locale: "ar", source: "reports_hub", report_type: activeReport, time_range: "30d" },
      `/api/export?format=csv&type=${type}`,
    ]);
  });

  it.each([
    { user: null },
    { loading: true },
    { total: 0 },
    { activeReport: "claims_overview", claimCount: 0 },
  ])("does not track or navigate when export is unavailable: %j", (options) => {
    expect(invoke(options).calls).toEqual([]);
  });
});
