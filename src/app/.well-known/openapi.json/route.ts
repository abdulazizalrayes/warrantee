import { NextResponse } from "next/server";

import { buildPublicOpenApi } from "@/lib/public-openapi";
import { logAgentUsage } from "@/lib/server/agent-usage-logger";

export function GET(request: Request) {
  logAgentUsage(request, "openapi_read");
  return NextResponse.json(
    buildPublicOpenApi(),
    {
      headers: {
        "Content-Type": "application/openapi+json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=3600",
      },
    },
  );
}

export function HEAD() {
  return new NextResponse(null, {
    headers: {
      "Content-Type": "application/openapi+json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
