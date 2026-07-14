import { afterEach, describe, expect, it, vi } from "vitest";

describe("crm integration", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
    delete process.env.TWENTY_API_KEY;
    delete process.env.TWENTY_API_BASE_URL;
    delete process.env.TWENTY_REQUEST_MAX_ATTEMPTS;
    delete process.env.TWENTY_REQUEST_TIMEOUT_MS;
    delete process.env.TWENTY_RETRY_BASE_DELAY_MS;
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

  it("creates a person only when the normalized email is absent", async () => {
    configureTwenty();
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ data: [] }))
      .mockResolvedValueOnce(jsonResponse({ id: "person-1" }, 201));
    vi.stubGlobal("fetch", fetchMock);

    const { upsertCrmContact } = await import("../crm");
    await expect(upsertCrmContact({
      email: " Lead@Example.com ",
      firstname: "Lead Person",
      phone: "+966500000000",
      company: "Example Co",
      lifecycleStage: "lead",
      source: "seller_application",
    })).resolves.toEqual({ enabled: true, provider: "twenty", contactId: "person-1" });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toContain("/rest/people?filter=");
    expect(decodeURIComponent(String(fetchMock.mock.calls[0]?.[0]))).toContain(
      'emails.primaryEmail[eq]:"lead@example.com"',
    );
    expect(fetchMock.mock.calls[1]?.[0]).toBe("https://api.twenty.test/rest/people");
    const createOptions = fetchMock.mock.calls[1]?.[1] as RequestInit;
    expect(createOptions.method).toBe("POST");
    expect(JSON.parse(String(createOptions.body))).toEqual(expect.objectContaining({
      name: { firstName: "Lead", lastName: "Person" },
      emails: { primaryEmail: "lead@example.com", additionalEmails: [] },
      companyName: "Example Co",
    }));
  });

  it("patches the existing person instead of creating a duplicate", async () => {
    configureTwenty();
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ data: [{ id: "person-existing" }] }))
      .mockResolvedValueOnce(jsonResponse({ data: {} }));
    vi.stubGlobal("fetch", fetchMock);

    const { upsertCrmContact } = await import("../crm");
    await expect(upsertCrmContact({ email: "lead@example.com" })).resolves.toEqual({
      enabled: true,
      provider: "twenty",
      contactId: "person-existing",
    });
    expect(fetchMock.mock.calls[1]?.[0]).toBe("https://api.twenty.test/rest/people/person-existing");
    expect(fetchMock.mock.calls[1]?.[1]).toEqual(expect.objectContaining({ method: "PATCH" }));
  });

  it("recovers from a duplicate-create race by looking up and patching", async () => {
    configureTwenty();
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ data: [] }))
      .mockResolvedValueOnce(new Response("duplicate entry", { status: 400 }))
      .mockResolvedValueOnce(jsonResponse({ data: [{ id: "person-race" }] }))
      .mockResolvedValueOnce(jsonResponse({ id: "person-race" }));
    vi.stubGlobal("fetch", fetchMock);

    const { upsertCrmContact } = await import("../crm");
    await expect(upsertCrmContact({ email: "lead@example.com" })).resolves.toEqual({
      enabled: true,
      provider: "twenty",
      contactId: "person-race",
    });
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls[3]?.[1]).toEqual(expect.objectContaining({ method: "PATCH" }));
  });

  it("retries transient Twenty responses", async () => {
    configureTwenty();
    process.env.TWENTY_RETRY_BASE_DELAY_MS = "0";
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("gateway timeout", { status: 504 }))
      .mockResolvedValueOnce(jsonResponse({ data: [] }))
      .mockResolvedValueOnce(jsonResponse({ id: "person-retried" }, 201));
    vi.stubGlobal("fetch", fetchMock);

    const { upsertCrmContact } = await import("../crm");
    await expect(upsertCrmContact({ email: "lead@example.com" })).resolves.toEqual({
      enabled: true,
      provider: "twenty",
      contactId: "person-retried",
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});

function configureTwenty() {
  process.env.TWENTY_API_KEY = "twenty-test-key";
  process.env.TWENTY_API_BASE_URL = "https://api.twenty.test";
  process.env.TWENTY_REQUEST_MAX_ATTEMPTS = "3";
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
