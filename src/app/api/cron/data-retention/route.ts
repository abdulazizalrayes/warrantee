import { NextRequest, NextResponse } from "next/server";
import { requireInternalBearer } from "@/lib/internal-auth";
import { runOperationalDataRetention } from "@/lib/server/data-retention";

async function handler(request: NextRequest) {
  const authError = requireInternalBearer(request, process.env.CRON_SECRET);
  if (authError) return authError;

  try {
    return NextResponse.json(await runOperationalDataRetention());
  } catch (error) {
    console.warn("Operational data retention failed:", error);
    return NextResponse.json({ error: "Operational data retention failed" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return handler(request);
}

export async function POST(request: NextRequest) {
  return handler(request);
}
