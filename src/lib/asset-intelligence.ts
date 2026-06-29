export type AssetIntelligenceWarranty = {
  id: string;
  status?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  created_at?: string | null;
  category?: string | null;
  seller_name?: string | null;
  supplier?: string | null;
  purchase_price?: string | number | null;
};

export type AssetIntelligenceClaim = {
  id: string;
  status?: string | null;
  warranty_id?: string | null;
  created_at?: string | null;
};

export type SupplierRiskSignal = {
  supplier: string;
  warranties: number;
  claims: number;
  expiring: number;
  expired: number;
  unpriced: number;
  riskScore: number;
};

export type AssetIntelligenceAction = {
  id: string;
  severity: "high" | "medium" | "low";
  category: "activation" | "renewal" | "claims" | "data_quality" | "supplier_risk";
  title: string;
  description: string;
  metric: number;
};

export type AssetIntelligenceSummary = {
  totalWarranties: number;
  activeWarranties: number;
  expiredWarranties: number;
  expiring30Days: number;
  expiring90Days: number;
  totalClaims: number;
  unresolvedClaims: number;
  coverageValue: number;
  unpricedAssets: number;
  supplierConcentration: number;
  lifecycleHealthScore: number;
  assetRiskScore: number;
  extensionOpportunity: number;
  supplierRiskSignals: SupplierRiskSignal[];
  nextActions: AssetIntelligenceAction[];
};

const unresolvedClaimStatuses = new Set(["pending", "filed", "submitted", "under_review", "open"]);

function parseDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toNumber(value: string | number | null | undefined) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getSupplierName(warranty: AssetIntelligenceWarranty) {
  return warranty.seller_name || warranty.supplier || "Unknown supplier";
}

function buildNextActions(input: {
  totalWarranties: number;
  expiring90Days: number;
  unresolvedClaims: number;
  unpricedAssets: number;
  supplierRiskSignals: SupplierRiskSignal[];
  lifecycleHealthScore: number;
}): AssetIntelligenceAction[] {
  const actions: AssetIntelligenceAction[] = [];

  if (input.totalWarranties === 0) {
    actions.push({
      id: "add_first_warranty",
      severity: "high",
      category: "activation",
      title: "Add the first warranty",
      description: "Activation starts when the account has at least one real warranty record with dates and evidence.",
      metric: 0,
    });
    return actions;
  }

  if (input.expiring90Days > 0) {
    actions.push({
      id: "review_renewal_window",
      severity: input.expiring90Days >= 5 ? "high" : "medium",
      category: "renewal",
      title: "Review warranties expiring in the next 90 days",
      description: "These records are renewal, extension, claim-prevention, or replacement opportunities.",
      metric: input.expiring90Days,
    });
  }

  if (input.unresolvedClaims > 0) {
    actions.push({
      id: "resolve_open_claims",
      severity: "high",
      category: "claims",
      title: "Resolve open claims",
      description: "Unresolved claims create customer trust risk and distort reliability intelligence.",
      metric: input.unresolvedClaims,
    });
  }

  if (input.unpricedAssets > 0) {
    actions.push({
      id: "complete_asset_values",
      severity: input.unpricedAssets / input.totalWarranties >= 0.3 ? "medium" : "low",
      category: "data_quality",
      title: "Complete missing purchase values",
      description: "Coverage exposure, replacement timing, and portfolio value need purchase-price data.",
      metric: input.unpricedAssets,
    });
  }

  const riskiestSupplier = input.supplierRiskSignals[0];
  if (riskiestSupplier && riskiestSupplier.riskScore >= 45) {
    actions.push({
      id: "review_supplier_reliability",
      severity: riskiestSupplier.riskScore >= 70 ? "high" : "medium",
      category: "supplier_risk",
      title: `Review supplier reliability: ${riskiestSupplier.supplier}`,
      description: "Supplier-level claim and expiry pressure can guide procurement, support, and renewal decisions.",
      metric: riskiestSupplier.riskScore,
    });
  }

  if (input.lifecycleHealthScore < 70) {
    actions.push({
      id: "improve_lifecycle_health",
      severity: input.lifecycleHealthScore < 50 ? "high" : "medium",
      category: "data_quality",
      title: "Improve lifecycle health score",
      description: "The portfolio has a mix of expiry, claims, supplier, or data-quality pressure that needs review.",
      metric: input.lifecycleHealthScore,
    });
  }

  return actions.slice(0, 5);
}

