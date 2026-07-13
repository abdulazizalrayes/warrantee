import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { apiRateLimit, getClientIp, getRateLimitHeaders } from "@/lib/rate-limit";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isTrustedSameOriginRequest } from "@/lib/request-origin";

const allowedEvents = new Set([
  "page_view",
  "auth_intent",
  "funnel_cta_click",
  "signup_submit",
  "sign_up",
  "contact_form_submit",
  "seller_application_submit",
  "onboarding_completed",
]);

const allowedMetadataKeys = new Set([
  "action",
  "account_type",
  "auth_mode",
  "cta",
  "destination",
  "event_category",
  "event_label",
  "feature",
  "has_company_name",
  "locale",
  "location",
  "method",
  "page_name",
  "page_type",
  "plan",
  "source",
  "subject",
  "tab",
  "utm_campaign",
  "utm_content",
  "utm_medium",
  "utm_source",
  "utm_term",
  "ref",
]);

function createSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function sanitizeMetadata(value: unknown) {
  const input = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const output: Record<string, string | number | boolean | null> = {};

  for (const [key, item] of Object.entries(input)) {
    if (!allowedMetadataKeys.has(key)) continue;
    if (item === null || typeof item === "boolean" || typeof item === "number") {
      output[key] = item;
    } else if (typeof item === "string") {
      output[key] = item.slice(0, 160);
    }
  }

  return output;
}

function sanitizePath(value: unknown) {
  if (typeof value !== "string") return null;
  if (!value.startsWith("/")) return null;
  return value.slice(0, 240);
}

function sanitizeReferrer(value: unknown) {
  if (typeof value !== "string" || !value) return null;
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`.slice(0, 240);
  } catch {
    return null;
  }
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

  const event = typeof body.event === "string" ? body.event : "";
  if (!allowedEvents.has(event)) {
    return NextResponse.json({ error: "Unsupported event" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: auth } = await supabase.auth.getUser();
  const supabaseAdmin = createSupabaseAdminClient();

  const metadata = {
    source: "server_funnel",
    path: sanitizePath(body.path),
    referrer: sanitizeReferrer(body.referrer),
    user_agent: request.headers.get("user-agent")?.slice(0, 180) || null,
    ...sanitizeMetadata(body.metadata),
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
