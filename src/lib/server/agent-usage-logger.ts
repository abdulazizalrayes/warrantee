import { logger } from "@/lib/logger";

type AgentUsageEvent =
  | "crawler_visit"
  | "llms_read"
  | "llms_full_read"
  | "openapi_read"
  | "auth_doc_read"
  | "agent_markdown_read"
  | "public_data_read"
  | "mcp_tool_call"
  | "mcp_resource_read"
  | "inquiry_preparation";

function classifyUserAgent(userAgent: string | null) {
  const ua = (userAgent || "").toLowerCase();
  if (!ua) return "unknown";
  if (/(warrantee-agent-.*(validator|check)|playwright)/.test(ua)) {
    return "automation";
  }
  if (/(gptbot|chatgpt|openai|claudebot|anthropic|perplexity|google-extended|gemini|bingbot|applebot|ccbot|bytespider)/.test(ua)) {
    return "ai_or_search_crawler";
  }
  if (/(bot|crawler|spider|slurp)/.test(ua)) return "crawler";
  return "browser_or_client";
}

export function logAgentUsage(
  request: Request | { headers: Headers; url?: string },
  event: AgentUsageEvent,
  metadata: Record<string, unknown> = {},
) {
  const url = "url" in request && request.url ? new URL(request.url) : null;
  const userAgent = request.headers.get("user-agent");
  const userAgentClass = classifyUserAgent(userAgent);

  logger.info("agent_readiness_event", {
    event,
    path: url?.pathname,
    user_agent_class: userAgentClass,
    // Keep user-agent bounded and do not log IPs, emails, tokens, or request bodies.
    user_agent_hint: userAgent?.slice(0, 120) || null,
    ...metadata,
  });

  if (
    event !== "crawler_visit" &&
    (userAgentClass === "crawler" || userAgentClass === "ai_or_search_crawler")
  ) {
    logger.info("agent_readiness_event", {
      event: "crawler_visit",
      source_event: event,
      path: url?.pathname,
      user_agent_class: userAgentClass,
      user_agent_hint: userAgent?.slice(0, 120) || null,
      ...metadata,
    });
  }
}
