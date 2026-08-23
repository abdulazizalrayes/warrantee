import crypto from "crypto";
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { apiJson } from "@/lib/api-response";
import { getClientIp, getRateLimitHeaders, rateLimit } from "@/lib/rate-limit";
import type { Json } from "@/types/database";

export const API_V1_SCOPES = [
  "warranties:read",
  "warranties:write",
  "claims:read",
  "documents:read",
] as const;
export type ApiV1Scope = (typeof API_V1_SCOPES)[number];

const DEFAULT_API_RATE_LIMIT_PER_MINUTE = 100;
const MAX_API_RATE_LIMIT_PER_MINUTE = 300;
const API_V1_IP_RATE_LIMIT = 300;
const API_TOKEN_PATTERN = /^wrt_([A-Za-z0-9]{8,32})_[A-Za-z0-9_-]{32,}$/;
export const API_V1_PROTECTED_RESOURCE_METADATA_URL =
  "https://warrantee.io/.well-known/oauth-protected-resource/api";

type Credential =
  | { kind: "bearer"; token: string }
  | { kind: "api_key"; token: string };

export type ApiRequester = {
  ok: true;
  kind: "user" | "api_key";
  userId: string;
  scopes: ApiV1Scope[];
  rateLimitPerMinute: number;
  rateLimitSubject: string;
  tokenId?: string;
  clientId?: string;
  companyId?: string;
};

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Supabase client environment variables are not configured");
  }

  return createClient(url, key);
}

function readCredential(request: NextRequest): Credential | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "").trim();
    return token ? { kind: "bearer", token } : null;
  }

  const apiKey = request.headers.get("x-api-key")?.trim();
  return apiKey ? { kind: "api_key", token: apiKey } : null;
}

export function timingSafeStringEqual(left: string, right: string) {
  const leftHash = crypto.createHash("sha256").update(left).digest();
  const rightHash = crypto.createHash("sha256").update(right).digest();
  return crypto.timingSafeEqual(leftHash, rightHash);
}

export function hashApiToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function createApiIntegrationToken() {
  const prefix = crypto.randomBytes(6).toString("hex");
  const secret = crypto.randomBytes(32).toString("base64url");
  const token = `wrt_${prefix}_${secret}`;

  return {
    token,
    prefix,
    hash: hashApiToken(token),
  };
}

export function normalizeApiScopes(value: unknown): ApiV1Scope[] {
  if (!Array.isArray(value)) return [];
  const scopes = value.filter((scope): scope is ApiV1Scope =>
    API_V1_SCOPES.includes(scope as ApiV1Scope)
  );
  return Array.from(new Set(scopes));
}

export function hasApiScope(requester: ApiRequester, requiredScope: ApiV1Scope) {
  return requester.scopes.includes(requiredScope);
}

export function apiV1Json(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Vary", "Authorization, x-api-key");
  if (init.status === 401 && !headers.has("WWW-Authenticate")) {
    headers.set(
      "WWW-Authenticate",
      `Bearer resource_metadata="${API_V1_PROTECTED_RESOURCE_METADATA_URL}"`,
    );
  }
  return apiJson(body, { ...init, headers });
}

function rateHeaders(result: { remaining: number; resetIn: number }, limit: number) {
  return {
    ...getRateLimitHeaders(result),
    "X-RateLimit-Limit": String(limit),
  };
}

async function enforceApiV1IpRateLimit(request: NextRequest) {
  const result = await rateLimit(getClientIp(request), {
    maxRequests: API_V1_IP_RATE_LIMIT,
    windowMs: 60_000,
    identifier: "api-v1-ip",
  });
  if (result.success) return null;

  return apiV1Json(
    { error: "Too many requests" },
    { status: 429, headers: rateHeaders(result, API_V1_IP_RATE_LIMIT) }
  );
}

async function enforceApiV1RequesterRateLimit(requester: ApiRequester) {
  const result = await rateLimit(requester.rateLimitSubject, {
    maxRequests: requester.rateLimitPerMinute,
    windowMs: 60_000,
    identifier: "api-v1-requester",
  });
  if (result.success) return null;

  return apiV1Json(
    { error: "Too many requests" },
    { status: 429, headers: rateHeaders(result, requester.rateLimitPerMinute) }
  );
}

