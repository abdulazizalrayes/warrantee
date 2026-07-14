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

const DEFAULT_TWENTY_API_BASE_URL = "https://api.twenty.com";

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
  const { firstName, lastName } = splitName(
    payload.firstname || payload.email.split("@")[0] || "Contact",
  );

  const person: Record<string, unknown> = {
    name: { firstName, lastName: payload.lastname || lastName },
    emails: {
      primaryEmail: payload.email,
      additionalEmails: [],
    },
  };

  if (payload.phone) {
    person.phones = {
      primaryPhoneNumber: payload.phone,
      additionalPhones: [],
    };
  }

  if (payload.company) {
    person.companyName = payload.company;
  }

  if (payload.lifecycleStage || payload.source) {
    person.crmNotes = [
      payload.lifecycleStage ? `Lifecycle: ${payload.lifecycleStage}` : null,
      payload.source ? `Source: ${payload.source}` : null,
    ].filter(Boolean).join("\n");
  }

  return person;
}

export async function upsertCrmContact(payload: CrmContactPayload): Promise<CrmResult> {
  const apiKey = getTwentyApiKey();
  if (!apiKey) {
    return { enabled: false, provider: "twenty", reason: "missing_api_key" };
  }

  const response = await fetch(`${getTwentyApiBaseUrl()}/rest/people`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildTwentyPersonPayload(payload)),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`Twenty CRM contact sync failed: ${details || response.statusText}`);
  }

  const body = await response.json().catch(() => ({}));
  return {
    enabled: true,
    provider: "twenty",
    contactId: body?.id || body?.data?.id || body?.data?.createPerson?.id || null,
  };
}

export async function checkCrmReadiness() {
  const apiKey = getTwentyApiKey();
  if (!apiKey) {
    return { name: "crm", status: "disabled", provider: "twenty", reason: "missing_api_key" };
  }

  const response = await fetch(`${getTwentyApiBaseUrl()}/rest/people?limit=1`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (response.status !== 200) {
    throw new Error(`Twenty CRM read check returned ${response.status}`);
  }

  return { name: "crm", status: "ok", provider: "twenty" };
}
