import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { sendEmail, welcomeEmail } from "@/lib/email";
import { upsertHubSpotContact } from "@/lib/hubspot";
import { getContentLocale, normalizeLocale, type Locale } from "@/lib/i18n";

function getLocaleFromPath(path: string | null): Locale {
  return normalizeLocale(path?.split("/").filter(Boolean)[0]);
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams?.get("code");
  const requestedNext = searchParams?.get("next");
  const fallbackLocale = getLocaleFromPath(requestedNext);
  const next =
    requestedNext && requestedNext.startsWith("/") && !requestedNext.startsWith("//")
      ? requestedNext
      : `/${fallbackLocale}/dashboard`;

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Send welcome email to new users
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
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

            await upsertHubSpotContact({
              email: profile.email || user.email || "",
              firstname: profile.full_name || profile.email || user.email || "User",
              lifecycleStage: "subscriber",
            }).catch((error) => {
              console.warn("HubSpot signup sync error:", error);
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

      return NextResponse.redirect(new URL(next, origin));
    }
  }

  return NextResponse.redirect(new URL(`/${fallbackLocale}/auth?error=auth_callback_error`, origin));
}
