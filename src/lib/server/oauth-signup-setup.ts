import type { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { boundedAuthRequest } from "@/lib/auth-request";
import { isNewOAuthSignup, type FlowIntent } from "@/lib/server/oauth-flow-intent";

type Admin = ReturnType<typeof createSupabaseAdminClient>;
type SignupUser = { id: string; created_at: string; app_metadata: { provider?: string } };
export type OAuthSetupStatus = "absent" | "completed" | "already_completed" | "skipped";

export class OAuthSignupRegistrationError extends Error {
  constructor() {
    super("oauth_signup_registration_failed");
  }
}

export async function resumeOAuthSignupSetup(admin: Admin, user: SignupUser, intent: FlowIntent | null): Promise<OAuthSetupStatus> {
  if (intent?.accountType === "business" && intent.companyName && isNewOAuthSignup(user, intent)) {
    try {
      const { error } = await boundedAuthRequest((signal) => admin.rpc("register_oauth_signup_setup", {
        p_user_id: user.id,
        p_company_name: intent.companyName,
        p_provider: intent.provider,
        p_flow_id: intent.flowId,
        p_issued_at: new Date(intent.issuedAt).toISOString(),
      }).abortSignal(signal));
      if (error) throw new OAuthSignupRegistrationError();
    } catch {
      throw new OAuthSignupRegistrationError();
    }
  }

  // The stored owner-bound intent survives expired cookies and later login attempts.
  // The RPC completes onboarding and its terminal marker in the same transaction.
  const { data, error } = await boundedAuthRequest((signal) => admin.rpc("resume_oauth_signup_setup", {
    p_user_id: user.id,
  }).abortSignal(signal));
  if (error || (data !== "absent" && data !== "completed" && data !== "already_completed" && data !== "skipped")) {
    throw new Error("oauth_signup_setup_failed");
  }
  return data;
}
