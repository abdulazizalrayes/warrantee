import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error: "This legacy unauthenticated email ingestion endpoint has been retired.",
      replacement: "Use the signed Resend inbound webhook at /api/ingest/email.",
    },
    { status: 410 }
  );
}
