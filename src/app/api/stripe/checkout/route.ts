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

    const body = await request.json();
    const planId = body.planId as string;
    const locale = typeof body.locale === "string" ? body.locale : "en";

    const plan = PLANS[planId as keyof typeof PLANS];
    if (!plan || planId === "free" || planId === "enterprise") {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    // Use server-side price ID only — never trust client-supplied priceId
    const serverPriceId = (plan as { stripe_price_id?: string }).stripe_price_id;
    if (!serverPriceId) {
      return NextResponse.json({ error: "Plan not available for purchase" }, { status: 400 });
    }

    const origin = request.headers.get("origin") || "https://warrantee.io";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: user.email!,
      line_items: [{ price: serverPriceId, quantity: 1 }],
      success_url: `${origin}/${locale}/dashboard?subscription=success`,
      cancel_url: `${origin}/${locale}/dashboard?subscription=cancelled`,
      metadata: { user_id: user.id, plan_id: planId },
      subscription_data: { trial_period_days: 30, metadata: { user_id: user.id, plan_id: planId } },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
