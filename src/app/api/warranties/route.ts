// @ts-nocheck
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { validateWarrantyInput, isValidDate, sanitizeString, isOneOf, VALID_WARRANTY_STATUSES } from "@/lib/validation";
import { apiRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";
import { buildWarrantyAccessOrClause, buildWarrantyOwnershipInsert } from "@/lib/warranty-access";

export async function GET(request: NextRequest) {
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
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const limitParam = parseInt(searchParams.get("limit") || "50");
    const offsetParam = parseInt(searchParams.get("offset") || "0");

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

    let query = supabase
      .from("warranties")
      .select("*", { count: "exact" })
      .or(buildWarrantyAccessOrClause(user.id))
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq("status", status);

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
    const ip = request.headers.get("x-forwarded-for") || "unknown";
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

    // Validate required fields
    const purchaseDate = body.purchase_date || body.start_date;
    const warrantyStartDate = body.warranty_start_date || body.start_date;
    const warrantyEndDate = body.warranty_end_date || body.end_date;

    const required = [
      ["product_name", body.product_name],
      ["purchase_date", purchaseDate],
      ["warranty_start_date", warrantyStartDate],
      ["warranty_end_date", warrantyEndDate],
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
    if (!isValidDate(purchaseDate)) {
      return NextResponse.json({ error: "Invalid purchase_date format" }, { status: 400 });
    }
    if (!isValidDate(warrantyStartDate)) {
      return NextResponse.json({ error: "Invalid warranty_start_date format" }, { status: 400 });
    }
    if (!isValidDate(warrantyEndDate)) {
      return NextResponse.json({ error: "Invalid warranty_end_date format" }, { status: 400 });
    }

    if (new Date(warrantyEndDate) <= new Date(warrantyStartDate)) {
      return NextResponse.json(
        { error: "warranty_end_date must be after warranty_start_date" },
        { status: 400 }
      );
    }

    // Sanitize string fields
    const sanitizedBody = {
      product_name: sanitizeString(body.product_name, 200),
      brand: body.brand ? sanitizeString(body.brand, 200) : undefined,
      purchase_date: purchaseDate,
      warranty_start_date: warrantyStartDate,
      warranty_end_date: warrantyEndDate,
      description: body.description ? sanitizeString(body.description, 5000) : undefined,
      serial_number: body.serial_number ? sanitizeString(body.serial_number, 100) : undefined,
      category: body.category ? sanitizeString(body.category, 50) : undefined,
      supplier: body.supplier ? sanitizeString(body.supplier, 200) : undefined,
      purchase_price: body.purchase_price,
      ...buildWarrantyOwnershipInsert(user.id),
      status: "active",
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
