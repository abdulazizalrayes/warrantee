import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { buildWarrantyAccessOrClause } from "@/lib/warranty-access";
import {
  inferWarrantyDocumentKind,
  isSchemaColumnError,
} from "@/lib/warranty-document-provenance";
import { computeSha256Hex } from "@/lib/server/document-hash";
import { sanitizeInboundAttachmentFilename } from "@/lib/ingestion/attachments";
import {
  WARRANTY_DOCUMENT_ALLOWED_TYPES,
  WARRANTY_DOCUMENT_MAX_SIZE,
  WARRANTY_DOCUMENTS_BUCKET,
  getWarrantyDocumentSafeExtension,
  sanitizeWarrantyDocumentSourceContext,
} from "@/lib/documents";

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

function isSha256Hex(value: unknown) {
  return typeof value === "string" && /^[a-f0-9]{64}$/i.test(value);
}

function isSafeDirectUploadPath(path: unknown, userId: string, warrantyId: string) {
  if (typeof path !== "string") return false;
  if (path.includes("..") || path.startsWith("/") || path.includes("\\")) return false;
  return path.startsWith(`${userId}/${warrantyId}/`);
}

async function signedUploadExists(storagePath: string) {
  const admin = createSupabaseAdminClient();
  const parts = storagePath.split("/");
  const objectName = parts.pop();
  const folder = parts.join("/");
  if (!objectName || !folder) return false;

  const { data, error } = await admin.storage
    .from(WARRANTY_DOCUMENTS_BUCKET)
    .list(folder, { limit: 1, search: objectName });

  if (error) return false;
  return Boolean(data?.some((item) => item.name === objectName));
}

