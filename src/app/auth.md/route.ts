import { NextRequest, NextResponse } from "next/server";

import { buildAuthMarkdown } from "@/lib/auth-doc";
import { logAgentUsage } from "@/lib/server/agent-usage-logger";

export function GET(request: NextRequest) {
  logAgentUsage(request, "auth_doc_read");

  return new NextResponse(buildAuthMarkdown(), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export function HEAD() {
  return new NextResponse(null, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
