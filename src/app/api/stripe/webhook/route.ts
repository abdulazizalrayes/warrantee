// @ts-nocheck
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function hasProcessedEvent(eventId: string, supabaseAdmin: any): Promise<boolean> {
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

async function markEventProcessed(event: any, supabaseAdmin: any) {
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
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
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
        const planId = session.metadata?.plan_id;
        const extensionId = session.metadata?.extension_id;

        if (userId && planId) {
          const { error } = await supabaseAdmin
            .from("profiles")
            .update({ role: planId === "pro" ? "user" : "admin" })
            .eq("id", userId);

          if (error) console.warn("Profile update failed:", error.message);
        }

        if (extensionId) {
          const { error: extError } = await supabaseAdmin
            .from("warranty_extensions")
            .update({
              is_purchased: true,
              purchased_by: userId || null,
              purchased_at: new Date().toISOString(),
            })
            .eq("id", extensionId);

          if (extError) {
            throw extError;
          }

          const { data: extension } = await supabaseAdmin
            .from("warranty_extensions")
            .select("warranty_id, new_end_date")
            .eq("id", extensionId)
            .single();

          if (extension) {
            const { error: warrantyError } = await supabaseAdmin
              .from("warranties")
              .update({
                end_date: extension.new_end_date,
                status: "renewed",
                updated_at: new Date().toISOString(),
              })
              .eq("id", extension.warranty_id);

            if (warrantyError) throw warrantyError;
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const userId = subscription.metadata?.user_id;

        if (userId) {
          const status = subscription.status;
          if (status === "canceled" || status === "unpaid") {
            const { error } = await supabaseAdmin
              .from("profiles")
              .update({ role: "user" })
              .eq("id", userId);

            if (error) console.warn("Subscription downgrade failed:", error.message);
          }
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        const metadata = invoice.metadata;

        if (metadata?.extension_id) {
          const { error: extError } = await supabaseAdmin
            .from("warranty_extensions")
            .update({
              is_purchased: true,
              purchased_at: new Date().toISOString(),
            })
            .eq("id", metadata.extension_id);

          if (extError) {
            throw extError;
          }

          const { data: extension } = await supabaseAdmin
            .from("warranty_extensions")
            .select("warranty_id, new_end_date")
            .eq("id", metadata.extension_id)
            .single();

          if (extension) {
            const { error: warrantyError } = await supabaseAdmin
              .from("warranties")
              .update({
                end_date: extension.new_end_date,
                status: "renewed",
                updated_at: new Date().toISOString(),
              })
              .eq("id", extension.warranty_id);

            if (warrantyError) throw warrantyError;
          }
        }
        break;
      }
    }

    await markEventProcessed(event, supabaseAdmin);
  } catch (err) {
    console.warn("Webhook processing error for event:", event.type);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
