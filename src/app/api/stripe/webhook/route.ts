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

type ExtensionPaymentRecord = {
  id: string;
  warranty_id: string;
  new_end_date: string;
  is_purchased: boolean | null;
  purchased_by: string | null;
  price?: number | null;
  currency?: string | null;
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

function normalizeMinorUnits(amount: unknown) {
  const parsed = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.round(parsed * 100);
}

function currencyMatches(expected: string | null | undefined, actual: string | null | undefined) {
  return String(expected || "SAR").toLowerCase() === String(actual || "").toLowerCase();
}

async function getExtensionPaymentRecord(
  supabaseAdmin: SupabaseAdminClient,
  extensionId: string
): Promise<ExtensionPaymentRecord | null> {
  const { data, error } = await supabaseAdmin
    .from("warranty_extensions")
    .select("id, warranty_id, new_end_date, is_purchased, purchased_by, price, currency")
    .eq("id", extensionId)
    .single();

  if (error || !data) return null;
  return data as unknown as ExtensionPaymentRecord;
}

async function fulfillVerifiedExtensionPayment(
  supabaseAdmin: SupabaseAdminClient,
  input: {
    extensionId: string;
    userId?: string | null;
    amountPaidMinor: number | null;
    currency?: string | null;
    source: string;
  }
) {
  const extension = await getExtensionPaymentRecord(supabaseAdmin, input.extensionId);
  if (!extension) {
    throw new Error("Extension offer not found");
  }

  if (extension.is_purchased && extension.purchased_by && input.userId && extension.purchased_by !== input.userId) {
    throw new Error("Extension offer was already purchased by another user");
  }

  const expectedAmountMinor = normalizeMinorUnits(extension.price);
  if (!expectedAmountMinor || input.amountPaidMinor !== expectedAmountMinor) {
    throw new Error("Stripe payment amount did not match extension offer");
  }

  if (!currencyMatches(extension.currency, input.currency)) {
    throw new Error("Stripe payment currency did not match extension offer");
  }

  const { error: extError } = await supabaseAdmin
    .from("warranty_extensions")
    .update({
      is_purchased: true,
      purchased_by: input.userId || extension.purchased_by || null,
      purchased_at: new Date().toISOString(),
    })
    .eq("id", input.extensionId);

  if (extError) throw extError;

  const { error: warrantyError } = await supabaseAdmin
    .from("warranties")
    .update({
      end_date: extension.new_end_date,
      warranty_end_date: extension.new_end_date,
      status: "renewed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", extension.warranty_id);

  if (warrantyError) throw warrantyError;

  await supabaseAdmin.from("activity_log").insert({
    actor_id: input.userId || null,
    entity_type: "warranty_extension",
    entity_id: input.extensionId,
    action: "extension_payment_fulfilled",
    metadata: {
      warranty_id: extension.warranty_id,
      amount_minor: input.amountPaidMinor,
      currency: input.currency || null,
      source: input.source,
    },
  });
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

async function hasProcessedEvent(eventId: string, supabaseAdmin: SupabaseAdminClient): Promise<boolean> {
  try {
    const { data } = await supabaseAdmin
      .from("webhook_events")
      .select("id")
      .eq("event_id", eventId)
      .maybeSingle();

    return Boolean(data);
  } catch (err) {
    console.warn("Idempotency check failed:", err);
    return false;
  }
}

async function markEventProcessed(event: Stripe.Event, supabaseAdmin: SupabaseAdminClient) {
  const { error } = await supabaseAdmin
    .from("webhook_events")
    .insert({
      event_id: event.id,
      processed_at: new Date().toISOString(),
    });

  if (error && error.code !== "23505") {
    throw error;
  }
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

  // Idempotency check: skip if we already processed this event
  if (await hasProcessedEvent(event.id, supabaseAdmin)) {
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
          await fulfillVerifiedExtensionPayment(supabaseAdmin, {
            extensionId,
            userId,
            amountPaidMinor: session.amount_total ?? null,
            currency: session.currency,
            source: "checkout.session.completed",
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
          await fulfillVerifiedExtensionPayment(supabaseAdmin, {
            extensionId: metadata.extension_id,
            userId: metadata.user_id || null,
            amountPaidMinor: invoice.amount_paid ?? null,
            currency: invoice.currency,
            source: "invoice.payment_succeeded",
          });
        }
        break;
      }
    }

    await markEventProcessed(event, supabaseAdmin);
  } catch {
    console.warn("Webhook processing error for event:", event.type);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
