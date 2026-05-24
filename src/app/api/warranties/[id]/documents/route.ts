import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { buildWarrantyAccessOrClause } from "@/lib/warranty-access";
import {
  inferWarrantyDocumentKind,
  isSchemaColumnError,
} from "@/lib/warranty-document-provenance";
import { computeSha256Hex } from "@/lib/server/document-hash";
import { sanitizeInboundAttachmentFilename } from "@/lib/ingestion/attachments";

const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/jpg",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const MAX_SIZE = 250 * 1024 * 1024;

function getSafeExtension(fileName: string, mimeType: string) {
  const extension = fileName.includes(".") ? fileName.split(".").pop()?.toLowerCase() : "";
  if (extension && /^[a-z0-9]{1,10}$/.test(extension)) return extension;

  if (mimeType === "application/pdf") return "pdf";
  if (mimeType === "image/jpeg" || mimeType === "image/jpg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "application/msword") return "doc";
  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return "docx";
  return "bin";
}

function sanitizeSourceContext(value: string | null) {
  const normalized = (value || "manual_upload").trim().toLowerCase();
  return normalized.replace(/[^a-z0-9_.-]+/g, "_").slice(0, 80) || "manual_upload";
}

async function getAuthorizedContext(warrantyId: string) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { supabase, user: null };
  }

  const { data: warranty } = await supabase
    .from("warranties")
    .select("id")
    .eq("id", warrantyId)
    .or(buildWarrantyAccessOrClause(user.id))
    .single();

  return { supabase, user: warranty ? user : null };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: warrantyId } = await params;
  const { supabase, user } = await getAuthorizedContext(warrantyId);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const declaredKind = formData.get("documentKind")?.toString() || null;
  const sourceContext = sanitizeSourceContext(formData.get("sourceContext")?.toString() || null);

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "File type not allowed" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File too large (max 250MB)" }, { status: 400 });
  }

  const safeFileName = sanitizeInboundAttachmentFilename(file.name);
  const ext = getSafeExtension(safeFileName, file.type);
  const filePath = `${user.id}/${warrantyId}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const uploadedAt = new Date().toISOString();
  const fileHash = computeSha256Hex(buffer);
  const documentKind = inferWarrantyDocumentKind(safeFileName, declaredKind);

  const { error: uploadError } = await supabase.storage
    .from("warranty-documents")
    .upload(filePath, buffer, { contentType: file.type });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: urlData } = supabase.storage.from("warranty-documents").getPublicUrl(filePath);

  const richInsertPayload = {
    warranty_id: warrantyId,
    file_name: safeFileName,
    file_type: file.type,
    file_size: file.size,
    file_url: urlData.publicUrl || filePath,
    storage_path: filePath,
    file_hash: fileHash,
    uploaded_by: user.id,
    uploaded_at: uploadedAt,
    document_kind: documentKind,
    provenance_status: "recorded",
    evidence_metadata: {
      source_context: sourceContext,
      original_file_name: safeFileName,
      content_type: file.type,
      bytes: file.size,
    },
  };

  let { data, error } = await supabase
    .from("warranty_documents")
    .insert(richInsertPayload)
    .select()
    .single();

  let schemaMode: "rich" | "fallback" = "rich";

  if (error && isSchemaColumnError(error.message)) {
    schemaMode = "fallback";
    const fallbackInsertPayload = {
      warranty_id: warrantyId,
      file_name: safeFileName,
      file_type: file.type,
      file_size: file.size,
      file_url: urlData.publicUrl || filePath,
      uploaded_by: user.id,
    };

    const retryResult = await supabase
      .from("warranty_documents")
      .insert(fallbackInsertPayload)
      .select()
      .single();

    data = retryResult.data;
    error = retryResult.error;
  }

  if (error) {
    await supabase.storage.from("warranty-documents").remove([filePath]);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  void (async () => {
    await supabase.from("activity_log").insert({
      actor_id: user.id,
      entity_type: "document",
      entity_id: data.id,
      action: "document_uploaded",
      metadata: {
        warranty_id: warrantyId,
        document_id: data.id,
        file_name: safeFileName,
        file_type: file.type,
        file_size: file.size,
        file_hash: fileHash,
        storage_path: filePath,
        uploaded_by: user.id,
        uploaded_at: uploadedAt,
        document_kind: documentKind,
        provenance_status: schemaMode === "rich" ? "recorded" : "legacy",
        source_context: sourceContext,
        schema_mode: schemaMode,
      },
    });
  })();

  return NextResponse.json(
    {
      ...data,
      provenance: {
        file_hash: fileHash,
        storage_path: filePath,
        uploaded_at: uploadedAt,
        document_kind: documentKind,
        provenance_status: schemaMode === "rich" ? "recorded" : "legacy",
        source_context: sourceContext,
      },
    },
    { status: 201 }
  );
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: warrantyId } = await params;
  const { supabase, user } = await getAuthorizedContext(warrantyId);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("warranty_documents")
    .select("*")
    .eq("warranty_id", warrantyId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
