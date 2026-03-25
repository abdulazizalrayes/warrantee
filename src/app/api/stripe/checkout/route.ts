// @ts-nocheck
import { NextResponse } from "next/server";
import { stripe, PLANS } from "@/lib/stripe";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { priceId, planId, locale = "en" } = await request.json();
    const plan = PLANS[planId as keyof typeof PLANS];
    if (!plan || planId === "free" || planId === "enterprise") {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const origin = request.headers.get("origin") || "https://warrantee.io";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: user.email!,
      line_items: [{ price: priceId || PLANS.pro.stripe_price_id, quantity: 1 }],
      success_url: `${origin}/${locale}/dashboard?subscription=success`,
      cancel_url: `${origin}/${locale}/dashboard?subscription=cancelled`,
      metadata: { user_id: user.id, plan_id: planId },
      subscription_data: { trial_period_days: 365, metadata: { user_id: user.id, plan_id: planId } },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
