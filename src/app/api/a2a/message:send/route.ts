import { randomUUID } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import {
  AGENT_CONCIERGE_MAX_QUESTION_LENGTH,
  answerAgentQuestion,
} from "@/lib/agent-concierge";
import { apiJson } from "@/lib/api-response";
import { getClientIp, getRateLimitHeaders, rateLimit } from "@/lib/rate-limit";
import { recordAgentQuestion } from "@/lib/server/agent-question-recorder";
import { logAgentUsage } from "@/lib/server/agent-usage-logger";

const A2A_VERSION = "1.0";
const MAX_BODY_BYTES = 12_288;
const RATE_LIMIT_PER_MINUTE = 30;
const BLOCKED_RATE_LIMIT = 3;

type A2APart = { text?: unknown };
type A2AMessage = {
  messageId?: unknown;
  contextId?: unknown;
  role?: unknown;
  parts?: unknown;
  metadata?: unknown;
};

function a2aHeaders(extra?: HeadersInit) {
  const headers = new Headers(extra);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, A2A-Version");
  headers.set("Access-Control-Max-Age", "86400");
  headers.set("A2A-Version", A2A_VERSION);
  return headers;
}

function boundedId(value: unknown) {
  return typeof value === "string" && value.length > 0 && value.length <= 200
    ? value
    : undefined;
}

function extractQuestion(message: A2AMessage) {
  if (!Array.isArray(message.parts)) return "";
  return (message.parts as A2APart[])
    .map((part) => (typeof part?.text === "string" ? part.text.trim() : ""))
    .filter(Boolean)
    .join("\n")
    .trim();
}

export function OPTIONS() {
  return new NextResponse(null, {
    headers: a2aHeaders({ "Cache-Control": "public, max-age=86400" }),
  });
}

export async function POST(request: NextRequest) {
  if (request.headers.get("a2a-version") !== A2A_VERSION) {
    return apiJson(
      { error: { code: "unsupported_version", message: "A2A-Version: 1.0 is required" } },
      { status: 400, headers: a2aHeaders() },
    );
  }

  const contentLength = Number(request.headers.get("content-length") || "0");
  if (contentLength > MAX_BODY_BYTES) {
    return apiJson(
      { error: { code: "request_too_large", message: "Request body is too large" } },
      { status: 413, headers: a2aHeaders() },
    );
  }

  const rateLimitResult = await rateLimit(getClientIp(request), {
    maxRequests: RATE_LIMIT_PER_MINUTE,
    windowMs: 60_000,
    identifier: "a2a-agent-concierge",
  });
  if (!rateLimitResult.success) {
    return apiJson(
      { error: { code: "rate_limited", message: "Too many requests" } },
      {
        status: 429,
        headers: a2aHeaders({
          ...getRateLimitHeaders(rateLimitResult),
          "X-RateLimit-Limit": String(RATE_LIMIT_PER_MINUTE),
        }),
      },
    );
  }

  let body: { message?: A2AMessage };
  try {
    body = (await request.json()) as { message?: A2AMessage };
  } catch {
    return apiJson(
      { error: { code: "invalid_json", message: "Invalid JSON body" } },
      { status: 400, headers: a2aHeaders() },
    );
  }

  const message = body.message;
  if (!message || message.role !== "ROLE_USER") {
    return apiJson(
      { error: { code: "invalid_message", message: "A ROLE_USER message is required" } },
      { status: 400, headers: a2aHeaders() },
    );
  }

  const question = extractQuestion(message);
  if (!question || question.length > AGENT_CONCIERGE_MAX_QUESTION_LENGTH) {
    return apiJson(
      {
        error: {
          code: "invalid_question",
          message: `One or more text parts totaling 1-${AGENT_CONCIERGE_MAX_QUESTION_LENGTH} characters are required`,
        },
      },
      { status: 400, headers: a2aHeaders() },
    );
  }

  const metadata = message.metadata;
  const locale =
    metadata &&
    typeof metadata === "object" &&
    "locale" in metadata &&
    ((metadata as { locale?: unknown }).locale === "en" ||
      (metadata as { locale?: unknown }).locale === "ar")
      ? ((metadata as { locale: "en" | "ar" }).locale)
      : undefined;
  const result = answerAgentQuestion(question, locale);
  const contextId = boundedId(message.contextId) || randomUUID();

  await recordAgentQuestion({
    result,
    source: "a2a",
    userAgent: request.headers.get("user-agent"),
  });
  logAgentUsage(request, "agent_question", {
    protocol: "a2a",
    intent: result.intent,
    answer_status: result.answerStatus,
  });

  if (result.security.blocked) {
    const blockedLimit = await rateLimit(getClientIp(request), {
      maxRequests: BLOCKED_RATE_LIMIT,
      windowMs: 15 * 60_000,
      identifier: "a2a-blocked-content",
    });
    if (!blockedLimit.success) {
      return apiJson(
        { error: { code: "temporarily_blocked", message: "Repeated unsafe requests were blocked" } },
        {
          status: 429,
          headers: a2aHeaders({
            ...getRateLimitHeaders(blockedLimit),
            "X-RateLimit-Limit": String(BLOCKED_RATE_LIMIT),
          }),
        },
      );
    }
  }

  return apiJson(
    {
      message: {
        messageId: randomUUID(),
        contextId,
        role: "ROLE_AGENT",
        parts: [
          { text: result.answer },
          {
            data: result,
            mediaType: "application/json",
          },
        ],
        metadata: {
          readOnly: true,
          sourceMessageId: boundedId(message.messageId) || null,
        },
      },
    },
    { headers: a2aHeaders() },
  );
}
