import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isValidElement, type ReactNode } from "react";

const fixture = vi.hoisted(() => ({
  states: [] as unknown[], refs: [] as { current: unknown }[], cursor: 0, refCursor: 0,
  effects: [] as (() => void | (() => void))[], locale: "en",
  auth: {} as Record<string, unknown>,
  push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), refreshProfile: vi.fn(),
  journey: vi.fn(), completed: vi.fn(), selected: vi.fn(),
  query: vi.fn(),
}));

vi.mock("react", async (importOriginal) => ({
  ...await importOriginal<typeof import("react")>(),
  useState(initial: unknown) {
    const index = fixture.cursor++;
    if (!(index in fixture.states)) fixture.states[index] = typeof initial === "function" ? initial() : initial;
    return [fixture.states[index], (value: unknown) => {
      fixture.states[index] = typeof value === "function" ? value(fixture.states[index]) : value;
    }];
  },
  useRef(initial: unknown) {
    const index = fixture.refCursor++;
    return fixture.refs[index] ||= { current: initial };
  },
  useEffect(effect: () => void | (() => void)) { fixture.effects.push(effect); },
}));
vi.mock("next/navigation", () => ({
  useParams: () => ({ locale: fixture.locale }),
  useRouter: () => ({ push: fixture.push, replace: fixture.replace, refresh: fixture.refresh }),
}));
vi.mock("next/link", () => ({ default: () => null }));
vi.mock("@/lib/auth-context", () => ({ useAuth: () => fixture.auth }));
vi.mock("@/lib/ga4-events", () => ({
  trackActivationStarted: vi.fn(), trackOnboardingCompleted: fixture.completed,
  trackOnboardingJourney: fixture.journey, trackOnboardingTemplateSelected: fixture.selected,
}));

type Query = { table: string; select?: string; filters: [string, ...unknown[]][]; signal?: AbortSignal; update?: unknown };
const queries: Query[] = [];
const client = { from(table: string) {
  const query: Query = { table, filters: [] };
  queries.push(query);
  const builder = {
    select(value: string) { query.select = value; return builder; },
    update(value: unknown) { query.update = value; return builder; },
    eq(...args: unknown[]) { query.filters.push(["eq", ...args]); return builder; },
    or(...args: unknown[]) { query.filters.push(["or", ...args]); return builder; },
    in(...args: unknown[]) { query.filters.push(["in", ...args]); return builder; },
    is(...args: unknown[]) { query.filters.push(["is", ...args]); return builder; },
    not(...args: unknown[]) { query.filters.push(["not", ...args]); return builder; },
    gte(...args: unknown[]) { query.filters.push(["gte", ...args]); return builder; },
    lte(...args: unknown[]) { query.filters.push(["lte", ...args]); return builder; },
    limit() { return builder; }, order() { return builder; }, single() { return builder; },
    abortSignal(signal: AbortSignal) { query.signal = signal; return builder; },
    then(resolve: (value: unknown) => unknown, reject: (error: unknown) => unknown) { return Promise.resolve(fixture.query(query)).then(resolve, reject); },
  };
  return builder;
} };
vi.mock("@/lib/supabase-browser", () => ({ createSupabaseBrowserClient: () => client }));

import OnboardingPage from "../../src/app/[locale]/onboarding/page";
import DashboardPage from "../../src/app/[locale]/dashboard/page";

