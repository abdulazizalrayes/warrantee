import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
const MOYASAR_SECRET = process.env.MOYASAR_SECRET_KEY;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { warrantyId, extensionMonths, provider, returnUrl } = body;

    if (!warrantyId || !provider) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!['stripe', 'moyasar'].includes(provider)) {
      return NextResponse.json({ error: 'Invalid payment provider' }, { status: 400 });
    }

    // Verify the warranty belongs to this user
    const { data: warranty } = await supabase
      .from('warranties')
      .select('id, product_name')
      .eq('id', warrantyId)
      .eq('user_id', user.id)
      .single();

    if (!warranty) {
      return NextResponse.json({ error: 'Warranty not found' }, { status: 404 });
    }

    // Derive pricing server-side — reject client-supplied amounts
    const months = typeof extensionMonths === 'number' && extensionMonths > 0
      ? Math.min(extensionMonths, 24)
      : 12;
    const PRICE_PER_MONTH_SAR = 49;
    const amount = months * PRICE_PER_MONTH_SAR;
    const currency = 'SAR';

    if (provider === 'stripe') {
      if (!STRIPE_SECRET) {
        return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
      }

      const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + STRIPE_SECRET,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          'mode': 'payment',
          'success_url': (returnUrl || process.env.NEXT_PUBLIC_APP_URL || '') + '/payment/success?session_id={CHECKOUT_SESSION_ID}',
          'cancel_url': (returnUrl || process.env.NEXT_PUBLIC_APP_URL || '') + '/payment/cancel',
          'line_items[0][price_data][currency]': currency.toLowerCase(),
          'line_items[0][price_data][product_data][name]': 'Warranty Extension - ' + months + ' months',
          'line_items[0][price_data][unit_amount]': String(amount * 100),
          'line_items[0][quantity]': '1',
          'metadata[warranty_id]': warrantyId,
          'metadata[extension_months]': String(months),
          'metadata[user_id]': user.id,
        }),
      });

      const session = await stripeRes.json();
      if (session.error) {
        return NextResponse.json({ error: session.error.message }, { status: 400 });
      }
      return NextResponse.json({ url: session.url, sessionId: session.id, provider: 'stripe' });
    }

    if (provider === 'moyasar') {
      if (!MOYASAR_SECRET) {
        return NextResponse.json({ error: 'Moyasar not configured' }, { status: 503 });
      }

      const moyasarRes = await fetch('https://api.moyasar.com/v1/invoices', {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(MOYASAR_SECRET + ':').toString('base64'),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amount * 100,
          currency,
          description: 'Warranty Extension - ' + months + ' months',
          callback_url: (returnUrl || process.env.NEXT_PUBLIC_APP_URL || '') + '/api/payments/moyasar/callback',
          metadata: { warranty_id: warrantyId, extension_months: months, user_id: user.id },
        }),
      });

      const invoice = await moyasarRes.json();
      if (invoice.errors) {
        return NextResponse.json({ error: invoice.message || 'Moyasar error' }, { status: 400 });
      }
      return NextResponse.json({ url: invoice.url, invoiceId: invoice.id, provider: 'moyasar' });
    }

    return NextResponse.json({ error: 'Invalid payment provider' }, { status: 400 });
  } catch (error) {
    console.error('Payment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
