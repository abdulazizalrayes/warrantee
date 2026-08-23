import { NextRequest, NextResponse } from "next/server";
import { getClientIp, getRateLimitHeaders, rateLimit } from "@/lib/rate-limit";
import { isTrustedSameOriginRequest } from "@/lib/request-origin";
import { PUBLIC_WARRANTY_STATUSES } from "@/lib/public-warranty";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { classifyTrafficUserAgent } from "@/lib/traffic-classification";
import { isValidUUID } from "@/lib/validation";

const allowedEventTypes = new Set([
  "view",
  "powered_by_click",
  "claim_intent",
  "extension_intent",
  "issuer_invite_intent",
]);

const allowedSources = new Set(["passport_page", "qr", "direct"]);

export async function POST(request: NextRequest) {
  const limit = await rateLimit(getClientIp(request), {
    maxRequests: 60,
    windowMs: 10 * 60 * 1000,
    identifier: "passport-events",
  });
  if (!limit.success) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: getRateLimitHeaders(limit) },
    );
  }

  if (!isTrustedSameOriginRequest(request, request.nextUrl.origin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const warrantyId = typeof body?.warrantyId === "string" ? body.warrantyId : "";
  const eventType = typeof body?.eventType === "string" ? body.eventType : "";
  if (!isValidUUID(warrantyId) || !allowedEventTypes.has(eventType)) {
    return NextResponse.json({ error: "Invalid passport event" }, { status: 400 });
  }

  const locale = body?.locale === "ar" ? "ar" : "en";
  const sourceCandidate = typeof body?.source === "string" ? body.source : "passport_page";
  const source = allowedSources.has(sourceCandidate) ? sourceCandidate : "passport_page";
  const userAgent = request.headers.get("user-agent");
  const admin = createSupabaseAdminClient();

  const { data: warranty, error: warrantyError } = await admin
    .from("warranties")
    .select("id")
    .eq("id", warrantyId)
    .in("status", [...PUBLIC_WARRANTY_STATUSES])
    .is("deleted_at", null)
    .maybeSingle();
  if (warrantyError || !warranty) {
    return NextResponse.json({ error: "Warranty not found" }, { status: 404 });
  }

  const { error } = await admin.from("warranty_passport_events").insert({
    warranty_id: warrantyId,
    event_type: eventType,
    locale,
    traffic_class: classifyTrafficUserAgent(userAgent),
    source,
  });

  if (error) {
    console.warn("Passport event could not be recorded:", error.message);
    return NextResponse.json({ accepted: true }, { status: 202 });
  }

  return NextResponse.json({ accepted: true }, { status: 201 });
}
