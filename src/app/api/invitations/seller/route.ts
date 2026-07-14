import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { Resend } from "resend";
import { upsertCrmContact } from "@/lib/crm";
import { getBusinessInboxBcc, getEmailFromAddress } from "@/lib/email-config";
import { getClientIp, getRateLimitHeaders, rateLimit } from "@/lib/rate-limit";
import { isTrustedSameOriginRequest } from "@/lib/request-origin";
import {
  isInvitationRetryable,
  sendSellerInvitationEmail,
} from "@/lib/seller-invitation-delivery";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isValidEmail, sanitizeString } from "@/lib/validation";

let resend: Resend | null = null;
function getResend() {
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY);
  return resend;
}

export async function POST(request: NextRequest) {
  const rateLimitResult = await rateLimit(getClientIp(request), {
    maxRequests: 10,
    windowMs: 10 * 60 * 1000,
    identifier: "seller-invitation",
  });
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: getRateLimitHeaders(rateLimitResult) },
    );
  }

  if (!isTrustedSameOriginRequest(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const sellerEmail = sanitizeString(String(body.seller_email || ""), 254).toLowerCase();
  const sellerName = body.seller_name ? sanitizeString(String(body.seller_name), 160) : null;
  const sellerPhone = body.seller_phone ? sanitizeString(String(body.seller_phone), 60) : null;
  const warrantyId = typeof body.warranty_id === "string" && body.warranty_id.trim()
    ? sanitizeString(body.warranty_id, 80)
    : null;
  const locale = body.locale === "ar" ? "ar" : "en";

  if (!isValidEmail(sellerEmail)) {
    return NextResponse.json({ error: "A valid seller_email is required" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data: existingSeller, error: sellerLookupError } = await admin
    .from("profiles")
    .select("id")
    .eq("email", sellerEmail)
    .maybeSingle();
  if (sellerLookupError) {
    return NextResponse.json({ error: "Could not check seller registration" }, { status: 500 });
  }
  if (existingSeller) {
    return NextResponse.json({
      error: "Seller is already registered",
      seller_id: existingSeller.id,
    }, { status: 409 });
  }

  const { data: existingInvite, error: inviteLookupError } = await admin
    .from("seller_invitations")
    .select("id, token, status, created_at, last_delivery_attempt_at, delivery_attempts, seller_email, seller_name, seller_phone, delivery_locale")
    .eq("seller_email", sellerEmail)
    .or(`inviter_id.eq.${user.id},invited_by.eq.${user.id}`)
    .in("status", ["pending", "pending_delivery"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (inviteLookupError) {
    return NextResponse.json({ error: "Could not check existing invitations" }, { status: 500 });
  }
  if (existingInvite && !isInvitationRetryable(existingInvite)) {
    return NextResponse.json({
      error: "Invitation delivery is already in progress",
      invitation_id: existingInvite.id,
      retryable: false,
    }, { status: 409 });
  }

  let invitation = existingInvite;
  if (!invitation) {
    const { data, error } = await admin
      .from("seller_invitations")
      .insert({
        inviter_id: user.id,
        invited_by: user.id,
        seller_email: sellerEmail,
        seller_name: sellerName,
        seller_phone: sellerPhone,
        warranty_id: warrantyId,
        delivery_locale: locale,
        status: "pending",
      })
      .select("id, token, status, created_at, last_delivery_attempt_at, delivery_attempts, seller_email, seller_name, seller_phone, delivery_locale")
      .single();
    if (error || !data) {
      return NextResponse.json({ error: error?.message || "Could not create invitation" }, { status: 500 });
    }
    invitation = data;
  }

  const deliveryAttemptAt = new Date().toISOString();
  const { error: attemptStateError } = await admin
    .from("seller_invitations")
    .update({
      status: "pending",
      delivery_attempts: Number(invitation.delivery_attempts || 0) + 1,
      last_delivery_attempt_at: deliveryAttemptAt,
      delivery_error: null,
    })
    .eq("id", invitation.id);
  if (attemptStateError) {
    return NextResponse.json({ error: "Could not start invitation delivery" }, { status: 500 });
  }

  const { data: inviterProfile } = await admin
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .maybeSingle();
  const inviterName = inviterProfile?.full_name || "A customer";
  const effectiveEmail = invitation.seller_email || sellerEmail;
  const effectiveName = invitation.seller_name || sellerName;
  const effectivePhone = invitation.seller_phone || sellerPhone;
  const effectiveLocale = invitation.delivery_locale === "ar" ? "ar" : locale;

  await upsertCrmContact({
    email: effectiveEmail,
    firstname: effectiveName || effectiveEmail,
    phone: effectivePhone,
    lifecycleStage: "lead",
    source: "seller_invitation",
  }).catch((crmError) => {
    console.warn("[Invitation] CRM sync failed", crmError);
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://warrantee.io";
  const inviteUrl = `${appUrl}/${effectiveLocale}/seller/accept-invite?token=${invitation.token}`;

  try {
    const { emailId } = await sendSellerInvitationEmail(getResend(), {
      invitationId: invitation.id,
      sellerEmail: effectiveEmail,
      sellerName: effectiveName,
      inviterName,
      inviteUrl,
      from: getEmailFromAddress(),
      bcc: getBusinessInboxBcc(),
    });
    const { error: sentStateError } = await admin
      .from("seller_invitations")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        resend_email_id: emailId,
        delivery_error: null,
      })
      .eq("id", invitation.id);
    if (sentStateError) {
      console.error("[Invitation] Resend accepted email but state update failed", sentStateError);
      return NextResponse.json({
        error: "Invitation was accepted by the email provider but its status could not be saved",
        invitation_id: invitation.id,
      }, { status: 500 });
    }
    return NextResponse.json({ invitation_id: invitation.id, status: "sent" });
  } catch (emailError) {
    const message = sanitizeString(
      emailError instanceof Error ? emailError.message : String(emailError),
      500,
    );
    console.error("[Invitation] Email delivery failed", emailError);
    const { error: failedStateError } = await admin
      .from("seller_invitations")
      .update({ status: "pending_delivery", delivery_error: message })
      .eq("id", invitation.id);
    if (failedStateError) {
      return NextResponse.json({ error: "Invitation delivery failed and retry state could not be saved" }, { status: 500 });
    }
    return NextResponse.json({
      invitation_id: invitation.id,
      status: "pending_delivery",
      retryable: true,
    }, { status: 202 });
  }
}
