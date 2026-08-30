import { NextRequest } from "next/server";

import { apiJson } from "@/lib/api-response";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const MAX_ANALYSIS_ROWS = 5000;

function boundedInteger(value: string | null, fallback: number, min: number, max: number) {
  const parsed = Number.parseInt(value || "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function increment(target: Record<string, number>, key: string) {
  target[key] = (target[key] || 0) + 1;
}

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiJson({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || !["admin", "super_admin"].includes(profile.role)) {
    return apiJson({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const days = boundedInteger(url.searchParams.get("days"), 30, 1, 180);
  const recentLimit = boundedInteger(url.searchParams.get("limit"), 50, 1, 200);
  const page = boundedInteger(url.searchParams.get("page"), 1, 1, 100_000);
  const includeAutomation = url.searchParams.get("includeAutomation") === "1";
  const pageStart = (page - 1) * recentLimit;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const admin = createSupabaseAdminClient();
  let analysisQuery = admin
    .from("agent_concierge_questions")
    .select(
      "id, created_at, question_redacted, question_hash, locale, intent, fit, answer_status, source_protocol, improvement_tags, redaction_applied, client_class",
      { count: "exact" },
    )
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(MAX_ANALYSIS_ROWS);
  let pageQuery = admin
    .from("agent_concierge_questions")
    .select(
      "created_at, question_redacted, locale, intent, fit, answer_status, source_protocol, redaction_applied",
      { count: "exact" },
    )
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .range(pageStart, pageStart + recentLimit - 1);
  if (!includeAutomation) {
    analysisQuery = analysisQuery.neq("client_class", "automation");
    pageQuery = pageQuery.neq("client_class", "automation");
  }

  const [analysisResult, pageResult] = await Promise.all([analysisQuery, pageQuery]);
  const { data, error, count } = analysisResult;

  if (error || pageResult.error) {
    return apiJson({ error: "Unable to read agent question report" }, { status: 500 });
  }

  const rows = data || [];
  const pageRows = pageResult.data || [];
  const total = pageResult.count || count || 0;
  const byIntent: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  const byLocale: Record<string, number> = {};
  const bySource: Record<string, number> = {};
  const byClientClass: Record<string, number> = {};
  const improvementBacklog: Record<string, number> = {};
  const repetitions = new Map<string, { question: string; count: number; lastAskedAt: string }>();

  for (const row of rows) {
    increment(byIntent, row.intent);
    increment(byStatus, row.answer_status);
    increment(byLocale, row.locale);
    increment(bySource, row.source_protocol);
    increment(byClientClass, row.client_class);
    for (const tag of row.improvement_tags || []) increment(improvementBacklog, tag);

    const repeated = repetitions.get(row.question_hash);
    if (repeated) repeated.count += 1;
    else {
      repetitions.set(row.question_hash, {
        question: row.question_redacted,
        count: 1,
        lastAskedAt: row.created_at,
      });
    }
  }

  const sortCounts = (value: Record<string, number>) =>
    Object.entries(value)
      .map(([key, value]) => ({ key, value }))
      .sort((a, b) => b.value - a.value || a.key.localeCompare(b.key));

  return apiJson({
    period: { days, since, includeAutomation },
    total,
    analyzed: rows.length,
    sampled: total > rows.length,
    pagination: {
      page,
      limit: recentLimit,
      totalPages: Math.ceil(total / recentLimit),
      hasNextPage: pageStart + pageRows.length < total,
    },
    breakdown: {
      intents: sortCounts(byIntent),
      statuses: sortCounts(byStatus),
      locales: sortCounts(byLocale),
      sources: sortCounts(bySource),
      clientClasses: sortCounts(byClientClass),
    },
    topRepeatedQuestions: [...repetitions.values()]
      .filter((item) => item.count > 1)
      .sort((a, b) => b.count - a.count || b.lastAskedAt.localeCompare(a.lastAskedAt))
      .slice(0, 25),
    improvementBacklog: sortCounts(improvementBacklog),
    unansweredOrPartial: rows
      .filter((row) => ["partial", "not_supported"].includes(row.answer_status))
      .slice(0, recentLimit)
      .map((row) => ({
        askedAt: row.created_at,
        question: row.question_redacted,
        intent: row.intent,
        status: row.answer_status,
        locale: row.locale,
        source: row.source_protocol,
      })),
    recentQuestions: pageRows.map((row) => ({
      askedAt: row.created_at,
      question: row.question_redacted,
      intent: row.intent,
      status: row.answer_status,
      fit: row.fit,
      locale: row.locale,
      source: row.source_protocol,
      redactionApplied: row.redaction_applied,
    })),
    privacy:
      "Questions are redacted before storage. This report contains no IP addresses, raw user-agents, credentials, or private warranty payloads.",
  });
}
