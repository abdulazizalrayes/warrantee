import { runInNewContext } from "node:vm";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/script", () => ({ default: () => null }));

describe("GTM consent bootstrap", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  async function bootstrap(saved: string | null) {
    vi.stubEnv("NEXT_PUBLIC_GTM_ID", "GTM-WFLBH83M");
    const { default: GoogleTagManager } = await import("../../components/GoogleTagManager");
    const element = GoogleTagManager()!;
    const source = element.props.children[0].props.children;
    const insertBefore = vi.fn();
    const listeners: Record<string, () => void> = {};
    const storage = { value: saved };
    const window = {
      dataLayer: [] as unknown[],
      localStorage: { getItem: () => storage.value },
      addEventListener: (event: string, callback: () => void) => { listeners[event] = callback; },
    };
    runInNewContext(source, {
      window,
      document: {
        getElementsByTagName: () => [{ parentNode: { insertBefore } }],
        createElement: () => ({}),
      },
    });
    return { window, storage, listeners, insertBefore };
  }

  it.each([null, "{invalid", JSON.stringify({ analytics: false, marketing: false })])(
    "does not load GTM without consent (%s)", async (saved) => {
      const { window, insertBefore } = await bootstrap(saved);
      expect(insertBefore).not.toHaveBeenCalled();
      expect(Array.from(window.dataLayer[0] as ArrayLike<unknown>)).toEqual([
        "consent", "default", expect.objectContaining({ analytics_storage: "denied" }),
      ]);
    }
  );

  it("loads once after grant and updates denial after withdrawal without reloading", async () => {
    const { window, storage, listeners, insertBefore } = await bootstrap(null);
    storage.value = JSON.stringify({ analytics: true, marketing: false });
    listeners.warrantee_cookie_consent_updated();
    listeners.warrantee_cookie_consent_updated();
    expect(insertBefore).toHaveBeenCalledOnce();
    expect(insertBefore.mock.calls[0][0].src).toBe(
      "https://www.googletagmanager.com/gtm.js?id=GTM-WFLBH83M"
    );
    storage.value = JSON.stringify({ analytics: false, marketing: false });
    listeners.warrantee_cookie_consent_updated();
    expect(Array.from(window.dataLayer.at(-1) as ArrayLike<unknown>)).toEqual([
      "consent", "update", expect.objectContaining({ analytics_storage: "denied" }),
    ]);
    expect(insertBefore).toHaveBeenCalledOnce();
    expect(window.dataLayer.some((entry) => (entry as { event?: string }).event === "gtm.js")).toBe(true);
    expect(window.dataLayer.some((entry) => (entry as ArrayLike<unknown>)[0] === "config")).toBe(false);
  });
});