export async function authorizeApiV1Request(request: NextRequest, scope: ApiV1Scope) {
  const ipLimitResponse = await enforceApiV1IpRateLimit(request);
  if (ipLimitResponse) return { response: ipLimitResponse };

  const requester = await resolveApiRequester(request);
  if (!requester.ok) {
    return { response: apiV1Json({ error: requester.error }, { status: requester.status }) };
  }

  if (!hasApiScope(requester, scope)) {
    return {
      response: apiV1Json({ error: `Missing required scope: ${scope}` }, { status: 403 }),
    };
  }

  const requesterLimitResponse = await enforceApiV1RequesterRateLimit(requester);
  if (requesterLimitResponse) return { response: requesterLimitResponse };

  return { requester };
}

export async function authorizeApiV1StatusRequest(request: NextRequest) {
  const ipLimitResponse = await enforceApiV1IpRateLimit(request);
  if (ipLimitResponse) return { response: ipLimitResponse };

  const requester = await resolveApiRequester(request);
  if (!requester.ok) {
    return { response: apiV1Json({ error: requester.error }, { status: requester.status }) };
  }

  const requesterLimitResponse = await enforceApiV1RequesterRateLimit(requester);
  if (requesterLimitResponse) return { response: requesterLimitResponse };

  return { requester };
}

export async function recordApiV1Usage(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  request: NextRequest,
  requester: ApiRequester,
  input: {
    statusCode: number;
    scope?: ApiV1Scope | null;
    metadata?: Json;
  }
) {
  const url = new URL(request.url);
  const ip = getClientIp(request);
  const ipHash = ip === "unknown" ? null : crypto.createHash("sha256").update(ip).digest("hex");
  const userAgent = request.headers.get("user-agent")?.slice(0, 500) || null;

  const { error } = await supabase.from("api_usage_events").insert({
    user_id: requester.userId,
    token_id: requester.tokenId || null,
    client_id: requester.clientId || null,
    company_id: requester.companyId || null,
    credential_kind: requester.kind,
    method: request.method,
    path: url.pathname,
    status_code: input.statusCode,
    scope: input.scope || null,
    ip_hash: ipHash,
    user_agent: userAgent,
    metadata: input.metadata || {},
  });

  if (error) {
    console.warn("API v1 usage metering failed:", error.message);
  }
}

export function normalizeApiRateLimit(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_API_RATE_LIMIT_PER_MINUTE;
  return Math.max(1, Math.min(Math.trunc(parsed), MAX_API_RATE_LIMIT_PER_MINUTE));
}

function parseApiTokenPrefix(token: string) {
  return API_TOKEN_PATTERN.exec(token)?.[1] || null;
}

