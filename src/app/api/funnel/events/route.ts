import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { apiRateLimit, getClientIp, getRateLimitHeaders } from "@/lib/rate-limit";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isTrustedSameOriginRequest } from "@/lib/request-origin";
import { classifyTrafficUserAgent } from "@/lib/traffic-classification";
import {
  sanitizeAnalyticsPath,
  sanitizeAnalyticsPayload,
  sanitizeAnalyticsReferrer,
  serverFunnelEvents,
} from "@/lib/analytics-payload";

function createSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimitResult = await apiRateLimit(ip);
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
    );
  }

  if (!isTrustedSameOriginRequest(request, request.nextUrl.origin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const event = typeof body.event === "string" ? body.event : "";
  if (!serverFunnelEvents.has(event)) {
    return NextResponse.json({ error: "Unsupported event" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: auth } = await supabase.auth.getUser();
  const supabaseAdmin = createSupabaseAdminClient();

  const userAgent = request.headers.get("user-agent");
  const metadata = {
    source: "server_funnel",
    path: sanitizeAnalyticsPath(body.path),
    referrer: sanitizeAnalyticsReferrer(body.referrer),
    ...sanitizeAnalyticsPayload(event, body.metadata, classifyTrafficUserAgent(userAgent)),
  };

  const { error } = await supabaseAdmin.from("activity_log").insert({
    actor_id: auth.user?.id || null,
    entity_type: "funnel_event",
    entity_id: crypto.randomUUID(),
    action: event,
    metadata,
  });

  if (error) {
    console.warn("Funnel event log failed:", error.message);
    return NextResponse.json({ accepted: true }, { status: 202 });
  }

  return NextResponse.json({ accepted: true }, { status: 201 });
}
