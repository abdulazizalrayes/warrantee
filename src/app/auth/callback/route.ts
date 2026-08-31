import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { sendEmail, welcomeEmail } from "@/lib/email";
import { upsertCrmContact } from "@/lib/crm";
import { getContentLocale, normalizeLocale, type Locale } from "@/lib/i18n";
import {
  OAUTH_SIGNUP_INTENT_COOKIE,
  parseOAuthSignupIntent,
} from "@/lib/oauth-signup-intent";
import { resolveSafeAuthRedirect } from "@/lib/auth-redirect";

function getLocaleFromPath(path: string | null): Locale {
  return normalizeLocale(path?.split("/").filter(Boolean)[0]);
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams?.get("code");
  const requestedNext = searchParams?.get("next");
  const fallbackLocale = getLocaleFromPath(requestedNext);
  const next = resolveSafeAuthRedirect(
    requestedNext,
    `/${fallbackLocale}/dashboard`,
  );

  if (!code) {
    const missingCodeResponse = NextResponse.redirect(
      new URL(`/${fallbackLocale}/auth?error=auth_callback_error`, origin),
    );
    missingCodeResponse.cookies.delete(OAUTH_SIGNUP_INTENT_COOKIE);
    return missingCodeResponse;
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    const exchangeErrorResponse = NextResponse.redirect(
      new URL(`/${fallbackLocale}/auth?error=auth_callback_error`, origin),
    );
    exchangeErrorResponse.cookies.delete(OAUTH_SIGNUP_INTENT_COOKIE);
    return exchangeErrorResponse;
  }

      const signupIntent = parseOAuthSignupIntent(
        request.cookies.get(OAUTH_SIGNUP_INTENT_COOKIE)?.value
      );

      // Send welcome email to new users
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          if (signupIntent?.accountType === "business" && signupIntent.companyName) {
            const supabaseAdmin = createSupabaseAdminClient();
            const { error: onboardingError } = await supabaseAdmin.rpc(
              "complete_business_onboarding",
              {
                p_user_id: user.id,
                p_company_name: signupIntent.companyName,
              }
            );
            if (onboardingError) {
              console.error("Business OAuth onboarding error:", onboardingError.message);
              const failedResponse = NextResponse.redirect(
                new URL(`/${fallbackLocale}/auth?error=business_setup_error&tab=signup`, origin)
              );
              failedResponse.cookies.delete(OAUTH_SIGNUP_INTENT_COOKIE);
              return failedResponse;
            }
          }

          const { data: profile } = await supabase
            .from("profiles")
            .select("created_at, email, full_name")
            .eq("id", user.id)
            .single();

          if (profile) {
            const createdAt = new Date(profile.created_at);
            const now = new Date();
            const diffMinutes =
              (now.getTime() - createdAt.getTime()) / (1000 * 60);

            await upsertCrmContact({
              email: profile.email || user.email || "",
              firstname: profile.full_name || profile.email || user.email || "User",
              lifecycleStage: "subscriber",
              source: "signup",
            }).catch((error) => {
              console.warn("CRM signup sync error:", error);
            });

            // If profile was created within last 5 minutes, send welcome email
            if (diffMinutes <= 5) {
              const email = profile.email || user.email || "";
              const name =
                profile.full_name || email.split("@")[0] || "User";
              const { subject, html } = welcomeEmail(name, getContentLocale(getLocaleFromPath(next)));
              await sendEmail({ to: email, subject, html });
            }
          }
        }
      } catch (e) {
        // Don't block auth flow if welcome email fails
        console.error("Welcome email error:", e);
      }

      const successResponse = NextResponse.redirect(new URL(next, origin));
      successResponse.cookies.delete(OAUTH_SIGNUP_INTENT_COOKIE);
      return successResponse;
}
