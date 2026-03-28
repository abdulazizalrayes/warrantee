// @ts-nocheck
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET() {
  const start = Date.now();
  const checks = {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime ? process.uptime() : null,
    checks: {} as Record<string, { status: string; latency?: number }>,
  };

  // Check Supabase connectivity
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const dbStart = Date.now();
    const { error } = await supabase.from("warranties").select("id").limit(1);
    checks.checks.database = {
      status: error ? "degraded" : "ok",
      latency: Date.now() - dbStart,
    };
    if (error) checks.status = "degraded";
  } catch {
    checks.checks.database = { status: "error" };
    checks.status = "degraded";
  }

  const totalLatency = Date.now() - start;

  return NextResponse.json(
    { ...checks, totalLatency },
    {
      status: checks.status === "ok" ? 200 : 503,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}
