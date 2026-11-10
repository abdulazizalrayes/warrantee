import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildActivationReport } from "@/lib/server/activation-report";

const now = new Date("2026-11-10T12:00:00.000Z");
const date = "2026-11-01T12:00:00.000Z";
type Row = Record<string, unknown> & { id: string; created_at: string };
const profile = (id: string, extra = {}): Row => ({ id, created_at: date, email: `${id}@customer.invalid`, role: "user", onboarding_completed: true, ...extra });
const warranty = (id: string, creator: string | null, extra = {}): Row => ({ id, created_at: date, created_by: creator, source: "manual", status: "active", deleted_at: null, ...extra });
const event = (id: string, extra = {}): Row => ({ id, created_at: date, actor_id: "creator", entity_id: null, entity_type: "funnel_event", action: "page_view", traffic_class: "human", ...extra });

function database(tables: Record<string, Row[]>, options: { failTable?: string; failOffset?: number; cap?: number; nullCount?: boolean; drift?: boolean; duplicatePage?: boolean } = {}) {
  const reads: { table: string; columns: string; offset: number; filters: [string, string, unknown][] }[] = [];
  const admin = { from(table: string) {
    let columns = "";
    let offset = 0;
    let end = 0;
    const filters: [string, string, unknown][] = [];
    const chain = {
      select(value: string, config: unknown) { expect(config).toEqual({ count: "exact" }); columns = value; return chain; },
      eq(key: string, value: unknown) { filters.push(["eq", key, value]); return chain; },
      neq(key: string, value: unknown) { filters.push(["neq", key, value]); return chain; },
      is(key: string, value: unknown) { filters.push(["eq", key, value]); return chain; },
      in(key: string, value: unknown) { filters.push(["in", key.replace("metadata->>", ""), value]); return chain; },
      lt(key: string, value: unknown) { filters.push(["lt", key, value]); return chain; },
      gte(key: string, value: unknown) { filters.push(["gte", key, value]); return chain; },
      order(key: string) { expect(key).toBe("id"); return chain; },
      range(start: number, finish: number) { offset = start; end = finish; return chain; },
      abortSignal(signal: AbortSignal) { expect(signal).toBeInstanceOf(AbortSignal); return chain; },
      then(resolve: (result: unknown) => unknown) {
        reads.push({ table, columns, offset, filters });
        if (table === options.failTable && offset === (options.failOffset || 0)) return Promise.resolve(resolve({ data: null, count: null, error: { message: "private-db-detail" } }));
        const filtered = (tables[table] || []).filter((row) => filters.every(([op, key, value]) => {
          if (op === "eq") return row[key] === value;
          if (op === "neq") return row[key] !== value;
          if (op === "in") return (value as unknown[]).includes(row[key]);
          if (op === "lt") return String(row[key]) < String(value);
          return String(row[key]) >= String(value);
        })).sort((a, b) => a.id.localeCompare(b.id));
        const start = options.duplicatePage && offset > 0 ? 0 : offset;
        const selected = filtered.slice(start, start + Math.min(end - offset + 1, options.cap || Infinity));
        const data = selected.map((row) => Object.fromEntries(columns.split(",").map((column) => {
          const key = column.split(":")[0];
          return [key, row[key] ?? null];
        })));
        return Promise.resolve(resolve({ data, count: options.nullCount ? null : filtered.length + (options.drift && offset > 0 ? 1 : 0), error: null }));
      },
    };
    return chain;
  } } as unknown as SupabaseClient;
  return { admin, reads };
}

