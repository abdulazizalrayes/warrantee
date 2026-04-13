// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { apiRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const MAX_OCR_TEXT_LENGTH = 50000;

async function extractTextFromImage(dataUri: string) {
  const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;
  if (!apiKey) {
    throw new Error("Image OCR requires GOOGLE_CLOUD_VISION_API_KEY");
  }

  const base64 = dataUri.includes(",") ? dataUri.split(",")[1] : dataUri;
  const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: [
        {
          image: { content: base64 },
          features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
        },
      ],
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Vision OCR failed: ${details}`);
  }

  const payload = await response.json();
  return payload.responses?.[0]?.fullTextAnnotation?.text || payload.responses?.[0]?.textAnnotations?.[0]?.description || "";
}

// Warranty field extraction from OCR text
function extractWarrantyFields(text: string) {
  const result: Record<string, any> = { confidence: 0, raw_text: text.substring(0, 500) };

  // Product name patterns
  const productPatterns = [
    /(?:product|item|device|model|equipment)\s*(?:name|description)?\s*[:;\-]?\s*(.+?)(?:\n|\r|$)/i,
    /(?:warranty|guarantee)\s+(?:for|of|on)\s+(.+?)(?:\.|\n|$)/i,
    /(?:purchased|bought)\s+(?:a\s+)?(.+?)(?:\s+on|\s+from|\.|\n|$)/i,
    /^([A-Z][A-Za-z0-9\s\-]+(?:Pro|Plus|Max|Ultra|Mini|Air)?)/m,
  ];

  for (const p of productPatterns) {
    const m = text.match(p);
    if (m && m[1].trim().length > 2 && m[1].trim().length < 100) {
      result.product_name = m[1].trim();
      result.confidence += 0.2;
      break;
    }
  }

  // Serial number
  const serialPatterns = [
    /(?:serial|s\/n|sn|imei|sku)\s*(?:number|no|#)?\s*[:;\-]?\s*([A-Za-z0-9\-]{4,30})/i,
    /(?:model)\s*(?:number|no|#)?\s*[:;\-]?\s*([A-Za-z0-9\-]{4,30})/i,
  ];

  for (const p of serialPatterns) {
    const m = text.match(p);
    if (m) {
      result.serial_number = m[1].trim();
      result.confidence += 0.15;
      break;
    }
  }

  // Dates
  const dateRegex = /(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{2,4})/g;
  const isoDateRegex = /(\d{4})[\-](\d{2})[\-](\d{2})/g;
  const dates: string[] = [];
  let dm;
  while ((dm = dateRegex.exec(text)) !== null) dates.push(dm[0]);
  while ((dm = isoDateRegex.exec(text)) !== null) dates.push(dm[0]);

  if (dates.length >= 1) {
    result.start_date = dates[0];
    result.confidence += 0.15;
  }
  if (dates.length >= 2) {
    result.end_date = dates[1];
    result.confidence += 0.15;
  }

  // Duration
  const durationPatterns = [
    /(\d+)\s*(?:year|yr)s?\s*(?:warranty|guarantee|coverage)/i,
    /(?:warranty|guarantee|coverage)\s*(?:period|duration)?\s*[:;]?\s*(\d+)\s*(?:year|yr|month|mo)/i,
    /(\d+)\s*(?:month|mo)s?\s*(?:warranty|guarantee|coverage)/i,
  ];

  for (const p of durationPatterns) {
    const m = text.match(p);
    if (m) {
      result.warranty_duration = m[0];
      result.confidence += 0.1;
      break;
    }
  }

  // Supplier / Seller
  const supplierPatterns = [
    /(?:seller|vendor|supplier|retailer|dealer|sold by|purchased from|store)\s*[:;\-]?\s*(.+?)(?:\n|\r|$)/i,
    /(?:company|manufacturer|brand)\s*[:;\-]?\s*(.+?)(?:\n|\r|$)/i,
  ];

  for (const p of supplierPatterns) {
    const m = text.match(p);
    if (m && m[1].trim().length > 1) {
      result.supplier = m[1].trim().substring(0, 100);
      result.confidence += 0.1;
      break;
    }
  }

  // Purchase price
  const pricePatterns = [
    /(?:price|amount|total|cost|paid)\s*[:;\-]?\s*(?:SAR|SR|\$|USD|EUR|\u00a3|\u20ac)?\s*([\d,]+\.?\d*)/i,
    /(?:SAR|SR|\$|USD|EUR)\s*([\d,]+\.?\d*)/i,
  ];

  for (const p of pricePatterns) {
    const m = text.match(p);
    if (m) {
      result.purchase_price = m[1].replace(/,/g, "");
      result.confidence += 0.1;
      break;
    }
  }

  // Category detection
  const categories: Record<string, string[]> = {
    electronics: ["phone", "laptop", "computer", "tv", "television", "tablet", "camera", "headphone", "speaker", "monitor", "iphone", "samsung", "macbook", "ipad"],
    appliances: ["washer", "dryer", "fridge", "refrigerator", "oven", "microwave", "dishwasher", "ac", "air conditioner", "washing machine"],
    automotive: ["car", "vehicle", "tire", "battery", "engine", "auto", "toyota", "honda", "bmw", "mercedes"],
    furniture: ["sofa", "chair", "table", "desk", "bed", "mattress", "wardrobe", "cabinet"],
    hvac: ["hvac", "heating", "ventilation", "cooling", "thermostat", "furnace"],
    machinery: ["generator", "pump", "compressor", "crane", "forklift", "drill"],
    construction: ["cement", "steel", "roofing", "insulation", "plywood", "brick"],
    software: ["license", "subscription", "software", "saas", "cloud"],
  };

  const lowerText = text.toLowerCase();
  for (const [cat, keywords] of Object.entries(categories)) {
    if (keywords.some((k) => lowerText.includes(k))) {
      result.category = cat;
      result.confidence += 0.05;
      break;
    }
  }

  // Invoice / PO reference
  const refPatterns = [
    /(?:invoice|inv)\s*(?:number|no|#|ref)?\s*[:;\-]?\s*([A-Za-z0-9\-\/]{3,30})/i,
    /(?:po|purchase order)\s*(?:number|no|#|ref)?\s*[:;\-]?\s*([A-Za-z0-9\-\/]{3,30})/i,
    /(?:receipt|order)\s*(?:number|no|#|ref)?\s*[:;\-]?\s*([A-Za-z0-9\-\/]{3,30})/i,
  ];

  for (const p of refPatterns) {
    const m = text.match(p);
    if (m) {
      result.invoice_reference = m[1].trim();
      result.confidence += 0.05;
      break;
    }
  }

  return result;
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

    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    let { text, image } = body;

    if (!text && typeof image === "string") {
      text = await extractTextFromImage(image);
    }

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Missing 'text' field. Send OCR-extracted text or an image data URI for parsing." },
        { status: 400 }
      );
    }

    if (text.length > MAX_OCR_TEXT_LENGTH) {
      return NextResponse.json(
        { error: `Text exceeds maximum length of ${MAX_OCR_TEXT_LENGTH} characters` },
        { status: 400 }
      );
    }

    const trimmedText = text.trim();
    if (trimmedText.length === 0) {
      return NextResponse.json(
        { error: "Text field cannot be empty" },
        { status: 400 }
      );
    }

    const fields = extractWarrantyFields(trimmedText);

    return NextResponse.json({
      success: true,
      text: trimmedText,
      fields,
      message:
        fields.confidence >= 0.3
          ? "Fields extracted successfully"
          : "Low confidence - some fields may need manual entry",
    });
  } catch (err) {
    console.warn("OCR parsing error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    const status = message.includes("GOOGLE_CLOUD_VISION_API_KEY") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function GET() {
  return NextResponse.json({
    status: "OCR parsing endpoint active",
    usage: "POST with { text: 'extracted OCR text' } or { image: 'data:image/png;base64,...' }",
    max_text_length: MAX_OCR_TEXT_LENGTH,
    fields: [
      "product_name",
      "serial_number",
      "start_date",
      "end_date",
      "warranty_duration",
      "supplier",
      "purchase_price",
      "category",
      "invoice_reference",
    ],
  });
}
