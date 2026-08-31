import { describe, expect, it } from "vitest";
import {
  filterRealFunnelEvents,
  isPaidSubscriptionSignal,
  isRealFunnelEvent,
} from "@/lib/growth-analytics";

describe("growth analytics", () => {
  const excludedUsers = new Set(["owner-user", "qa-user"]);

  it("keeps privacy-safe human events", () => {
    expect(isRealFunnelEvent({
      metadata: {
        traffic_class: "human",
        utm_source: "linkedin",
        utm_campaign: "seller_outreach",
      },
    }, excludedUsers)).toBe(true);
  });

  it("excludes crawlers, monitoring, QA, and internal actors", () => {
    const events = [
      { id: "human", metadata: { traffic_class: "human" } },
      { id: "crawler", metadata: { traffic_class: "crawler" } },
      { id: "monitoring", metadata: { traffic_class: "monitoring" } },
      { id: "qa-class", metadata: { traffic_class: "qa" } },
      { id: "qa-campaign", metadata: { traffic_class: "human", utm_source: "codex_qa" } },
      { id: "owner", actor_id: "owner-user", metadata: { traffic_class: "human" } },
      { id: "legacy-unclassified", metadata: {} },
    ];

    expect(filterRealFunnelEvents(events, excludedUsers).map((event) => event.id)).toEqual(["human"]);
  });

  it("treats ambiguous or missing classification as non-customer evidence", () => {
    expect(isRealFunnelEvent({ metadata: null }, excludedUsers)).toBe(false);
    expect(isRealFunnelEvent({ metadata: { traffic_class: "" } }, excludedUsers)).toBe(false);
  });

  it("counts only paid subscriptions attached to eligible real users", () => {
    const realUsers = new Set(["real-user"]);

    expect(isPaidSubscriptionSignal({ user_id: "real-user", plan_id: "pro", status: "active" }, realUsers)).toBe(true);
    expect(isPaidSubscriptionSignal({ user_id: "real-user", plan_id: "pro", status: "trialing" }, realUsers)).toBe(true);
    expect(isPaidSubscriptionSignal({ user_id: "real-user", plan_id: "free", status: "active" }, realUsers)).toBe(false);
    expect(isPaidSubscriptionSignal({ user_id: "deleted-user", plan_id: "pro", status: "active" }, realUsers)).toBe(false);
    expect(isPaidSubscriptionSignal({ user_id: "real-user", plan_id: "pro", status: "past_due" }, realUsers)).toBe(false);
  });
});
