export const PUBLIC_WARRANTY_STATUSES = [
  "active",
  "claimed",
  "expired",
  "cancelled",
  "renewed",
] as const;

export function maskPublicSerialNumber(value: string | null | undefined) {
  if (!value) return null;
  const normalized = value.trim();
  if (normalized.length <= 4) return "*".repeat(normalized.length);
  return `${"*".repeat(Math.min(normalized.length - 4, 8))}${normalized.slice(-4)}`;
}
