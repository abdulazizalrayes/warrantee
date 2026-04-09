interface HubSpotContactPayload {
  email: string;
  firstname?: string | null;
  lastname?: string | null;
  phone?: string | null;
  company?: string | null;
  lifecycleStage?: string | null;
}

function getHubSpotToken() {
  return process.env.HUBSPOT_ACCESS_TOKEN || "";
}

function splitName(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 1) {
    return { firstname: name.trim(), lastname: "" };
  }

  return {
    firstname: parts.slice(0, -1).join(" "),
    lastname: parts.at(-1) || "",
  };
}

async function findContactByEmail(email: string) {
  const token = getHubSpotToken();
  if (!token) {
    return null;
  }

  const response = await fetch("https://api.hubapi.com/crm/v3/objects/contacts/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      filterGroups: [
        {
          filters: [
            {
              propertyName: "email",
              operator: "EQ",
              value: email,
            },
          ],
        },
      ],
      limit: 1,
      properties: ["email"],
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`HubSpot search failed: ${details}`);
  }

  const body = await response.json();
  return body.results?.[0]?.id ?? null;
}

export async function upsertHubSpotContact(payload: HubSpotContactPayload) {
  const token = getHubSpotToken();
  if (!token) {
    return { enabled: false as const };
  }

  const { firstname, lastname } = splitName(payload.firstname || payload.email);
  const properties: Record<string, string> = {
    email: payload.email,
    firstname,
    lastname,
  };

  if (payload.phone) properties.phone = payload.phone;
  if (payload.company) properties.company = payload.company;
  if (payload.lifecycleStage) properties.lifecyclestage = payload.lifecycleStage;

  const contactId = await findContactByEmail(payload.email);
  const url = contactId
    ? `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`
    : "https://api.hubapi.com/crm/v3/objects/contacts";
  const method = contactId ? "PATCH" : "POST";

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ properties }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`HubSpot upsert failed: ${details}`);
  }

  const body = await response.json();
  return {
    enabled: true as const,
    contactId: body.id || contactId,
  };
}
