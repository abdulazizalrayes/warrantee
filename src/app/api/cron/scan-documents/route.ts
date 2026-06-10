import { NextRequest, NextResponse } from "next/server";
import { requireInternalBearer } from "@/lib/internal-auth";
import { scanPendingWarrantyDocuments } from "@/lib/server/document-security-scanner";

function parseLimit(request: NextRequest) {
  const value = Number.parseInt(request.nextUrl.searchParams.get("limit") || "", 10);
  if (!Number.isFinite(value) || value <= 0) return undefined;
  return value;
}

async function handler(request: NextRequest) {
  const authError = requireInternalBearer(request, process.env.CRON_SECRET);
  if (authError) return authError;

  try {
    const result = await scanPendingWarrantyDocuments({ limit: parseLimit(request) });
    return NextResponse.json(result, { status: result.configured ? 200 : 503 });
  } catch (error) {
    console.warn("Document security scan failed:", error);
    return NextResponse.json({ error: "Document security scan failed" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return handler(request);
}

export async function POST(request: NextRequest) {
  return handler(request);
}
