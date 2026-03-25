import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) return NextResponse.json({ error: "No signature" }, { status: 400 });

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const userId = session.metadata?.user_id;
      const planId = session.metadata?.plan_id;
      if (userId && planId) {
        await supabaseAdmin.from("profiles").update({ role: planId === "pro" ? "user" : "admin" }).eq("id", userId);
      }
      break;
    }
    case "customer.subscription.updated": {
      const subscription = event.data.object;
      const userId = subscription.metadata?.user_id;
      if (userId) {
        const status = subscription.status;
        if (status === "canceled" || status === "unpaid") {
          await supabaseAdmin.from("profiles").update({ role: "user" }).eq("id", userId);
        }
      }
      break;
    }
    case "invoice.payment_succeeded": {
      const invoice = event.data.object;
      const metadata = invoice.metadata;
      if (metadata?.extension_id) {
        await supabaseAdmin.from("warranty_extensions").update({ is_purchased: true }).eq("id", metadata.extension_id);
        const { data: ext } = await supabaseAdmin.from("warranty_extensions").select("warranty_id, new_end_date").eq("id", metadata.extension_id).single();
        if (ext) await supabaseAdmin.from("warranties").update({ end_date: ext.new_end_date, status: "renewed" }).eq("id", ext.warranty_id);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
