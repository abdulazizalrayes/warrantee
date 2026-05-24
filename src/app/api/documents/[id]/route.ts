import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { WARRANTY_DOCUMENTS_BUCKET, normalizeWarrantyDocumentStoragePath } from "@/lib/documents";
import { canViewWarranty } from "@/lib/warranty-access";
import { isSchemaColumnError } from "@/lib/warranty-document-provenance";

type WarrantyAccessRow = {
  id: string;
  user_id?: string | null;
  created_by?: string | null;
  recipient_user_id?: string | null;
  buyer_id?: string | null;
  seller_id?: string | null;
  issuer_user_id?: string | null;
};

type DocumentRow = {
  id: string;
  file_name?: string | null;
  file_url?: string | null;
  storage_path?: string | null;
  warranty_id: string;
  uploaded_by?: string | null;
};

function canDeleteDocument(document: DocumentRow, warranty: WarrantyAccessRow, userId: string) {
  return (
    document.uploaded_by === userId ||
    warranty.user_id === userId ||
    warranty.created_by === userId ||
    warranty.issuer_user_id === userId ||
    warranty.seller_id === userId
  );
}

async function getDocument(admin: ReturnType<typeof createSupabaseAdminClient>, id: string) {
  let { data, error } = await admin
    .from("warranty_documents")
    .select("id, file_name, file_url, storage_path, warranty_id, uploaded_by")
    .eq("id", id)
    .single();

  if (error && isSchemaColumnError(error.message)) {
    const fallback = await admin
      .from("warranty_documents")
      .select("id, file_name, file_url, warranty_id")
      .eq("id", id)
      .single();
    data = fallback.data as typeof data;
    error = fallback.error;
  }

  return { data: data as DocumentRow | null, error };
}

export async function DELETE(
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

  const { data: document, error: documentError } = await getDocument(admin, id);
  if (documentError || !document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const { data: warranty, error: warrantyError } = await admin
    .from("warranties")
    .select("id, user_id, created_by, recipient_user_id, buyer_id, seller_id, issuer_user_id")
    .eq("id", document.warranty_id)
    .single();

  if (warrantyError || !warranty || !canViewWarranty(warranty, user.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!canDeleteDocument(document, warranty, user.id)) {
    return NextResponse.json({ error: "Only the uploader, owner, issuer, or seller can delete this document" }, { status: 403 });
  }

  const storagePath = normalizeWarrantyDocumentStoragePath(document.storage_path, document.file_url);
  if (storagePath) {
    const { error: removeError } = await admin.storage
      .from(WARRANTY_DOCUMENTS_BUCKET)
      .remove([storagePath]);

    if (removeError) {
      return NextResponse.json({ error: "Document file could not be removed" }, { status: 500 });
    }
  }

  const { error: deleteError } = await admin
    .from("warranty_documents")
    .delete()
    .eq("id", document.id);

  if (deleteError) {
    return NextResponse.json({ error: "Document record could not be deleted" }, { status: 500 });
  }

  void admin
    .from("activity_log")
    .insert({
      actor_id: user.id,
      entity_type: "document",
      entity_id: document.id,
      action: "document_deleted",
      metadata: {
        warranty_id: document.warranty_id,
        file_name: document.file_name || null,
        storage_path: storagePath,
      },
    })
    .then(() => undefined);

  return NextResponse.json({ success: true });
}
