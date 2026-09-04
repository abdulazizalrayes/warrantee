import { NextRequest, NextResponse } from "next/server";
import { getClientIp, getRateLimitHeaders, rateLimit } from "@/lib/rate-limit";
import { isTrustedSameOriginRequest } from "@/lib/request-origin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { classifyTrafficUserAgent } from "@/lib/traffic-classification";
import { sanitizeString } from "@/lib/validation";
import { assessUntrustedContent, isInstructionAttack } from "@/lib/untrusted-content";
import { recordUntrustedContentEvent } from "@/lib/server/untrusted-content-events";

const allowedStages = new Set([
  "landing",
  "signup",
  "onboarding",
  "first_warranty",
  "import",
  "claim",
  "extension",
  "cancellation",
]);

const allowedReasons = new Set([
  "easy",
  "unclear",
  "missing_workflow",
  "technical_issue",
  "not_ready",
  "too_expensive",
  "other",
]);

export async function POST(request: NextRequest) {
  const limit = await rateLimit(getClientIp(request), {
    maxRequests: 8,
    windowMs: 60 * 60 * 1000,
    identifier: "customer-feedback",
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
  const stage = typeof body?.stage === "string" ? body.stage : "";
  const reasonCode = typeof body?.reasonCode === "string" ? body.reasonCode : "";
  if (!allowedStages.has(stage) || !allowedReasons.has(reasonCode)) {
    return NextResponse.json({ error: "Invalid feedback" }, { status: 400 });
  }

  const comment = typeof body?.comment === "string"
    ? sanitizeString(body.comment, 1000) || null
    : null;
  const contentAssessment = assessUntrustedContent(comment);
  if (isInstructionAttack(contentAssessment) && contentAssessment.category !== "none") {
    await recordUntrustedContentEvent("customer_feedback", contentAssessment.category);
    return NextResponse.json({ error: "Unsafe external instructions are not accepted" }, { status: 400 });
  }
  const locale = body?.locale === "ar" ? "ar" : "en";
  const supabase = await createServerSupabaseClient();
  const { data: auth } = await supabase.auth.getUser();
  const admin = createSupabaseAdminClient();
  const userAgent = request.headers.get("user-agent");

  const { error } = await admin.from("customer_feedback_events").insert({
    actor_id: auth.user?.id || null,
    stage,
    reason_code: reasonCode,
    comment,
    locale,
    traffic_class: classifyTrafficUserAgent(userAgent),
    metadata: {
      source: "in_product",
      content_boundary: "untrusted_external_text",
      execution_policy: "display_only_no_actions",
    },
  });

  if (error) {
    return NextResponse.json({ error: "Feedback could not be saved" }, { status: 500 });
  }

  return NextResponse.json({ accepted: true }, { status: 201 });
}
