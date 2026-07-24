import { NextRequest, NextResponse } from "next/server";
import { requireInternalBearer } from "@/lib/internal-auth";
import { WARRANTY_DOCUMENT_MAX_SIZE } from "@/lib/documents";
import { scanDocumentBaseline } from "@/lib/server/document-security-baseline";

export const runtime = "nodejs";

type ScanRequestPayload = {
  file_name?: string | null;
  file_type?: string | null;
  file_size?: number | null;
  file_hash?: string | null;
  signed_url?: string | null;
};

const SIGNED_STORAGE_PATH_PREFIX =
  "/storage/v1/object/sign/warranty-documents/";

function getAllowedStorageOrigin() {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "").origin;
  } catch {
    return "";
  }
}

function parseSignedUrl(value: string | null | undefined) {
  try {
    const parsed = new URL(String(value || ""));
    const allowedOrigin = getAllowedStorageOrigin();
    if (
      parsed.protocol !== "https:" ||
      !allowedOrigin ||
      parsed.origin !== allowedOrigin ||
      parsed.username ||
      parsed.password ||
      !parsed.pathname.startsWith(SIGNED_STORAGE_PATH_PREFIX)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const authError = requireInternalBearer(request, process.env.DOCUMENT_SECURITY_SCANNER_TOKEN);
  if (authError) return authError;

  const payload = (await request.json().catch(() => null)) as ScanRequestPayload | null;
  const signedUrl = parseSignedUrl(payload?.signed_url);
  if (!payload || !signedUrl) {
    return NextResponse.json({ verdict: "blocked", reason: "invalid_signed_url" }, { status: 400 });
  }

  const declaredSize = Number(payload.file_size || 0);
  if (!Number.isFinite(declaredSize) || declaredSize <= 0 || declaredSize > WARRANTY_DOCUMENT_MAX_SIZE) {
    return NextResponse.json({ verdict: "blocked", reason: "invalid_file_size" }, { status: 400 });
  }

  const response = await fetch(signedUrl, {
    redirect: "error",
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    return NextResponse.json(
      { verdict: "scan_failed", reason: "document_fetch_failed", details: { status: response.status } },
      { status: 502 }
    );
  }

  const contentLength = Number(response.headers.get("content-length") || declaredSize);
  if (!Number.isFinite(contentLength) || contentLength <= 0 || contentLength > WARRANTY_DOCUMENT_MAX_SIZE) {
    return NextResponse.json({ verdict: "blocked", reason: "invalid_content_length" }, { status: 400 });
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length <= 0 || bytes.length > WARRANTY_DOCUMENT_MAX_SIZE) {
    return NextResponse.json(
      { verdict: "blocked", reason: "invalid_download_size" },
      { status: 400 }
    );
  }
  const result = scanDocumentBaseline({
    fileName: payload.file_name,
    fileType: payload.file_type,
    fileSize: declaredSize,
    fileHash: payload.file_hash,
    bytes,
  });

  return NextResponse.json(result, { status: result.verdict === "clean" ? 200 : 422 });
}
