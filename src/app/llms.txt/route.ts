import { NextRequest, NextResponse } from "next/server";

import { buildLlmsTxt } from "@/lib/llms-content";
import { logAgentUsage } from "@/lib/server/agent-usage-logger";

export function GET(request: NextRequest) {
  logAgentUsage(request, "llms_read");

  return new NextResponse(buildLlmsTxt(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export function HEAD() {
  return new NextResponse(null, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
