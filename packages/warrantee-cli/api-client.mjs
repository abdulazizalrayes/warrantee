const DEFAULT_BASE_URL = "https://warrantee.io";

export class WarranteeApiError extends Error {
  constructor(message, { status = 0, body = null, headers = {} } = {}) {
    super(message);
    this.name = "WarranteeApiError";
    this.status = status;
    this.body = body;
    this.headers = headers;
  }
}

export function normalizeBaseUrl(baseUrl = DEFAULT_BASE_URL) {
  const normalized = String(baseUrl || DEFAULT_BASE_URL).trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(normalized)) {
    throw new WarranteeApiError("Base URL must start with http:// or https://");
  }
  return normalized;
}

export function resolveApiKey({ apiKey, env = process.env } = {}) {
  return String(apiKey || env.WARRANTEE_API_KEY || "").trim();
}

function appendQuery(url, query = {}) {
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    url.searchParams.set(key, String(value));
  }
}

async function parseResponse(response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function headersToObject(headers) {
  const output = {};
  headers.forEach((value, key) => {
    output[key] = value;
  });
  return output;
}

export async function apiRequest({
  baseUrl = DEFAULT_BASE_URL,
  path,
  method = "GET",
  apiKey,
  body,
  query,
  idempotencyKey,
  requireAuth = true,
  fetchImpl = globalThis.fetch,
} = {}) {
  if (!path || !String(path).startsWith("/")) {
    throw new WarranteeApiError("API path must start with /");
  }
  if (typeof fetchImpl !== "function") {
    throw new WarranteeApiError("No fetch implementation is available");
  }

  const url = new URL(path, `${normalizeBaseUrl(baseUrl)}/`);
  appendQuery(url, query);

  const resolvedApiKey = resolveApiKey({ apiKey });
  if (requireAuth && !resolvedApiKey) {
    throw new WarranteeApiError(
      "WARRANTEE_API_KEY is required. Generate a scoped key in Warrantee Settings > API / CLI / MCP."
    );
  }

  const headers = {
    Accept: "application/json",
  };
  if (resolvedApiKey) headers["x-api-key"] = resolvedApiKey;
  if (idempotencyKey) headers["Idempotency-Key"] = String(idempotencyKey);
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const response = await fetchImpl(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const parsed = await parseResponse(response);

  if (!response.ok) {
    const message =
      parsed && typeof parsed === "object" && "error" in parsed
        ? String(parsed.error)
        : `Warrantee API request failed with status ${response.status}`;
    throw new WarranteeApiError(message, {
      status: response.status,
      body: parsed,
      headers: headersToObject(response.headers),
    });
  }

  return parsed;
}

export function listWarranties(options = {}) {
  return apiRequest({
    ...options,
    path: "/api/v1/warranties",
    method: "GET",
    query: {
      page: options.page,
      limit: options.limit,
      status: options.status,
      category: options.category,
    },
  });
}

export function getWarranty(id, options = {}) {
  return apiRequest({
    ...options,
    path: `/api/v1/warranties/${encodeURIComponent(id)}`,
    method: "GET",
  });
}

export function createWarranty(input, options = {}) {
  return apiRequest({
    ...options,
    path: "/api/v1/warranties",
    method: "POST",
    body: input,
  });
}

export function updateWarranty(id, input, options = {}) {
  return apiRequest({
    ...options,
    path: `/api/v1/warranties/${encodeURIComponent(id)}`,
    method: "PUT",
    body: input,
  });
}

export function deleteWarranty(id, options = {}) {
  return apiRequest({
    ...options,
    path: `/api/v1/warranties/${encodeURIComponent(id)}`,
    method: "DELETE",
  });
}

export function listClaims(options = {}) {
  return apiRequest({
    ...options,
    path: "/api/v1/claims",
    method: "GET",
    query: {
      page: options.page,
      limit: options.limit,
      status: options.status,
      warranty_id: options.warrantyId,
    },
  });
}

export function getClaim(id, options = {}) {
  return apiRequest({
    ...options,
    path: `/api/v1/claims/${encodeURIComponent(id)}`,
    method: "GET",
  });
}

export function listDocuments(options = {}) {
  return apiRequest({
    ...options,
    path: "/api/v1/documents",
    method: "GET",
    query: {
      page: options.page,
      limit: options.limit,
      warranty_id: options.warrantyId,
      q: options.query,
    },
  });
}

export function getDocument(id, options = {}) {
  return apiRequest({
    ...options,
    path: `/api/v1/documents/${encodeURIComponent(id)}`,
    method: "GET",
  });
}

export function verifyWarranty(query, options = {}) {
  return apiRequest({
    ...options,
    path: "/api/v1/warranties/verify",
    method: "GET",
    requireAuth: false,
    query: { q: query },
  });
}

export const warranteeApi = {
  apiRequest,
  listWarranties,
  getWarranty,
  createWarranty,
  updateWarranty,
  deleteWarranty,
  listClaims,
  getClaim,
  listDocuments,
  getDocument,
  verifyWarranty,
};
