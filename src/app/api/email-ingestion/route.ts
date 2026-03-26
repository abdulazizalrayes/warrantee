import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Parse warranty data from OCR/email text using regex patterns
function extractWarrantyData(text: string) {
  const data: Record<string, string> = {};

  // Product name patterns
  const productPatterns = [
    /(?:product|item|model|device)[:\s]+([^\n,]+)/i,
    /(?:\u0645\u0646\u062a\u062c|\u062c\u0647\u0627\u0632|\u0635\u0646\u0641)[:\s]+([^\n,]+)/i,
  ];
  for (const p of productPatterns) {
    const m = text.match(p);
    if (m) { data.product_name = m[1].trim(); break; }
  }

  // Serial number
  const serialPatterns = [
    /(?:serial|s\/n|sn)[:\s#]+([A-Za-z0-9\-]+)/i,
    /(?:\u0631\u0642\u0645 \u0627\u0644\u062a\u0633\u0644\u0633\u0644)[:\s]+([A-Za-z0-9\-]+)/i,
  ];
  for (const p of serialPatterns) {
    const m = text.match(p);
    if (m) { data.serial_number = m[1].trim(); break; }
  }

  // Date patterns (warranty start/purchase date)
  const datePatterns = [
    /(?:date|purchase date|warranty start|bought on|purchased)[:\s]+([\d]{1,4}[\-\/\.][\d]{1,2}[\-\/\.][\d]{1,4})/i,
    /(?:\u062a\u0627\u0631\u064a\u062e|\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0634\u0631\u0627\u0621)[:\s]+([\d]{1,4}[\-\/\.][\d]{1,2}[\-\/\.][\d]{1,4})/i,
  ];
  for (const p of datePatterns) {
    const m = text.match(p);
    if (m) { data.start_date = m[1].trim(); break; }
  }

  // Warranty period / end date
  const periodPatterns = [
    /(?:warranty|guarantee|valid)[:\s]+(?:for\s+)?(\d+)\s*(?:year|month|yr|mo)/i,
    /(?:warranty end|expiry|expires)[:\s]+([\d]{1,4}[\-\/\.][\d]{1,2}[\-\/\.][\d]{1,4})/i,
    /(?:\u0636\u0645\u0627\u0646|\u0635\u0644\u0627\u062d\u064a\u0629)[:\s]+(\d+)\s*(?:\u0633\u0646\u0629|\u0634\u0647\u0631)/i,
  ];
  for (const p of periodPatterns) {
    const m = text.match(p);
    if (m) { data.warranty_period = m[1].trim(); break; }
  }

  // Seller/vendor name
  const sellerPatterns = [
    /(?:seller|vendor|store|shop|retailer|sold by|from)[:\s]+([^\n,]+)/i,
    /(?:\u0627\u0644\u0628\u0627\u0626\u0639|\u0627\u0644\u0645\u062a\u062c\u0631|\u0627\u0644\u0645\u0648\u0631\u062f)[:\s]+([^\n,]+)/i,
  ];
  for (const p of sellerPatterns) {
    const m = text.match(p);
    if (m) { data.seller_name = m[1].trim(); break; }
  }

  // Invoice/PO reference
  const refPatterns = [
    /(?:invoice|inv|receipt|order)[:\s#]+([A-Za-z0-9\-]+)/i,
    /(?:\u0641\u0627\u062a\u0648\u0631\u0629|\u0631\u0642\u0645 \u0627\u0644\u0637\u0644\u0628)[:\s#]+([A-Za-z0-9\-]+)/i,
  ];
  for (const p of refPatterns) {
    const m = text.match(p);
    if (m) { data.invoice_reference = m[1].trim(); break; }
  }

  // Category
  const catPatterns = [
    /(?:category|type|department)[:\s]+([^\n,]+)/i,
  ];
  for (const p of catPatterns) {
    const m = text.match(p);
    if (m) { data.category = m[1].trim(); break; }
  }

  return data;
}

// Compute confidence score based on how many fields were extracted
function computeConfidence(data: Record<string, string>): number {
  const weights: Record<string, number> = {
    product_name: 30, serial_number: 15, start_date: 20,
    warranty_period: 15, seller_name: 10, invoice_reference: 5, category: 5,
  };
  let score = 0;
  for (const [key, weight] of Object.entries(weights)) {
    if (data[key]) score += weight;
  }
  return Math.min(score, 100);
}

// Parse date string into YYYY-MM-DD
function parseDate(dateStr: string): string | null {
  const cleaned = dateStr.replace(/[\/\.]/g, "-");
  const parts = cleaned.split("-");
  if (parts.length !== 3) return null;
  let [a, b, c] = parts.map(Number);
  // Handle DD-MM-YYYY or YYYY-MM-DD
  if (a > 31) return cleaned; // Already YYYY-MM-DD
  if (c > 31) return c + "-" + String(b).padStart(2, "0") + "-" + String(a).padStart(2, "0");
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let fromEmail = "";
    let subject = "";
    let textBody = "";
    let htmlBody = "";
    let attachmentTexts: string[] = [];
    let userId: string | null = null;

    // Handle multipart form data (SendGrid/Postmark inbound parse)
    if (contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await request.formData();
      fromEmail = (formData.get("from") as string) || (formData.get("sender") as string) || "";
      subject = (formData.get("subject") as string) || "";
      textBody = (formData.get("text") as string) || (formData.get("TextBody") as string) || "";
      htmlBody = (formData.get("html") as string) || (formData.get("HtmlBody") as string) || "";

      // Extract sender email from "Name <email>" format
      const emailMatch = fromEmail.match(/<([^>]+)>/);
      if (emailMatch) fromEmail = emailMatch[1];

      // Process attachments — SendGrid sends them as numbered fields
      const attachmentCount = parseInt((formData.get("attachments") as string) || "0");
      for (let i = 1; i <= Math.max(attachmentCount, 10); i++) {
        const att = formData.get("attachment" + i) as File | null;
        if (!att) continue;

        const attType = att.type || "";
        // For images and PDFs, send to OCR endpoint
        if (attType.startsWith("image/") || attType === "application/pdf") {
          try {
            const buffer = await att.arrayBuffer();
            const base64 = Buffer.from(buffer).toString("base64");
            const dataUri = "data:" + attType + ";base64," + base64;

            // Call our OCR API route
            const ocrUrl = new URL("/api/ocr", request.url);
            const ocrRes = await fetch(ocrUrl.toString(), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ image: dataUri }),
            });
            if (ocrRes.ok) {
              const ocrData = await ocrRes.json();
              if (ocrData.text) attachmentTexts.push(ocrData.text);
            }
          } catch (e) {
            console.error("OCR failed for attachment:", e);
          }
        }
        // For text files, read directly
        else if (attType.startsWith("text/")) {
          try {
            attachmentTexts.push(await att.text());
          } catch (e) { /* skip */ }
        }
      }

      // Also handle Postmark-style attachments in JSON
      const attachmentsJson = formData.get("Attachments") as string;
      if (attachmentsJson) {
        try {
          const atts = JSON.parse(attachmentsJson);
          for (const att of atts) {
            if (att.ContentType?.startsWith("image/") || att.ContentType === "application/pdf") {
              const dataUri = "data:" + att.ContentType + ";base64," + att.Content;
              const ocrUrl = new URL("/api/ocr", request.url);
              const ocrRes = await fetch(ocrUrl.toString(), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ image: dataUri }),
              });
              if (ocrRes.ok) {
                const ocrData = await ocrRes.json();
                if (ocrData.text) attachmentTexts.push(ocrData.text);
              }
            }
          }
        } catch (e) { /* not JSON */ }
      }
    }
    // Handle JSON body (direct API call)
    else {
      const json = await request.json();
      fromEmail = json.from || json.sender || json.email || "";
      subject = json.subject || "";
      textBody = json.text || json.body || "";
      if (json.attachment_text) attachmentTexts.push(json.attachment_text);
    }

    // Look up user by email
    if (fromEmail) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("email", fromEmail.toLowerCase())
        .single();
      if (profile) userId = profile.id;
    }

    if (!userId) {
      // Try to find user in auth.users
      const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
      const authUser = users?.find((u) => u.email?.toLowerCase() === fromEmail.toLowerCase());
      if (authUser) userId = authUser.id;
    }

    if (!userId) {
      return NextResponse.json(
        { error: "No account found for email: " + fromEmail + ". Please sign up at warrantee.io first." },
        { status: 404 }
      );
    }

    // Combine all text sources for extraction
    const allText = [subject, textBody, ...attachmentTexts].join("\n");
    const extractedData = extractWarrantyData(allText);
    const confidence = computeConfidence(extractedData);

    // Calculate dates
    let startDate = extractedData.start_date ? parseDate(extractedData.start_date) : null;
    if (!startDate) startDate = new Date().toISOString().split("T")[0];

    let endDate: string | null = null;
    if (extractedData.warranty_period) {
      const period = parseInt(extractedData.warranty_period);
      const start = new Date(startDate);
      if (allText.toLowerCase().includes("month") || allText.includes("\u0634\u0647\u0631")) {
        start.setMonth(start.getMonth() + period);
      } else {
        start.setFullYear(start.getFullYear() + period);
      }
      endDate = start.toISOString().split("T")[0];
    }
    if (!endDate) {
      const d = new Date(startDate);
      d.setFullYear(d.getFullYear() + 1);
      endDate = d.toISOString().split("T")[0];
    }

    // Log the ingestion
    const { data: ingestion } = await supabaseAdmin.from("email_ingestion").insert({
      user_id: userId,
      from_email: fromEmail,
      subject: subject,
      extracted_data: extractedData,
      confidence_score: confidence,
      status: confidence >= 30 ? "extracted" : "received",
    }).select().single();

    // Auto-create warranty if confidence is high enough
    let warranty = null;
    if (confidence >= 30 && extractedData.product_name) {
      const { data: newWarranty } = await supabaseAdmin.from("warranties").insert({
        product_name: extractedData.product_name,
        serial_number: extractedData.serial_number || null,
        start_date: startDate,
        end_date: endDate,
        seller_name: extractedData.seller_name || null,
        invoice_reference: extractedData.invoice_reference || null,
        category: extractedData.category || null,
        created_by: userId,
        status: confidence >= 60 ? "active" : "draft",
        is_self_registered: true,
        language: allText.match(/[\u0600-\u06FF]/) ? "ar" : "en",
      }).select().single();

      warranty = newWarranty;

      // Link warranty to ingestion record
      if (warranty && ingestion) {
        await supabaseAdmin.from("email_ingestion").update({
          warranty_id: warranty.id,
          status: "confirmed",
        }).eq("id", ingestion.id);
      }
    }

    return NextResponse.json({
      success: true,
      message: warranty
        ? "Warranty auto-created from email"
        : "Email received but confidence too low for auto-creation. Please add manually.",
      confidence,
      extracted: extractedData,
      warranty_id: warranty?.id || null,
      warranty_ref: warranty?.reference_number || null,
      status: warranty ? warranty.status : "needs_review",
    });

  } catch (error: unknown) {
    console.error("Email ingestion error:", error);
    return NextResponse.json(
      { error: "Failed to process email", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
