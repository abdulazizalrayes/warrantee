import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { buildWarrantyAccessOrClause } from '@/lib/warranty-access';

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
    const {
      warrantyId,
      extensionMonths,
      provider,
      returnUrl,
      successUrl,
      cancelUrl,
      locale = 'en',
    } = body;

    if (!warrantyId || !provider) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!['stripe', 'moyasar'].includes(provider)) {
      return NextResponse.json({ error: 'Invalid payment provider' }, { status: 400 });
    }

    // Verify the warranty belongs to this user
    const { data: warranty } = await supabase
      .from('warranties')
      .select('id, product_name, end_date')
      .eq('id', warrantyId)
      .or(buildWarrantyAccessOrClause(user.id))
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
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    const safeBaseUrl = typeof returnUrl === 'string' && returnUrl.startsWith('http')
      ? returnUrl
      : appUrl;
    const resolvedSuccessUrl =
      typeof successUrl === 'string' && successUrl.startsWith('http')
        ? successUrl
        : `${safeBaseUrl}/${locale}/warranties/${warrantyId}?extension=success`;
    const resolvedCancelUrl =
      typeof cancelUrl === 'string' && cancelUrl.startsWith('http')
        ? cancelUrl
        : `${safeBaseUrl}/${locale}/warranties/${warrantyId}?extension=cancelled`;
    const newEndDate = new Date(warranty.end_date);
    newEndDate.setMonth(newEndDate.getMonth() + months);

    const { data: extension, error: extensionError } = await supabase
      .from('warranty_extensions')
      .insert({
        warranty_id: warrantyId,
        new_end_date: newEndDate.toISOString().split('T')[0],
        price: amount,
        currency,
        commission_rate: 8.0,
        commission_amount: amount * 0.08,
        is_purchased: false,
      })
      .select('id')
      .single();

    if (extensionError || !extension) {
      return NextResponse.json({ error: 'Failed to create extension request' }, { status: 500 });
    }

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
          'success_url': resolvedSuccessUrl,
          'cancel_url': resolvedCancelUrl,
          'line_items[0][price_data][currency]': currency.toLowerCase(),
          'line_items[0][price_data][product_data][name]': 'Warranty Extension - ' + months + ' months',
          'line_items[0][price_data][unit_amount]': String(amount * 100),
          'line_items[0][quantity]': '1',
          'metadata[extension_id]': extension.id,
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
          callback_url: `${safeBaseUrl}/api/payments/moyasar/callback`,
          metadata: { extension_id: extension.id, warranty_id: warrantyId, extension_months: months, user_id: user.id },
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
