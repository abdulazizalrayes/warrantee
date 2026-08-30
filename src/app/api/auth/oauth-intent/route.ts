import { NextRequest, NextResponse } from "next/server";
import { isTrustedSameOriginRequest } from "@/lib/request-origin";
import {
  buildOAuthSignupIntent,
  OAUTH_SIGNUP_INTENT_COOKIE,
  OAUTH_SIGNUP_INTENT_MAX_AGE_SECONDS,
  serializeOAuthSignupIntent,
} from "@/lib/oauth-signup-intent";

export async function POST(request: NextRequest) {
  if (!isTrustedSameOriginRequest(request, request.nextUrl.origin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const response = NextResponse.json({ ok: true });

  if (!body?.accountType) {
    response.cookies.delete(OAUTH_SIGNUP_INTENT_COOKIE);
    return response;
  }

  const intent = buildOAuthSignupIntent(body);
  if (!intent) {
    return NextResponse.json(
      { error: "Choose a valid account type and enter a company name for Business signup." },
      { status: 400 }
    );
  }

  response.cookies.set({
    name: OAUTH_SIGNUP_INTENT_COOKIE,
    value: serializeOAuthSignupIntent(intent),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/auth/callback",
    maxAge: OAUTH_SIGNUP_INTENT_MAX_AGE_SECONDS,
  });
  return response;
}
