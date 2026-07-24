import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";
import { getClientIp, getRateLimitHeaders, webhookRateLimit } from "@/lib/rate-limit";
import { PLANS } from "@/lib/stripe";

function getSupabaseAdmin() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

type SupabaseAdminClient = SupabaseClient<Database>;

type SubscriptionLike = Stripe.Subscription & {
  current_period_start?: number | null;
  current_period_end?: number | null;
  cancel_at_period_end?: boolean | null;
  trial_start?: number | null;
  trial_end?: number | null;
};

function objectId(value: string | { id?: string } | null | undefined) {
  if (!value) return null;
  return typeof value === "string" ? value : value.id || null;
}

function timestampToIso(value: number | null | undefined) {
  return value ? new Date(value * 1000).toISOString() : null;
}

function planLimits(planId: string) {
  const plan = PLANS[planId as keyof typeof PLANS] || PLANS.free;
  return {
    warranty_limit: plan.warranty_limit,
    team_limit: plan.team_limit,
  };
}

async function fulfillVerifiedExtensionPayment(
  supabaseAdmin: SupabaseAdminClient,
  input: {
    extensionId: string;
    userId: string;
    amountPaidMinor: number | null;
    currency?: string | null;
    source: string;
    checkoutSessionId?: string | null;
    paymentIntentId?: string | null;
  }
) {
  if (!input.amountPaidMinor || !input.currency) {
    throw new Error("Stripe payment amount or currency was missing");
  }

  const { error } = await supabaseAdmin.rpc("fulfill_warranty_extension_payment", {
    p_extension_id: input.extensionId,
    p_user_id: input.userId,
    p_amount_paid_minor: input.amountPaidMinor,
    p_currency: input.currency,
    p_source: input.source,
    p_checkout_session_id: input.checkoutSessionId || "",
    p_payment_intent_id: input.paymentIntentId || "",
  });

  if (error) {
    if (error.message.includes("extension_payment_amount_mismatch")) {
      throw new Error("Stripe payment amount did not match extension offer");
    }
    if (error.message.includes("extension_payment_currency_mismatch")) {
      throw new Error("Stripe payment currency did not match extension offer");
    }
    throw error;
  }
}

async function recordExtensionPaymentException(
  supabaseAdmin: SupabaseAdminClient,
  extensionId: string,
  status: "refunded" | "disputed",
  eventId: string
) {
  const { error } = await supabaseAdmin.rpc(
    "record_warranty_extension_payment_exception",
    {
      p_extension_id: extensionId,
      p_status: status,
      p_event_id: eventId,
    }
  );
  if (error) throw error;
}

