import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { buildWarrantyAccessOrClause } from '@/lib/warranty-access';
import { getExtensionEligibility } from '@/lib/extension-eligibility';
import { getLatestExtensionPolicy } from '@/lib/extension-policy';
import { getClientIp, getRateLimitHeaders, paymentRateLimit } from '@/lib/rate-limit';

type PaymentWarranty = {
  id: string;
  product_name: string | null;
  status: string;
  end_date: string;
  currency?: string | null;
  user_id?: string | null;
  buyer_id?: string | null;
  recipient_user_id?: string | null;
  seller_id?: string | null;
  issuer_user_id?: string | null;
};

function isMissingColumnError(error: unknown, column: string) {
  const message = String((error as { message?: unknown })?.message || "");
  return (
    message.includes(`'${column}' column`) ||
    message.includes(`column ${column}`) ||
    message.includes(`column "${column}"`) ||
    message.includes(`.${column}`)
  );
}

function sameOriginUrl(pathOrUrl: unknown, appUrl: string, fallbackPath: string) {
  const base = new URL(appUrl);
  if (typeof pathOrUrl !== 'string' || !pathOrUrl.trim()) {
    return new URL(fallbackPath, base).toString();
  }

  try {
    const parsed = new URL(pathOrUrl, base);
    if (parsed.origin !== base.origin) {
      return new URL(fallbackPath, base).toString();
    }
    return parsed.toString();
  } catch {
    return new URL(fallbackPath, base).toString();
  }
}

function getPaymentProviderSecrets() {
  return {
    stripeSecret: process.env["STRIPE_SECRET_KEY"],
    moyasarSecret: process.env["MOYASAR_SECRET_KEY"],
  };
}

async function getPaymentWarranty(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  warrantyId: string,
  userId: string
) {
  const access = buildWarrantyAccessOrClause(userId);
  const result = await supabase
    .from('warranties')
    .select('id, product_name, status, end_date, currency, user_id, buyer_id, recipient_user_id, seller_id, issuer_user_id')
    .eq('id', warrantyId)
    .or(access)
    .single();

  if (!result.error) return result as { data: PaymentWarranty; error: null };

  if (isMissingColumnError(result.error, 'currency')) {
    const fallback = await supabase
      .from('warranties')
      .select('id, product_name, status, end_date, user_id, buyer_id, recipient_user_id, seller_id, issuer_user_id')
      .eq('id', warrantyId)
      .or(access)
      .single();

    if (!fallback.error && fallback.data) {
      return {
        data: { ...(fallback.data as PaymentWarranty), currency: null },
        error: null,
      };
    }

    return fallback as { data: null; error: unknown };
  }

  return result as { data: null; error: unknown };
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimitResult = await paymentRateLimit(`${user.id}:${ip}`);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many payment attempts. Please wait before trying again.' },
        { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
      );
    }

    const body = await request.json();
    const {
      warrantyId,
      extensionId,
      extensionMonths,
      provider,
      returnUrl,
      successUrl,
      cancelUrl,
      locale = 'en',
    } = body;

    if ((!warrantyId && !extensionId) || !provider) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!['stripe', 'moyasar'].includes(provider)) {
      return NextResponse.json({ error: 'Invalid payment provider' }, { status: 400 });
    }

    // Verify the warranty belongs to this user
    const { data: warranty, error: warrantyError } = await getPaymentWarranty(supabase, warrantyId, user.id);

    if (!warranty) {
      if (warrantyError) {
        console.error('Payment warranty lookup error:', warrantyError);
      }
      return NextResponse.json({ error: 'Warranty not found' }, { status: 404 });
    }

    const canPurchaseExtension =
      warranty.user_id === user.id ||
      warranty.buyer_id === user.id ||
      warranty.recipient_user_id === user.id;

    if (!canPurchaseExtension) {
      return NextResponse.json(
        { error: 'Only the warranty holder or recipient can purchase an extension' },
        { status: 403 }
      );
    }

    const policy = await getLatestExtensionPolicy(supabase, warrantyId);
    const eligibility = getExtensionEligibility(warranty, policy);
    let months = typeof extensionMonths === 'number' && extensionMonths > 0
      ? Math.min(extensionMonths, 24)
      : 12;
    let amount = 0;
    let currency = warranty?.currency || 'SAR';
    let resolvedExtensionId = extensionId as string | undefined;

    if (resolvedExtensionId) {
      const { data: existingExtension } = await supabase
        .from('warranty_extensions')
        .select('id, warranty_id, price, currency, new_end_date, is_purchased')
        .eq('id', resolvedExtensionId)
        .single();

      if (!existingExtension || existingExtension.warranty_id !== warrantyId) {
        return NextResponse.json({ error: 'Extension offer not found' }, { status: 404 });
      }

      if (existingExtension.is_purchased) {
        return NextResponse.json({ error: 'This extension was already purchased' }, { status: 409 });
      }

      if (typeof existingExtension.price !== 'number' || existingExtension.price <= 0) {
        return NextResponse.json({ error: 'This extension does not have a seller-approved price yet' }, { status: 422 });
      }

      amount = existingExtension.price;
      currency = existingExtension.currency || currency;
      const currentEnd = new Date(warranty.end_date);
      const newEnd = new Date(existingExtension.new_end_date);
      months = Math.max(
        1,
        (newEnd.getFullYear() - currentEnd.getFullYear()) * 12 +
        (newEnd.getMonth() - currentEnd.getMonth())
      );
    } else {
      return NextResponse.json(
        {
          error: eligibility.hasApprovedFallbackProvider
            ? 'An approved provider offer is required before checkout can start.'
            : 'Direct platform fallback checkout is disabled until an approved seller or provider offer exists.',
        },
        { status: 422 }
      );
    }
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    const safeLocale = locale === 'ar' ? 'ar' : 'en';
    const defaultSuccessPath = `/${safeLocale}/warranties/${warrantyId}?extension=success`;
    const defaultCancelPath = `/${safeLocale}/warranties/${warrantyId}?extension=cancelled`;
    const resolvedSuccessUrl = sameOriginUrl(successUrl || returnUrl, appUrl, defaultSuccessPath);
    const resolvedCancelUrl = sameOriginUrl(cancelUrl, appUrl, defaultCancelPath);
    if (!resolvedExtensionId) {
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

      resolvedExtensionId = extension.id;
    }

    if (provider === 'stripe') {
      const { stripeSecret } = getPaymentProviderSecrets();
      if (!stripeSecret) {
        return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
      }

      const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + stripeSecret,
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
          'metadata[extension_id]': resolvedExtensionId!,
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
      const { moyasarSecret } = getPaymentProviderSecrets();
      if (!moyasarSecret) {
        return NextResponse.json({ error: 'Moyasar not configured' }, { status: 503 });
      }

      const moyasarRes = await fetch('https://api.moyasar.com/v1/invoices', {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(moyasarSecret + ':').toString('base64'),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amount * 100,
          currency,
          description: 'Warranty Extension - ' + months + ' months',
          callback_url: new URL('/api/payments/moyasar/callback', appUrl).toString(),
          metadata: { extension_id: resolvedExtensionId!, warranty_id: warrantyId, extension_months: months, user_id: user.id },
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
