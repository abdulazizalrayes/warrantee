// @ts-nocheck
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { validateClaimInput } from "@/lib/validation";
import { apiRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";
import { buildWarrantyAccessOrClause } from "@/lib/warranty-access";

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

    const { data: visibleWarranties, error: warrantyListError } = await supabase
      .from("warranties")
      .select("id")
      .or(buildWarrantyAccessOrClause(user.id));

    if (warrantyListError) {
      console.warn("Claim warranty scope fetch error:", warrantyListError.message);
      return NextResponse.json({ error: warrantyListError.message }, { status: 500 });
    }

    const warrantyIds = (visibleWarranties || []).map((warranty) => warranty.id);
    if (warrantyIds.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const { data, error } = await supabase
      .from("warranty_claims")
      .select("*, warranties(product_name)")
      .in("warranty_id", warrantyIds)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Claims fetch error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.warn("Claims GET error:", err);
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
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const validation = validateClaimInput(body);
    if (!validation.valid) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.errors },
        { status: 400 }
      );
    }

    const { warranty_id, claim_type, description } = validation.sanitized!;

    // Verify the warranty belongs to the user
    const { data: warranty, error: warrantyError } = await supabase
      .from("warranties")
      .select("id, status, user_id, buyer_id, recipient_user_id")
      .eq("id", warranty_id)
      .or(buildWarrantyAccessOrClause(user.id))
      .single();

    if (warrantyError || !warranty) {
      return NextResponse.json(
        { error: "Warranty not found or does not belong to you" },
        { status: 404 }
      );
    }

    if (warranty.status !== "active" && warranty.status !== "renewed") {
      return NextResponse.json(
        { error: "Claims can only be filed against active warranties" },
        { status: 400 }
      );
    }

    const canFileClaim =
      warranty.user_id === user.id ||
      warranty.buyer_id === user.id ||
      warranty.recipient_user_id === user.id;

    if (!canFileClaim) {
      return NextResponse.json(
        { error: "Only the warranty holder or recipient can file a claim" },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from("warranty_claims")
      .insert({
        warranty_id,
        user_id: user.id,
        claim_type,
        description,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.warn("Claim insert error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.warn("Claims POST error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
