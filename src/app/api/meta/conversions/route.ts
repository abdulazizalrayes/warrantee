import { NextRequest, NextResponse } from "next/server";
import { apiRateLimit, getClientIp, getRateLimitHeaders } from "@/lib/rate-limit";
import { isTrustedSameOriginRequest } from "@/lib/request-origin";

const GRAPH_VERSION = process.env.META_GRAPH_API_VERSION || "v20.0";
const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;
const META_CAPI_ACCESS_TOKEN = process.env.META_CAPI_ACCESS_TOKEN;
const META_CAPI_TEST_EVENT_CODE = process.env.META_CAPI_TEST_EVENT_CODE;

const allowedEvents = new Set([
  "CompleteRegistration",
  "Lead",
  "Purchase",
  "WarrantyCreated",
  "WarrantyScan",
  "WarrantyClaimSubmitted",
  "WarrantyExtensionRequest",
  "WarrantyExtensionWishlist",
  "WarrantyDocumentView",
  "ReportExportRequested",
]);

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimitResult = await apiRateLimit(ip);
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
    );
  }

  if (!isTrustedSameOriginRequest(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!META_PIXEL_ID || !META_CAPI_ACCESS_TOKEN) {
    return NextResponse.json(
      { enabled: false, message: "Meta Conversions API is not configured." },
      { status: 202 },
    );
  }

  const payload = await request.json().catch(() => null);
  const eventName = typeof payload?.eventName === "string" ? payload.eventName : "";
  if (!allowedEvents.has(eventName)) {
    return NextResponse.json({ error: "Unsupported Meta event." }, { status: 400 });
  }

  const event = {
    event_name: eventName,
    event_time: Math.floor(Date.now() / 1000),
    event_id: typeof payload?.eventId === "string" ? payload.eventId : undefined,
    action_source: "website",
    event_source_url: typeof payload?.sourceUrl === "string" ? payload.sourceUrl : request.headers.get("referer") || undefined,
    custom_data: payload?.customData && typeof payload.customData === "object" ? payload.customData : undefined,
  };

  const body: Record<string, unknown> = { data: [event] };
  if (META_CAPI_TEST_EVENT_CODE) {
    body.test_event_code = META_CAPI_TEST_EVENT_CODE;
  }

  const response = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${META_PIXEL_ID}/events`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${META_CAPI_ACCESS_TOKEN}`,
    },
    body: JSON.stringify(body),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    return NextResponse.json({ error: "Meta Conversions API rejected the event.", result }, { status: 502 });
  }

  return NextResponse.json({ ok: true, result });
}
