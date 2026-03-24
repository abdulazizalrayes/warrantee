import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

// AI-enhanced parsing for warranty emails
function parseWarrantyEmail(subject: string, body: string, from: string) {
  const result: Record<string, any> = { confidence: 0 };

  // Product name extraction
  const productPatterns = [
    /(?:warranty|guarantee|coverage)\s+(?:for|of|on)\s+(.+?)(?:\.|\n|$)/i,
    /(?:product|item|device)[:;]?\s*(.+?)(?:\.|\n|$)/i,
    /(?:purchased|bought|ordered)\s+(?:a\s+)?(.+?)(?:\s+on|\s+from|\.|\n|$)/i,
  ];
  for (const p of productPatterns) {
    const m = body.match(p) || subject.match(p);
    if (m) { result.product_name = m[1].trim(); result.confidence += 0.2; break; }
  }

  // Serial number extraction
  const serialPatterns = [
    /(?:serial|s\/n|sn|model)\s*(?:number|no|#)?[:;]?\s*([A-Za-z0-9-]+)/i,
    /(?:IMEI|SKU)[:;]?\s*([A-Za-z0-9-]+)/i,
  ];
  for (const p of serialPatterns) {
    const m = body.match(p);
    if (m) { result.serial_number = m[1].trim(); result.confidence += 0.2; break; }
  }

  // Date extraction
  const datePatterns = [
    /(?:purchased|bought|date)\s*(?:on|of)?[:;]?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    /(?:warranty\s+(?:start|begin))\s*[:;]?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    /(\d{4}-\d{2}-\d{2})/,
  ];
  for (const p of datePatterns) {
    const m = body.match(p);
    if (m) { result.start_date = m[1]; result.confidence += 0.2; break; }
  }

  // Duration/end date
  const durationPatterns = [
    /(\d+)\s*(?:year|yr)s?\s*(?:warranty|guarantee|coverage)/i,
    /(?:warranty|guarantee|coverage)\s*(?:period|duration)?[:;]?\s*(\d+)\s*(?:year|yr|month|mo)/i,
    /(?:expires?|expiry|valid until)[:;]?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
  ];
  for (const p of durationPatterns) {
    const m = body.match(p);
    if (m) { result.duration_hint = m[0]; result.confidence += 0.2; break; }
  }

  // Supplier extraction from email domain
  if (from) {
    const domain = from.split("@")[1]?.split(".")[0];
    if (domain && !["gmail", "yahoo", "outlook", "hotmail", "icloud"].includes(domain.toLowerCase())) {
      result.supplier = domain.charAt(0).toUpperCase() + domain.slice(1);
      result.confidence += 0.1;
    }
  }

  // Category detection
  const categories: Record<string, string[]> = {
    electronics: ["phone", "laptop", "computer", "tv", "tablet", "camera", "headphone", "speaker", "monitor"],
    appliances: ["washer", "dryer", "fridge", "refrigerator", "oven", "microwave", "dishwasher", "ac", "air conditioner"],
    automotive: ["car", "vehicle", "tire", "battery", "engine", "auto"],
    furniture: ["sofa", "chair", "table", "desk", "bed", "mattress"],
  };
  const lowerBody = (subject + " " + body).toLowerCase();
  for (const [cat, keywords] of Object.entries(categories)) {
    if (keywords.some(k => lowerBody.includes(k))) {
      result.category = cat;
      result.confidence += 0.1;
      break;
    }
  }

  return result;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { from, subject, html, text, to } = body;
    const emailBody = text || html || "";

    // AI parsing
    const parsed = parseWarrantyEmail(subject || "", emailBody, from || "");

    // Find user by email
    const recipientEmail = Array.isArray(to) ? to[0] : to;
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", recipientEmail)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "User not found", parsed }, { status: 404 });
    }

    // Create warranty if confidence high enough
    if (parsed.confidence >= 0.4 && parsed.product_name) {
      const startDate = parsed.start_date ? new Date(parsed.start_date) : new Date();
      const endDate = new Date(startDate);
      endDate.setFullYear(endDate.getFullYear() + 1); // default 1 year

      const { data: warranty, error } = await supabase.from("warranties").insert({
        user_id: profile.id,
        product_name: parsed.product_name,
        serial_number: parsed.serial_number || null,
        start_date: startDate.toISOString().split("T")[0],
        end_date: endDate.toISOString().split("T")[0],
        status: "pending",
        category: parsed.category || "other",
        supplier: parsed.supplier || null,
        description: `Auto-imported from email: ${subject}`,
      }).select().single();

      if (warranty) {
        // Notify user
        await supabase.from("notifications").insert({
          user_id: profile.id,
          warranty_id: warranty.id,
          type: "warranty_imported",
          title: "Warranty imported from email",
          message: `A warranty for ${parsed.product_name} was automatically imported. Please review.`,
        });

        return NextResponse.json({
          success: true,
          warranty_id: warranty.id,
          parsed,
          message: "Warranty created from email",
        });
      }
    }

    return NextResponse.json({
      success: false,
      parsed,
      message: parsed.confidence < 0.4 ? "Low confidence - manual review needed" : "Missing product name",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: "Email ingestion endpoint active",
    capabilities: ["product_name", "serial_number", "dates", "supplier", "category"],
    minimum_confidence: 0.4,
  });
}
