// @ts-nocheck

import { isValidEmail, sanitizeString } from "@/lib/validation";

const RESERVED_OR_RISKY_DOMAINS = new Set([
  "example.com",
  "example.net",
  "example.org",
  "localhost",
  "test.com",
  "test.local",
  "mailinator.com",
  "tempmail.com",
  "yopmail.com",
  "guerrillamail.com",
  "sharklasers.com",
]);

const DEFAULT_COOLDOWN_MS = 90 * 1000;

export function normalizeAuthEmail(value: string) {
  return sanitizeString(String(value || ""), 254).toLowerCase();
}

export function getAuthEmailSafetyError(
  value: string,
  options?: { allowedEmails?: string[] }
) {
  const email = normalizeAuthEmail(value);

  if (!isValidEmail(email)) {
    return "Please enter a valid email address.";
  }

  const [, domain = ""] = email.split("@");
  const normalizedAllowed =
    options?.allowedEmails?.map((allowed) => normalizeAuthEmail(allowed)) ?? [];

  if (normalizedAllowed.length > 0 && !normalizedAllowed.includes(email)) {
    return "This email is not authorized for this access path.";
  }

  if (RESERVED_OR_RISKY_DOMAINS.has(domain)) {
    return "Please use your real email address to continue.";
  }

  if (domain.startsWith("example.") || domain.endsWith(".invalid")) {
    return "Please use your real email address to continue.";
  }

  return null;
}

function getCooldownKey(email: string, purpose: string) {
  return `warrantee:auth-email:${purpose}:${normalizeAuthEmail(email)}`;
}

export function getAuthEmailCooldownSeconds(email: string, purpose: string, cooldownMs = DEFAULT_COOLDOWN_MS) {
  if (typeof window === "undefined") return 0;

  try {
    const raw = window.localStorage.getItem(getCooldownKey(email, purpose));
    if (!raw) return 0;

    const sentAt = Number(raw);
    if (!Number.isFinite(sentAt)) return 0;

    const remainingMs = sentAt + cooldownMs - Date.now();
    return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0;
  } catch {
    return 0;
  }
}

export function rememberAuthEmailSend(email: string, purpose: string) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(getCooldownKey(email, purpose), String(Date.now()));
  } catch {
    // Ignore localStorage failures.
  }
}

export function buildAuthEmailErrorMessage(email: string, purpose: string, options?: { allowedEmails?: string[] }) {
  const safetyError = getAuthEmailSafetyError(email, options);
  if (safetyError) return safetyError;

  const remainingSeconds = getAuthEmailCooldownSeconds(email, purpose);
  if (remainingSeconds > 0) {
    return `Please wait ${remainingSeconds} seconds before requesting another email.`;
  }

  return null;
}
