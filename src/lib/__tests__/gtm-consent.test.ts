import { runInNewContext } from "node:vm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildGtmBootstrap } from "../analytics-bootstrap.mjs";

vi.mock("next/script", () => ({ default: () => null }));

describe("GTM consent bootstrap", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  async function bootstrap(saved: string | null, options: { writable?: boolean; memoryDenied?: boolean } = {}) {
    vi.stubEnv("NEXT_PUBLIC_GTM_ID", "GTM-WFLBH83M");
    const { default: GoogleTagManager } = await import("../../components/GoogleTagManager");
    const element = GoogleTagManager()!;
    expect(element.props.children[0].props.src).toBe("/agent-bootstrap/analytics/gtm.js");
    expect(element.props.children[0].props.children).toBeUndefined();
    const source = buildGtmBootstrap("GTM-WFLBH83M", "G-ZQJ4LRG4GN");
    const insertBefore = vi.fn();
    const listeners: Record<string, () => void> = {};
    const storage = { value: saved, writable: options.writable ?? true };
    const window = {
      dataLayer: [] as unknown[],
      __warranteeConsentStorageFailed: options.memoryDenied ?? false,
      location: { pathname: "/en/pricing" },
      localStorage: { getItem: () => storage.value, setItem: (_key: string, value: string) => { if (!storage.writable) throw new Error('Storage read-only'); storage.value = value; } },
      addEventListener: (event: string, callback: () => void) => { listeners[event] = callback; },
    };
    runInNewContext(source, {
      window,
      document: {
        referrer: "https://reference.example.invalid/private?email=redaction@example.invalid",
        getElementsByTagName: () => [{ parentNode: { insertBefore } }],
        createElement: () => ({}),
      },
      URL,
    });
    return { window, storage, listeners, insertBefore };
  }

  it.each([null, "{invalid", JSON.stringify({ analytics: false, marketing: false })])(
    "does not load GTM without consent (%s)", async (saved) => {
      const { window, insertBefore } = await bootstrap(saved);
      expect(insertBefore).not.toHaveBeenCalled();
      expect(Array.from(window.dataLayer.find(entry => (entry as ArrayLike<unknown>)[0] === "consent") as ArrayLike<unknown>)).toEqual([
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

  it("does not let a readable but unpersistable initial grant authorize GTM", async () => {
    const { window, insertBefore } = await bootstrap(JSON.stringify({ analytics: true, marketing: true }), { writable: false });
    expect(insertBefore).not.toHaveBeenCalled();
    expect(window.__warranteeConsentStorageFailed).toBe(true);
    expect((window as unknown as Record<string, unknown>)["ga-disable-G-ZQJ4LRG4GN"]).toBe(true);
  });

  it("requires an explicit successful save and memory clear before recovering, and never reloads GTM", async () => {
    const granted = JSON.stringify({ analytics: true, marketing: false });
    const { window, storage, listeners, insertBefore } = await bootstrap(granted);
    expect(insertBefore).toHaveBeenCalledOnce();
    window.__warranteeConsentStorageFailed = true;
    listeners.warrantee_cookie_consent_updated();
    expect((window as unknown as Record<string, unknown>)["ga-disable-G-ZQJ4LRG4GN"]).toBe(true);
    listeners.warrantee_cookie_consent_updated();
    expect(insertBefore).toHaveBeenCalledOnce();
    storage.writable = true;
    window.localStorage.setItem("warrantee_cookie_consent", granted);
    window.__warranteeConsentStorageFailed = false;
    listeners.warrantee_cookie_consent_updated();
    listeners.warrantee_cookie_consent_updated();
    expect((window as unknown as Record<string, unknown>)["ga-disable-G-ZQJ4LRG4GN"]).toBe(false);
    expect(insertBefore).toHaveBeenCalledOnce();
  });
});
