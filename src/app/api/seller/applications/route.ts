import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { contactRateLimit, getClientIp, getRateLimitHeaders } from "@/lib/rate-limit";
import { isTrustedSameOriginRequest } from "@/lib/request-origin";
import { isValidEmail, sanitizeString } from "@/lib/validation";

function requiredString(value: unknown, maxLength: number) {
  return typeof value === "string" && value.trim()
    ? sanitizeString(value, maxLength)
    : "";
}

function optionalString(value: unknown, maxLength: number) {
  return typeof value === "string" && value.trim()
    ? sanitizeString(value, maxLength)
    : null;
}

function buildTicketNumber() {
  return `SEL-${Date.now().toString(36).toUpperCase()}`;
}

export async function POST(request: NextRequest) {
  try {
    const rateLimitResult = await contactRateLimit(getClientIp(request));
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
      );
    }

    if (!isTrustedSameOriginRequest(request)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const application = {
      companyName: requiredString(body.companyName, 200),
      crNumber: requiredString(body.crNumber, 80),
      industry: requiredString(body.industry, 80),
      website: optionalString(body.website, 240),
      contactName: requiredString(body.contactName, 160),
      contactEmail: requiredString(body.contactEmail, 254).toLowerCase(),
      contactPhone: requiredString(body.contactPhone, 60),
      address: optionalString(body.address, 500),
      city: optionalString(body.city, 120),
      warrantyPolicy: optionalString(body.warrantyPolicy, 5000),
    };

    const missing = Object.entries(application)
      .filter(([key, value]) => ["companyName", "crNumber", "industry", "contactName", "contactEmail", "contactPhone"].includes(key) && !value)
      .map(([key]) => key);

    if (missing.length > 0) {
      return NextResponse.json({ error: `Missing required fields: ${missing.join(", ")}` }, { status: 400 });
    }

    if (!isValidEmail(application.contactEmail)) {
      return NextResponse.json({ error: "A valid contact email is required" }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const admin = createSupabaseAdminClient();

    const { data: sellerApplication, error: sellerApplicationError } = await admin
      .from("seller_invitations")
      .insert({
        company_name: application.companyName,
        cr_number: application.crNumber,
        industry: application.industry,
        website: application.website,
        contact_name: application.contactName,
        contact_email: application.contactEmail,
        contact_phone: application.contactPhone,
        address: application.address,
        city: application.city,
        warranty_policy: application.warrantyPolicy,
        user_id: user?.id || null,
        status: "pending",
      })
      .select("id")
      .single();

    if (sellerApplication) {
      return NextResponse.json({ success: true, application_id: sellerApplication.id }, { status: 201 });
    }

    const { data: fallbackTicket, error: fallbackError } = await admin
      .from("support_tickets")
      .insert({
        ticket_number: buildTicketNumber(),
        user_id: user?.id || null,
        requester_email: application.contactEmail,
        requester_name: application.contactName,
        company: application.companyName,
        subject: "Seller registration",
        description: [
          `Company: ${application.companyName}`,
          `CR Number: ${application.crNumber}`,
          `Industry: ${application.industry}`,
          `Website: ${application.website || "-"}`,
          `City: ${application.city || "-"}`,
          `Address: ${application.address || "-"}`,
          "",
          `Warranty policy: ${application.warrantyPolicy || "-"}`,
          "",
          `seller_invitations insert failed: ${sellerApplicationError?.message || "unknown"}`,
        ].join("\n"),
        category: "seller",
        priority: "medium",
        status: "open",
        source: "seller_application",
        metadata: application,
      })
      .select("id, ticket_number")
      .single();

    if (fallbackError) {
      return NextResponse.json({ error: "Failed to submit seller application" }, { status: 500 });
    }

    return NextResponse.json(
      { success: true, fallback_ticket: fallbackTicket },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