type ElementProps = { children?: ReactNode; onClick?: () => unknown; href?: string; role?: string; [key: string]: unknown };
function elements(node: ReactNode): { type: unknown; props: ElementProps }[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!isValidElement<ElementProps>(node)) return [];
  return [node, ...elements(node.props.children)];
}
function text(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(text).join("");
  return isValidElement<ElementProps>(node) ? text(node.props.children) : "";
}
function render(page = DashboardPage) {
  fixture.cursor = 0; fixture.refCursor = 0; fixture.effects = [];
  return page();
}
function button(node: ReactNode, label: string) {
  const element = elements(node).find((element) => element.type === "button" && text(element.props.children) === label);
  expect(element, `button ${label}`).toBeDefined();
  return element!.props;
}
let cleanup: void | (() => void);
async function flush() { await new Promise<void>((resolve) => setImmediate(resolve)); }
async function loadDashboard() {
  render();
  fixture.effects[0]();
  cleanup = fixture.effects[1]();
  await flush();
  return render();
}

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(fixture, { states: [], refs: [], cursor: 0, refCursor: 0, effects: [], locale: "en" });
  fixture.auth = {
    user: { id: "synthetic-user", user_metadata: {}, email: "synthetic@example.invalid" },
    profile: { account_type: "consumer", onboarding_completed: true, role: "user" },
    loading: false, profileLoading: false, profileError: null, refreshProfile: fixture.refreshProfile,
  };
  fixture.query.mockImplementation((query: Query) => ({ data: query.table === "profiles" ? { id: "synthetic-user" } : [], count: 0, error: null }));
  queries.length = 0; cleanup = undefined;
});
afterEach(() => { cleanup?.(); vi.useRealTimers(); });

describe("onboarding setup with synthetic profile writes", () => {
  it.each([["en", "Next", "Complete Setup"], ["ar", "التالي", "إكمال الإعداد"]])("%s personal setup keeps contact optional and records completed mode", async (locale, next, complete) => {
    fixture.locale = locale;
    let view = render(OnboardingPage);
    fixture.effects[0](); fixture.effects[0]();
    expect(fixture.journey).toHaveBeenCalledTimes(1);
    expect(fixture.journey).toHaveBeenCalledWith("opened", { locale, account_type: "consumer" });
    const selected = elements(view).filter(({ props }) => props["aria-pressed"] === true);
    expect(selected).toHaveLength(1);
    expect(text(selected[0].props.children)).toContain(locale === "ar" ? "مشترياتي الشخصية" : "My personal purchase");
    expect(text(view)).not.toContain("Equipment dealer");
    button(view, next).onClick?.();
    view = render(OnboardingPage);
    const phone = elements(view).find(({ props }) => props.id === "onboarding-phone");
    expect(phone?.props.required).not.toBe(true);
    expect(phone?.props["aria-describedby"]).toBe("onboarding-phone-hint");
    expect(elements(view).filter(({ props }) => props["aria-pressed"] !== undefined)).toHaveLength(2);
    await button(view, complete).onClick?.();
    expect(fixture.completed).toHaveBeenCalledWith(expect.objectContaining({ completion_mode: "completed", template: "personal_purchase" }));
    expect(fixture.journey).toHaveBeenCalledWith("step_completed", { locale, step: 0, outcome: "success", account_type: "consumer" });
    expect(fixture.journey).toHaveBeenCalledWith("step_completed", { locale, step: 1, outcome: "success", account_type: "consumer" });
    expect(queries[0].update).toMatchObject({ phone: null, onboarding_completed: true });
    expect(queries[0].select).toBe("id");
    expect(text(render(OnboardingPage))).toContain(locale === "ar" ? "حسابك جاهز" : "Your account is all set up");
  });

  it("business setup retains all five business selectors and no personal template", () => {
    fixture.auth.profile = { account_type: "business" };
    const view = render(OnboardingPage);
    const choices = elements(view).filter(({ props }) => props["aria-pressed"] !== undefined);
    expect(choices).toHaveLength(5);
    expect(text(view)).toContain("Equipment dealer or service team");
    expect(text(view)).not.toContain("My personal purchase");
  });

  it("skip has its own completion mode and does not save optional contact settings", async () => {
    button(render(OnboardingPage), "Skip for now").onClick?.();
    await flush();
    expect(fixture.completed).toHaveBeenCalledWith(expect.objectContaining({ completion_mode: "skipped", template: "personal_purchase" }));
    expect(queries[0].update).not.toHaveProperty("phone");
    expect(fixture.push).toHaveBeenCalledWith("/en/dashboard");
  });

  it("an unconfirmed profile update remains on setup and emits only allowlisted failure metadata", async () => {
    fixture.query.mockResolvedValue({ data: null, error: null });
    button(render(OnboardingPage), "Skip for now").onClick?.();
    await flush();
    expect(fixture.completed).not.toHaveBeenCalled();
    expect(fixture.push).not.toHaveBeenCalled();
    expect(fixture.journey).toHaveBeenCalledWith("save_failed", { locale: "en", step: 0, outcome: "failure", reason: "unavailable", account_type: "consumer" });
    expect(elements(render(OnboardingPage)).some(({ props }) => props.role === "alert")).toBe(true);
  });

  it("does not open setup analytics or show business/personal choices before the profile is ready", () => {
    fixture.auth.profileLoading = true;
    expect(text(render(OnboardingPage))).toContain("Loading your account");
    fixture.effects[0]();
    expect(fixture.journey).not.toHaveBeenCalled();
    expect(queries).toHaveLength(0);
  });

  it("a nonsettling setup update stops saving after eight seconds and reports timeout", async () => {
    vi.useFakeTimers();
    fixture.query.mockImplementation(() => new Promise(() => {}));
    button(render(OnboardingPage), "Skip for now").onClick?.();
    await vi.advanceTimersByTimeAsync(8000);
    expect(fixture.states[1]).toBe(false);
    expect(queries[0].signal?.aborted).toBe(true);
    expect(fixture.completed).not.toHaveBeenCalled();
    expect(fixture.journey).toHaveBeenCalledWith("save_failed", { locale: "en", step: 0, outcome: "failure", reason: "timeout", account_type: "consumer" });
    expect(elements(render(OnboardingPage)).some(({ props }) => props.role === "alert")).toBe(true);
  });

  it("does not erase existing contact and name values when optional contact is left blank", async () => {
    fixture.auth.profile = { account_type: "consumer", full_name: "Synthetic Name", phone: "+966500000000" };
    button(render(OnboardingPage), "Next").onClick?.();
    await button(render(OnboardingPage), "Complete Setup").onClick?.();
    expect(queries[0].update).toMatchObject({ full_name: "Synthetic Name", phone: "+966500000000" });
  });

  it.each(["complete", "skip"])("%s clears its timeout and restores controls after a rejected fetch", async (action) => {
    vi.useFakeTimers();
    fixture.query.mockRejectedValue(new TypeError("Synthetic fetch failure"));
    let view = render(OnboardingPage);
    if (action === "complete") {
      button(view, "Next").onClick?.();
      view = render(OnboardingPage);
    }
    await button(view, action === "complete" ? "Complete Setup" : "Skip for now").onClick?.();
    await vi.advanceTimersByTimeAsync(0);
    expect(vi.getTimerCount()).toBe(0);
    expect(fixture.states[1]).toBe(false);
    expect(fixture.completed).not.toHaveBeenCalled();
    const failed = render(OnboardingPage);
    expect(button(failed, action === "complete" ? "Complete Setup" : "Skip for now").disabled).toBe(false);
    expect(elements(failed).some(({ props }) => props.role === "alert")).toBe(true);
    expect(text(failed)).not.toContain("Synthetic fetch failure");
  });
});

