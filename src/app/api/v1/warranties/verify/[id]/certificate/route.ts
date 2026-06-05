import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import QRCode from "qrcode";
import { escapeHtml } from "@/lib/html-escape";
import { getClientIp, getRateLimitHeaders, publicLookupRateLimit } from "@/lib/rate-limit";

const VERIFICATION_SELECT =
  "id, reference_number, product_name, product_name_ar, serial_number, status, start_date, end_date, category, seller_name, created_at";

const VERIFICATION_QUERY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 .:/#-]{0,79}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;

function normalizeVerificationQuery(query: string) {
  const normalized = query.trim().slice(0, 80);
  return VERIFICATION_QUERY_PATTERN.test(normalized) ? normalized : "";
}

async function findPublicWarranty(supabase: SupabaseClient, safeQuery: string) {
  if (UUID_PATTERN.test(safeQuery)) {
    const result = await supabase
      .from("warranties")
      .select(VERIFICATION_SELECT)
      .eq("id", safeQuery)
      .limit(1)
      .maybeSingle();

    if (result.data || result.error) return result;
  }

  const referenceResult = await supabase
    .from("warranties")
    .select(VERIFICATION_SELECT)
    .ilike("reference_number", safeQuery)
    .limit(1)
    .maybeSingle();

  if (referenceResult.data || referenceResult.error) return referenceResult;

  return supabase
    .from("warranties")
    .select(VERIFICATION_SELECT)
    .ilike("serial_number", safeQuery)
    .limit(1)
    .maybeSingle();
}