async function insertDocumentMetadata(input: {
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>;
  warrantyId: string;
  userId: string;
  safeFileName: string;
  fileType: string;
  fileSize: number;
  filePath: string;
  fileHash: string;
  declaredKind: string | null;
  sourceContext: string;
}) {
  const uploadedAt = new Date().toISOString();
  const documentKind = inferWarrantyDocumentKind(input.safeFileName, input.declaredKind);

  const richInsertPayload = {
    warranty_id: input.warrantyId,
    file_name: input.safeFileName,
    file_type: input.fileType,
    file_size: input.fileSize,
    file_url: input.filePath,
    storage_path: input.filePath,
    file_hash: input.fileHash,
    uploaded_by: input.userId,
    uploaded_at: uploadedAt,
    document_kind: documentKind,
    provenance_status: "recorded",
    security_status: "pending_scan",
    security_metadata: {
      scanner: "not_configured",
      state: "queued",
    },
    evidence_metadata: {
      source_context: input.sourceContext,
      original_file_name: input.safeFileName,
      content_type: input.fileType,
      bytes: input.fileSize,
    },
  };

  let { data, error } = await input.supabase
    .from("warranty_documents")
    .insert(richInsertPayload)
    .select()
    .single();

  let schemaMode: "rich" | "fallback" = "rich";

  if (error && isSchemaColumnError(error.message)) {
    schemaMode = "fallback";
    const fallbackInsertPayload = {
      warranty_id: input.warrantyId,
      file_name: input.safeFileName,
      file_type: input.fileType,
      file_size: input.fileSize,
      file_url: input.filePath,
      uploaded_by: input.userId,
    };

    const retryResult = await input.supabase
      .from("warranty_documents")
      .insert(fallbackInsertPayload)
      .select()
      .single();

    data = retryResult.data;
    error = retryResult.error;
  }

  if (error || !data) {
    return { data: null, error, uploadedAt, documentKind, schemaMode };
  }

  const { error: auditError } = await input.supabase.from("activity_log").insert({
    actor_id: input.userId,
    entity_type: "document",
    entity_id: data.id,
    action: "document_uploaded",
      metadata: {
      warranty_id: input.warrantyId,
      document_id: data.id,
      file_name: input.safeFileName,
      file_type: input.fileType,
      file_size: input.fileSize,
      file_hash: input.fileHash,
      storage_path: input.filePath,
      uploaded_by: input.userId,
      uploaded_at: uploadedAt,
      document_kind: documentKind,
      provenance_status: schemaMode === "rich" ? "recorded" : "legacy",
      security_status: schemaMode === "rich" ? "pending_scan" : "legacy_untracked",
      source_context: input.sourceContext,
      schema_mode: schemaMode,
    },
  });
  if (auditError) {
    console.warn("Document upload audit log failed:", auditError.message);
  }

  return { data, error: null, uploadedAt, documentKind, schemaMode };
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

  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const safeFileName = sanitizeInboundAttachmentFilename(String(body.fileName || ""));
    const fileType = String(body.fileType || "").toLowerCase();
    const fileSize = Number(body.fileSize);
    const filePath = String(body.storagePath || "");
    const fileHash = String(body.fileHash || "").toLowerCase();
    const declaredKind = typeof body.documentKind === "string" ? body.documentKind : null;
    const sourceContext = sanitizeWarrantyDocumentSourceContext(
      typeof body.sourceContext === "string" ? body.sourceContext : null
    );

    if (!safeFileName) return NextResponse.json({ error: "fileName is required" }, { status: 400 });
    if (!WARRANTY_DOCUMENT_ALLOWED_TYPES.includes(fileType)) {
      return NextResponse.json({ error: "File type not allowed" }, { status: 400 });
    }
    if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > WARRANTY_DOCUMENT_MAX_SIZE) {
      return NextResponse.json({ error: "File too large (max 20MB)" }, { status: 400 });
    }
    if (!isSha256Hex(fileHash)) {
      return NextResponse.json({ error: "A valid SHA-256 file hash is required" }, { status: 400 });
    }
    if (!isSafeDirectUploadPath(filePath, user.id, warrantyId)) {
      return NextResponse.json({ error: "Invalid storage path" }, { status: 400 });
    }
    if (!(await signedUploadExists(filePath))) {
      return NextResponse.json({ error: "Uploaded file was not found in storage" }, { status: 400 });
    }

    const result = await insertDocumentMetadata({
      supabase,
      warrantyId,
      userId: user.id,
      safeFileName,
      fileType,
      fileSize,
      filePath,
      fileHash,
      declaredKind,
      sourceContext,
    });

    if (result.error || !result.data) {
      await supabase.storage.from(WARRANTY_DOCUMENTS_BUCKET).remove([filePath]);
      return NextResponse.json({ error: result.error?.message || "Failed to record document" }, { status: 500 });
    }

    return NextResponse.json(
      {
        ...result.data,
        provenance: {
          file_hash: fileHash,
          storage_path: filePath,
          uploaded_at: result.uploadedAt,
          document_kind: result.documentKind,
          provenance_status: result.schemaMode === "rich" ? "recorded" : "legacy",
          security_status: result.schemaMode === "rich" ? "pending_scan" : "legacy_untracked",
          source_context: sourceContext,
        },
      },
      { status: 201 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const declaredKind = formData.get("documentKind")?.toString() || null;
  const sourceContext = sanitizeWarrantyDocumentSourceContext(formData.get("sourceContext")?.toString() || null);

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (!WARRANTY_DOCUMENT_ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "File type not allowed" }, { status: 400 });
  }
  if (file.size > WARRANTY_DOCUMENT_MAX_SIZE) {
    return NextResponse.json({ error: "File too large (max 20MB)" }, { status: 400 });
  }

  const safeFileName = sanitizeInboundAttachmentFilename(file.name);
  const ext = getWarrantyDocumentSafeExtension(safeFileName, file.type);
  const filePath = `${user.id}/${warrantyId}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const fileHash = computeSha256Hex(buffer);

  const { error: uploadError } = await supabase.storage
    .from("warranty-documents")
    .upload(filePath, buffer, { contentType: file.type });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const result = await insertDocumentMetadata({
    supabase,
    warrantyId,
    userId: user.id,
    safeFileName,
    fileType: file.type,
    fileSize: file.size,
    filePath,
    fileHash,
    declaredKind,
    sourceContext,
  });

  if (result.error || !result.data) {
    await supabase.storage.from("warranty-documents").remove([filePath]);
    return NextResponse.json({ error: result.error?.message || "Failed to record document" }, { status: 500 });
  }

  return NextResponse.json(
    {
      ...result.data,
      provenance: {
        file_hash: fileHash,
        storage_path: filePath,
        uploaded_at: result.uploadedAt,
        document_kind: result.documentKind,
        provenance_status: result.schemaMode === "rich" ? "recorded" : "legacy",
        security_status: result.schemaMode === "rich" ? "pending_scan" : "legacy_untracked",
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
