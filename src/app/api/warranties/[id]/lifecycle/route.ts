import { NextRequest, NextResponse } from "next/server";
import { apiRateLimit, getClientIp, getRateLimitHeaders } from "@/lib/rate-limit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isValidUUID } from "@/lib/validation";
import { canViewWarrantyForUser } from "@/lib/warranty-access";

type TimelineEvent = {
  id: string;
  eventType: string;
  occurredAt: string;
  evidenceType: string;
  provenance: string;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!isValidUUID(id)) {
    return NextResponse.json({ error: "Invalid warranty ID" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = await apiRateLimit(`${auth.user.id}:${getClientIp(request)}`);
  if (!limit.success) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: getRateLimitHeaders(limit) },
    );
  }

  const { data: warranty } = await supabase
    .from("warranties")
    .select("id,user_id,created_by,seller_id,issuer_user_id,recipient_user_id,buyer_id,created_at,start_date,status")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!warranty) {
    return NextResponse.json({ error: "Warranty not found" }, { status: 404 });
  }
  if (!await canViewWarrantyForUser(supabase, warranty, auth.user.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createSupabaseAdminClient();
  const [storedResult, documentsResult, claimsResult] = await Promise.all([
    admin
      .from("asset_lifecycle_events")
      .select("id,event_type,occurred_at,evidence_type,provenance")
      .eq("warranty_id", id)
      .order("occurred_at", { ascending: false }),
    admin
      .from("warranty_documents")
      .select("id,created_at")
      .eq("warranty_id", id)
      .is("deleted_at", null),
    admin
      .from("warranty_claims")
      .select("id,created_at")
      .eq("warranty_id", id)
      .is("deleted_at", null),
  ]);

  if (storedResult.error || documentsResult.error || claimsResult.error) {
    return NextResponse.json({ error: "Lifecycle timeline could not be loaded" }, { status: 500 });
  }

  const events: TimelineEvent[] = [
    {
      id: `warranty:${id}:registered`,
      eventType: "registered",
      occurredAt: warranty.created_at,
      evidenceType: "system",
      provenance: "warrantee",
    },
  ];

  if (warranty.start_date && ["active", "expired", "claimed", "renewed"].includes(warranty.status || "")) {
    events.push({
      id: `warranty:${id}:activated`,
      eventType: "activated",
      occurredAt: warranty.start_date,
      evidenceType: "system",
      provenance: "warrantee",
    });
  }

  for (const document of documentsResult.data || []) {
    events.push({
      id: `document:${document.id}`,
      eventType: "document_added",
      occurredAt: document.created_at,
      evidenceType: "document",
      provenance: "warrantee",
    });
  }
  for (const claim of claimsResult.data || []) {
    events.push({
      id: `claim:${claim.id}`,
      eventType: "claim_filed",
      occurredAt: claim.created_at,
      evidenceType: "system",
      provenance: "warrantee",
    });
  }
  for (const event of storedResult.data || []) {
    events.push({
      id: event.id,
      eventType: event.event_type,
      occurredAt: event.occurred_at,
      evidenceType: event.evidence_type,
      provenance: event.provenance,
    });
  }

  const deduplicated = Array.from(
    new Map(events.map((event) => [`${event.eventType}:${event.occurredAt}:${event.provenance}`, event])).values(),
  ).sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

  return NextResponse.json({ data: deduplicated });
}
