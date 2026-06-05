import crypto from "crypto";
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const API_V1_SCOPES = ["warranties:read", "warranties:write"] as const;
export type ApiV1Scope = (typeof API_V1_SCOPES)[number];

const DEFAULT_API_RATE_LIMIT_PER_MINUTE = 100;
const MAX_API_RATE_LIMIT_PER_MINUTE = 300;
const API_TOKEN_PATTERN = /^wrt_([A-Za-z0-9]{8,32})_[A-Za-z0-9_-]{32,}$/;

type Credential =
  | { kind: "bearer"; token: string }
  | { kind: "api_key"; token: string };

export type ApiRequester = {
  ok: true;
  kind: "user" | "api_key" | "legacy_integration";
  userId: string;
  scopes: ApiV1Scope[];
  rateLimitPerMinute: number;
  rateLimitSubject: string;
  tokenId?: string;
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
  if (!Array.isArray(value)) return [...API_V1_SCOPES];
  const scopes = value.filter((scope): scope is ApiV1Scope =>
    API_V1_SCOPES.includes(scope as ApiV1Scope)
  );
  return scopes.length > 0 ? Array.from(new Set(scopes)) : [...API_V1_SCOPES];
}

export function hasApiScope(requester: ApiRequester, requiredScope: ApiV1Scope) {
  return requester.scopes.includes(requiredScope);
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
    .select("id, user_id, token_hash, scopes, rate_limit_per_minute, expires_at, revoked_at")
    .eq("token_prefix", prefix)
    .is("revoked_at", null)
    .maybeSingle();

  if (error || !data) return null;
  if (data.expires_at && new Date(data.expires_at).getTime() <= Date.now()) return null;

  const incomingHash = hashApiToken(token);
  if (!timingSafeStringEqual(incomingHash, data.token_hash)) return null;

  await supabase
    .from("api_integration_tokens")
    .update({ last_used_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", data.id);

  const scopes = normalizeApiScopes(data.scopes);
  const rateLimitPerMinute = normalizeApiRateLimit(data.rate_limit_per_minute);

  return {
    ok: true,
    kind: "api_key",
    userId: data.user_id,
    tokenId: data.id,
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

  const integrationToken = process.env.WARRANTEE_API_INTEGRATION_TOKEN;
  if (credential.kind === "api_key") {
    const storedRequester = await resolveStoredApiKey(credential.token);
    if (storedRequester) return storedRequester;
  }

  if (
    credential.kind === "api_key" &&
    integrationToken &&
    timingSafeStringEqual(credential.token, integrationToken)
  ) {
    const integrationOwnerId =
      process.env.WARRANTEE_API_INTEGRATION_OWNER_ID || process.env.WARRANTEE_API_OWNER_ID;

    if (!integrationOwnerId) {
      return {
        ok: false as const,
        status: 503,
        error: "Integration token is configured without a bound owner account.",
      };
    }

    return {
      ok: true as const,
      kind: "legacy_integration" as const,
      userId: integrationOwnerId,
      scopes: [...API_V1_SCOPES],
      rateLimitPerMinute: DEFAULT_API_RATE_LIMIT_PER_MINUTE,
      rateLimitSubject: `legacy-integration:${integrationOwnerId}`,
    };
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

export function buildIdempotencyReference(idempotencyKey: string) {
  return `API-${crypto.createHash("sha256").update(idempotencyKey).digest("hex").slice(0, 24)}`;
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
