import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const DEFAULT_INGESTION_PAYLOAD_DAYS = 90;
const DEFAULT_OCR_TEXT_DAYS = 90;
const DEFAULT_API_USAGE_DAYS = 400;
const DEFAULT_WEBHOOK_EVENT_DAYS = 400;
const DEFAULT_AGENT_QUESTION_DAYS = 180;
const DEFAULT_LIMIT = 250;
const MAX_LIMIT = 1000;

function boundedInteger(value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number.parseInt(value || "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function daysAgoIso(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

export function getDataRetentionConfig() {
  return {
    ingestionPayloadDays: boundedInteger(
      process.env.DATA_RETENTION_INGESTION_PAYLOAD_DAYS,
      DEFAULT_INGESTION_PAYLOAD_DAYS,
      7,
      3650
    ),
    ocrTextDays: boundedInteger(process.env.DATA_RETENTION_OCR_TEXT_DAYS, DEFAULT_OCR_TEXT_DAYS, 7, 3650),
    apiUsageDays: boundedInteger(process.env.DATA_RETENTION_API_USAGE_DAYS, DEFAULT_API_USAGE_DAYS, 30, 3650),
    webhookEventDays: boundedInteger(
      process.env.DATA_RETENTION_WEBHOOK_EVENT_DAYS,
      DEFAULT_WEBHOOK_EVENT_DAYS,
      30,
      3650
    ),
    agentQuestionDays: boundedInteger(
      process.env.DATA_RETENTION_AGENT_QUESTION_DAYS,
      DEFAULT_AGENT_QUESTION_DAYS,
      30,
      3650
    ),
    limit: boundedInteger(process.env.DATA_RETENTION_BATCH_LIMIT, DEFAULT_LIMIT, 1, MAX_LIMIT),
  };
}

export async function runOperationalDataRetention() {
  const supabase = createSupabaseAdminClient();
  const config = getDataRetentionConfig();
  const now = new Date().toISOString();

  const ingestionPayloadCutoff = daysAgoIso(config.ingestionPayloadDays);
  const ocrTextCutoff = daysAgoIso(config.ocrTextDays);
  const apiUsageCutoff = daysAgoIso(config.apiUsageDays);
  const webhookEventCutoff = daysAgoIso(config.webhookEventDays);
  const agentQuestionCutoff = daysAgoIso(config.agentQuestionDays);

  const { data: ingestionJobs, error: ingestionSelectError } = await supabase
    .from("ingestion_jobs")
    .select("id")
    .is("sensitive_payload_redacted_at", null)
    .lt("created_at", ingestionPayloadCutoff)
    .or("raw_payload.not.is.null,text_body.not.is.null,html_body.not.is.null")
    .limit(config.limit);

  if (ingestionSelectError) throw ingestionSelectError;

  const ingestionJobIds = (ingestionJobs || []).map((item) => item.id);
  if (ingestionJobIds.length > 0) {
    const { error: ingestionUpdateError } = await supabase
      .from("ingestion_jobs")
      .update({
        raw_payload: null,
        text_body: null,
        html_body: null,
        sensitive_payload_redacted_at: now,
        updated_at: now,
      })
      .in("id", ingestionJobIds);

    if (ingestionUpdateError) throw ingestionUpdateError;
  }

  const { data: ocrAttachments, error: ocrSelectError } = await supabase
    .from("ingestion_attachments")
    .select("id")
    .is("sensitive_ocr_redacted_at", null)
    .not("ocr_raw_text", "is", null)
    .lt("processed_at", ocrTextCutoff)
    .limit(config.limit);

  if (ocrSelectError) throw ocrSelectError;

  const ocrAttachmentIds = (ocrAttachments || []).map((item) => item.id);
  if (ocrAttachmentIds.length > 0) {
    const { error: ocrUpdateError } = await supabase
      .from("ingestion_attachments")
      .update({
        ocr_raw_text: null,
        sensitive_ocr_redacted_at: now,
      })
      .in("id", ocrAttachmentIds);

    if (ocrUpdateError) throw ocrUpdateError;
  }

  const { data: apiUsageEvents, error: apiUsageSelectError } = await supabase
    .from("api_usage_events")
    .select("id")
    .lt("created_at", apiUsageCutoff)
    .limit(config.limit);

  if (apiUsageSelectError) throw apiUsageSelectError;

  const apiUsageEventIds = (apiUsageEvents || []).map((item) => item.id);
  if (apiUsageEventIds.length > 0) {
    const { error: apiUsageDeleteError } = await supabase
      .from("api_usage_events")
      .delete()
      .in("id", apiUsageEventIds);

    if (apiUsageDeleteError) throw apiUsageDeleteError;
  }

  const { data: webhookEvents, error: webhookEventSelectError } = await supabase
    .from("webhook_events")
    .select("id")
    .eq("status", "processed")
    .lt("processed_at", webhookEventCutoff)
    .limit(config.limit);

  if (webhookEventSelectError) throw webhookEventSelectError;

  const webhookEventIds = (webhookEvents || []).map((item) => item.id);
  if (webhookEventIds.length > 0) {
    const { error: webhookEventDeleteError } = await supabase
      .from("webhook_events")
      .delete()
      .in("id", webhookEventIds);

    if (webhookEventDeleteError) throw webhookEventDeleteError;
  }

  const { data: agentQuestions, error: agentQuestionSelectError } = await supabase
    .from("agent_concierge_questions")
    .select("id")
    .lt("created_at", agentQuestionCutoff)
    .limit(config.limit);

  if (agentQuestionSelectError) throw agentQuestionSelectError;

  const agentQuestionIds = (agentQuestions || []).map((item) => item.id);
  if (agentQuestionIds.length > 0) {
    const { error: agentQuestionDeleteError } = await supabase
      .from("agent_concierge_questions")
      .delete()
      .in("id", agentQuestionIds);

    if (agentQuestionDeleteError) throw agentQuestionDeleteError;
  }

  return {
    status: "ok",
    config,
    cutoffs: {
      ingestionPayloadCutoff,
      ocrTextCutoff,
      apiUsageCutoff,
      webhookEventCutoff,
      agentQuestionCutoff,
    },
    redacted: {
      ingestionPayloads: ingestionJobIds.length,
      ocrTexts: ocrAttachmentIds.length,
    },
    deleted: {
      apiUsageEvents: apiUsageEventIds.length,
      webhookEvents: webhookEventIds.length,
      agentQuestions: agentQuestionIds.length,
    },
  };
}
