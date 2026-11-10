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
  authoritativeActivationMilestones,
} from "@/lib/analytics-payload";
import { isValidUUID } from "@/lib/validation";

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
    const text = await request.text();
    if (Buffer.byteLength(text, "utf8") > 16384) {
      return NextResponse.json({ error: "Event payload too large" }, { status: 413 });
    }
    body = JSON.parse(text);
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

  const suppliedMetadata = body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
    ? body.metadata as Record<string, unknown> : {};
  if (event === "activation_milestone" && authoritativeActivationMilestones.has(String(suppliedMetadata.milestone))) {
    return NextResponse.json({ error: "This outcome is recorded by the warranty service" }, { status: 400 });
  }
  if (body.event_id !== undefined && !isValidUUID(body.event_id)) {
    return NextResponse.json({ error: "Invalid event identifier" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: auth } = await supabase.auth.getUser();
  if ((event === "onboarding_journey" || event === "warranty_journey") && !auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabaseAdmin = createSupabaseAdminClient();

  const userAgent = request.headers.get("user-agent");
  const metadata = {
    source: "server_funnel",
    path: sanitizeAnalyticsPath(body.path),
    referrer: sanitizeAnalyticsReferrer(body.referrer),
    ...sanitizeAnalyticsPayload(event, body.metadata, classifyTrafficUserAgent(userAgent)),
  };

  const { error } = await supabaseAdmin.from("activity_log").insert({
    id: body.event_id || crypto.randomUUID(),
    actor_id: auth.user?.id || null,
    entity_type: "funnel_event",
    entity_id: crypto.randomUUID(),
    action: event,
    metadata,
  });

  if (error) {
    if (error.code === "23505" && body.event_id) {
      const { data: existing } = await supabaseAdmin.from("activity_log")
        .select("actor_id,action,entity_type").eq("id", body.event_id).maybeSingle();
      if (existing?.actor_id === (auth.user?.id || null) && existing?.action === event && existing?.entity_type === "funnel_event") {
        return NextResponse.json({ accepted: true, duplicate: true }, { status: 200 });
      }
      return NextResponse.json({ accepted: false }, { status: 409 });
    }
    console.warn("Funnel event log failed:", { code: error.code || "unavailable" });
    return NextResponse.json({ accepted: false, retryable: true }, { status: 503 });
  }

  return NextResponse.json({ accepted: true }, { status: 201 });
}
