import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// POST /api/notifications/whatsapp - Send WhatsApp notification
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { warranty_id, phone, message_type } = body;

    if (!phone || !warranty_id) {
      return NextResponse.json({ error: 'phone and warranty_id are required' }, { status: 400 });
    }

    // Fetch warranty details
    const { data: warranty, error } = await supabase
      .from('warranties')
      .select('*')
      .eq('id', warranty_id)
      .single();

    if (error || !warranty) {
      return NextResponse.json({ error: 'Warranty not found' }, { status: 404 });
    }

    // Build message based on type
    let messageText = '';
    const daysLeft = Math.ceil((new Date(warranty.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    switch (message_type) {
      case 'expiry_reminder':
        messageText = `Warrantee Reminder: Your warranty for "${warranty.product_name}" (Ref: ${warranty.reference_number}) expires in ${daysLeft} days on ${warranty.end_date}. Visit https://warrantee.io to manage it.`;
        break;
      case 'claim_update':
        messageText = `Warrantee Update: A claim on your warranty for "${warranty.product_name}" has been updated. Visit https://warrantee.io to view details.`;
        break;
      default:
        messageText = `Warrantee: Your warranty for "${warranty.product_name}" (Ref: ${warranty.reference_number}) is ${warranty.status}. Expires: ${warranty.end_date}. Visit https://warrantee.io`;
    }

    // Check for Twilio credentials
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuth = process.env.TWILIO_AUTH_TOKEN;
    const twilioWhatsapp = process.env.TWILIO_WHATSAPP_NUMBER;

    if (twilioSid && twilioAuth && twilioWhatsapp) {
      // Send via Twilio WhatsApp API
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
      const formData = new URLSearchParams();
      formData.append('From', `whatsapp:${twilioWhatsapp}`);
      formData.append('To', `whatsapp:${phone}`);
      formData.append('Body', messageText);

      const twilioResp = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${twilioSid}:${twilioAuth}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      const result = await twilioResp.json();
      if (!twilioResp.ok) {
        return NextResponse.json({ error: 'Failed to send WhatsApp', details: result }, { status: 500 });
      }

      // Log notification
      await supabase.from('notifications').insert({
        user_id: warranty.user_id,
        warranty_id: warranty.id,
        type: 'whatsapp',
        title: 'WhatsApp Notification Sent',
        message: messageText,
      });

      return NextResponse.json({ success: true, sid: result.sid });
    }

    // No Twilio configured - return message preview
    return NextResponse.json({
      success: false,
      configured: false,
      message: 'WhatsApp integration not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_NUMBER environment variables.',
      preview: { phone, messageText },
    });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/notifications/whatsapp - Check configuration status
export async function GET() {
  const configured = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_NUMBER);
  return NextResponse.json({ configured, provider: 'twilio' });
}
