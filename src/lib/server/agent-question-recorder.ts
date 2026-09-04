import type { AgentConciergeResult } from "@/lib/agent-concierge";
import { classifyUserAgent } from "@/lib/server/agent-usage-logger";
import { recordUntrustedContentEvent } from "@/lib/server/untrusted-content-events";
import { logger } from "@/lib/logger";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type AgentQuestionSource = "http" | "mcp" | "a2a";

export async function recordAgentQuestion({
  result,
  source,
  userAgent,
}: {
  result: AgentConciergeResult;
  source: AgentQuestionSource;
  userAgent?: string | null;
}) {
  if (
    process.env.NODE_ENV === "test" &&
    process.env.AGENT_CONCIERGE_RECORD_IN_TESTS !== "1"
  ) {
    return;
  }

  if (result.security.blocked && result.security.category !== "none") {
    await recordUntrustedContentEvent(
      source === "mcp" ? "agent_mcp" : source === "a2a" ? "agent_a2a" : "agent_http",
      result.security.category,
    );
    return;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.from("agent_concierge_questions").insert({
      question_redacted: null,
      question_hash: null,
      locale: result.language,
      intent: result.intent,
      fit: result.fit,
      answer_status: result.answerStatus,
      source_protocol: source,
      citations: result.citations.map(({ title, url }) => ({ title, url })),
      improvement_tags: result.improvementTags,
      redaction_applied: false,
      client_class: classifyUserAgent(userAgent || null),
    });

    if (error) throw error;
  } catch (error) {
    logger.warn("agent_concierge_question_record_failed", {
      source,
      intent: result.intent,
      error: error instanceof Error ? error.message : "unknown_error",
    });
  }
}
