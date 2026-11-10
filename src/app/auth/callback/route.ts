import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { after, NextRequest, NextResponse } from "next/server";
import { normalizeLocale, type Locale } from "@/lib/i18n";
import {
  OAUTH_SIGNUP_INTENT_COOKIE,
} from "@/lib/oauth-signup-intent";
import { resolveSafeAuthRedirect } from "@/lib/auth-redirect";
import { bindOAuthFlowIntentToUser, expireOAuthIntent, isNewOAuthSignup, readOAuthFlowIntent, setOAuthIntent } from "@/lib/server/oauth-flow-intent";
import { enqueueAuthFollowupJobs, processAuthFollowupJobs } from "@/lib/server/auth-followup-jobs";
import { OAuthSignupRegistrationError, resumeOAuthSignupSetup, type OAuthSetupStatus } from "@/lib/server/oauth-signup-setup";
import { boundedAuthRequest } from "@/lib/auth-request";
import { buildOAuthSetupErrorPath } from "@/lib/oauth-setup-recovery";

function getLocaleFromPath(path: string | null): Locale {
  return normalizeLocale(path?.split("/").filter(Boolean)[0]);
}

async function enqueueFollowups(admin: ReturnType<typeof createSupabaseAdminClient>, userId: string, locale: string) {
  await enqueueAuthFollowupJobs(admin, userId, locale);
  // The durable queue is authoritative; after() is only a low-latency first attempt.
  after(async () => {
    try {
      await processAuthFollowupJobs(admin, userId);
    } catch {
      console.error("Auth follow-up processing deferred to maintenance");
    }
  });
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams?.get("code");
  const retrySetup = !code && searchParams.get("retry_setup") === "1";
  const requestedNext = searchParams?.get("next");
  const fallbackLocale = getLocaleFromPath(requestedNext);
  const next = resolveSafeAuthRedirect(
    requestedNext,
    `/${fallbackLocale}/dashboard`,
  );

  const redirect = (path: string) => expireOAuthIntent(NextResponse.redirect(new URL(path, origin)));
  const callbackError = `/${fallbackLocale}/auth?error=auth_callback_error`;
  const expiredSetup = `/${fallbackLocale}/auth?error=business_setup_expired&tab=signup`;
  if (!code && !retrySetup) return redirect(callbackError);
  try {
    const supabase = await createServerSupabaseClient();
    if (code) {
      const { error } = await boundedAuthRequest(() => supabase.auth.exchangeCodeForSession(code));
      if (error) return redirect(callbackError);
    }
    const { data: { user }, error: userError } = await boundedAuthRequest(() => supabase.auth.getUser());
    if (userError || !user) return redirect(callbackError);

    // Explicit recovery reuses only the original signed intent or a durable job.
    const signedIntent = readOAuthFlowIntent(
      request.cookies.get(OAUTH_SIGNUP_INTENT_COOKIE)?.value,
      searchParams.get("signup_flow"), next,
    );
    const intent = retrySetup && signedIntent?.userId !== user.id ? null : signedIntent;
    const setupError = buildOAuthSetupErrorPath(fallbackLocale, next, intent?.flowId);
    let setupStatus: OAuthSetupStatus = "absent";
    const oauthProvider = user.app_metadata.provider === "google" || user.app_metadata.provider === "apple";
    if (oauthProvider) {
      try {
        setupStatus = await resumeOAuthSignupSetup(createSupabaseAdminClient(), user, intent);
      } catch (error) {
        // Until registration is durable, retain the signed intent for a retry.
        if (error instanceof OAuthSignupRegistrationError) {
          const remainingSeconds = intent ? Math.floor((intent.expiresAt - Date.now()) / 1000) : 0;
          if (!intent || remainingSeconds <= 0) {
            return redirect(expiredSetup);
          }
          return setOAuthIntent(NextResponse.redirect(new URL(setupError, origin)), bindOAuthFlowIntentToUser(intent, user.id), remainingSeconds);
        }
        return redirect(setupError);
      }
    }
    if (retrySetup && setupStatus === "absent") return redirect(expiredSetup);
    if (searchParams.has("signup_flow") && !intent && setupStatus === "absent") {
      return redirect(`/${fallbackLocale}/auth?error=signup_intent_error&tab=signup`);
    }
    const newSignup = intent && isNewOAuthSignup(user, intent);
    if (newSignup || setupStatus === "completed" || setupStatus === "already_completed") {
      const admin = createSupabaseAdminClient();
      try {
        await enqueueFollowups(admin, user.id, fallbackLocale);
      } catch {
        // Auth succeeded; enqueue failure must not be mislabeled as auth failure.
        console.error("Auth follow-up enqueue failed");
      }
    } else if (!searchParams.has("signup_flow")) {
      const created = Date.parse(user.created_at);
      const confirmed = Date.parse(user.email_confirmed_at || "");
      if (user.app_metadata.provider === "email" && created <= confirmed &&
        confirmed <= Date.now() && Date.now() - confirmed < 60_000 &&
        Date.now() - created < 5 * 60_000) {
        try {
          await enqueueFollowups(createSupabaseAdminClient(), user.id, fallbackLocale);
        } catch {
          console.error("Auth follow-up enqueue failed");
        }
      }
    }
    return redirect(next);
  } catch {
    return redirect(callbackError);
  }
}
