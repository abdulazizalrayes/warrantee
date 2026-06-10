import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { WARRANTY_DOCUMENTS_BUCKET, normalizeWarrantyDocumentStoragePath } from "@/lib/documents";

type ScanVerdict = "clean" | "blocked" | "scan_failed";

type PendingDocument = {
  id: string;
  warranty_id: string;
  file_name: string | null;
  file_type: string | null;
  file_size: number | null;
  file_hash?: string | null;
  file_url?: string | null;
  storage_path?: string | null;
  security_metadata?: Record<string, unknown> | null;
};

type ScannerResponse = {
  verdict?: string;
  status?: string;
  reason?: string;
  details?: unknown;
  engine?: string;
  signature?: string;
};

const DEFAULT_SCAN_LIMIT = 10;
const MAX_SCAN_LIMIT = 25;
const SCAN_TIMEOUT_MS = 20_000;

function scannerConfig() {
  return {
    url: process.env.DOCUMENT_SECURITY_SCANNER_URL?.trim() || "",
    token: process.env.DOCUMENT_SECURITY_SCANNER_TOKEN?.trim() || "",
  };
}

function normalizeVerdict(payload: ScannerResponse): ScanVerdict {
  const raw = String(payload.verdict || payload.status || "").toLowerCase();
  if (raw === "clean" || raw === "allow" || raw === "allowed") return "clean";
  if (raw === "blocked" || raw === "malicious" || raw === "infected" || raw === "deny") return "blocked";
  return "scan_failed";
}

async function callScanner(input: {
  scannerUrl: string;
  scannerToken: string;
  signedUrl: string;
  document: PendingDocument;
  storagePath: string;
}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SCAN_TIMEOUT_MS);
  try {
    const response = await fetch(input.scannerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(input.scannerToken ? { Authorization: `Bearer ${input.scannerToken}` } : {}),
      },
      body: JSON.stringify({
        document_id: input.document.id,
        warranty_id: input.document.warranty_id,
        file_name: input.document.file_name,
        file_type: input.document.file_type,
        file_size: input.document.file_size,
        file_hash: input.document.file_hash || null,
        storage_bucket: WARRANTY_DOCUMENTS_BUCKET,
        storage_path: input.storagePath,
        signed_url: input.signedUrl,
      }),
      signal: controller.signal,
    });

    const payload = (await response.json().catch(() => ({}))) as ScannerResponse;
    if (!response.ok) {
      return {
        verdict: "scan_failed" as ScanVerdict,
        metadata: {
          scanner: "external",
          scanner_status: response.status,
          reason: payload.reason || "scanner_http_error",
          details: payload.details || null,
        },
      };
    }

    return {
      verdict: normalizeVerdict(payload),
      metadata: {
        scanner: "external",
        scanner_status: response.status,
        engine: payload.engine || null,
        signature: payload.signature || null,
        reason: payload.reason || null,
        details: payload.details || null,
      },
    };
  } catch (error) {
    return {
      verdict: "scan_failed" as ScanVerdict,
      metadata: {
        scanner: "external",
        reason: error instanceof Error ? error.message : "scanner_request_failed",
      },
    };
  } finally {
    clearTimeout(timer);
  }
}

async function updateDocumentScanResult(input: {
  document: PendingDocument;
  verdict: ScanVerdict;
  metadata: Record<string, unknown>;
}) {
  const supabase = createSupabaseAdminClient();
  const securityMetadata: Record<string, unknown> = {
    ...(input.document.security_metadata || {}),
    ...input.metadata,
    scanned_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("warranty_documents")
    .update({
      security_status: input.verdict,
      security_checked_at: new Date().toISOString(),
      security_metadata: securityMetadata,
    })
    .eq("id", input.document.id);

  if (error) throw error;

  const { error: auditError } = await supabase.from("activity_log").insert({
    actor_id: null,
    entity_type: "document",
    entity_id: input.document.id,
    action: "document_security_scanned",
    metadata: {
      document_id: input.document.id,
      warranty_id: input.document.warranty_id,
      security_status: input.verdict,
      scanner: securityMetadata.scanner || "external",
    },
  });

  if (auditError) {
    console.warn("Document scan audit log failed:", auditError.message);
  }
}

export async function scanPendingWarrantyDocuments(options: { limit?: number } = {}) {
  const { url, token } = scannerConfig();
  if (!url) {
    return {
      configured: false,
      scanned: 0,
      clean: 0,
      blocked: 0,
      failed: 0,
      message: "DOCUMENT_SECURITY_SCANNER_URL is not configured.",
    };
  }

  const limit = Math.min(Math.max(1, options.limit || DEFAULT_SCAN_LIMIT), MAX_SCAN_LIMIT);
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("warranty_documents")
    .select("id, warranty_id, file_name, file_type, file_size, file_hash, file_url, storage_path, security_metadata")
    .eq("security_status", "pending_scan")
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) throw error;

  const summary = {
    configured: true,
    scanned: 0,
    clean: 0,
    blocked: 0,
    failed: 0,
    results: [] as Array<{ id: string; status: ScanVerdict; reason?: string }>,
  };

  for (const document of (data || []) as PendingDocument[]) {
    const storagePath = normalizeWarrantyDocumentStoragePath(document.storage_path, document.file_url);
    if (!storagePath) {
      await updateDocumentScanResult({
        document,
        verdict: "scan_failed",
        metadata: { scanner: "external", reason: "missing_storage_path" },
      });
      summary.scanned += 1;
      summary.failed += 1;
      summary.results.push({ id: document.id, status: "scan_failed", reason: "missing_storage_path" });
      continue;
    }

    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(WARRANTY_DOCUMENTS_BUCKET)
      .createSignedUrl(storagePath, 60 * 5);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      await updateDocumentScanResult({
        document,
        verdict: "scan_failed",
        metadata: { scanner: "external", reason: signedUrlError?.message || "signed_url_failed" },
      });
      summary.scanned += 1;
      summary.failed += 1;
      summary.results.push({ id: document.id, status: "scan_failed", reason: "signed_url_failed" });
      continue;
    }

    const result = await callScanner({
      scannerUrl: url,
      scannerToken: token,
      signedUrl: signedUrlData.signedUrl,
      document,
      storagePath,
    });

    await updateDocumentScanResult({ document, verdict: result.verdict, metadata: result.metadata });
    summary.scanned += 1;
    if (result.verdict === "clean") summary.clean += 1;
    if (result.verdict === "blocked") summary.blocked += 1;
    if (result.verdict === "scan_failed") summary.failed += 1;
    summary.results.push({
      id: document.id,
      status: result.verdict,
      reason: typeof result.metadata.reason === "string" ? result.metadata.reason : undefined,
    });
  }

  return summary;
}
