import { afterEach, describe, expect, it, vi } from "vitest";

describe("crm integration", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
    delete process.env.TWENTY_API_KEY;
    delete process.env.TWENTY_API_BASE_URL;
  });

  it("keeps CRM sync disabled without blocking app flows when Twenty is not configured", async () => {
    const { upsertCrmContact, checkCrmReadiness } = await import("../crm");

    await expect(upsertCrmContact({ email: "lead@example.com" })).resolves.toEqual({
      enabled: false,
      provider: "twenty",
      reason: "missing_api_key",
    });
    await expect(checkCrmReadiness()).resolves.toEqual({
      name: "crm",
      status: "disabled",
      provider: "twenty",
      reason: "missing_api_key",
    });
  });

  it("uses Twenty CRM REST endpoints when configured", async () => {
    process.env.TWENTY_API_KEY = "twenty-test-key";
    process.env.TWENTY_API_BASE_URL = "https://api.twenty.test";
    const fetchMock = vi.fn<typeof fetch>(
      async () => new Response(JSON.stringify({ id: "person-1" }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { upsertCrmContact } = await import("../crm");
    const result = await upsertCrmContact({
      email: "lead@example.com",
      firstname: "Lead Person",
      phone: "+966500000000",
      company: "Example Co",
      lifecycleStage: "lead",
      source: "seller_application",
    });

    expect(result).toEqual({ enabled: true, provider: "twenty", contactId: "person-1" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.twenty.test/rest/people",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer twenty-test-key",
          "Content-Type": "application/json",
        }),
      }),
    );
    const requestOptions = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(requestOptions.body))).toEqual(
      expect.objectContaining({
        name: { firstName: "Lead", lastName: "Person" },
        emails: { primaryEmail: "lead@example.com", additionalEmails: [] },
        companyName: "Example Co",
      }),
    );
  });
});
