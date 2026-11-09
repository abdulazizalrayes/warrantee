import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isValidElement, type ReactNode } from "react";

const hooks = vi.hoisted(() => ({
  values: [] as unknown[],
  writes: [] as number[],
  cursor: 0,
  effect: undefined as undefined | (() => void | (() => void)),
  user: { id: "synthetic-user" } as { id: string } | null,
  authLoading: false,
  locale: "en",
}));

vi.mock("react", async importOriginal => ({
  ...await importOriginal<typeof import("react")>(),
  useState(initial: unknown) {
    const index = hooks.cursor++;
    if (!(index in hooks.values)) hooks.values[index] = initial;
    return [hooks.values[index], (value: unknown) => {
      hooks.writes.push(index);
      hooks.values[index] = typeof value === "function" ? value(hooks.values[index]) : value;
    }];
  },
  useEffect(effect: () => void | (() => void)) { hooks.effect = effect; },
}));
vi.mock("next/navigation", () => ({ useParams: () => ({ locale: hooks.locale }) }));
vi.mock("next/link", () => ({ default: () => null }));
vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({ user: hooks.user, loading: hooks.authLoading }) }));
vi.mock("@/components/dashboard/DashboardPageShell", () => ({ DashboardPageShell: () => null }));
vi.mock("@/components/dashboard/ProtectedRouteNotice", () => ({ ProtectedRouteNotice: () => null }));
vi.mock("@/components/PageViewTracker", () => ({ PageViewTracker: () => null }));
vi.mock("@/lib/ga4-events", () => ({ trackDocumentView: vi.fn() }));

import DocumentsPage from "../../src/app/[locale]/documents/page";

type PendingRequest = {
  url: URL;
  signal: AbortSignal;
  resolve: (response: Response) => void;
  reject: (error: Error) => void;
};
const requests: PendingRequest[] = [];
let cleanup: undefined | (() => void);

function commit(search = "") {
  hooks.values[2] = search;
  hooks.cursor = 0;
  DocumentsPage();
  cleanup?.();
  cleanup = hooks.effect?.() || undefined;
}

async function flush() {
  await new Promise<void>(resolve => setImmediate(resolve));
}

function result(id: string, ok = true) {
  return { ok, json: async () => ok ? { data: [{ id }] } : { error: "Synthetic request failure" } } as Response;
}

beforeEach(() => {
  Object.assign(hooks, {
    values: [], writes: [], cursor: 0, effect: undefined,
    user: { id: "synthetic-user" }, authLoading: false, locale: "en",
  });
  cleanup = undefined;
  requests.length = 0;
  // Deliberately ignore aborts so late transport/body completion cannot hide a stale-state bug.
  vi.stubGlobal("fetch", vi.fn((input: string, options: RequestInit) => new Promise<Response>((resolve, reject) => {
    requests.push({ url: new URL(input, "https://fixture.invalid"), signal: options.signal as AbortSignal, resolve, reject });
  })));
});
afterEach(() => { cleanup?.(); vi.unstubAllGlobals(); });

