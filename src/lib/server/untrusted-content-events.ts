import type { UntrustedContentCategory } from "@/lib/untrusted-content";
import { logger } from "@/lib/logger";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type UntrustedContentSurface =
  | "agent_http"
  | "agent_mcp"
  | "agent_a2a"
  | "email_body"
  | "ocr_output"
  | "contact_form"
  | "seller_application"
  | "customer_feedback";

export async function recordUntrustedContentEvent(
  surface: UntrustedContentSurface,
  category: Exclude<UntrustedContentCategory, "none">,
) {
  try {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.rpc("record_untrusted_content_event", {
      p_surface: surface,
      p_category: category,
    });
    if (error) throw error;
  } catch (error) {
    logger.warn("untrusted_content_event_record_failed", {
      surface,
      category,
      error: error instanceof Error ? error.message : "unknown_error",
    });
  }
}
