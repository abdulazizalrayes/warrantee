import type { WarranteeAccountType } from "@/lib/plan-config";

export const OAUTH_SIGNUP_INTENT_COOKIE = "warrantee_oauth_signup";
export const OAUTH_SIGNUP_INTENT_MAX_AGE_SECONDS = 10 * 60;

export type OAuthSignupIntent = {
  accountType: WarranteeAccountType;
  companyName: string | null;
  expiresAt: number;
};

export function buildOAuthSignupIntent(input: {
  accountType?: unknown;
  companyName?: unknown;
  now?: number;
}): OAuthSignupIntent | null {
  if (input.accountType !== "consumer" && input.accountType !== "business") {
    return null;
  }

  const companyName =
    typeof input.companyName === "string"
      ? input.companyName.trim().slice(0, 200)
      : "";

  if (input.accountType === "business" && !companyName) {
    return null;
  }

  const now = input.now ?? Date.now();
  return {
    accountType: input.accountType,
    companyName: input.accountType === "business" ? companyName : null,
    expiresAt: now + OAUTH_SIGNUP_INTENT_MAX_AGE_SECONDS * 1_000,
  };
}

export function serializeOAuthSignupIntent(intent: OAuthSignupIntent) {
  return Buffer.from(JSON.stringify(intent), "utf8").toString("base64url");
}

export function parseOAuthSignupIntent(
  value: string | undefined,
  now = Date.now()
): OAuthSignupIntent | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8")
    ) as Partial<OAuthSignupIntent>;
    const intent = buildOAuthSignupIntent({
      accountType: parsed.accountType,
      companyName: parsed.companyName,
      now: parsed.expiresAt
        ? parsed.expiresAt - OAUTH_SIGNUP_INTENT_MAX_AGE_SECONDS * 1_000
        : now,
    });

    if (!intent || parsed.expiresAt !== intent.expiresAt || intent.expiresAt < now) {
      return null;
    }

    return intent;
  } catch {
    return null;
  }
}
