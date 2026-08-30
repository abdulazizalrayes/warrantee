import { NextRequest, NextResponse } from "next/server";

import {
  AGENT_CONCIERGE_MAX_QUESTION_LENGTH,
  answerAgentQuestion,
  getAgentConciergeContract,
} from "@/lib/agent-concierge";
import { apiJson } from "@/lib/api-response";
import { getClientIp, getRateLimitHeaders, rateLimit } from "@/lib/rate-limit";
import { recordAgentQuestion } from "@/lib/server/agent-question-recorder";
import { logAgentUsage } from "@/lib/server/agent-usage-logger";

const MAX_BODY_BYTES = 8_192;
const RATE_LIMIT_PER_MINUTE = 30;

function publicHeaders(extra?: HeadersInit) {
  const headers = new Headers(extra);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, HEAD, POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  headers.set("Access-Control-Max-Age", "86400");
  return headers;
}

async function enforceRateLimit(request: NextRequest) {
  const result = await rateLimit(getClientIp(request), {
    maxRequests: RATE_LIMIT_PER_MINUTE,
    windowMs: 60_000,
    identifier: "agent-concierge",
  });
  if (result.success) return null;

  return apiJson(
    { error: "Too many requests" },
    {
      status: 429,
      headers: publicHeaders({
        ...getRateLimitHeaders(result),
        "X-RateLimit-Limit": String(RATE_LIMIT_PER_MINUTE),
      }),
    },
  );
}

export function GET() {
  return apiJson(getAgentConciergeContract(), {
    headers: publicHeaders({
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
    }),
  });
}

export function HEAD() {
  return new NextResponse(null, {
    headers: publicHeaders({
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
    }),
  });
}

export function OPTIONS() {
  return new NextResponse(null, {
    headers: publicHeaders({ "Cache-Control": "public, max-age=86400" }),
  });
}

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") || "0");
  if (contentLength > MAX_BODY_BYTES) {
    return apiJson({ error: "Request body is too large" }, { status: 413, headers: publicHeaders() });
  }

  const limited = await enforceRateLimit(request);
  if (limited) return limited;

  let body: { question?: unknown; locale?: unknown; source?: unknown };
  try {
    body = (await request.json()) as {
      question?: unknown;
      locale?: unknown;
      source?: unknown;
    };
  } catch {
    return apiJson({ error: "Invalid JSON body" }, { status: 400, headers: publicHeaders() });
  }

  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (!question) {
    return apiJson({ error: "question is required" }, { status: 400, headers: publicHeaders() });
  }
  if (question.length > AGENT_CONCIERGE_MAX_QUESTION_LENGTH) {
    return apiJson(
      { error: `question must be ${AGENT_CONCIERGE_MAX_QUESTION_LENGTH} characters or fewer` },
      { status: 400, headers: publicHeaders() },
    );
  }

  const locale = body.locale === "ar" || body.locale === "en" ? body.locale : undefined;
  const result = answerAgentQuestion(question, locale);
  const source = body.source === "mcp" ? "mcp" : "http";

  await recordAgentQuestion({
    question,
    result,
    source,
    userAgent: request.headers.get("user-agent"),
  });
  logAgentUsage(request, "agent_question", {
    protocol: source,
    intent: result.intent,
    answer_status: result.answerStatus,
  });

  return apiJson(result, { headers: publicHeaders() });
}
