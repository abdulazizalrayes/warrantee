import { describe, expect, it } from "vitest";

import {
  buildWarrantyAccessOrClause,
  buildWarrantyOwnershipInsert,
} from "@/lib/warranty-access";

describe("warranty access helpers", () => {
  it("builds an ownership OR clause across all supported fields", () => {
    expect(buildWarrantyAccessOrClause("user-123")).toBe(
      [
        "user_id.eq.user-123",
        "created_by.eq.user-123",
        "recipient_user_id.eq.user-123",
        "buyer_id.eq.user-123",
        "seller_id.eq.user-123",
        "issuer_user_id.eq.user-123",
      ].join(",")
    );
  });

  it("creates ownership insert defaults for new warranties", () => {
    expect(buildWarrantyOwnershipInsert("user-123")).toEqual({
      user_id: "user-123",
      created_by: "user-123",
      issuer_user_id: "user-123",
    });
  });
});