describe("actual document-page effect with synthetic deferred requests", () => {
  it.each([["en", "View document"], ["ar", "\u0639\u0631\u0636 \u0627\u0644\u0645\u0633\u062a\u0646\u062f"]])("%s: populated document links have an accessible name", (locale, label) => {
    hooks.locale = locale;
    hooks.values[0] = [{ id: "synthetic-document", file_name: "Synthetic.pdf", storage_path: "synthetic/file.pdf", file_size: 1, version: 1, created_at: "2026-01-01" }];
    hooks.values[1] = false;
    const names: unknown[] = [];
    function collect(node: ReactNode): void {
      if (Array.isArray(node)) { node.forEach(collect); return; }
      if (!isValidElement<{ children?: ReactNode; "aria-label"?: string }>(node)) return;
      if (node.type === "a") names.push(node.props["aria-label"]);
      collect(node.props.children);
    }
    collect(DocumentsPage());
    expect(names).toEqual([label]);
  });

  it.each(["en", "ar"])("%s: a slower old search cannot replace newer results", async locale => {
    hooks.locale = locale;
    commit("older");
    commit(" newer ");
    expect(requests[0].signal.aborted).toBe(true);
    expect(requests[1].signal.aborted).toBe(false);
    expect(requests[1].url.searchParams.get("q")).toBe("newer");
    expect(requests[1].url.searchParams.get("limit")).toBe("200");
    expect(vi.mocked(fetch).mock.calls[1][1]?.cache).toBe("no-store");
    requests[1].resolve(result("synthetic-newer"));
    await flush();
    expect(hooks.values[0]).toEqual([{ id: "synthetic-newer" }]);
    requests[0].resolve(result("synthetic-older"));
    await flush();
    expect(hooks.values[0]).toEqual([{ id: "synthetic-newer" }]);
    expect(hooks.values[1]).toBe(false);
    expect(hooks.values[3]).toBe("");
  });

  it("an obsolete rejection cannot clear results, show an error, or stop the latest loading state", async () => {
    hooks.values[0] = [{ id: "synthetic-existing" }];
    commit("older");
    commit("newer");
    requests[0].reject(new Error("Synthetic obsolete failure"));
    await flush();
    expect(hooks.values[0]).toEqual([{ id: "synthetic-existing" }]);
    expect(hooks.values[1]).toBe(true);
    expect(hooks.values[3]).toBe("");
    requests[1].resolve(result("synthetic-newer"));
    await flush();
    expect(hooks.values[0]).toEqual([{ id: "synthetic-newer" }]);
    expect(hooks.values[1]).toBe(false);
  });

  it("clearing search cannot be overwritten by a pending filtered response", async () => {
    commit("obsolete-filter");
    commit("   ");
    expect(requests[1].url.searchParams.has("q")).toBe(false);
    requests[1].resolve(result("synthetic-unfiltered"));
    await flush();
    requests[0].resolve(result("synthetic-obsolete-filter"));
    await flush();
    expect(requests[0].signal.aborted).toBe(true);
    expect(hooks.values[0]).toEqual([{ id: "synthetic-unfiltered" }]);
    expect(hooks.values[1]).toBe(false);
  });

  it("ignores a response body that finishes after its request was cancelled", async () => {
    let resolveBody!: (body: unknown) => void;
    commit("older");
    requests[0].resolve({ ok: true, json: () => new Promise(resolve => { resolveBody = resolve; }) } as Response);
    await flush();
    commit("newer");
    requests[1].resolve(result("synthetic-newer"));
    await flush();
    resolveBody({ data: [{ id: "synthetic-older" }] });
    await flush();
    expect(hooks.values[0]).toEqual([{ id: "synthetic-newer" }]);
    expect(hooks.values[1]).toBe(false);
  });

  it("preserves the existing error state for a failed current request", async () => {
    hooks.values[0] = [{ id: "synthetic-existing" }];
    commit("current");
    requests[0].resolve(result("unused", false));
    await flush();
    expect(hooks.values[0]).toEqual([]);
    expect(hooks.values[3]).toBe("Synthetic request failure");
    expect(hooks.values[1]).toBe(false);
  });

  it("does not update any state after unmount cleanup", async () => {
    commit("current");
    cleanup?.();
    const writesBeforeCompletion = hooks.writes.length;
    requests[0].resolve(result("synthetic-late"));
    await flush();
    expect(requests[0].signal.aborted).toBe(true);
    expect(hooks.writes).toHaveLength(writesBeforeCompletion);
  });

  it("cancels the old session request and keeps the signed-out state empty", async () => {
    commit("current");
    hooks.user = null;
    commit("current");
    expect(requests).toHaveLength(1);
    requests[0].resolve(result("synthetic-old-session"));
    await flush();
    expect(requests[0].signal.aborted).toBe(true);
    expect(hooks.values[0]).toEqual([]);
    expect(hooks.values[1]).toBe(false);
    expect(hooks.values[3]).toBe("");
  });

  it("does not request documents while authentication is loading", () => {
    hooks.authLoading = true;
    commit("current");
    expect(fetch).not.toHaveBeenCalled();
  });
});
