import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { buildOAuthSetupErrorPath, buildOAuthSetupRetryPath } from "@/lib/oauth-setup-recovery";
import { sanitizeAnalyticsPath, sanitizeAnalyticsPayload } from "@/lib/analytics-payload";

const fixture = vi.hoisted(() => ({
  locale: "en", user: { id: "synthetic-user" } as { id: string } | null,
  error: "business_setup_error", redirect: "/ar/dashboard?tab=claims#pending",
  flowId: "11111111-1111-4111-8111-111111111111",
}));
vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    useState: (initial: unknown) => actual.useState(initial && typeof initial === "object" && "signupFlow" in initial
      ? { error: fixture.error, tab: "signup", redirect: fixture.redirect, account: "business", signupFlow: fixture.flowId }
      : initial),
  };
});
vi.mock("next/navigation", () => ({ useParams: () => ({ locale: fixture.locale }), useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("next/link", () => ({ default: ({ children, href, ...props }: { children: ReactNode; href: string }) => <a href={href} {...props}>{children}</a> }));
vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({ user: fixture.user, loading: false }) }));
vi.mock("@/components/PageViewTracker", () => ({ PageViewTracker: () => null }));
vi.mock("@/lib/ga4-events", () => ({ trackAuthIntent: vi.fn(), trackAuthJourney: vi.fn(), trackSignup: vi.fn(), trackSignupSubmit: vi.fn() }));
import AuthPage from "@/app/[locale]/auth/page";

beforeEach(() => {
  fixture.locale = "en"; fixture.user = { id: "synthetic-user" }; fixture.error = "business_setup_error";
  fixture.redirect = "/ar/dashboard?tab=claims#pending";
});

describe("normal Business setup recovery action", () => {
  it.each(["en", "ar"])("renders a localized full-navigation retry action for the authenticated %s error screen", (locale) => {
    fixture.locale = locale;
    const html = renderToStaticMarkup(<AuthPage />);
    const action = buildOAuthSetupRetryPath(fixture.redirect, fixture.flowId).split("&").join("&amp;");
    expect(html).toContain(`href="${action}"`);
    expect(html).toContain(locale === "ar" ? "إعادة محاولة إعداد الشركة" : "Retry Business setup");
    expect(action).not.toContain("code=");
    expect(action).not.toContain("company");
  });
  it.each(["unauthenticated", "terminal", "unrelated"])("does not offer blind setup recovery for %s state", (mode) => {
    if (mode === "unauthenticated") fixture.user = null;
    if (mode === "terminal") fixture.error = "business_setup_expired";
    if (mode === "unrelated") fixture.error = "auth_callback_error";
    expect(renderToStaticMarkup(<AuthPage />)).not.toContain("retry_setup=");
  });
  it("carries only a normalized destination and bounded original flow ID", () => {
    const error = new URL(buildOAuthSetupErrorPath("ar", fixture.redirect, fixture.flowId), "https://warrantee.test");
    expect([...error.searchParams.keys()]).toEqual(["error", "tab", "redirect", "signup_flow"]);
    expect(error.searchParams.get("redirect")).toBe(fixture.redirect);
    const retry = new URL(buildOAuthSetupRetryPath("https://external.invalid", "not-a-flow?company=private"), "https://warrantee.test");
    expect([...retry.searchParams.keys()]).toEqual(["retry_setup", "next"]);
    expect(retry.searchParams.get("next")).toBe("/en/dashboard");
  });
  it("does not expose recovery query metadata through analytics paths or payloads", () => {
    const retry = buildOAuthSetupRetryPath(fixture.redirect, fixture.flowId);
    expect(sanitizeAnalyticsPath(retry)).toBe("/[other]");
    const payload = sanitizeAnalyticsPayload("page_view", {
      page_name: "auth_portal", signup_flow: fixture.flowId, retry_setup: "1", redirect: fixture.redirect,
    }, "qa");
    expect(payload).not.toHaveProperty("signup_flow");
    expect(payload).not.toHaveProperty("retry_setup");
    expect(payload).not.toHaveProperty("redirect");
    expect(JSON.stringify(payload)).not.toContain(fixture.flowId);
  });
});
