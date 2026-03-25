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
  const lang = isAr ? "ar" : "en";
  const fontFamily = isAr ? "'IBM Plex Sans Arabic'" : "'Inter'";
  const startDate = new Date(warranty.start_date).toLocaleDateString(isAr ? "ar-SA" : "en-US", { year: "numeric", month: "long", day: "numeric" });
  const endDate = new Date(warranty.end_date).toLocaleDateString(isAr ? "ar-SA" : "en-US", { year: "numeric", month: "long", day: "numeric" });
  const certNumber = warranty.certificate_number || generateCertificateNumber();
  const issueDate = new Date().toLocaleDateString(isAr ? "ar-SA" : "en-US", { year: "numeric", month: "long", day: "numeric" });

  const trustText = isAr ? "ثق بالشروط" : "Trust the Terms";
  const certTitle = isAr ? "شهادة ضمان" : "Warranty Certificate";
  const productLabel = isAr ? "المنتج" : "Product";
  const serialLabel = isAr ? "الرقم التسلسلي" : "Serial Number";
  const startLabel = isAr ? "تاريخ البداية" : "Start Date";
  const endLabel = isAr ? "تاريخ الانتهاء" : "End Date";
  const customerLabel = isAr ? "العميل" : "Customer";
  const statusLabel = isAr ? "الحالة" : "Status";
  const coverageLabel = isAr ? "تفاصيل التغطية" : "Coverage Details";
  const companyLabel = isAr ? "الشركة" : "Company";
  const verifiedText = isAr ? "معتمد" : "Verified";
  const issueDateLabel = isAr ? "تاريخ الإصدار" : "Issue Date";
  const verifyText = isAr ? "تحقق من هذه الشهادة على" : "Verify this certificate at";
  const textAlign = isAr ? "left" : "right";

  const statusColor = warranty.status === "active" ? "#16a34a" : "#dc2626";
  const statusValue = warranty.status?.toUpperCase() || "ACTIVE";
  const productName = warranty.product_name || "N/A";
  const serialNumber = warranty.serial_number || "N/A";
  const customerName = warranty.customer_name || warranty.customer_email || "N/A";
  const companyName = company?.name || "Warrantee";

  const coverageSection = warranty.coverage_details
    ? '<div class="coverage"><div class="coverage-title">' + coverageLabel + '</div><div class="coverage-text">' + warranty.coverage_details + '</div></div>'
    : "";

  const parts = [
    "<!DOCTYPE html>",
    '<html dir="' + dir + '" lang="' + lang + '">',
    "<head>",
    '<meta charset="UTF-8">',
    "<style>",
    "@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap');",
    "* { margin: 0; padding: 0; box-sizing: border-box; }",
    "body { font-family: " + fontFamily + ", sans-serif; background: #f8f9fa; padding: 40px; direction: " + dir + "; }",
    ".certificate { max-width: 800px; margin: 0 auto; background: white; border: 3px solid #1A1A2E; border-radius: 12px; padding: 48px; position: relative; overflow: hidden; }",
    ".certificate::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 8px; background: linear-gradient(90deg, #E94560, #1A1A2E, #0F3460); }",
    ".header { text-align: center; margin-bottom: 32px; }",
    ".logo { font-size: 28px; font-weight: 700; color: #1A1A2E; margin-bottom: 4px; }",
    ".logo span { color: #E94560; }",
    ".subtitle { color: #666; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; }",
    ".title { text-align: center; font-size: 24px; font-weight: 700; color: #1A1A2E; margin: 24px 0; border-bottom: 2px solid #E94560; padding-bottom: 12px; display: inline-block; }",
    ".title-wrap { text-align: center; }",
    ".cert-number { text-align: center; color: #888; font-size: 13px; margin-bottom: 24px; }",
    ".details { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 24px 0; }",
    ".detail-item { padding: 12px 16px; background: #f8f9fa; border-radius: 8px; border-left: 3px solid #E94560; }",
    ".detail-label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }",
    ".detail-value { font-size: 15px; font-weight: 600; color: #1A1A2E; }",
    ".coverage { margin: 24px 0; padding: 16px; background: #f0f9ff; border-radius: 8px; border: 1px solid #bae6fd; }",
    ".coverage-title { font-weight: 600; color: #0369a1; margin-bottom: 8px; }",
    ".coverage-text { color: #334155; font-size: 14px; line-height: 1.6; }",
    ".footer { margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: flex-end; }",
    ".stamp { text-align: center; }",
    ".stamp-circle { width: 80px; height: 80px; border: 2px solid #E94560; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 8px; }",
    ".stamp-text { font-size: 10px; color: #E94560; font-weight: 700; text-transform: uppercase; }",
    ".issue-date { color: #888; font-size: 12px; }",
    ".verify-note { text-align: center; margin-top: 24px; padding: 12px; background: #fefce8; border-radius: 8px; font-size: 12px; color: #854d0e; }",
    ".watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 80px; font-weight: 700; color: rgba(233,69,96,0.04); pointer-events: none; white-space: nowrap; }",
    "</style>",
    "</head>",
    "<body>",
    '<div class="certificate">',
    '<div class="watermark">WARRANTEE</div>',
    '<div class="header">',
    '<div class="logo">Warrantee<span>.</span></div>',
    '<div class="subtitle">' + trustText + '</div>',
    "</div>",
    '<div class="title-wrap">',
    '<div class="title">' + certTitle + '</div>',
    "</div>",
    '<div class="cert-number">#' + certNumber + '</div>',
    '<div class="details">',
    '<div class="detail-item"><div class="detail-label">' + productLabel + '</div><div class="detail-value">' + productName + '</div></div>',
    '<div class="detail-item"><div class="detail-label">' + serialLabel + '</div><div class="detail-value">' + serialNumber + '</div></div>',
    '<div class="detail-item"><div class="detail-label">' + startLabel + '</div><div class="detail-value">' + startDate + '</div></div>',
    '<div class="detail-item"><div class="detail-label">' + endLabel + '</div><div class="detail-value">' + endDate + '</div></div>',
    '<div class="detail-item"><div class="detail-label">' + customerLabel + '</div><div class="detail-value">' + customerName + '</div></div>',
    '<div class="detail-item"><div class="detail-label">' + statusLabel + '</div><div class="detail-value" style="color: ' + statusColor + '">' + statusValue + '</div></div>',
    "</div>",
    coverageSection,
    '<div class="footer">',
    '<div><div class="detail-label">' + companyLabel + '</div><div class="detail-value">' + companyName + '</div></div>',
    '<div class="stamp"><div class="stamp-circle"><div class="stamp-text">' + verifiedText + '</div></div></div>',
    '<div style="text-align: ' + textAlign + '"><div class="detail-label">' + issueDateLabel + '</div><div class="issue-date">' + issueDate + '</div></div>',
    "</div>",
    '<div class="verify-note">' + verifyText + ' https://warrantee.io/en/verify?q=' + certNumber + '</div>',
    "</div>",
    "</body>",
    "</html>"
  ];

  return parts.join("\n");
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
        "Content-Disposition": "inline; filename=\"warranty-certificate-" + certNumber + ".html\"",
      },
    });
  } catch (error) {
    console.error("Certificate generation error:", error);
    return NextResponse.json({ error: "Failed to generate certificate" }, { status: 500 });
  }
}