export function computeAssetIntelligence(
  warranties: AssetIntelligenceWarranty[],
  claims: AssetIntelligenceClaim[],
  nowInput: Date = new Date()
): AssetIntelligenceSummary {
  const now = nowInput;
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  const totalWarranties = warranties.length;
  const totalClaims = claims.length;
  const claimsByWarranty = claims.reduce((acc: Record<string, number>, claim) => {
    if (claim.warranty_id) acc[claim.warranty_id] = (acc[claim.warranty_id] || 0) + 1;
    return acc;
  }, {});
  const unresolvedClaims = claims.filter((claim) =>
    unresolvedClaimStatuses.has(String(claim.status || "").toLowerCase())
  ).length;

  const activeWarranties = warranties.filter((warranty) => {
    const end = parseDate(warranty.end_date);
    return Boolean(end && end > now && String(warranty.status || "active") !== "cancelled");
  }).length;
  const expiredWarranties = warranties.filter((warranty) => {
    const end = parseDate(warranty.end_date);
    return Boolean((end && end <= now) || warranty.status === "expired");
  }).length;
  const expiring30Days = warranties.filter((warranty) => {
    const end = parseDate(warranty.end_date);
    return Boolean(end && end > now && end <= thirtyDaysFromNow);
  }).length;
  const expiring90Days = warranties.filter((warranty) => {
    const end = parseDate(warranty.end_date);
    return Boolean(end && end > now && end <= ninetyDaysFromNow);
  }).length;
  const coverageValue = warranties.reduce((sum, warranty) => sum + toNumber(warranty.purchase_price), 0);
  const unpricedAssets = warranties.filter((warranty) => toNumber(warranty.purchase_price) <= 0).length;

  const supplierMap: Record<string, SupplierRiskSignal> = {};
  for (const warranty of warranties) {
    const supplier = getSupplierName(warranty);
    const end = parseDate(warranty.end_date);
    if (!supplierMap[supplier]) {
      supplierMap[supplier] = { supplier, warranties: 0, claims: 0, expiring: 0, expired: 0, unpriced: 0, riskScore: 0 };
    }
    supplierMap[supplier].warranties += 1;
    supplierMap[supplier].claims += claimsByWarranty[warranty.id] || 0;
    if (end && end > now && end <= ninetyDaysFromNow) supplierMap[supplier].expiring += 1;
    if (end && end <= now) supplierMap[supplier].expired += 1;
    if (toNumber(warranty.purchase_price) <= 0) supplierMap[supplier].unpriced += 1;
  }

  const supplierRiskSignals = Object.values(supplierMap)
    .map((supplier) => {
      const claimRate = supplier.warranties > 0 ? supplier.claims / supplier.warranties : 0;
      const expiryRate = supplier.warranties > 0 ? supplier.expiring / supplier.warranties : 0;
      const expiredRate = supplier.warranties > 0 ? supplier.expired / supplier.warranties : 0;
      const dataGapRate = supplier.warranties > 0 ? supplier.unpriced / supplier.warranties : 0;
      return {
        ...supplier,
        riskScore: clampScore(claimRate * 45 + expiryRate * 25 + expiredRate * 20 + dataGapRate * 10),
      };
    })
    .sort((a, b) => b.riskScore - a.riskScore || b.warranties - a.warranties)
    .slice(0, 10);

  const topSupplierCount = Math.max(0, ...Object.values(supplierMap).map((supplier) => supplier.warranties));
  const supplierConcentration = totalWarranties > 0 ? clampScore((topSupplierCount / totalWarranties) * 100) : 0;

  const expiryPressure = totalWarranties > 0 ? (expiring90Days / totalWarranties) * 25 : 0;
  const expiredPressure = totalWarranties > 0 ? (expiredWarranties / totalWarranties) * 20 : 0;
  const claimPressure = totalWarranties > 0 ? (unresolvedClaims / totalWarranties) * 30 : 0;
  const dataQualityPressure = totalWarranties > 0 ? (unpricedAssets / totalWarranties) * 15 : 0;
  const supplierPressure = supplierRiskSignals[0] ? supplierRiskSignals[0].riskScore * 0.1 : 0;
  const lifecycleHealthScore = clampScore(
    100 - expiryPressure - expiredPressure - claimPressure - dataQualityPressure - supplierPressure
  );

  const summary = {
    totalWarranties,
    activeWarranties,
    expiredWarranties,
    expiring30Days,
    expiring90Days,
    totalClaims,
    unresolvedClaims,
    coverageValue,
    unpricedAssets,
    supplierConcentration,
    lifecycleHealthScore,
    assetRiskScore: lifecycleHealthScore,
    extensionOpportunity: expiring90Days,
    supplierRiskSignals,
    nextActions: [] as AssetIntelligenceAction[],
  };

  summary.nextActions = buildNextActions({
    totalWarranties,
    expiring90Days,
    unresolvedClaims,
    unpricedAssets,
    supplierRiskSignals,
    lifecycleHealthScore,
  });

  return summary;
}
