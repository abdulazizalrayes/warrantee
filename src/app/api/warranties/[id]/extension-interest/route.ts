import { NextRequest, NextResponse } from "next/server";
import { apiRateLimit, getClientIp, getRateLimitHeaders } from "@/lib/rate-limit";
import { isTrustedSameOriginRequest } from "@/lib/request-origin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isValidUUID } from "@/lib/validation";
import { canViewWarrantyForUser } from "@/lib/warranty-access";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isValidUUID(id)) {
    return NextResponse.json({ error: "Invalid warranty ID" }, { status: 400 });
  }

  const rateLimitResult = await apiRateLimit(`${getClientIp(request)}:${id}`);
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: getRateLimitHeaders(rateLimitResult) },
    );
  }

  if (!isTrustedSameOriginRequest(request, request.nextUrl.origin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: warranty } = await supabase
    .from("warranties")
    .select("id, user_id, created_by, seller_id, issuer_user_id, recipient_user_id, buyer_id")
    .eq("id", id)
    .single();

  if (!warranty) {
    return NextResponse.json({ error: "Warranty not found" }, { status: 404 });
  }

  if (!await canViewWarrantyForUser(supabase, warranty, user.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const requestedMonths = Number(body.extensionMonths);
  if (!Number.isInteger(requestedMonths) || requestedMonths < 1 || requestedMonths > 120) {
    return NextResponse.json({ error: "extensionMonths must be an integer from 1 to 120" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data: existingRequest, error: requestLookupError } = await admin
    .from("warranty_extension_requests")
    .select("id, requested_months, status, created_at, updated_at")
    .eq("warranty_id", id)
    .eq("requester_id", user.id)
    .in("status", ["requested", "reviewing", "quoted"])
    .maybeSingle();

  if (requestLookupError) {
    return NextResponse.json({ error: "Failed to check extension requests" }, { status: 500 });
  }

  let extensionRequest = existingRequest;
  if (existingRequest) {
    if (existingRequest.status === "quoted" && existingRequest.requested_months !== requestedMonths) {
      return NextResponse.json(
        { error: "A quoted extension request already exists and cannot be changed" },
        { status: 409 },
      );
    }

    if (existingRequest.status !== "quoted" && existingRequest.requested_months !== requestedMonths) {
      const { data, error } = await admin
        .from("warranty_extension_requests")
        .update({ requested_months: requestedMonths, updated_at: new Date().toISOString() })
        .eq("id", existingRequest.id)
        .select("id, requested_months, status, created_at, updated_at")
        .single();
      if (error || !data) {
        return NextResponse.json({ error: "Failed to update extension request" }, { status: 500 });
      }
      extensionRequest = data;
    }
  } else {
    const { data, error } = await admin
      .from("warranty_extension_requests")
      .insert({
        warranty_id: id,
        requester_id: user.id,
        requested_months: requestedMonths,
        status: "requested",
      })
      .select("id, requested_months, status, created_at, updated_at")
      .single();
    if (error || !data) {
      return NextResponse.json({ error: "Failed to create extension request" }, { status: 500 });
    }
    extensionRequest = data;
  }

  const { error } = await supabase.from("activity_log").insert({
    actor_id: user.id,
    entity_type: "warranty",
    entity_id: id,
    action: "extension_interest_registered",
    metadata: {
      extension_request_id: extensionRequest?.id,
      requested_months: requestedMonths,
      source: "extension_request",
      created_at: new Date().toISOString(),
    },
  });

  if (error) {
    return NextResponse.json({ error: "Failed to record wishlist interest" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: extensionRequest });
}
