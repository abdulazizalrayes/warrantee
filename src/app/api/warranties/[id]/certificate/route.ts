import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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

  const { data: warranty, error } = await supabase
    .from("warranties")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !warranty) {
    return NextResponse.json({ error: "Warranty not found" }, { status: 404 });
  }

  const locale = warranty.language || "en";
  const isAr = locale === "ar";
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://warrantee.io";
  const verifyUrl = `${baseUrl}/${locale}/verify/${id}`;

  const now = new Date();
  const endDate = new Date(warranty.end_date);
  const isActive = endDate > now && warranty.status === "active";

  const html = `<!DOCTYPE html>
<html dir="${isAr ? "rtl" : "ltr"}" lang="${locale}">
<head><meta charset="UTF-8"><title>${isAr ? "شهادة ضمان" : "Warranty Certificate"}</title>
<style>
  body { font-family: Arial, sans-serif; margin: 0; padding: 40px; background: #fff; color: #1A1A2E; }
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
    <div class="field"><label>${isAr ? "المنتج" : "Product"}</label><p>${warranty.product_name}</p></div>
    <div class="field"><label>${isAr ? "الرقم المرجعي" : "Reference"}</label><p>${warranty.reference_number}</p></div>
    <div class="field"><label>${isAr ? "الرقم التسلسلي" : "Serial Number"}</label><p>${warranty.serial_number || "-"}</p></div>
    <div class="field"><label>${isAr ? "الفئة" : "Category"}</label><p>${warranty.category || "-"}</p></div>
    <div class="field"><label>${isAr ? "تاريخ البداية" : "Start Date"}</label><p>${warranty.start_date}</p></div>
    <div class="field"><label>${isAr ? "تاريخ الانتهاء" : "End Date"}</label><p>${warranty.end_date}</p></div>
  </div>
  <div class="qr">
    <img src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(verifyUrl)}" alt="QR Code" />
    <div class="ref">${isAr ? "امسح للتحقق" : "Scan to verify"} | ${verifyUrl}</div>
  </div>
  <div class="footer">${isAr ? "صادر عن منصة ضمانتي" : "Issued by Warrantee Platform"} | warrantee.io</div>
</div>
</body></html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