describe("complete privacy-safe activation aggregates", () => {
  it("paginates beyond 100 events and 200 users/warranties with no silent caps", async () => {
    const profiles = Array.from({ length: 1205 }, (_, index) => profile(`user-${index}`));
    const warranties = Array.from({ length: 1006 }, (_, index) => warranty(`warranty-${index}`, `user-${index}`));
    const activity_log = Array.from({ length: 1108 }, (_, index) => event(`event-${index}`, { actor_id: `user-${index}` }));
    const db = database({ profiles, warranties, activity_log });
    const report = await buildActivationReport(db.admin, now);
    expect(report.complete).toBe(true);
    expect(report.stock.real).toMatchObject({ accounts: 1205, creatorUsers: 1006, warranties: 1006, newAccounts30d: 1205 });
    expect(report.hints.real.total).toBe(1108);
    expect(report.coverage).toEqual({ profiles: 1205, warranties: 1006, events30d: 1108, historicalAutomationEvents: 0 });
    expect(db.reads.filter((read) => read.table === "profiles").map((read) => read.offset)).toEqual([0, 500, 1000]);
    expect(db.reads.every((read) => !read.columns.includes("*") && !read.columns.includes("metadata,"))).toBe(true);
    expect(db.reads.find((read) => read.table === "warranties")?.columns).not.toMatch(/buyer|recipient|seller|issuer/);
    expect(JSON.stringify(report)).not.toMatch(/customer.invalid|user-100|event-100|warranty-100/);
  });

  it("counts only created_by, excludes drafts/deleted rows, and bounds the 30-day window", async () => {
    const db = database({
      profiles: [profile("creator", { created_at: "2026-09-01T00:00:00Z" }), profile("recipient"), profile("seller"), profile("buyer"), profile("future", { created_at: now.toISOString() })],
      warranties: [warranty("real", "creator", { recipient_user_id: "recipient", seller_id: "seller", buyer_id: "buyer" }), warranty("draft", "recipient", { status: "draft" }), warranty("deleted", "seller", { deleted_at: date }), warranty("missing", null)],
      activity_log: [event("start", { created_at: "2026-10-11T12:00:00.000Z" }), event("before", { created_at: "2026-10-11T11:59:59.999Z" }), event("end", { created_at: now.toISOString() })],
    });
    const report = await buildActivationReport(db.admin, now);
    expect(report.period).toEqual({ days: 30, since: "2026-10-11T12:00:00.000Z", until: now.toISOString(), bounds: "[since, until)" });
    expect(report.stock.real).toMatchObject({ accounts: 4, creatorUsers: 1, newAccounts30d: 3, warranties: 1, unattributedWarranties: 0 });
    expect(report.stock.all.unattributedWarranties).toBe(1);
    expect(report.hints.real.total).toBe(1);
  });

  it("excludes exact internal/QA actors and canonical automation without fuzzy email matching", async () => {
    const db = database({
      profiles: [profile("creator", { email: "contest.qahtani@customer.invalid" }), profile("namesake", { email: "abdulaziz@customer.invalid" }), profile("internal", { email: "owner@warrantee.io" }), profile("admin", { role: "admin" }), profile("reserved", { email: "person@example.com" }), profile("qa-actor")],
      warranties: [warranty("real", "creator"), warranty("qa-source", "creator", { source: "seed_fixture" }), warranty("qa-actor-warranty", "qa-actor"), warranty("qa-tracked", "namesake")],
      activity_log: [
        event("real"), event("qa", { actor_id: "qa-actor", traffic_class: "qa", created_at: "2026-09-01T00:00:00Z" }),
        event("qa-tracked", { actor_id: null, action: "warranty_created", entity_id: "qa-tracked", traffic_class: "monitoring", created_at: "2026-09-01T00:00:00Z" }),
        event("crawler", { actor_id: null, traffic_class: "crawler" }), event("monitor", { actor_id: null, traffic_class: "monitoring" }),
        event("internal", { actor_id: "internal" }), event("unclassified", { actor_id: null, traffic_class: null }),
        event("campaign-qa", { actor_id: null, utm_campaign: "codex_qa" }),
      ],
    });
    const report = await buildActivationReport(db.admin, now);
    expect(report.stock.real.accounts).toBe(2);
    expect(report.stock.real.warranties).toBe(1);
    expect(report.hints.real.total).toBe(1);
    expect(report.excluded).toEqual({ accounts: 4, warranties: 3, events: 5 });
    expect(report.coverage.historicalAutomationEvents).toBe(4);
  });

  it("separates backend deduplicated scopes from client success/setup hints and sanitizes legacy text", async () => {
    const db = database({ profiles: [profile("creator")], warranties: [warranty("real", "creator")], activity_log: [
      event("created", { action: "activation_milestone", source: "server_warranty_creation", milestone: "first_warranty_created", entity_id: "private-company" }),
      event("duplicate", { action: "activation_milestone", source: "server_warranty_creation", milestone: "first_warranty_created", entity_id: "private-company" }),
      event("issued", { action: "activation_milestone", source: "server_warranty_creation", milestone: "first_warranty_issued", entity_id: "private-company" }),
      event("forged-client", { action: "activation_milestone", source: "server_funnel", milestone: "first_warranty_created", entity_id: "not-verified" }),
      event("completed", { action: "onboarding_completed", completion_mode: "completed" }),
      event("skipped", { action: "onboarding_completed", completion_mode: "skipped" }),
      event("legacy", { action: "onboarding_completed" }),
      event("private-action", { action: "private@example.invalid", utm_source: "private@example.invalid", utm_campaign: "private-text" }),
      event("registered-campaign", { utm_source: "manual_outreach", utm_medium: "direct", utm_campaign: "seller_pilot_sep_2026" }),
    ] });
    const report = await buildActivationReport(db.admin, now);
    expect(report.verified).toEqual({ firstWarrantyCreatedScopes: 1, firstWarrantyIssuedScopes: 1 });
    expect(report.hints.real.setup).toEqual({ completed: 1, skipped: 1, unknown: 1 });
    expect(report.hints.real.total).toBe(6);
    expect(report.stock.real.setupResolved).toBe(1);
    expect(report.hints.real.campaigns).toEqual([{ source: "manual_outreach", medium: "direct", campaign: "seller_pilot_sep_2026", count: 1, actions: { page_view: 1 } }]);
    expect(JSON.stringify(report)).not.toMatch(/private-company|private@example|private-text|not-verified/);
    expect(report.gaps.join(" ")).toContain("restricting direct authenticated");
  });

  it.each([
    { failTable: "profiles", failOffset: 500 },
    { failTable: "warranties", failOffset: 500 },
    { failTable: "activity_log", failOffset: 500 },
    { cap: 200 }, { nullCount: true }, { drift: true }, { duplicatePage: true },
    { failTable: "warranties" }, { failTable: "activity_log" },
  ])("fails closed on failed, truncated, missing or changing pages: %j", async (options) => {
    const db = database({
      profiles: Array.from({ length: 601 }, (_, index) => profile(`user-${index}`)),
      warranties: Array.from({ length: 601 }, (_, index) => warranty(`warranty-${index}`, `user-${index}`)),
      activity_log: Array.from({ length: 601 }, (_, index) => event(`event-${index}`)),
    }, options);
    await expect(buildActivationReport(db.admin, now)).rejects.toThrow();
  });

  it("returns honest empty counts for a complete empty dataset", async () => {
    const report = await buildActivationReport(database({}).admin, now);
    expect(report.stock.real.accounts).toBe(0);
    expect(report.hints.real.total).toBe(0);
    expect(report.complete).toBe(true);
  });
});
