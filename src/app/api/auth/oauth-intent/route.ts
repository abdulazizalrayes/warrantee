import { NextRequest, NextResponse } from "next/server";
import { isTrustedSameOriginRequest } from "@/lib/request-origin";
import { resolveSafeAuthRedirect } from "@/lib/auth-redirect";
import { createOAuthFlowIntent, expireOAuthIntent, setOAuthIntent } from "@/lib/server/oauth-flow-intent";

export async function POST(request: NextRequest) {
  if (!isTrustedSameOriginRequest(request, request.nextUrl.origin)) {
    return expireOAuthIntent(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
  }

  const body = await request.json().catch(() => null);
  const response = NextResponse.json({ ok: true });

  if (!body?.accountType) {
    return expireOAuthIntent(response);
  }

  let flow;
  try {
    flow = createOAuthFlowIntent({ ...body, next: resolveSafeAuthRedirect(body.next, "/en/dashboard") });
  } catch {
    return expireOAuthIntent(NextResponse.json({ error: "Could not prepare signup. Please retry." }, { status: 503 }));
  }
  if (!flow) {
    return expireOAuthIntent(NextResponse.json(
      { error: "Choose a valid account type and enter a company name for Business signup." },
      { status: 400 }
    ));
  }

  return setOAuthIntent(NextResponse.json({ ok: true, flowId: flow.intent.flowId }), flow.value);
}
