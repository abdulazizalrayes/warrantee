export type ExtensionPolicySource =
  | "none"
  | "seller"
  | "platform"
  | "third_party"
  | "seller_then_platform";

export type ExtensionPolicyStatus =
  | "not_configured"
  | "pending"
  | "approved"
  | "rejected";

export type ExtensionPricingMode =
  | "quote_required"
  | "fixed_price"
  | "admin_review";

export type ExtensionUnderwritingStatus =
  | "not_started"
  | "requires_review"
  | "approved"
  | "rejected";

export type ExtensionPolicyRecord = {
  source: ExtensionPolicySource;
  status: ExtensionPolicyStatus;
  providerLabel?: string | null;
  providerEmail?: string | null;
  providerReference?: string | null;
  pricingMode?: ExtensionPricingMode;
  price?: number | null;
  currency?: string | null;
  coverageTerms?: string | null;
  underwritingStatus?: ExtensionUnderwritingStatus;
  slaHours?: number | null;
  notes?: string | null;
  configuredAt?: string | null;
  configuredBy?: string | null;
};

type SupabaseLike = {
  from: (table: string) => any;
};

export function getDefaultExtensionPolicy(): ExtensionPolicyRecord {
  return {
    source: "none",
    status: "not_configured",
    providerLabel: null,
    providerEmail: null,
    providerReference: null,
    pricingMode: "quote_required",
    price: null,
    currency: null,
    coverageTerms: null,
    underwritingStatus: "not_started",
    slaHours: null,
    notes: null,
    configuredAt: null,
    configuredBy: null,
  };
}

export function parseExtensionPolicyMetadata(metadata: any): ExtensionPolicyRecord {
  const fallback = getDefaultExtensionPolicy();
  if (!metadata || typeof metadata !== "object") return fallback;

  const source = metadata.source;
  const status = metadata.status;
  const pricingMode = metadata.pricingMode;
  const underwritingStatus = metadata.underwritingStatus;
  const price = Number(metadata.price);
  const slaHours = Number(metadata.slaHours);

  return {
    source:
      source === "seller" ||
      source === "platform" ||
      source === "third_party" ||
      source === "seller_then_platform" ||
      source === "none"
        ? source
        : fallback.source,
    status:
      status === "pending" ||
      status === "approved" ||
      status === "rejected" ||
      status === "not_configured"
        ? status
        : fallback.status,
    providerLabel: typeof metadata.providerLabel === "string" ? metadata.providerLabel : null,
    providerEmail: typeof metadata.providerEmail === "string" ? metadata.providerEmail : null,
    providerReference: typeof metadata.providerReference === "string" ? metadata.providerReference : null,
    pricingMode:
      pricingMode === "fixed_price" ||
      pricingMode === "admin_review" ||
      pricingMode === "quote_required"
        ? pricingMode
        : fallback.pricingMode,
    price: Number.isFinite(price) && price > 0 ? price : null,
    currency: typeof metadata.currency === "string" && metadata.currency.trim()
      ? metadata.currency.trim().toUpperCase()
      : null,
    coverageTerms: typeof metadata.coverageTerms === "string" ? metadata.coverageTerms : null,
    underwritingStatus:
      underwritingStatus === "requires_review" ||
      underwritingStatus === "approved" ||
      underwritingStatus === "rejected" ||
      underwritingStatus === "not_started"
        ? underwritingStatus
        : fallback.underwritingStatus,
    slaHours: Number.isFinite(slaHours) && slaHours > 0 ? slaHours : null,
    notes: typeof metadata.notes === "string" ? metadata.notes : null,
    configuredAt: typeof metadata.configuredAt === "string" ? metadata.configuredAt : null,
    configuredBy: typeof metadata.configuredBy === "string" ? metadata.configuredBy : null,
  };
}

export function isApprovedFallbackPolicy(policy: ExtensionPolicyRecord | null | undefined) {
  if (!policy || policy.status !== "approved") return false;
  return (
    policy.source === "platform" ||
    policy.source === "third_party" ||
    policy.source === "seller_then_platform"
  );
}

export function hasApprovedPricedProvider(policy: ExtensionPolicyRecord | null | undefined) {
  return Boolean(
    isApprovedFallbackPolicy(policy) &&
      policy?.pricingMode === "fixed_price" &&
      policy.underwritingStatus === "approved" &&
      typeof policy.price === "number" &&
      policy.price > 0
  );
}

export async function getLatestExtensionPolicy(
  supabase: SupabaseLike,
  warrantyId: string
): Promise<ExtensionPolicyRecord> {
  const { data } = await supabase
    .from("activity_log")
    .select("metadata, created_at, actor_id")
    .eq("entity_type", "warranty")
    .eq("entity_id", warrantyId)
    .eq("action", "extension_policy_set")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return getDefaultExtensionPolicy();

  return parseExtensionPolicyMetadata({
    ...data.metadata,
    configuredAt: data.created_at,
    configuredBy: data.actor_id,
  });
}
