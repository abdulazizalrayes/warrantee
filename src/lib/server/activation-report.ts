import type { SupabaseClient } from "@supabase/supabase-js";
import { isRealFunnelEvent } from "@/lib/growth-analytics";
import { sanitizeAnalyticsPayload, serverFunnelEvents } from "@/lib/analytics-payload";

type Profile = { id: string; email: string | null; role: string | null; created_at: string; onboarding_completed: boolean | null };
type Warranty = { id: string; created_by: string | null; source: string | null; status: string; created_at: string };
type Event = {
  id: string; actor_id: string | null; entity_id: string | null; action: string;
  traffic_class: string | null; source: string | null; milestone: string | null;
  completion_mode: string | null; utm_source: string | null; utm_medium: string | null;
  utm_campaign: string | null; ref: string | null;
};
type Stock = { accounts: number; setupResolved: number; creatorUsers: number; warranties: number; newAccounts30d: number; newWarranties30d: number; unattributedWarranties: number };
type Hints = {
  total: number; actions: { action: string; count: number }[];
  setup: { completed: number; skipped: number; unknown: number };
  campaigns: { source: string; medium: string; campaign: string; count: number; actions: Record<string, number> }[];
};
export type ActivationReport = {
  complete: true;
  period: { days: 30; since: string; until: string; bounds: "[since, until)" };
  stockAsOf: string;
  stock: { real: Stock; all: Stock };
  hints: { real: Hints; all: Hints };
  verified: { firstWarrantyCreatedScopes: number; firstWarrantyIssuedScopes: number };
  excluded: { accounts: number; warranties: number; events: number };
  coverage: { profiles: number; warranties: number; events30d: number; historicalAutomationEvents: number };
  gaps: string[];
};

// Exact roles/domains and explicit identities only, never fragments of personal names.
function internalProfile(profile: Profile) {
  if (["admin", "super_admin", "support", "platform_admin"].includes(profile.role || "")) return true;
  const email = (profile.email || "").trim().toLowerCase();
  const domain = email.split("@")[1];
  return ["warrantee.io", "example.com", "example.org", "example.net"].includes(domain)
    || Boolean(process.env.E2E_USER_EMAIL && email === process.env.E2E_USER_EMAIL.trim().toLowerCase());
}

const syntheticSource = /(?:^|[_-])(?:qa|test|seed|synthetic|monitoring|codex|diag)(?:[_-]|$)/i;
const metadata = (event: Event) => ({
  traffic_class: event.traffic_class, source: event.source, milestone: event.milestone,
  completion_mode: event.completion_mode, utm_source: event.utm_source,
  utm_medium: event.utm_medium, utm_campaign: event.utm_campaign, ref: event.ref,
});

function hints(events: Event[]): Hints {
  const actions = new Map<string, number>();
  const campaigns = new Map<string, Hints["campaigns"][number]>();
  const setup = { completed: 0, skipped: 0, unknown: 0 };
  let total = 0;
  for (const event of events) {
    // Only the separately counted backend milestones assert authoritative success.
    if (event.action === "activation_milestone" && event.source === "server_warranty_creation") continue;
    const action = serverFunnelEvents.has(event.action) || ["warranty_created", "claim_submitted"].includes(event.action)
      ? event.action : "other";
    total++;
    actions.set(action, (actions.get(action) || 0) + 1);
    if (action === "onboarding_completed") {
      const mode = event.completion_mode;
      if (mode === "completed" || mode === "skipped") setup[mode]++;
      else setup.unknown++;
    }
    // Revalidate registered campaign codes; old stored metadata is untrusted.
    const safe = sanitizeAnalyticsPayload("page_view", metadata(event), "human") || {};
    const source = String(safe.utm_source || "");
    const medium = String(safe.utm_medium || "");
    const campaign = String(safe.utm_campaign || "");
    if (!source && !medium && !campaign) continue;
    const key = JSON.stringify([source, medium, campaign]);
    const bucket = campaigns.get(key) || { source, medium, campaign, count: 0, actions: {} };
    bucket.count++;
    bucket.actions[action] = (bucket.actions[action] || 0) + 1;
    campaigns.set(key, bucket);
  }
  return {
    total, setup,
    actions: Array.from(actions, ([action, count]) => ({ action, count })).sort((a, b) => b.count - a.count),
    campaigns: Array.from(campaigns.values()).sort((a, b) => b.count - a.count),
  };
}

function stock(profiles: Profile[], warranties: Warranty[], since: string): Stock {
  const ids = new Set(profiles.map((profile) => profile.id));
  const creators = new Set(warranties.flatMap((warranty) =>
    warranty.created_by && ids.has(warranty.created_by) ? [warranty.created_by] : []));
  return {
    accounts: profiles.length,
    // Both completed and skipped setup set this flag; it cannot prove completion.
    setupResolved: profiles.filter((profile) => profile.onboarding_completed === true).length,
    creatorUsers: creators.size, warranties: warranties.length,
    newAccounts30d: profiles.filter((profile) => profile.created_at >= since).length,
    newWarranties30d: warranties.filter((warranty) => warranty.created_at >= since).length,
    unattributedWarranties: warranties.filter((warranty) => !warranty.created_by || !ids.has(warranty.created_by)).length,
  };
}

const PAGE_SIZE = 500;

