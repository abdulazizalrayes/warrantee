interface CrmContactPayload {
  email: string;
  firstname?: string | null;
  lastname?: string | null;
  phone?: string | null;
  company?: string | null;
  lifecycleStage?: string | null;
  source?: string | null;
}

type CrmResult =
  | { enabled: false; provider: "twenty"; reason: "missing_api_key" }
  | { enabled: true; provider: "twenty"; contactId: string | null }
  | { enabled: true; provider: "twenty"; error: string };

type JsonObject = Record<string, unknown>;

const DEFAULT_TWENTY_API_BASE_URL = "https://api.twenty.com";

class TwentyResponseError extends Error {
  constructor(
    readonly status: number,
    readonly details: string,
  ) {
    super(`Twenty CRM request failed (${status}): ${details || "unknown error"}`);
  }
}

function getTwentyApiKey() {
  return process.env.TWENTY_API_KEY || "";
}

function getTwentyApiBaseUrl() {
  return (process.env.TWENTY_API_BASE_URL || DEFAULT_TWENTY_API_BASE_URL).replace(/\/$/, "");
}

function splitName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) {
    return { firstName: parts[0] || "Contact", lastName: "" };
  }

  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts.at(-1) || "",
  };
}

function buildTwentyPersonPayload(payload: CrmContactPayload) {
  const email = payload.email.trim().toLowerCase();
  const { firstName, lastName } = splitName(
    payload.firstname || email.split("@")[0] || "Contact",
  );

  const person: Record<string, unknown> = {
    name: { firstName, lastName: payload.lastname || lastName },
    emails: {
      primaryEmail: email,
      additionalEmails: [],
    },
  };

  if (payload.phone) {
    person.phones = {
      primaryPhoneNumber: payload.phone,
      additionalPhones: [],
    };
  }

  if (payload.company) person.companyName = payload.company;

  if (payload.lifecycleStage || payload.source) {
    person.crmNotes = [
      payload.lifecycleStage ? `Lifecycle: ${payload.lifecycleStage}` : null,
      payload.source ? `Source: ${payload.source}` : null,
    ].filter(Boolean).join("\n");
  }

  return person;
}

function isRetryableStatus(status: number, details: string) {
  return [429, 500, 502, 503, 504].includes(status)
    || (status === 400 && /query read timeout/i.test(details));
}

function isDuplicateError(error: unknown) {
  if (!(error instanceof TwentyResponseError)) return false;
  return /duplicate|already exists|unique constraint/i.test(error.details);
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function twentyRequest(path: string, init: RequestInit = {}) {
  const attempts = Math.max(1, Number(process.env.TWENTY_REQUEST_MAX_ATTEMPTS || "3"));
  const timeoutMs = Math.max(100, Number(process.env.TWENTY_REQUEST_TIMEOUT_MS || "15000"));
  const baseDelayMs = Math.max(0, Number(process.env.TWENTY_RETRY_BASE_DELAY_MS || "250"));
  const method = init.method || "GET";

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`${getTwentyApiBaseUrl()}${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${getTwentyApiKey()}`,
          "Content-Type": "application/json",
          ...(init.headers || {}),
        },
      });
      const details = response.ok ? "" : await response.clone().text().catch(() => "");
      if (isRetryableStatus(response.status, details) && attempt < attempts) {
        console.warn("[CRM] Twenty request retry", { method, path, attempt, status: response.status });
        await delay(baseDelayMs * attempt);
        continue;
      }
      if (!response.ok) throw new TwentyResponseError(response.status, details || response.statusText);
      return response;
    } catch (error) {
      if (error instanceof TwentyResponseError || attempt === attempts) throw error;
      console.warn("[CRM] Twenty network retry", {
        method,
        path,
        attempt,
        error: error instanceof Error ? error.message : String(error),
      });
      await delay(baseDelayMs * attempt);
    } finally {
      clearTimeout(timer);
    }
  }

  throw new Error("Twenty CRM request failed after retries");
}

function extractFirstPerson(body: unknown): JsonObject | null {
  if (Array.isArray(body)) return (body[0] as JsonObject | undefined) || null;
  if (!body || typeof body !== "object") return null;
  const root = body as JsonObject;
  if (Array.isArray(root.data)) return (root.data[0] as JsonObject | undefined) || null;
  if (Array.isArray(root.people)) return (root.people[0] as JsonObject | undefined) || null;
  const data = root.data as JsonObject | undefined;
  if (data && Array.isArray(data.people)) return (data.people[0] as JsonObject | undefined) || null;
  return null;
}

function extractContactId(body: unknown, fallbackId?: string) {
  if (!body || typeof body !== "object") return fallbackId || null;
  const root = body as JsonObject;
  if (typeof root.id === "string") return root.id;
  const data = root.data as JsonObject | undefined;
  if (typeof data?.id === "string") return data.id;
  const nested = data?.createPerson as JsonObject | undefined;
  return typeof nested?.id === "string" ? nested.id : fallbackId || null;
}

async function findPersonByEmail(email: string) {
  const params = new URLSearchParams({
    filter: `emails.primaryEmail[eq]:"${email}"`,
    limit: "1",
  });
  const response = await twentyRequest(`/rest/people?${params.toString()}`);
  return extractFirstPerson(await response.json().catch(() => null));
}

async function writePerson(method: "POST" | "PATCH", path: string, person: JsonObject, fallbackId?: string) {
  const response = await twentyRequest(path, { method, body: JSON.stringify(person) });
  return extractContactId(await response.json().catch(() => null), fallbackId);
}

export async function upsertCrmContact(payload: CrmContactPayload): Promise<CrmResult> {
  if (!getTwentyApiKey()) {
    return { enabled: false, provider: "twenty", reason: "missing_api_key" };
  }

  const email = payload.email.trim().toLowerCase();
  const person = buildTwentyPersonPayload({ ...payload, email });
  const existing = await findPersonByEmail(email);
  const existingId = typeof existing?.id === "string" ? existing.id : "";

  if (existingId) {
    const contactId = await writePerson("PATCH", `/rest/people/${encodeURIComponent(existingId)}`, person, existingId);
    return { enabled: true, provider: "twenty", contactId };
  }

  try {
    const contactId = await writePerson("POST", "/rest/people", person);
    return { enabled: true, provider: "twenty", contactId };
  } catch (error) {
    if (!isDuplicateError(error)) throw error;
    console.warn("[CRM] Twenty duplicate detected; resolving by lookup and update", { email });
    const duplicate = await findPersonByEmail(email);
    const duplicateId = typeof duplicate?.id === "string" ? duplicate.id : "";
    if (!duplicateId) throw error;
    const contactId = await writePerson("PATCH", `/rest/people/${encodeURIComponent(duplicateId)}`, person, duplicateId);
    return { enabled: true, provider: "twenty", contactId };
  }
}

export async function checkCrmReadiness() {
  if (!getTwentyApiKey()) {
    return { name: "crm", status: "disabled", provider: "twenty", reason: "missing_api_key" };
  }

  await twentyRequest("/rest/people?limit=1");
  return { name: "crm", status: "ok", provider: "twenty" };
}
