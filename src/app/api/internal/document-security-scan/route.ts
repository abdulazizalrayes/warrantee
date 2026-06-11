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

function parseSignedUrl(value: string | null | undefined) {
  try {
    const parsed = new URL(String(value || ""));
    if (parsed.protocol !== "https:") return null;
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

  const response = await fetch(signedUrl, { redirect: "follow" });
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
  const result = scanDocumentBaseline({
    fileName: payload.file_name,
    fileType: payload.file_type,
    fileSize: declaredSize,
    fileHash: payload.file_hash,
    bytes,
  });

  return NextResponse.json(result, { status: result.verdict === "clean" ? 200 : 422 });
}
