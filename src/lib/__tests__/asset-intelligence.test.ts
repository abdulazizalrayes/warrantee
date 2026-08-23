import { describe, expect, it } from "vitest";
import { computeAssetIntelligence } from "../asset-intelligence";

describe("asset intelligence", () => {
  const now = new Date("2026-06-29T00:00:00Z");

  it("turns warranties and claims into lifecycle health signals", () => {
    const result = computeAssetIntelligence(
      [
        {
          id: "w1",
          status: "active",
          end_date: "2026-07-10",
          seller_name: "Supplier A",
          purchase_price: 1200,
        },
        {
          id: "w2",
          status: "active",
          end_date: "2026-08-15",
          seller_name: "Supplier A",
          purchase_price: null,
        },
        {
          id: "w3",
          status: "expired",
          end_date: "2026-05-01",
          seller_name: "Supplier B",
          purchase_price: 700,
        },
      ],
      [
        { id: "c1", warranty_id: "w1", status: "pending" },
        { id: "c2", warranty_id: "w3", status: "approved" },
      ],
      now
    );

    expect(result.totalWarranties).toBe(3);
    expect(result.activeWarranties).toBe(2);
    expect(result.expiredWarranties).toBe(1);
    expect(result.expiring30Days).toBe(1);
    expect(result.expiring90Days).toBe(2);
    expect(result.unresolvedClaims).toBe(1);
    expect(result.coverageValue).toBe(1900);
    expect(result.unpricedAssets).toBe(1);
    expect(result.supplierConcentration).toBe(67);
    expect(result.lifecycleHealthScore).toBeNull();
    expect(result.evidenceStatus).toBe("insufficient_evidence");
    expect(result.supplierRiskSignals[0]?.riskScore).toBeNull();
    const supplierB = result.supplierRiskSignals.find((signal) => signal.supplier === "Supplier B");
    expect(supplierB?.expired).toBe(1);
    expect(result.nextActions.map((action) => action.id)).toContain("review_renewal_window");
    expect(result.nextActions.map((action) => action.id)).toContain("resolve_open_claims");
  });

  it("prioritizes first-value activation when the account has no warranties", () => {
    const result = computeAssetIntelligence([], [], now);

    expect(result.lifecycleHealthScore).toBeNull();
    expect(result.nextActions).toEqual([
      expect.objectContaining({
        id: "add_first_warranty",
        severity: "high",
        category: "activation",
      }),
    ]);
  });

  it("only publishes scored intelligence after the evidence threshold is met", () => {
    const warranties = Array.from({ length: 10 }, (_, index) => ({
      id: `w${index}`,
      status: "active",
      end_date: index < 2 ? "2026-07-10" : "2027-07-10",
      seller_name: index < 5 ? "Supplier A" : "Supplier B",
      purchase_price: 1000,
    }));

    const result = computeAssetIntelligence(warranties, [], now);

    expect(result.evidenceStatus).toBe("eligible");
    expect(result.lifecycleHealthScore).toEqual(expect.any(Number));
    expect(result.assetRiskScore).toBe(100 - (result.lifecycleHealthScore ?? 0));
    expect(result.supplierRiskSignals.every((signal) => signal.riskScore !== null)).toBe(true);
  });
});
