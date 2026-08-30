import { describe, expect, it } from "vitest";
import {
  isWarrantyLimitError,
  WARRANTY_LIMIT_ERROR_CODE,
  warrantyLimitResponseBody,
} from "@/lib/warranty-entitlements";

describe("warranty entitlements", () => {
  it("recognizes the database quota signal without exposing database details", () => {
    expect(isWarrantyLimitError({ code: "P0001", message: "warranty_limit_reached" })).toBe(true);
    expect(isWarrantyLimitError({ code: "23505", message: "duplicate key" })).toBe(false);
    expect(warrantyLimitResponseBody()).toEqual({
      error: "Warranty limit reached for the current plan.",
      code: WARRANTY_LIMIT_ERROR_CODE,
    });
  });
});
