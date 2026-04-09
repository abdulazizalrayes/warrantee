import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { apiRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";
import { validateContactInput } from "@/lib/validation";
import { upsertHubSpotContact } from "@/lib/hubspot";
import { sendEmail } from "@/lib/email";

function buildNotificationHtml(input: {
  name: string;
  email: string;
  company: string | null;
  subject: string;
  message: string;
  phone?: string | null;
  kind?: string;
}) {
  const escapeHtml = (value: string | null | undefined) =>
    (value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  return `
    <div style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto; padding: 24px;">
      <h1 style="font-size: 22px; color: #0f172a; margin-bottom: 16px;">New Warrantee lead</h1>
      <p><strong>Type:</strong> ${escapeHtml(input.kind || "contact_form")}</p>
      <p><strong>Name:</strong> ${escapeHtml(input.name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(input.email)}</p>
      <p><strong>Company:</strong> ${escapeHtml(input.company || "-")}</p>
      <p><strong>Phone:</strong> ${escapeHtml(input.phone || "-")}</p>
      <p><strong>Subject:</strong> ${escapeHtml(input.subject)}</p>
      <div style="margin-top: 20px;">
        <strong>Message</strong>
        <pre style="white-space: pre-wrap; font-family: Arial, sans-serif; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px;">${escapeHtml(input.message)}</pre>
      </div>
    </div>
  `;
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const rateLimitResult = await apiRateLimit(ip);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
      );
    }

    const body = await request.json();
    const validation = validateContactInput(body);
    if (!validation.valid || !validation.sanitized) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.errors },
        { status: 400 }
      );
    }

    const input = validation.sanitized;
    const hubspotResult = await upsertHubSpotContact({
      email: input.email,
      firstname: input.name,
      phone: input.phone,
      company: input.company,
      lifecycleStage: input.kind === "seller_application" ? "lead" : undefined,
    }).catch((error) => ({
      enabled: true as const,
      error: error instanceof Error ? error.message : "Unknown HubSpot error",
    }));

    const supabase = await createServerSupabaseClient();
    const { data: auth } = await supabase.auth.getUser();

    const emailResult = await sendEmail({
      to: "hello@warrantee.io",
      subject: `[Warrantee] ${input.subject}`,
      html: buildNotificationHtml(input),
    });

    return NextResponse.json(
      {
        success: true,
        submittedBy: auth.user?.id || null,
        hubspot: hubspotResult,
        emailed: emailResult.success,
      },
      { status: 201 }
    );
  } catch (error) {
    console.warn("Contact submission error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