async function upsertSubscriptionState(
  supabaseAdmin: SupabaseAdminClient,
  input: {
    userId: string;
    planId: string;
    status: string;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    trialStart: string | null;
    trialEnd: string | null;
    cancelAtPeriodEnd: boolean;
    metadata?: Json;
  }
) {
  const { error } = await supabaseAdmin
    .from("subscriptions")
    .upsert(
      {
        user_id: input.userId,
        plan_id: input.planId,
        status: input.status,
        stripe_customer_id: input.stripeCustomerId,
        stripe_subscription_id: input.stripeSubscriptionId,
        current_period_start: input.currentPeriodStart,
        current_period_end: input.currentPeriodEnd,
        trial_start: input.trialStart,
        trial_end: input.trialEnd,
        cancel_at_period_end: input.cancelAtPeriodEnd,
        ...planLimits(input.planId),
        metadata: input.metadata || {},
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  if (error) throw error;
}

async function syncStripeSubscription(
  supabaseAdmin: SupabaseAdminClient,
  subscription: SubscriptionLike,
  fallbackUserId?: string | null,
  fallbackPlanId?: string | null,
) {
  const userId = subscription.metadata?.user_id || fallbackUserId;
  if (!userId) return;

  const planId = subscription.metadata?.plan_id || fallbackPlanId || "pro";
  await upsertSubscriptionState(supabaseAdmin, {
    userId,
    planId,
    status: subscription.status,
    stripeCustomerId: objectId(subscription.customer),
    stripeSubscriptionId: subscription.id,
    currentPeriodStart: timestampToIso(subscription.current_period_start),
    currentPeriodEnd: timestampToIso(subscription.current_period_end),
    trialStart: timestampToIso(subscription.trial_start),
    trialEnd: timestampToIso(subscription.trial_end),
    cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
    metadata: subscription.metadata as Json,
  });
}

async function claimEvent(eventId: string, supabaseAdmin: SupabaseAdminClient) {
  const { data, error } = await supabaseAdmin.rpc("claim_stripe_webhook_event", {
    p_event_id: eventId,
  });
  if (error) throw error;
  return data === true;
}

async function completeEvent(eventId: string, supabaseAdmin: SupabaseAdminClient) {
  const { data, error } = await supabaseAdmin.rpc("complete_stripe_webhook_event", {
    p_event_id: eventId,
  });
  if (error || data !== true) throw error || new Error("Stripe webhook event was not claimed");
}

async function failEvent(eventId: string, supabaseAdmin: SupabaseAdminClient) {
  await supabaseAdmin.rpc("fail_stripe_webhook_event", {
    p_event_id: eventId,
    p_error: "webhook_processing_failed",
  });
}

export async function POST(request: Request) {
  const rateLimitResult = await webhookRateLimit(getClientIp(request));
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: "Too many webhook attempts" },
      { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("Stripe webhook secret is not configured");
    return NextResponse.json({ error: "Webhook is not configured" }, { status: 503 });
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    );
  } catch {
    // Log signature failures without exposing internal details
    console.warn("Webhook signature verification failed");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdmin();

  let claimed = false;
  try {
    claimed = await claimEvent(event.id, supabaseAdmin);
  } catch {
    console.warn("Stripe webhook event claim failed");
    return NextResponse.json({ error: "Webhook processing unavailable" }, { status: 503 });
  }

  if (!claimed) {
    return NextResponse.json({ received: true, deduplicated: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.metadata?.user_id;
        const extensionId = session.metadata?.extension_id;

        // Billing state must not grant application roles. Admin/seller access is
        // controlled by invitation and team-management flows, not Stripe metadata.

        if (extensionId) {
          if (!userId) {
            throw new Error("Stripe extension payment was missing its user");
          }
          await fulfillVerifiedExtensionPayment(supabaseAdmin, {
            extensionId,
            userId,
            amountPaidMinor: session.amount_total ?? null,
            currency: session.currency,
            source: "checkout.session.completed",
            checkoutSessionId: session.id,
            paymentIntentId: objectId(session.payment_intent),
          });
        }

        const subscriptionId = objectId(session.subscription);
        if (userId && subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          await syncStripeSubscription(
            supabaseAdmin,
            subscription as SubscriptionLike,
            userId,
            session.metadata?.plan_id || null
          );
        }
        break;
      }

      case "customer.subscription.updated": {
        await syncStripeSubscription(supabaseAdmin, event.data.object as SubscriptionLike);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        const metadata = invoice.metadata;

        if (metadata?.extension_id) {
          if (!metadata.user_id) {
            throw new Error("Stripe extension invoice was missing its user");
          }
          await fulfillVerifiedExtensionPayment(supabaseAdmin, {
            extensionId: metadata.extension_id,
            userId: metadata.user_id,
            amountPaidMinor: invoice.amount_paid ?? null,
            currency: invoice.currency,
            source: "invoice.payment_succeeded",
          });
        }
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object;
        const extensionId = charge.metadata?.extension_id;
        if (extensionId) {
          await recordExtensionPaymentException(
            supabaseAdmin,
            extensionId,
            "refunded",
            event.id
          );
        }
        break;
      }

      case "charge.dispute.created": {
        const dispute = event.data.object;
        const chargeId = objectId(dispute.charge);
        if (chargeId) {
          const charge = await stripe.charges.retrieve(chargeId);
          const extensionId = charge.metadata?.extension_id;
          if (extensionId) {
            await recordExtensionPaymentException(
              supabaseAdmin,
              extensionId,
              "disputed",
              event.id
            );
          }
        }
        break;
      }
    }

    await completeEvent(event.id, supabaseAdmin);
  } catch {
    await failEvent(event.id, supabaseAdmin);
    console.warn("Webhook processing error for event:", event.type);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
