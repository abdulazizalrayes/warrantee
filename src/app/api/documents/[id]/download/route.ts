import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  WARRANTY_DOCUMENTS_BUCKET,
  WARRANTY_DOCUMENT_BLOCKED_SECURITY_STATUSES,
  normalizeWarrantyDocumentStoragePath,
} from "@/lib/documents";
import { canViewWarranty } from "@/lib/warranty-access";
import { isSchemaColumnError } from "@/lib/warranty-document-provenance";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const admin = createSupabaseAdminClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let { data: document, error: documentError } = await admin
    .from("warranty_documents")
    .select("id, file_name, file_url, storage_path, warranty_id, security_status")
    .eq("id", id)
    .single();

  if (documentError && isSchemaColumnError(documentError.message)) {
    const fallbackResult = await admin
      .from("warranty_documents")
      .select("id, file_name, file_url, warranty_id")
      .eq("id", id)
      .single();
    document = fallbackResult.data as typeof document;
    documentError = fallbackResult.error;
  }

  if (documentError || !document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const securityStatus = (document as { security_status?: string | null }).security_status;
  if (
    securityStatus &&
    WARRANTY_DOCUMENT_BLOCKED_SECURITY_STATUSES.includes(
      securityStatus as (typeof WARRANTY_DOCUMENT_BLOCKED_SECURITY_STATUSES)[number]
    )
  ) {
    return NextResponse.json({ error: "Document is blocked by security review" }, { status: 423 });
  }

  const { data: warranty, error: warrantyError } = await admin
    .from("warranties")
    .select("id, user_id, created_by, recipient_user_id, buyer_id, seller_id, issuer_user_id")
    .eq("id", document.warranty_id)
    .single();

  if (warrantyError || !warranty || !canViewWarranty(warranty, user.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const storagePath = normalizeWarrantyDocumentStoragePath(document.storage_path, document.file_url);
  if (storagePath) {
    const { data: signedUrlData, error: signedUrlError } = await admin.storage
      .from(WARRANTY_DOCUMENTS_BUCKET)
      .createSignedUrl(storagePath, 60 * 10, {
        download: document.file_name || undefined,
      });

    if (!signedUrlError && signedUrlData?.signedUrl) {
      return NextResponse.redirect(signedUrlData.signedUrl, { status: 302 });
    }
  }

  return NextResponse.json(
    { error: "Document file is unavailable or outside the approved storage bucket." },
    { status: 404 }
  );
}
