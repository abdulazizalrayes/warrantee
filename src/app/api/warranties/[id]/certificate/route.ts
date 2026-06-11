import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { buildWarrantyAccessOrClause } from "@/lib/warranty-access";
import { escapeHtml } from "@/lib/html-escape";
import QRCode from "qrcode";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check direct ownership
  const { data: warranty, error } = await supabase
    .from("warranties")
    .select("*")
    .eq("id", id)
    .or(buildWarrantyAccessOrClause(user.id))
    .single();

  // Fall back to party_warranties membership (sellers/partners)
  let resolvedWarranty = warranty;
  if (error || !warranty) {
    const { data: partyWarranty } = await supabase
      .from("party_warranties")
      .select("warranty_id")
      .eq("warranty_id", id)
      .eq("user_id", user.id)
      .single();

    if (partyWarranty) {
      const { data: w } = await supabase
        .from("warranties")
        .select("*")
        .eq("id", id)
        .single();
      resolvedWarranty = w;
    }
  }

  if (!resolvedWarranty) {
    return NextResponse.json({ error: "Warranty not found" }, { status: 404 });
  }

  const warranty_data = resolvedWarranty;
  const locale = warranty_data.language || "en";
  const isAr = locale === "ar";
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://warrantee.io";
  const verifyUrl = `${baseUrl}/${locale}/verify/${id}`;

  const now = new Date();
  const endDate = new Date(warranty_data.end_date);
  const isActive = endDate > now && warranty_data.status === "active";

  const format = _request.nextUrl.searchParams?.get("format");

  if (format === "pdf") {
    return generatePdf(warranty_data, isAr, isActive, verifyUrl, id, supabase);
  }

  // Default: HTML
  const html = await buildHtml(warranty_data, isAr, isActive, verifyUrl, locale);
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

