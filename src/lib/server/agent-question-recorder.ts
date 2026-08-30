import { createHash } from "node:crypto";

import type { AgentConciergeResult } from "@/lib/agent-concierge";
import { redactAgentQuestion } from "@/lib/agent-question-privacy";
import { classifyUserAgent } from "@/lib/server/agent-usage-logger";
import { logger } from "@/lib/logger";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type AgentQuestionSource = "http" | "mcp" | "a2a";

export async function recordAgentQuestion({
  question,
  result,
  source,
  userAgent,
}: {
  question: string;
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

  const redacted = redactAgentQuestion(question);
  const questionHash = createHash("sha256")
    .update(redacted.text.toLocaleLowerCase(result.language), "utf8")
    .digest("hex");

  try {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.from("agent_concierge_questions").insert({
      question_redacted: redacted.text,
      question_hash: questionHash,
      locale: result.language,
      intent: result.intent,
      fit: result.fit,
      answer_status: result.answerStatus,
      source_protocol: source,
      citations: result.citations.map(({ title, url }) => ({ title, url })),
      improvement_tags: result.improvementTags,
      redaction_applied: redacted.redactionApplied,
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
