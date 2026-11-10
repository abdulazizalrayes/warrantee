import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type { NextResponse } from "next/server";
import {
  buildOAuthSignupIntent,
  OAUTH_SIGNUP_INTENT_COOKIE,
  OAUTH_SIGNUP_INTENT_MAX_AGE_SECONDS,
  type OAuthSignupIntent,
} from "@/lib/oauth-signup-intent";

export const OAUTH_INTENT_PATH = "/auth/callback";
export type FlowIntent = OAuthSignupIntent & {
  flowId: string;
  issuedAt: number;
  next: string;
  provider: "google" | "apple";
  userId?: string;
};

function sign(payload: string) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("OAuth intent signing unavailable");
  return createHmac("sha256", key).update(`warrantee:oauth-signup:v1:${payload}`).digest("base64url");
}

function serializeSignedIntent(intent: FlowIntent) {
  const payload = Buffer.from(JSON.stringify(intent)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function bindOAuthFlowIntentToUser(intent: FlowIntent, userId: string) {
  return serializeSignedIntent({ ...intent, userId });
}

export function createOAuthFlowIntent(input: {
  accountType?: unknown;
  companyName?: unknown;
  provider?: unknown;
  next: string;
}, now = Date.now()) {
  const signup = buildOAuthSignupIntent({ ...input, now });
  if (!signup || (input.provider !== "google" && input.provider !== "apple")) return null;
  const intent: FlowIntent = {
    ...signup, flowId: randomUUID(), issuedAt: now, next: input.next, provider: input.provider,
  };
  return { intent, value: serializeSignedIntent(intent) };
}

export function readOAuthFlowIntent(value: string | undefined, flowId: string | null, next: string, now = Date.now()): FlowIntent | null {
  if (!value || value.length > 4096 || !flowId) return null;
  try {
    const [payload, signature, extra] = value.split(".");
    if (!payload || !signature || extra) return null;
    const expected = Buffer.from(sign(payload));
    const actual = Buffer.from(signature);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as FlowIntent;
    const valid = buildOAuthSignupIntent({ ...parsed, now: parsed.issuedAt });
    if (!valid || parsed.flowId !== flowId || parsed.next !== next ||
      !Number.isFinite(parsed.issuedAt) || parsed.issuedAt > now ||
      parsed.expiresAt !== valid.expiresAt || parsed.expiresAt <= now ||
      (parsed.userId !== undefined && (typeof parsed.userId !== "string" || !parsed.userId || parsed.userId.length > 128)) ||
      (parsed.provider !== "google" && parsed.provider !== "apple")) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function isNewOAuthSignup(user: { id?: string; created_at: string; app_metadata: { provider?: string } }, intent: FlowIntent, now = Date.now()) {
  const createdAt = Date.parse(user.created_at);
  return Number.isFinite(createdAt) && createdAt >= intent.issuedAt &&
    intent.issuedAt <= now && createdAt <= now && now < intent.expiresAt &&
    (!intent.userId || intent.userId === user.id) &&
    user.app_metadata.provider === intent.provider;
}

export function expireOAuthIntent(response: NextResponse) {
  response.cookies.set({
    name: OAUTH_SIGNUP_INTENT_COOKIE, value: "", path: OAUTH_INTENT_PATH,
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 0,
  });
  return response;
}

export function setOAuthIntent(response: NextResponse, value: string, maxAge = OAUTH_SIGNUP_INTENT_MAX_AGE_SECONDS) {
  response.cookies.set({
    name: OAUTH_SIGNUP_INTENT_COOKIE, value, path: OAUTH_INTENT_PATH,
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax",
    maxAge,
  });
  return response;
}
