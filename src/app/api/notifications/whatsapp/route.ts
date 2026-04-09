import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

async function getAuthorizedWarranty(warrantyId: string) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { supabase, user: null, warranty: null };
  }

  const { data: warranty, error } = await supabase
    .from("warranties")
    .select("*")
    .eq("id", warrantyId)
    .eq("user_id", user.id)
    .single();

  if (error || !warranty) {
    return { supabase, user, warranty: null };
  }

  return { supabase, user, warranty };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { warranty_id, phone, message_type } = body;

    if (!phone || !warranty_id) {
      return NextResponse.json({ error: "phone and warranty_id are required" }, { status: 400 });
    }

    const { supabase, user, warranty } = await getAuthorizedWarranty(warranty_id);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!warranty) {
      return NextResponse.json({ error: "Warranty not found" }, { status: 404 });
    }

    let messageText = "";
    const daysLeft = Math.ceil(
      (new Date(warranty.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    switch (message_type) {
      case "expiry_reminder":
        messageText = `Warrantee Reminder: Your warranty for "${warranty.product_name}" (Ref: ${warranty.reference_number}) expires in ${daysLeft} days on ${warranty.end_date}. Visit https://warrantee.io to manage it.`;
        break;
      case "claim_update":
        messageText = `Warrantee Update: A claim on your warranty for "${warranty.product_name}" has been updated. Visit https://warrantee.io to view details.`;
        break;
      default:
        messageText = `Warrantee: Your warranty for "${warranty.product_name}" (Ref: ${warranty.reference_number}) is ${warranty.status}. Expires: ${warranty.end_date}. Visit https://warrantee.io`;
    }

    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuth = process.env.TWILIO_AUTH_TOKEN;
    const twilioWhatsapp = process.env.TWILIO_WHATSAPP_NUMBER;

    if (twilioSid && twilioAuth && twilioWhatsapp) {
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
      const formData = new URLSearchParams();
      formData.append("From", `whatsapp:${twilioWhatsapp}`);
      formData.append("To", `whatsapp:${phone}`);
      formData.append("Body", messageText);

      const twilioResp = await fetch(twilioUrl, {
        method: "POST",
        headers: {
          Authorization: "Basic " + btoa(`${twilioSid}:${twilioAuth}`),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      const result = await twilioResp.json();
      if (!twilioResp.ok) {
        return NextResponse.json({ error: "Failed to send WhatsApp", details: result }, { status: 500 });
      }

      await supabase.from("notifications").insert({
        user_id: user.id,
        warranty_id: warranty.id,
        type: "whatsapp",
        title: "WhatsApp Notification Sent",
        message: messageText,
      });

      return NextResponse.json({ success: true, sid: result.sid });
    }

    return NextResponse.json({
      success: false,
      configured: false,
      message: "WhatsApp integration not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_NUMBER environment variables.",
      preview: { phone, messageText },
    });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  const configured = !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_WHATSAPP_NUMBER
  );
  return NextResponse.json({ configured, provider: "twilio" });
}
