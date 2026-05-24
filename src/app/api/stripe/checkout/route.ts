import { NextResponse } from "next/server";
import { stripe, PLANS } from "@/lib/stripe";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getClientIp, getRateLimitHeaders, paymentRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimitResult = await paymentRateLimit(`${user.id}:${ip}`);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many checkout attempts. Please wait before trying again." },
        { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
      );
    }

    const body = await request.json();
    const planId = body.planId as string;
    const locale = body.locale === "ar" ? "ar" : "en";

    const plan = PLANS[planId as keyof typeof PLANS];
    if (!plan || planId === "free" || planId === "enterprise") {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    // Use server-side price ID only — never trust client-supplied priceId
    const serverPriceId = (plan as { stripe_price_id?: string }).stripe_price_id;
    if (!serverPriceId) {
      return NextResponse.json({ error: "Plan not available for purchase" }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    const appOrigin = new URL(appUrl).origin;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: user.email!,
      line_items: [{ price: serverPriceId, quantity: 1 }],
      success_url: `${appOrigin}/${locale}/dashboard?subscription=success`,
      cancel_url: `${appOrigin}/${locale}/dashboard?subscription=cancelled`,
      metadata: { user_id: user.id, plan_id: planId },
      subscription_data: { trial_period_days: 30, metadata: { user_id: user.id, plan_id: planId } },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