function formatDate(value: string | null | undefined, locale: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function resolveLocale(request: NextRequest) {
  const requestedLocale = request.nextUrl.searchParams.get("locale");
  return requestedLocale === "ar" ? "ar" : "en";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rateLimitResult = await publicLookupRateLimit(getClientIp(request));
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { success: false, error: "Too many verification attempts" },
      { status: 429, headers: getRateLimitHeaders(rateLimitResult) },
    );
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }

  const { id } = await params;
  const safeQuery = normalizeVerificationQuery(id);
  if (!safeQuery) {
    return NextResponse.json({ success: false, error: "Invalid verification query" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  const { data, error } = await findPublicWarranty(supabase, safeQuery);
  if (error || !data) {
    return NextResponse.json({ success: false, error: "Warranty not found" }, { status: 404 });
  }

  const locale = resolveLocale(request);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://warrantee.io";
  const verifyUrl = `${baseUrl}/${locale}/verify/${data.id}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    width: 188,
    margin: 2,
    errorCorrectionLevel: "H",
    color: {
      dark: "#1d1d1f",
      light: "#ffffff",
    },
  });

  const isAr = locale === "ar";
  const endDate = data.end_date ? new Date(data.end_date) : null;
  const isActive =
    endDate &&
    !Number.isNaN(endDate.getTime()) &&
    endDate.getTime() > Date.now() &&
    (data.status === "active" || data.status === "renewed");

  const productName = escapeHtml(isAr && data.product_name_ar ? data.product_name_ar : data.product_name || "-");
  const referenceNumber = escapeHtml(data.reference_number || "-");
  const serialNumber = escapeHtml(data.serial_number || "-");
  const category = escapeHtml(data.category || "-");
  const sellerName = escapeHtml(data.seller_name || "-");
  const statusText = isActive ? (isAr ? "نشط" : "Active") : (isAr ? "منتهي" : "Expired");
  const safeVerifyUrl = escapeHtml(verifyUrl);

  const html = `<!DOCTYPE html>
<html dir="${isAr ? "rtl" : "ltr"}" lang="${locale}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${isAr ? "شهادة ضمان موثقة" : "Verified Warranty Certificate"}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 32px; background: #fbfbfd; color: #1d1d1f; font-family: Arial, Helvetica, sans-serif; }
    .certificate { max-width: 840px; margin: 0 auto; background: #fff; border: 1px solid rgba(0,0,0,.08); border-radius: 18px; padding: 40px; box-shadow: 0 18px 60px rgba(0,0,0,.08); }
    .brand { color: #0071e3; font-weight: 700; letter-spacing: -.01em; }
    h1 { margin: 10px 0 8px; font-size: 38px; line-height: 1.08; letter-spacing: -.03em; }
    .subtitle { margin: 0; color: #6e6e73; font-size: 16px; line-height: 1.6; }
    .status { display: inline-flex; margin-top: 22px; border-radius: 999px; padding: 8px 14px; font-size: 13px; font-weight: 700; background: ${isActive ? "#ecfdf3" : "#fff1f2"}; color: ${isActive ? "#047857" : "#be123c"}; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; margin-top: 32px; }
    .field { border-radius: 12px; background: #f5f5f7; padding: 14px 16px; }
    .label { color: #6e6e73; font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
    .value { margin-top: 6px; font-size: 15px; font-weight: 600; overflow-wrap: anywhere; }
    .verify { display: grid; grid-template-columns: 190px 1fr; gap: 24px; align-items: center; margin-top: 32px; border-top: 1px solid rgba(0,0,0,.08); padding-top: 28px; }
    .qr { width: 188px; height: 188px; border: 1px solid rgba(0,0,0,.08); border-radius: 12px; padding: 8px; }
    .verify-title { margin: 0 0 8px; font-size: 20px; font-weight: 700; }
    .verify-copy { margin: 0; color: #6e6e73; line-height: 1.6; }
    .url { margin-top: 12px; color: #0071e3; font-size: 13px; overflow-wrap: anywhere; }
    .footer { margin-top: 28px; color: #6e6e73; font-size: 12px; text-align: center; }
    @media (max-width: 720px) {
      body { padding: 16px; }
      .certificate { padding: 24px; border-radius: 14px; }
      h1 { font-size: 30px; }
      .grid, .verify { grid-template-columns: 1fr; }
    }
    @media print {
      body { background: #fff; padding: 0; }
      .certificate { box-shadow: none; border: 1px solid #d2d2d7; }
    }
  </style>
</head>
<body>
  <main class="certificate">
    <div class="brand">Warrantee.</div>
    <h1>${isAr ? "شهادة ضمان موثقة" : "Verified Warranty Certificate"}</h1>
    <p class="subtitle">${isAr ? "هذه شهادة عامة آمنة للتحقق من صحة الضمان دون كشف بيانات الحساب الخاصة." : "This public-safe certificate confirms warranty authenticity without exposing private account data."}</p>
    <div class="status">${statusText}</div>

    <section class="grid" aria-label="${isAr ? "تفاصيل الضمان" : "Warranty details"}">
      <div class="field"><div class="label">${isAr ? "المنتج" : "Product"}</div><div class="value">${productName}</div></div>
      <div class="field"><div class="label">${isAr ? "المرجع" : "Reference"}</div><div class="value">${referenceNumber}</div></div>
      <div class="field"><div class="label">${isAr ? "الرقم التسلسلي" : "Serial Number"}</div><div class="value">${serialNumber}</div></div>
      <div class="field"><div class="label">${isAr ? "الفئة" : "Category"}</div><div class="value">${category}</div></div>
      <div class="field"><div class="label">${isAr ? "تاريخ البداية" : "Start Date"}</div><div class="value">${escapeHtml(formatDate(data.start_date, locale))}</div></div>
      <div class="field"><div class="label">${isAr ? "تاريخ الانتهاء" : "End Date"}</div><div class="value">${escapeHtml(formatDate(data.end_date, locale))}</div></div>
      <div class="field"><div class="label">${isAr ? "البائع" : "Seller"}</div><div class="value">${sellerName}</div></div>
      <div class="field"><div class="label">${isAr ? "الحالة" : "Status"}</div><div class="value">${statusText}</div></div>
    </section>

    <section class="verify">
      <img class="qr" src="${qrDataUrl}" alt="${isAr ? "رمز تحقق QR" : "Verification QR code"}">
      <div>
        <p class="verify-title">${isAr ? "امسح للتحقق المباشر" : "Scan for live verification"}</p>
        <p class="verify-copy">${isAr ? "يعيد رمز QR فتح جواز المنتج المباشر في Warrantee للتحقق من أحدث حالة للضمان." : "The QR code opens the live Warrantee product passport so the latest warranty state can be checked any time."}</p>
        <p class="url">${safeVerifyUrl}</p>
      </div>
    </section>

    <p class="footer">${isAr ? "صادر عبر منصة Warrantee | الحقول العامة فقط" : "Issued via Warrantee Platform | public-safe fields only"}</p>
  </main>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Content-Disposition": `inline; filename="warranty-${data.id}-certificate.html"`,
      "Content-Security-Policy": "default-src 'none'; img-src data:; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex",
      Vary: "Accept-Language",
    },
  });
}
