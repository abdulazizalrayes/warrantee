// @ts-nocheck
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { validateWarrantyInput, isValidDate, sanitizeString, isOneOf, VALID_WARRANTY_STATUSES } from "@/lib/validation";
import { apiRateLimit, getClientIp, getRateLimitHeaders } from "@/lib/rate-limit";
import {
  buildWarrantyAccessOrClause,
  buildBuyerWarrantyAccessOrClause,
  buildSellerWarrantyAccessOrClause,
  buildWarrantyOwnershipInsert,
} from "@/lib/warranty-access";

function generateReferenceNumber() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `WR-${timestamp}-${random}`;
}

export async function GET(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rateLimitResult = await apiRateLimit(ip);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
      );
    }

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams?.get("status");
    const view = searchParams?.get("view");
    const search = sanitizeString(searchParams?.get("q") || "", 80);
    const limitParam = parseInt(searchParams?.get("limit") || "50");
    const offsetParam = parseInt(searchParams?.get("offset") || "0");

    // Validate pagination params
    const limit = Math.min(Math.max(1, isNaN(limitParam) ? 50 : limitParam), 100);
    const offset = Math.max(0, isNaN(offsetParam) ? 0 : offsetParam);

    // Validate status filter
    if (status && !isOneOf(status, VALID_WARRANTY_STATUSES)) {
      return NextResponse.json(
        { error: "Invalid status filter. Must be one of: " + VALID_WARRANTY_STATUSES.join(", ") },
        { status: 400 }
      );
    }

    const accessFilter =
      view === "seller"
        ? buildSellerWarrantyAccessOrClause(user.id)
        : view === "buyer"
          ? buildBuyerWarrantyAccessOrClause(user.id)
          : buildWarrantyAccessOrClause(user.id);

    let query = supabase
      .from("warranties")
      .select("*", { count: "exact" })
      .or(accessFilter)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq("status", status);
    if (search) {
      query = query.or(
        [
          `product_name.ilike.%${search}%`,
          `product_name_ar.ilike.%${search}%`,
          `serial_number.ilike.%${search}%`,
          `reference_number.ilike.%${search}%`,
          `seller_name.ilike.%${search}%`,
          `seller_email.ilike.%${search}%`,
          `sku.ilike.%${search}%`,
        ].join(",")
      );
    }

    const { data, error, count } = await query;

    if (error) {
      console.warn("Warranties fetch error:", error.message);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    return NextResponse.json({
      data,
      pagination: { total: count, limit, offset },
    });
  } catch (err) {
    console.warn("Warranties GET error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rateLimitResult = await apiRateLimit(ip);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
      );
    }

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const required = [
      ["product_name", body.product_name],
      ["start_date", body.start_date || body.warranty_start_date || body.purchase_date],
      ["end_date", body.end_date || body.warranty_end_date],
    ] as const;
    const missing = required.filter(([, value]) => !value).map(([field]) => field);
    if (missing.length > 0) {
      return NextResponse.json(
        { error: "Missing required fields: " + missing.join(", ") },
        { status: 400 }
      );
    }

    // Validate field types and lengths
    const validation = validateWarrantyInput(body);
    if (!validation.valid) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.errors },
        { status: 400 }
      );
    }

    // Validate dates
    const startDate = body.start_date || body.warranty_start_date || body.purchase_date;
    const endDate = body.end_date || body.warranty_end_date;

    if (!isValidDate(startDate)) {
      return NextResponse.json({ error: "Invalid start_date format" }, { status: 400 });
    }
    if (!isValidDate(endDate)) {
      return NextResponse.json({ error: "Invalid end_date format" }, { status: 400 });
    }

    if (new Date(endDate) <= new Date(startDate)) {
      return NextResponse.json(
        { error: "end_date must be after start_date" },
        { status: 400 }
      );
    }

    // Sanitize string fields
    const requestedStatus =
      typeof body.status === "string" && isOneOf(body.status, VALID_WARRANTY_STATUSES)
        ? body.status
        : "active";

    const sanitizedBody = {
      reference_number:
        typeof body.reference_number === "string" && body.reference_number.trim().length > 0
          ? sanitizeString(body.reference_number, 60)
          : generateReferenceNumber(),
      product_name: sanitizeString(body.product_name, 200),
      product_name_ar: body.product_name_ar ? sanitizeString(body.product_name_ar, 200) : undefined,
      sku: body.sku ? sanitizeString(body.sku, 100) : undefined,
      quantity:
        typeof body.quantity === "number" && Number.isFinite(body.quantity) && body.quantity > 0
          ? Math.floor(body.quantity)
          : undefined,
      start_date: startDate,
      end_date: endDate,
      description: body.description ? sanitizeString(body.description, 5000) : undefined,
      serial_number: body.serial_number ? sanitizeString(body.serial_number, 100) : undefined,
      category: body.category ? sanitizeString(body.category, 50) : undefined,
      seller_name: body.seller_name ? sanitizeString(body.seller_name, 200) : undefined,
      seller_email: body.seller_email ? sanitizeString(body.seller_email, 200) : undefined,
      po_reference: body.po_reference ? sanitizeString(body.po_reference, 200) : undefined,
      invoice_reference: body.invoice_reference ? sanitizeString(body.invoice_reference, 200) : undefined,
      terms_and_conditions: body.terms_and_conditions
        ? sanitizeString(body.terms_and_conditions, 5000)
        : undefined,
      custom_clauses: body.custom_clauses ? sanitizeString(body.custom_clauses, 5000) : undefined,
      language:
        body.language === "ar" || body.language === "en" ? body.language : undefined,
      purchase_price: body.purchase_price,
      source: body.source ? sanitizeString(body.source, 50) : "manual",
      coverage_type: body.coverage_type ? sanitizeString(body.coverage_type, 50) : "standard",
      ...buildWarrantyOwnershipInsert(user.id),
      status: requestedStatus,
    };

    // Remove undefined fields
    const cleanBody = Object.fromEntries(
      Object.entries(sanitizedBody).filter(([_, v]) => v !== undefined)
    );

    const { data, error } = await supabase
      .from("warranties")
      .insert(cleanBody)
      .select()
      .single();

    if (error) {
      console.warn("Warranty insert error:", error.message);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    // Audit log — non-blocking
    supabase.from("activity_log").insert({
      actor_id: user.id,
      entity_type: "warranty",
      entity_id: data.id,
      action: "created",
      new_state: { status: data.status, product_name: data.product_name },
    }).then(() => {});

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.warn("Warranties POST error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
