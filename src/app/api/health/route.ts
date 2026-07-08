import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getRequestId, structuredLog } from "@/lib/monitoring";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const start = Date.now();
  const requestId = getRequestId(request);
  const checks = {
    status: "ok",
    timestamp: new Date().toISOString(),
    checks: {} as Record<string, { status: string; latency?: number }>,
  };

  // Check Supabase connectivity
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );
    const dbStart = Date.now();
    const { error } = await supabase.from("profiles").select("id").limit(1);
    checks.checks.database = {
      status: error ? "degraded" : "ok",
      latency: Date.now() - dbStart,
    };
    if (error) checks.status = "degraded";
  } catch (error) {
    checks.checks.database = { status: "error" };
    checks.status = "degraded";
    structuredLog("error", {
      route: "/api/health",
      msg: "database health check failed",
      requestId,
      error,
    });
  }

  const totalLatency = Date.now() - start;
  structuredLog(checks.status === "ok" ? "info" : "warn", {
    route: "/api/health",
    msg: "health check completed",
    requestId,
    ms: totalLatency,
    status: checks.status,
    checks: checks.checks,
  });

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
