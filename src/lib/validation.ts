// @ts-nocheck
// Input validation utilities for API routes

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUUID(value: unknown): value is string {
  return typeof value === "string" && UUID_REGEX.test(value);
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function isStringInRange(
  value: unknown,
  min: number,
  max: number
): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  return trimmed.length >= min && trimmed.length <= max;
}

export function isOneOf<T extends string>(
  value: unknown,
  allowed: readonly T[]
): value is T {
  return typeof value === "string" && allowed.includes(value as T);
}

export function sanitizeString(value: string, maxLength = 5000): string {
  return value.trim().slice(0, maxLength);
}

export function isValidEmail(value: unknown): value is string {
  if (typeof value !== "string") return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

export function isValidDate(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const date = new Date(value);
  return !isNaN(date.getTime());
}

export function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && value > 0 && isFinite(value);
}

// Claim types allowed in the system
export const VALID_CLAIM_TYPES = [
  "repair",
  "replacement",
  "refund",
  "inspection",
  "other",
] as const;

export type ClaimType = (typeof VALID_CLAIM_TYPES)[number];

// Warranty statuses
export const VALID_WARRANTY_STATUSES = [
  "active",
  "expired",
  "pending",
  "renewed",
  "cancelled",
] as const;

export type WarrantyStatus = (typeof VALID_WARRANTY_STATUSES)[number];

// Validation result type
export interface ValidationError {
  field: string;
  message: string;
}

export function validateContactInput(body: Record<string, unknown>): {
  valid: boolean;
  errors: ValidationError[];
  sanitized?: {
    name: string;
    email: string;
    company: string | null;
    subject: string;
    message: string;
    phone?: string | null;
    kind?: string;
  };
} {
  const errors: ValidationError[] = [];

  if (!isStringInRange(body.name, 2, 120)) {
    errors.push({ field: "name", message: "Name must be between 2 and 120 characters" });
  }

  if (!isValidEmail(body.email)) {
    errors.push({ field: "email", message: "A valid email address is required" });
  }

  if (!isStringInRange(body.subject, 2, 120)) {
    errors.push({ field: "subject", message: "Subject must be between 2 and 120 characters" });
  }

  if (!isStringInRange(body.message, 10, 4000)) {
    errors.push({ field: "message", message: "Message must be between 10 and 4000 characters" });
  }

  if (body.company !== undefined && body.company !== null && !isStringInRange(String(body.company), 0, 200)) {
    errors.push({ field: "company", message: "Company must be under 200 characters" });
  }

  if (body.phone !== undefined && body.phone !== null && !isStringInRange(String(body.phone), 3, 40)) {
    errors.push({ field: "phone", message: "Phone must be between 3 and 40 characters" });
  }

  if (body.kind !== undefined && body.kind !== null && !isStringInRange(String(body.kind), 2, 60)) {
    errors.push({ field: "kind", message: "Kind must be between 2 and 60 characters" });
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    sanitized: {
      name: sanitizeString(body.name as string, 120),
      email: sanitizeString(body.email as string, 254).toLowerCase(),
      company: body.company ? sanitizeString(String(body.company), 200) : null,
      subject: sanitizeString(body.subject as string, 120),
      message: sanitizeString(body.message as string, 4000),
      phone: body.phone ? sanitizeString(String(body.phone), 40) : null,
      kind: body.kind ? sanitizeString(String(body.kind), 60) : "contact_form",
    },
  };
}

export function validateClaimInput(body: Record<string, unknown>): {
  valid: boolean;
  errors: ValidationError[];
  sanitized?: {
    warranty_id: string;
    claim_type: ClaimType;
    description: string;
  };
} {
  const errors: ValidationError[] = [];

  if (!isValidUUID(body.warranty_id)) {
    errors.push({ field: "warranty_id", message: "Invalid warranty ID format" });
  }

  if (!isOneOf(body.claim_type, VALID_CLAIM_TYPES)) {
    errors.push({
      field: "claim_type",
      message: `Invalid claim type. Must be one of: ${VALID_CLAIM_TYPES.join(", ")}`,
    });
  }

  if (!isStringInRange(body.description, 10, 2000)) {
    errors.push({
      field: "description",
      message: "Description must be between 10 and 2000 characters",
    });
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    sanitized: {
      warranty_id: body.warranty_id as string,
      claim_type: body.claim_type as ClaimType,
      description: sanitizeString(body.description as string, 2000),
    },
  };
}

export function validateWarrantyInput(body: Record<string, unknown>): {
  valid: boolean;
  errors: ValidationError[];
} {
  const errors: ValidationError[] = [];

  if (!isNonEmptyString(body.product_name)) {
    errors.push({ field: "product_name", message: "Product name is required" });
  } else if (!isStringInRange(body.product_name, 1, 200)) {
    errors.push({ field: "product_name", message: "Product name must be under 200 characters" });
  }

  if (body.brand !== undefined && !isStringInRange(body.brand, 1, 200)) {
    errors.push({ field: "brand", message: "Brand must be under 200 characters" });
  }

  if (body.start_date && !isValidDate(body.start_date)) {
    errors.push({ field: "start_date", message: "Invalid start date format" });
  }

  if (body.end_date && !isValidDate(body.end_date)) {
    errors.push({ field: "end_date", message: "Invalid end date format" });
  }

  if (body.start_date && body.end_date && isValidDate(body.start_date) && isValidDate(body.end_date)) {
    if (new Date(body.end_date as string) <= new Date(body.start_date as string)) {
      errors.push({ field: "end_date", message: "End date must be after start date" });
    }
  }

  if (body.description && !isStringInRange(body.description, 0, 5000)) {
    errors.push({ field: "description", message: "Description must be under 5000 characters" });
  }

  return { valid: errors.length === 0, errors };
}
