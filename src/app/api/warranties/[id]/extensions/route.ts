import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { canMutateWarranty, canViewWarranty } from "@/lib/warranty-access";
import { getExtensionEligibility } from "@/lib/extension-eligibility";
import { getLatestExtensionPolicy, hasApprovedPricedProvider } from "@/lib/extension-policy";

// GET /api/warranties/[id]/extensions — list extension offers for a warranty
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
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

  if (!canViewWarranty(warranty, user.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: extensions, error } = await supabase
    .from("warranty_extensions")
    .select("*")
    .eq("warranty_id", id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch extensions" }, { status: 500 });
  }

  return NextResponse.json({ data: extensions });
}

// POST /api/warranties/[id]/extensions — create an extension offer
// Body: { extension_months, price, currency?, terms?, purchase_now? }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: warranty, error: fetchError } = await supabase
    .from("warranties")
    .select("id, status, end_date, user_id, created_by, seller_id, issuer_user_id, recipient_user_id, buyer_id, product_name")
    .eq("id", id)
    .single();

  if (fetchError || !warranty) {
    return NextResponse.json({ error: "Warranty not found" }, { status: 404 });
  }

  if (!["active", "expired"].includes(warranty.status)) {
    return NextResponse.json(
      { error: `Extensions can only be offered on active or expired warranties (current: ${warranty.status})` },
      { status: 422 }
    );
  }

  if (!canMutateWarranty(warranty, user.id)) {
    return NextResponse.json(
      { error: "Only the warranty owner, seller, or issuer can create extension offers" },
      { status: 403 }
    );
  }

  const policy = await getLatestExtensionPolicy(supabase, id);
  const eligibility = getExtensionEligibility(warranty, policy);
  if (!eligibility.canOpenFlow) {
    return NextResponse.json(
      {
        error:
          eligibility.state === "seller_missing"
            ? "No on-platform seller is linked to this product, so extension offers cannot be created yet."
            : eligibility.state === "approval_required"
              ? "This product does not have an approved extension provider yet."
              : eligibility.state === "invalid_dates"
                ? "The warranty end date is invalid, so an extension cannot be created."
                : "This warranty is not eligible for extension.",
      },
      { status: 422 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const extensionMonths = Number(body.extension_months);
  if (!extensionMonths || extensionMonths < 1 || extensionMonths > 120) {
    return NextResponse.json(
      { error: "extension_months must be between 1 and 120" },
      { status: 400 }
    );
  }

  const currentEnd = new Date(warranty.end_date);
  if (Number.isNaN(currentEnd.getTime())) {
    return NextResponse.json(
      { error: "The warranty end date is invalid, so an extension cannot be created." },
      { status: 422 }
    );
  }
  const newEnd = new Date(currentEnd);
  newEnd.setMonth(newEnd.getMonth() + extensionMonths);

  const providerBackedOffer =
    !eligibility.hasOnPlatformSeller &&
    eligibility.hasApprovedFallbackProvider &&
    hasApprovedPricedProvider(policy);
  const requestedPrice = Number(body.price);
  const priceFromRequest = Number.isFinite(requestedPrice) && requestedPrice > 0 ? requestedPrice : null;
  const resolvedPrice = providerBackedOffer ? policy.price : priceFromRequest;
  const isQuoteRequest = !resolvedPrice || body.request_quote === true;
  const extensionRecord: Record<string, unknown> = {
    warranty_id: id,
    new_end_date: newEnd.toISOString().split("T")[0],
    price: isQuoteRequest ? null : resolvedPrice,
    currency: providerBackedOffer ? (policy.currency ?? body.currency ?? "SAR") : (body.currency ?? "SAR"),
    terms: providerBackedOffer ? (policy.coverageTerms ?? body.terms ?? null) : (body.terms ?? null),
    offered_by: user.id,
    is_purchased: false,
  };

  const purchaseNow = body.purchase_now === true;
  if (purchaseNow) {
    return NextResponse.json(
      { error: "Immediate purchase is disabled for safety. Create the offer first, then purchase it through the dedicated buyer flow." },
      { status: 422 }
    );
  }

  const { data: extension, error: insertError } = await supabase
    .from("warranty_extensions")
    .insert(extensionRecord)
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: "Failed to create extension" }, { status: 500 });
  }

  await supabase.from("activity_log").insert({
    actor_id: user.id,
    entity_type: "warranty",
    entity_id: id,
    action: providerBackedOffer
      ? "provider_extension_offer_created"
      : isQuoteRequest
        ? "warranty_extension_requested"
        : "warranty_extension_offer_created",
    metadata: {
      extension_months: extensionMonths,
      new_end_date: extensionRecord.new_end_date,
      request_type: eligibility.hasOnPlatformSeller ? "seller_quote" : "approved_provider_quote",
      policy_state: eligibility.state,
      provider_source: providerBackedOffer ? policy.source : null,
      provider_label: providerBackedOffer ? policy.providerLabel : null,
      provider_email: providerBackedOffer ? policy.providerEmail : null,
      underwriting_status: policy.underwritingStatus,
      pricing_mode: policy.pricingMode,
    },
  });

  return NextResponse.json(
    { data: extension, new_end_date: extensionRecord.new_end_date },
    { status: 201 }
  );
}