// Exact totals detect backend row caps, missing pages and concurrent count drift.
async function readAll<T extends { id: string }>(query: (offset: number) => PromiseLike<{
  data: unknown[] | null; error: unknown; count: number | null;
}>): Promise<T[]> {
  const rows: T[] = [];
  const seen = new Set<string>();
  let expected: number | null = null;
  do {
    const result = await query(rows.length);
    if (result.error || !Array.isArray(result.data) || result.count === null
      || !Number.isSafeInteger(result.count) || result.count < 0) throw new Error("Incomplete activation report");
    if (expected !== null && expected !== result.count) throw new Error("Activation report changed during pagination");
    expected = result.count;
    if (result.data.length !== Math.min(PAGE_SIZE, expected - rows.length)) throw new Error("Truncated activation report");
    for (const row of result.data as T[]) {
      if (!row.id || seen.has(row.id)) throw new Error("Invalid activation report page");
      seen.add(row.id);
      rows.push(row);
    }
  } while (rows.length < expected);
  return rows;
}

export async function buildActivationReport(admin: SupabaseClient, now = new Date()): Promise<ActivationReport> {
  const until = now.toISOString();
  const since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const signal = AbortSignal.timeout(25_000);
  const profiles = await readAll<Profile>((offset) => admin.from("profiles")
    .select("id,email,role,created_at,onboarding_completed", { count: "exact" })
    .lt("created_at", until).order("id").range(offset, offset + PAGE_SIZE - 1).abortSignal(signal));
  const warranties = await readAll<Warranty>((offset) => admin.from("warranties")
    .select("id,created_by,source,status,created_at", { count: "exact" })
    .is("deleted_at", null).neq("status", "draft").lt("created_at", until)
    .order("id").range(offset, offset + PAGE_SIZE - 1).abortSignal(signal));
  const automation = await readAll<Pick<Event, "id" | "actor_id" | "entity_id" | "action">>((offset) => admin.from("activity_log")
    .select("id,actor_id,entity_id,action", { count: "exact" }).eq("entity_type", "funnel_event")
    .in("metadata->>traffic_class", ["qa", "monitoring", "crawler"]).lt("created_at", until)
    .order("id").range(offset, offset + PAGE_SIZE - 1).abortSignal(signal));
  const events = await readAll<Event>((offset) => admin.from("activity_log")
    .select("id,actor_id,entity_id,action,traffic_class:metadata->>traffic_class,source:metadata->>source,milestone:metadata->>milestone,completion_mode:metadata->>completion_mode,utm_source:metadata->>utm_source,utm_medium:metadata->>utm_medium,utm_campaign:metadata->>utm_campaign,ref:metadata->>ref", { count: "exact" })
    .eq("entity_type", "funnel_event").gte("created_at", since).lt("created_at", until)
    .order("id").range(offset, offset + PAGE_SIZE - 1).abortSignal(signal));

  const excludedIds = new Set(profiles.filter(internalProfile).map((profile) => profile.id));
  const excludedWarrantyIds = new Set<string>();
  for (const event of automation) {
    if (event.actor_id) excludedIds.add(event.actor_id);
    if (event.action === "warranty_created" && event.entity_id) excludedWarrantyIds.add(event.entity_id);
  }
  const realProfiles = profiles.filter((profile) => !excludedIds.has(profile.id));
  const eligibleIds = new Set(realProfiles.map((profile) => profile.id));
  const realWarranties = warranties.filter((warranty) =>
    !excludedWarrantyIds.has(warranty.id) && !syntheticSource.test(warranty.source || "")
    && warranty.created_by !== null && eligibleIds.has(warranty.created_by));
  const realEvents = events.filter((event) => isRealFunnelEvent({ actor_id: event.actor_id, metadata: metadata(event) }, excludedIds));
  const created = new Set<string>();
  const issued = new Set<string>();
  for (const event of realEvents) {
    if (!event.actor_id || !event.entity_id || event.action !== "activation_milestone" || event.source !== "server_warranty_creation") continue;
    if (event.milestone === "first_warranty_created") created.add(event.entity_id);
    if (event.milestone === "first_warranty_issued") issued.add(event.entity_id);
  }
  return {
    complete: true, period: { days: 30, since, until, bounds: "[since, until)" }, stockAsOf: until,
    stock: { real: stock(realProfiles, realWarranties, since), all: stock(profiles, warranties, since) },
    hints: { real: hints(realEvents), all: hints(events) },
    verified: { firstWarrantyCreatedScopes: created.size, firstWarrantyIssuedScopes: issued.size },
    excluded: { accounts: profiles.length - realProfiles.length, warranties: warranties.length - realWarranties.length, events: events.length - realEvents.length },
    coverage: { profiles: profiles.length, warranties: warranties.length, events30d: events.length, historicalAutomationEvents: automation.length },
    gaps: [
      "Historical stock is current retained state before until, not a signup cohort or an atomic database snapshot; deleted warranties and drafts are excluded.",
      "Setup-resolved profile flags include skipped setup. Completed/skipped event counts are client hints, not verified setup actions or unique users.",
      "Creator stock uses only created_by, never buyers, recipients, sellers or issuers. Missing creator attribution is reported in all-stock unattributedWarranties and excluded from real warranty stock, not inferred.",
      "Verified 30-day milestones require human backend source server_warranty_creation; distinct scopes may be personal users or issuer companies, not a user conversion rate.",
      "Missing historical traffic classification cannot establish real-user activity; unclassified events are excluded from the real lens. Unknown internal identities cannot be inferred from names.",
      "Backend milestone coverage begins when its writer is installed; absence of a milestone does not prove absence of historical creation or issuance.",
      "Authoritative source trust requires the migration restricting direct authenticated funnel_event inserts to backend writers. Human traffic classification is heuristic; committed backend actions, not visitor humanity, are authoritative.",
    ],
  };
}
