import { NextRequest, NextResponse } from 'next/server';

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
const MOYASAR_SECRET = process.env.MOYASAR_SECRET_KEY;

interface PaymentRequest {
  amount: number;
  currency: string;
  warrantyId: string;
  extensionMonths: number;
  provider: 'stripe' | 'moyasar';
  returnUrl?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: PaymentRequest = await request.json();
    const { amount, currency, warrantyId, extensionMonths, provider, returnUrl } = body;

    if (!amount || !currency || !warrantyId || !provider) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
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
          'success_url': (returnUrl || process.env.NEXT_PUBLIC_APP_URL || '') + '/payment/success?session_id={CHECKOUT_SESSION_ID}',
          'cancel_url': (returnUrl || process.env.NEXT_PUBLIC_APP_URL || '') + '/payment/cancel',
          'line_items[0][price_data][currency]': currency.toLowerCase(),
          'line_items[0][price_data][product_data][name]': 'Warranty Extension - ' + extensionMonths + ' months',
          'line_items[0][price_data][unit_amount]': String(amount * 100),
          'line_items[0][quantity]': '1',
          'metadata[warranty_id]': warrantyId,
          'metadata[extension_months]': String(extensionMonths),
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
          currency: currency,
          description: 'Warranty Extension - ' + extensionMonths + ' months',
          callback_url: (returnUrl || process.env.NEXT_PUBLIC_APP_URL || '') + '/api/payments/moyasar/callback',
          metadata: { warranty_id: warrantyId, extension_months: extensionMonths },
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
