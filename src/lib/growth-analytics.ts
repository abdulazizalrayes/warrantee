export type FunnelEventLike = {
  actor_id?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type SubscriptionSignalLike = {
  user_id?: string | null;
  plan_id?: string | null;
  status?: string | null;
};

const syntheticCampaignMarker = /(?:^|[_-])(?:qa|test|seed|synthetic|monitoring|codex)(?:[_-]|$)/i;

function metadataText(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === "string" ? value.trim() : "";
}

export function isRealFunnelEvent(
  event: FunnelEventLike,
  excludedUserIds: ReadonlySet<string>,
) {
  if (event.actor_id && excludedUserIds.has(String(event.actor_id))) return false;

  const metadata = event.metadata || {};
  if (metadataText(metadata, "traffic_class") !== "human") return false;

  return ["utm_source", "utm_medium", "utm_campaign", "utm_content", "ref"]
    .every((key) => !syntheticCampaignMarker.test(metadataText(metadata, key)));
}

export function filterRealFunnelEvents<T extends FunnelEventLike>(
  events: T[],
  excludedUserIds: ReadonlySet<string>,
) {
  return events.filter((event) => isRealFunnelEvent(event, excludedUserIds));
}

export function isPaidSubscriptionSignal(
  subscription: SubscriptionSignalLike,
  eligibleUserIds?: ReadonlySet<string>,
) {
  const status = String(subscription.status || "").toLowerCase();
  const planId = String(subscription.plan_id || "").toLowerCase();
  const userId = String(subscription.user_id || "");

  if (!['active', 'trialing'].includes(status)) return false;
  if (!planId || planId === 'free') return false;
  if (eligibleUserIds && (!userId || !eligibleUserIds.has(userId))) return false;
  return true;
}
