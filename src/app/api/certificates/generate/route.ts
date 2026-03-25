// @ts-nocheck
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

function generateCertificateNumber(): string {
  const prefix = "WC";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(3).toString("hex").toUpperCase();
  return prefix + "-" + timestamp + "-" + random;
}

function generateCertificateHTML(warranty: any, company: any, locale: string = "en"): string {
  const isAr = locale === "ar";
  const dir = isAr ? "rtl" : "ltr";
  const startDate = new Date(warranty.start_date).toLocaleDateString(isAr ? "ar-SA" : "en-US", { year: "numeric", month: "long", day: "numeric" });
  const endDate = new Date(warranty.end_date).toLocaleDateString(isAr ? "ar-SA" : "en-US", { year: "numeric", month: "long", day: "numeric" });
  const certNumber = warranty.certificate_number || generateCertificateNumber();
  const issueDate = new Date().toLocaleDateString(isAr ? "ar-SA" : "en-US", { year: "numeric", month: "long", day: "numeric" });

  return \`<!DOCTYPE html>
<html dir="\${dir}" lang="\${isAr ? "ar" : "en"}">
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: \${isAr ? "'IBM Plex Sans Arabic'" : "'Inter'"}, sans-serif; background: #f8f9fa; padding: 40px; direction: \${dir}; }
    .certificate { max-width: 800px; margin: 0 auto; background: white; border: 3px solid #1A1A2E; border-radius: 12px; padding: 48px; position: relative; overflow: hidden; }
    .certificate::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 8px; background: linear-gradient(90deg, #E94560, #1A1A2E, #0F3460); }
    .header { text-align: center; margin-bottom: 32px; }
    .logo { font-size: 28px; font-weight: 700; color: #1A1A2E; margin-bottom: 4px; }
    .logo span { color: #E94560; }
    .subtitle { color: #666; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; }
    .title { text-align: center; font-size: 24px; font-weight: 700; color: #1A1A2E; margin: 24px 0; border-bottom: 2px solid #E94560; padding-bottom: 12px; display: inline-block; }
    .title-wrap { text-align: center; }
    .cert-number { text-align: center; color: #888; font-size: 13px; margin-bottom: 24px; }
    .details { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 24px 0; }
    .detail-item { padding: 12px 16px; background: #f8f9fa; border-radius: 8px; border-left: 3px solid #E94560; }
    .detail-label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
    .detail-value { font-size: 15px; font-weight: 600; color: #1A1A2E; }
    .coverage { margin: 24px 0; padding: 16px; background: #f0f9ff; border-radius: 8px; border: 1px solid #bae6fd; }
    .coverage-title { font-weight: 600; color: #0369a1; margin-bottom: 8px; }
    .coverage-text { color: #334155; font-size: 14px; line-height: 1.6; }
    .footer { margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: flex-end; }
    .stamp { text-align: center; }
    .stamp-circle { width: 80px; height: 80px; border: 2px solid #E94560; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 8px; }
    .stamp-text { font-size: 10px; color: #E94560; font-weight: 700; text-transform: uppercase; }
    .issue-date { color: #888; font-size: 12px; }
    .verify-note { text-align: center; margin-top: 24px; padding: 12px; background: #fefce8; border-radius: 8px; font-size: 12px; color: #854d0e; }
    .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 80px; font-weight: 700; color: rgba(233,69,96,0.04); pointer-events: none; white-space: nowrap; }
  </style>
</head>
<body>
  <div class="certificate">
    <div class="watermark">WARRANTEE</div>
    <div class="header">
      <div class="logo">Warrantee<span>.</span></div>
      <div class="subtitle">\${isAr ? "\u062B\u0642 \u0628\u0627\u0644\u0634\u0631\u0648\u0637" : "Trust the Terms"}</div>
    </div>
    <div class="title-wrap">
      <div class="title">\${isAr ? "\u0634\u0647\u0627\u062F\u0629 \u0636\u0645\u0627\u0646" : "Warranty Certificate"}</div>
    </div>
    <div class="cert-number">#\${certNumber}</div>
    <div class="details">
      <div class="detail-item">
        <div class="detail-label">\${isAr ? "\u0627\u0644\u0645\u0646\u062A\u062C" : "Product"}</div>
        <div class="detail-value">\${warranty.product_name || "N/A"}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">\${isAr ? "\u0627\u0644\u0631\u0642\u0645 \u0627\u0644\u062A\u0633\u0644\u0633\u0644\u064A" : "Serial Number"}</div>
        <div class="detail-value">\${warranty.serial_number || "N/A"}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">\${isAr ? "\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0628\u062F\u0627\u064A\u0629" : "Start Date"}</div>
        <div class="detail-value">\${startDate}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">\${isAr ? "\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0627\u0646\u062A\u0647\u0627\u0621" : "End Date"}</div>
        <div class="detail-value">\${endDate}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">\${isAr ? "\u0627\u0644\u0639\u0645\u064A\u0644" : "Customer"}</div>
        <div class="detail-value">\${warranty.customer_name || warranty.customer_email || "N/A"}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">\${isAr ? "\u0627\u0644\u062D\u0627\u0644\u0629" : "Status"}</div>
        <div class="detail-value" style="color: \${warranty.status === 'active' ? '#16a34a' : '#dc2626'}">\${warranty.status?.toUpperCase() || "ACTIVE"}</div>
      </div>
    </div>
    \${warranty.coverage_details ? \`<div class="coverage">
      <div class="coverage-title">\${isAr ? "\u062A\u0641\u0627\u0635\u064A\u0644 \u0627\u0644\u062A\u063A\u0637\u064A\u0629" : "Coverage Details"}</div>
      <div class="coverage-text">\${warranty.coverage_details}</div>
    </div>\` : ""}
    <div class="footer">
      <div>
        <div class="detail-label">\${isAr ? "\u0627\u0644\u0634\u0631\u0643\u0629" : "Company"}</div>
        <div class="detail-value">\${company?.name || "Warrantee"}</div>
      </div>
      <div class="stamp">
        <div class="stamp-circle">
          <div class="stamp-text">\${isAr ? "\u0645\u0639\u062A\u0645\u062F" : "Verified"}</div>
        </div>
      </div>
      <div style="text-align: \${isAr ? 'left' : 'right'}">
        <div class="detail-label">\${isAr ? "\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0625\u0635\u062F\u0627\u0631" : "Issue Date"}</div>
        <div class="issue-date">\${issueDate}</div>
      </div>
    </div>
    <div class="verify-note">\${isAr ? "\u062A\u062D\u0642\u0642 \u0645\u0646 \u0647\u0630\u0647 \u0627\u0644\u0634\u0647\u0627\u062F\u0629 \u0639\u0644\u0649" : "Verify this certificate at"} https://warrantee.io/en/verify?q=\${certNumber}</div>
  </div>
</body>
</html>\`;
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { warrantyId, locale = "en" } = await request.json();
    if (!warrantyId) {
      return NextResponse.json({ error: "Missing warrantyId" }, { status: 400 });
    }

    const { data: warranty, error: wError } = await supabase
      .from("warranties")
      .select("*, companies(*)")
      .eq("id", warrantyId)
      .single();

    if (wError || !warranty) {
      return NextResponse.json({ error: "Warranty not found" }, { status: 404 });
    }

    const certNumber = warranty.certificate_number || generateCertificateNumber();
    const certHash = crypto.createHash("sha256").update(certNumber + warrantyId).digest("hex").slice(0, 16);

    // Update warranty with certificate info if not already set
    if (!warranty.certificate_number) {
      const admin = getSupabaseAdmin();
      await admin
        .from("warranties")
        .update({ certificate_number: certNumber, certificate_hash: certHash })
        .eq("id", warrantyId);
    }

    const html = generateCertificateHTML(warranty, warranty.companies, locale);

    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": \`inline; filename="warranty-certificate-\${certNumber}.html"\`,
      },
    });
  } catch (error) {
    console.error("Certificate generation error:", error);
    return NextResponse.json({ error: "Failed to generate certificate" }, { status: 500 });
  }
}
