import { describe, it, expect } from "vitest";
import {
  isValidUUID,
  isNonEmptyString,
  isStringInRange,
  isOneOf,
  sanitizeString,
  isValidEmail,
  isValidDate,
  isPositiveNumber,
  validateWarrantyInput,
  validateClaimInput,
  VALID_CLAIM_TYPES,
  VALID_WARRANTY_STATUSES,
} from "../validation";

describe("isValidUUID", () => {
  it("accepts valid UUIDs", () => {
    expect(isValidUUID("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
    expect(isValidUUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")).toBe(true);
  });

  it("rejects invalid UUIDs", () => {
    expect(isValidUUID("not-a-uuid")).toBe(false);
    expect(isValidUUID("")).toBe(false);
    expect(isValidUUID(null)).toBe(false);
    expect(isValidUUID(123)).toBe(false);
  });
});

describe("isNonEmptyString", () => {
  it("accepts non-empty strings", () => {
    expect(isNonEmptyString("hello")).toBe(true);
  });

  it("rejects empty or whitespace-only strings", () => {
    expect(isNonEmptyString("")).toBe(false);
    expect(isNonEmptyString("   ")).toBe(false);
    expect(isNonEmptyString(null)).toBe(false);
    expect(isNonEmptyString(undefined)).toBe(false);
  });
});

describe("isStringInRange", () => {
  it("validates string length within range", () => {
    expect(isStringInRange("hello", 1, 10)).toBe(true);
    expect(isStringInRange("hi", 3, 10)).toBe(false);
    expect(isStringInRange("a".repeat(11), 1, 10)).toBe(false);
  });
});

describe("isOneOf", () => {
  it("validates value is in allowed list", () => {
    expect(isOneOf("active", VALID_WARRANTY_STATUSES)).toBe(true);
    expect(isOneOf("expired", VALID_WARRANTY_STATUSES)).toBe(true);
    expect(isOneOf("invalid", VALID_WARRANTY_STATUSES)).toBe(false);
    expect(isOneOf(123, VALID_WARRANTY_STATUSES)).toBe(false);
  });
});

describe("sanitizeString", () => {
  it("trims whitespace", () => {
    expect(sanitizeString("  hello  ")).toBe("hello");
  });

  it("truncates to max length", () => {
    expect(sanitizeString("a".repeat(300), 200)).toHaveLength(200);
  });

  it("handles short strings", () => {
    expect(sanitizeString("hi", 200)).toBe("hi");
  });
});

describe("isValidEmail", () => {
  it("accepts valid emails", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
    expect(isValidEmail("name+tag@domain.co")).toBe(true);
  });

  it("rejects invalid emails", () => {
    expect(isValidEmail("not-an-email")).toBe(false);
    expect(isValidEmail("@domain.com")).toBe(false);
    expect(isValidEmail("user@")).toBe(false);
    expect(isValidEmail("")).toBe(false);
    expect(isValidEmail(null)).toBe(false);
  });
});

describe("isValidDate", () => {
  it("accepts valid date strings", () => {
    expect(isValidDate("2024-01-15")).toBe(true);
    expect(isValidDate("2024-12-31T23:59:59Z")).toBe(true);
  });

  it("rejects invalid dates", () => {
    expect(isValidDate("not-a-date")).toBe(false);
    expect(isValidDate("")).toBe(false);
    expect(isValidDate(null)).toBe(false);
  });
});

describe("isPositiveNumber", () => {
  it("accepts positive numbers", () => {
    expect(isPositiveNumber(1)).toBe(true);
    expect(isPositiveNumber(0.5)).toBe(true);
  });

  it("rejects non-positive or invalid", () => {
    expect(isPositiveNumber(0)).toBe(false);
    expect(isPositiveNumber(-1)).toBe(false);
    expect(isPositiveNumber(Infinity)).toBe(false);
    expect(isPositiveNumber("5")).toBe(false);
  });
});

describe("validateWarrantyInput", () => {
  it("passes with valid input", () => {
    const result = validateWarrantyInput({
      product_name: "MacBook Pro",
      start_date: "2024-01-01",
      end_date: "2025-01-01",
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("fails when product_name is missing", () => {
    const result = validateWarrantyInput({
      start_date: "2024-01-01",
      end_date: "2025-01-01",
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0].field).toBe("product_name");
  });

  it("fails when end_date is before start_date", () => {
    const result = validateWarrantyInput({
      product_name: "Test",
      start_date: "2025-01-01",
      end_date: "2024-01-01",
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "end_date")).toBe(true);
  });
});

describe("validateClaimInput", () => {
  it("passes with valid input", () => {
    const result = validateClaimInput({
      warranty_id: "550e8400-e29b-41d4-a716-446655440000",
      claim_type: "repair",
      description: "The screen is cracked and needs replacement under warranty.",
    });
    expect(result.valid).toBe(true);
    expect(result.sanitized).toBeDefined();
  });

  it("fails with invalid warranty_id", () => {
    const result = validateClaimInput({
      warranty_id: "bad-id",
      claim_type: "repair",
      description: "The screen is cracked and needs replacement.",
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0].field).toBe("warranty_id");
  });

  it("fails with invalid claim_type", () => {
    const result = validateClaimInput({
      warranty_id: "550e8400-e29b-41d4-a716-446655440000",
      claim_type: "invalid_type",
      description: "A valid description that is long enough.",
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "claim_type")).toBe(true);
  });

  it("fails with short description", () => {
    const result = validateClaimInput({
      warranty_id: "550e8400-e29b-41d4-a716-446655440000",
      claim_type: "repair",
      description: "short",
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "description")).toBe(true);
  });
});