async function generatePdf(
  warranty: any,
  isAr: boolean,
  isActive: boolean,
  verifyUrl: string,
  warrantyId: string,
  supabase: any
): Promise<NextResponse> {
  const PDFDocument = (await import("pdfkit")).default;
  const qrBuffer = await QRCode.toBuffer(verifyUrl, {
    width: 150,
    margin: 2,
    errorCorrectionLevel: "H",
    color: { dark: "#1A1A2E", light: "#FFFFFF" },
  });

  const chunks: Buffer[] = [];
  const doc = new PDFDocument({ size: "A4", margin: 50 });

  await new Promise<void>((resolve, reject) => {
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", resolve);
    doc.on("error", reject);

    const blue = "#4169E1";
    const gray = "#6b7280";
    const green = "#166534";
    const red = "#991b1b";
    const pageWidth = doc.page.width;
    const margin = 50;
    const contentWidth = pageWidth - margin * 2;

    // Header
    doc
      .rect(margin, margin, contentWidth, 80)
      .stroke(blue);

    doc
      .font("Helvetica-Bold")
      .fontSize(22)
      .fillColor(blue)
      .text(isAr ? "ضمانتي" : "Warrantee", margin + 10, margin + 15, {
        align: "center",
        width: contentWidth - 20,
      });

    doc
      .font("Helvetica")
      .fontSize(11)
      .fillColor(gray)
      .text(
        isAr ? "شهادة ضمان رقمية" : "Digital Warranty Certificate",
        margin + 10,
        margin + 45,
        { align: "center", width: contentWidth - 20 }
      );

    // Status badge
    const statusText = isActive
      ? isAr ? "نشط" : "Active"
      : isAr ? "منتهي" : "Expired";
    const statusColor = isActive ? green : red;
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor(statusColor)
      .text(statusText, margin + 10, margin + 63, {
        align: "center",
        width: contentWidth - 20,
      });

    // Details section
    let y = margin + 100;
    const labelFontSize = 9;
    const valueFontSize = 12;
    const rowHeight = 36;
    const col1 = margin;
    const col2 = margin + contentWidth / 2;
    const colWidth = contentWidth / 2 - 10;

    const fields = [
      [isAr ? "المنتج" : "Product", warranty.product_name],
      [isAr ? "الرقم المرجعي" : "Reference", warranty.reference_number],
      [isAr ? "الرقم التسلسلي" : "Serial Number", warranty.serial_number || "-"],
      [isAr ? "الفئة" : "Category", warranty.category || "-"],
      [isAr ? "تاريخ البداية" : "Start Date", warranty.start_date],
      [isAr ? "تاريخ الانتهاء" : "End Date", warranty.end_date],
    ];

    fields.forEach(([label, value], idx) => {
      const col = idx % 2 === 0 ? col1 : col2;
      if (idx % 2 === 0 && idx > 0) y += rowHeight;

      doc
        .font("Helvetica")
        .fontSize(labelFontSize)
        .fillColor(gray)
        .text(label, col, y, { width: colWidth });

      doc
        .font("Helvetica-Bold")
        .fontSize(valueFontSize)
        .fillColor("#1A1A2E")
        .text(String(value), col, y + 12, { width: colWidth });
    });

    y += rowHeight + 20;

    // Divider
    doc.moveTo(margin, y).lineTo(margin + contentWidth, y).stroke(gray);
    y += 16;

    // Verify URL
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor(gray)
      .text(
        isAr ? `امسح للتحقق: ${verifyUrl}` : `Scan to verify: ${verifyUrl}`,
        margin,
        y,
        { width: contentWidth, align: "center" }
      );

    y += 24;

    doc.image(qrBuffer, margin + (contentWidth - 120) / 2, y, {
      fit: [120, 120],
    });

    y += 136;

    // Footer
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(gray)
      .text(
        isAr
          ? "صادر عن منصة ضمانتي | warrantee.io"
          : "Issued by Warrantee Platform | warrantee.io",
        margin,
        y,
        { align: "center", width: contentWidth }
      );

    doc.end();
  });

  const pdfBuffer = Buffer.concat(chunks);

  // Optionally upload to Supabase Storage and set certificate_url
  try {
    const filePath = `certificates/${warrantyId}.pdf`;
    await supabase.storage
      .from("warranties")
      .upload(filePath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    const { data: urlData } = supabase.storage
      .from("warranties")
      .getPublicUrl(filePath);

    if (urlData?.publicUrl) {
      await supabase
        .from("warranties")
        .update({ certificate_url: urlData.publicUrl })
        .eq("id", warrantyId);
    }
  } catch {
    // Non-fatal: still return the PDF even if storage upload fails
  }

  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="warranty-${warrantyId}.pdf"`,
      "Content-Length": String(pdfBuffer.length),
    },
  });
}

async function buildHtml(
  warranty: any,
  isAr: boolean,
  isActive: boolean,
  verifyUrl: string,
  locale: string
): Promise<string> {
  const productName = escapeHtml(warranty.product_name);
  const referenceNumber = escapeHtml(warranty.reference_number);
  const serialNumber = escapeHtml(warranty.serial_number || "-");
  const category = escapeHtml(warranty.category || "-");
  const startDate = escapeHtml(warranty.start_date);
  const endDate = escapeHtml(warranty.end_date);
  const safeVerifyUrl = escapeHtml(verifyUrl);
  const fontFamily = isAr
    ? "'IBM Plex Sans Arabic', 'Noto Sans Arabic', Tahoma, sans-serif"
    : "Arial, sans-serif";
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    width: 160,
    margin: 2,
    errorCorrectionLevel: "H",
    color: { dark: "#1A1A2E", light: "#FFFFFF" },
  });

  return `<!DOCTYPE html>
<html dir="${isAr ? "rtl" : "ltr"}" lang="${locale}">
<head><meta charset="UTF-8"><title>${isAr ? "شهادة ضمان" : "Warranty Certificate"}</title>
<style>
  body { font-family: ${fontFamily}; margin: 0; padding: 40px; background: #fff; color: #1A1A2E; }
  .cert { max-width: 800px; margin: 0 auto; border: 3px solid #4169E1; border-radius: 16px; padding: 40px; }
  .header { text-align: center; border-bottom: 2px solid #e5e7eb; padding-bottom: 24px; margin-bottom: 24px; }
  .logo { font-size: 28px; font-weight: bold; color: #4169E1; }
  .subtitle { color: #6b7280; font-size: 14px; margin-top: 4px; }
  .badge { display: inline-block; padding: 6px 16px; border-radius: 999px; font-size: 14px; font-weight: 600; margin-top: 12px; }
  .active { background: #dcfce7; color: #166534; }
  .expired { background: #fee2e2; color: #991b1b; }
  .details { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 24px 0; }
  .field label { font-size: 12px; color: #6b7280; text-transform: uppercase; }
  .field p { font-size: 16px; font-weight: 500; margin: 4px 0 0; }
  .qr { text-align: center; margin-top: 24px; padding-top: 24px; border-top: 2px solid #e5e7eb; }
  .qr img { width: 160px; height: 160px; }
  .ref { font-size: 13px; color: #6b7280; margin-top: 8px; }
  .footer { text-align: center; margin-top: 24px; font-size: 12px; color: #9ca3af; }
  @media print { body { padding: 20px; } .cert { border: 2px solid #4169E1; } }
</style></head>
<body>
<div class="cert">
  <div class="header">
    <div class="logo">${isAr ? "ضمانتي — ثق بالشروط" : "Warrantee — Trust the Terms™"}</div>
    <div class="subtitle">${isAr ? "شهادة ضمان رقمية" : "Digital Warranty Certificate"}</div>
    <div class="badge ${isActive ? "active" : "expired"}">${isActive ? (isAr ? "نشط" : "Active") : (isAr ? "منتهي" : "Expired")}</div>
  </div>
  <div class="details">
    <div class="field"><label>${isAr ? "المنتج" : "Product"}</label><p>${productName}</p></div>
    <div class="field"><label>${isAr ? "الرقم المرجعي" : "Reference"}</label><p>${referenceNumber}</p></div>
    <div class="field"><label>${isAr ? "الرقم التسلسلي" : "Serial Number"}</label><p>${serialNumber}</p></div>
    <div class="field"><label>${isAr ? "الفئة" : "Category"}</label><p>${category}</p></div>
    <div class="field"><label>${isAr ? "تاريخ البداية" : "Start Date"}</label><p>${startDate}</p></div>
    <div class="field"><label>${isAr ? "تاريخ الانتهاء" : "End Date"}</label><p>${endDate}</p></div>
  </div>
  <div class="qr">
    <img src="${qrDataUrl}" alt="QR Code" />
    <div class="ref">${isAr ? "امسح للتحقق" : "Scan to verify"} | ${safeVerifyUrl}</div>
  </div>
  <div class="footer">${isAr ? "صادر عن منصة ضمانتي" : "Issued by Warrantee Platform"} | warrantee.io</div>
</div>
</body></html>`;
}
