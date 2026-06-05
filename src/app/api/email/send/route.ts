import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { emailTemplates } from '@/lib/email-templates';

function safeCompare(a: string, b: string) {
  const aHash = crypto.createHash('sha256').update(a).digest();
  const bHash = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(aHash, bHash);
}

function authorizeEmailSend(request: NextRequest) {
  const configuredSecret = process.env.EMAIL_SEND_API_SECRET || process.env.EMAIL_SEND_SECRET;
  if (!configuredSecret) {
    return NextResponse.json(
      { error: 'Email send endpoint is not configured for authenticated use' },
      { status: 503 }
    );
  }

  const authHeader = request.headers.get('authorization') || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';
  const sharedSecret = bearerToken || request.headers.get('x-email-send-secret') || '';

  if (!sharedSecret || !safeCompare(sharedSecret, configuredSecret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const authError = authorizeEmailSend(request);
    if (authError) return authError;

    const { to, templateKey, data, locale = 'en' } = await request.json();

    if (!to || !templateKey) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const template = emailTemplates[templateKey];
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const subject = template.subject[locale as 'en' | 'ar'] || template.subject.en;
    const html = template.html(data || {}, locale as 'en' | 'ar');

    // Using Resend API
    const RESEND_API_KEY = process.env.RESEND_API_KEY;

    if (!RESEND_API_KEY) {
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Email service unavailable' }, { status: 500 });
      }
      console.log('Email would be sent:', { to, subject });
      return NextResponse.json({ success: true, mock: true, message: 'Email logged (no API key)' });
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'Warrantee <hello@warrantee.io>',
        to: [to],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      console.error('Resend error:', error);
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }

    const result = await res.json();
    return NextResponse.json({ success: true, id: result.id });
  } catch (error) {
    console.error('Email API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