async function resolveStoredApiKey(token: string): Promise<ApiRequester | null> {
  const prefix = parseApiTokenPrefix(token);
  if (!prefix) return null;

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("api_integration_tokens")
    .select("id, user_id, client_id, company_id, token_hash, scopes, rate_limit_per_minute, expires_at, revoked_at")
    .eq("token_prefix", prefix)
    .is("revoked_at", null)
    .maybeSingle();

  if (error || !data) return null;
  if (data.expires_at && new Date(data.expires_at).getTime() <= Date.now()) return null;

  if (data.client_id) {
    const { data: client, error: clientError } = await supabase
      .from("api_clients")
      .select("status")
      .eq("id", data.client_id)
      .eq("owner_user_id", data.user_id)
      .maybeSingle();
    if (clientError || client?.status !== "active") return null;
  }

  const incomingHash = hashApiToken(token);
  if (!timingSafeStringEqual(incomingHash, data.token_hash)) return null;

  await supabase
    .from("api_integration_tokens")
    .update({ last_used_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", data.id);

  const scopes = normalizeApiScopes(data.scopes);
  if (scopes.length === 0) return null;
  const rateLimitPerMinute = normalizeApiRateLimit(data.rate_limit_per_minute);

  return {
    ok: true,
    kind: "api_key",
    userId: data.user_id,
    tokenId: data.id,
    clientId: data.client_id || undefined,
    companyId: data.company_id || undefined,
    scopes,
    rateLimitPerMinute,
    rateLimitSubject: `api-key:${data.id}`,
  };
}

export async function resolveApiRequester(request: NextRequest): Promise<
  ApiRequester | { ok: false; status: number; error: string }
> {
  const credential = readCredential(request);
  if (!credential) {
    return {
      ok: false as const,
      status: 401,
      error: "Unauthorized. Provide a Bearer token or x-api-key.",
    };
  }

  if (credential.kind === "api_key") {
    const storedRequester = await resolveStoredApiKey(credential.token);
    if (storedRequester) return storedRequester;
  }

  if (credential.kind !== "bearer") {
    return {
      ok: false as const,
      status: 401,
      error: "Invalid API key",
    };
  }

  const supabase = getSupabase();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(credential.token);

  if (error || !user) {
    return {
      ok: false as const,
      status: 401,
      error: "Invalid token",
    };
  }

  return {
    ok: true as const,
    kind: "user" as const,
    userId: user.id,
    scopes: [...API_V1_SCOPES],
    rateLimitPerMinute: DEFAULT_API_RATE_LIMIT_PER_MINUTE,
    rateLimitSubject: `user:${user.id}`,
  };
}

export function buildIdempotencyReference(idempotencyKey: string, scope = "global") {
  return `API-${crypto.createHash("sha256").update(`${scope}:${idempotencyKey}`).digest("hex").slice(0, 24)}`;
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function hashApiRequestBody(body: unknown) {
  return crypto.createHash("sha256").update(stableJson(body)).digest("hex");
}

export async function beginApiIdempotency(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  request: NextRequest,
  requester: ApiRequester,
  body: unknown,
) {
  const key = request.headers.get("idempotency-key")?.trim() || null;
  if (!key) return { state: "not_requested" as const };
  if (key.length < 8 || key.length > 200) return { state: "invalid_key" as const };

  const path = new URL(request.url).pathname;
  const requestHash = hashApiRequestBody(body);
  const record = {
    user_id: requester.userId,
    client_id: requester.clientId || null,
    method: request.method,
    path,
    idempotency_key: key,
    request_hash: requestHash,
    status: "processing",
  };
  const { data, error } = await supabase
    .from("api_idempotency_records")
    .insert(record)
    .select("id")
    .single();
  if (!error && data) return { state: "started" as const, recordId: data.id, key };
  if (error?.code !== "23505") throw new Error("idempotency_record_failed");

  let query = supabase
    .from("api_idempotency_records")
    .select("id,request_hash,status,response_status,resource_type,resource_id,expires_at")
    .eq("user_id", requester.userId)
    .eq("method", request.method)
    .eq("path", path)
    .eq("idempotency_key", key);
  query = requester.clientId ? query.eq("client_id", requester.clientId) : query.is("client_id", null);
  const { data: existing, error: lookupError } = await query.maybeSingle();
  if (lookupError || !existing) throw new Error("idempotency_lookup_failed");
  if (existing.request_hash !== requestHash) {
    return { state: "body_mismatch" as const };
  }
  if (existing.status === "completed" && existing.resource_id) {
    return {
      state: "replay" as const,
      resourceId: existing.resource_id,
      responseStatus: existing.response_status || 200,
    };
  }
  if (existing.status === "processing" && new Date(existing.expires_at).getTime() > Date.now()) {
    return { state: "processing" as const };
  }

  const { error: retryError } = await supabase
    .from("api_idempotency_records")
    .update({
      status: "processing",
      response_status: null,
      resource_type: null,
      resource_id: null,
      expires_at: new Date(Date.now() + 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", existing.id);
  if (retryError) throw new Error("idempotency_retry_failed");
  return { state: "started" as const, recordId: existing.id, key };
}

export async function completeApiIdempotency(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  recordId: string | null,
  resourceType: string,
  resourceId: string,
  responseStatus: number,
) {
  if (!recordId) return;
  const { error } = await supabase
    .from("api_idempotency_records")
    .update({
      status: "completed",
      response_status: responseStatus,
      resource_type: resourceType,
      resource_id: resourceId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", recordId);
  if (error) throw new Error("idempotency_completion_failed");
}

export async function failApiIdempotency(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  recordId: string | null,
  responseStatus: number,
) {
  if (!recordId) return;
  await supabase
    .from("api_idempotency_records")
    .update({ status: "failed", response_status: responseStatus, updated_at: new Date().toISOString() })
    .eq("id", recordId);
}

export function parsePositiveInt(value: string | null, fallback: number, max: number) {
  const parsed = Number.parseInt(value || "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

export function isValidIsoDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return false;
  return !Number.isNaN(Date.parse(value));
}
