import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { sanitizeInboundAttachmentFilename } from "@/lib/ingestion/attachments";
import {
  WARRANTY_DOCUMENT_ALLOWED_TYPES,
  WARRANTY_DOCUMENT_MAX_SIZE,
  WARRANTY_DOCUMENTS_BUCKET,
  getWarrantyDocumentSafeExtension,
} from "@/lib/documents";
import { getClientIp, getRateLimitHeaders, rateLimit } from "@/lib/rate-limit";
import { buildWarrantyAccessOrClause } from "@/lib/warranty-access";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: warrantyId } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limitResult = await rateLimit(`${user.id}:${getClientIp(request)}`, {
    maxRequests: 30,
    windowMs: 10 * 60_000,
    identifier: "document-signed-upload",
  });
  if (!limitResult.success) {
    return NextResponse.json(
      { error: "Too many document upload requests" },
      { status: 429, headers: { ...getRateLimitHeaders(limitResult), "X-RateLimit-Limit": "30" } }
    );
  }

  const { data: warranty } = await supabase
    .from("warranties")
    .select("id")
    .eq("id", warrantyId)
    .or(buildWarrantyAccessOrClause(user.id))
    .single();

  if (!warranty) {
    return NextResponse.json({ error: "Warranty not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const safeFileName = sanitizeInboundAttachmentFilename(String(body.fileName || ""));
  const fileType = String(body.fileType || "").toLowerCase();
  const fileSize = Number(body.fileSize);

  if (!safeFileName) return NextResponse.json({ error: "fileName is required" }, { status: 400 });
  if (!WARRANTY_DOCUMENT_ALLOWED_TYPES.includes(fileType)) {
    return NextResponse.json({ error: "File type not allowed" }, { status: 400 });
  }
  if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > WARRANTY_DOCUMENT_MAX_SIZE) {
    return NextResponse.json({ error: "File too large (max 20MB)" }, { status: 400 });
  }

  const ext = getWarrantyDocumentSafeExtension(safeFileName, fileType);
  const random = crypto.randomBytes(6).toString("hex");
  const storagePath = `${user.id}/${warrantyId}/${Date.now()}-${random}.${ext}`;
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.storage
    .from(WARRANTY_DOCUMENTS_BUCKET)
    .createSignedUploadUrl(storagePath);

  if (error || !data?.token) {
    return NextResponse.json({ error: "Could not prepare document upload" }, { status: 500 });
  }

  return NextResponse.json({
    bucket: WARRANTY_DOCUMENTS_BUCKET,
    path: data.path || storagePath,
    token: data.token,
    signedUrl: data.signedUrl,
  });
}