describe("dashboard recovery and permission-aware checklist", () => {
  it.each([["en", "Loading your profile", "Retry"], ["ar", "جارٍ تحميل ملف حسابك", "إعادة المحاولة"]])("%s has distinct profile loading and retry states", async (locale, loading, retry) => {
    fixture.locale = locale;
    fixture.states[5] = true;
    fixture.auth.profile = null;
    fixture.auth.profileLoading = true;
    expect(text(render())).toContain(loading);
    fixture.effects[1]();
    expect(queries).toHaveLength(0);
    fixture.auth.profileLoading = false;
    fixture.auth.profileError = "Synthetic private failure";
    const view = render();
    expect(text(view)).not.toContain("Synthetic private failure");
    await button(view, retry).onClick?.();
    expect(fixture.refreshProfile).toHaveBeenCalledOnce();
  });

  it("never treats a warranty without accessible proof as completed or links a consumer to approvals", async () => {
    fixture.query.mockImplementation((query: Query) => ({
      data: query.table === "warranties" ? [{ id: "synthetic-warranty", product_name: "Synthetic", status: "active", end_date: "2027-01-01", created_at: "2026-01-01" }] : [],
      count: query.table === "warranties" ? 1 : 0, error: null,
    }));
    const view = await loadDashboard();
    expect(fixture.states[8]).toBe(false);
    expect(elements(view).some(({ props }) => props.href === "/en/approval")).toBe(false);
    expect(text(view)).toContain("Track your warranties");
    const proofQuery = queries.find(({ table }) => table === "warranty_documents");
    expect(proofQuery?.select).toBe("warranty_id, warranties!inner(id)");
    expect(proofQuery?.filters).toContainEqual(["is", "deleted_at", null]);
    expect(proofQuery?.filters).toContainEqual(["or", expect.stringContaining("user_id.eq.synthetic-user"), { referencedTable: "warranties" }]);
  });

  it.each(["viewer", "creator", "approver", "company_admin"])("%s membership gates approval navigation using actual authority", async (role) => {
    fixture.query.mockImplementation((query: Query) => ({
      data: query.table === "company_members"
        ? query.select === "company_id, role" ? [{ company_id: "synthetic-company", role }] : role === "approver" ? [{ company_id: "synthetic-company" }] : []
        : query.table === "warranty_documents" ? [{ warranty_id: "synthetic-warranty" }] : [],
      count: 0, error: null,
    }));
    const view = await loadDashboard();
    expect(fixture.states[8]).toBe(true);
    expect(elements(view).some(({ props }) => props.href === "/en/approval")).toBe(["approver", "company_admin"].includes(role));
    expect(queries[0].filters).toContainEqual(["eq", "is_active", true]);
  });

  it.each(["company_members", "warranties", "warranty_documents", "activity_log"])("%s query failure ends loading with a retry, not false zero stats", async (table) => {
    fixture.query.mockImplementation((query: Query) => ({ data: [], count: 0, error: query.table === table ? { message: "Synthetic private failure" } : null }));
    const view = await loadDashboard();
    expect(fixture.states[4]).toBe(false);
    expect(fixture.states[0]).toBeNull();
    expect(text(view)).toContain("We could not load your dashboard");
    expect(text(view)).not.toContain("Synthetic private failure");
    button(view, "Retry").onClick?.();
    expect(fixture.states[7]).toBe(1);
  });

  it("times out even if access resolution never settles", async () => {
    vi.useFakeTimers();
    fixture.query.mockImplementation(() => new Promise(() => {}));
    render(); fixture.effects[0](); cleanup = fixture.effects[1]();
    await vi.advanceTimersByTimeAsync(12000);
    expect(fixture.states[4]).toBe(false);
    expect(text(render())).toContain("We could not load your dashboard");
  });

  it("retry can recover the dashboard after a failed database load", async () => {
    fixture.query.mockResolvedValue({ data: [], error: { message: "Synthetic failure" } });
    const failed = await loadDashboard();
    button(failed, "Retry").onClick?.();
    cleanup?.();
    fixture.query.mockResolvedValue({ data: [], count: 0, error: null });
    render(); cleanup = fixture.effects[1](); await flush();
    expect(fixture.states[6]).toBe(false);
    expect(text(render())).toContain("First-value checklist");
  });

  it("signed-out and incomplete-profile users redirect before any dashboard query", () => {
    fixture.auth.user = null;
    fixture.auth.profile = null;
    render(); fixture.effects[1]();
    expect(fixture.push).toHaveBeenCalledWith("/en/auth");
    expect(queries).toHaveLength(0);
    fixture.auth.user = { id: "synthetic-user" };
    fixture.auth.profile = { onboarding_completed: false };
    render(); fixture.effects[1]();
    expect(fixture.push).toHaveBeenCalledWith("/en/onboarding");
    expect(queries).toHaveLength(0);
  });

  it("ignores a late request from an unmounted or replaced session", async () => {
    let resolve!: (value: unknown) => void;
    fixture.query.mockImplementation(() => new Promise((done) => { resolve = done; }));
    render(); fixture.effects[0](); cleanup = fixture.effects[1](); await flush();
    cleanup?.();
    const before = [...fixture.states];
    resolve({ data: [], error: null }); await flush();
    expect(fixture.states).toEqual(before);
    expect(queries).toHaveLength(1);
  });
});
