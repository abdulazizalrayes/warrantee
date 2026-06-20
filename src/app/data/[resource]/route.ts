import { NextRequest, NextResponse } from "next/server";

import { getPublicResource } from "@/lib/agent-public-data";
import { logAgentUsage } from "@/lib/server/agent-usage-logger";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ resource: string }> },
) {
  const { resource: resourceName } = await params;
  const resource = getPublicResource(resourceName);
  if (!resource) {
    return NextResponse.json({ error: "Unknown public data resource" }, { status: 404 });
  }

  logAgentUsage(request, "public_data_read", { resource: resourceName });

  return NextResponse.json(resource, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export function HEAD() {
  return new NextResponse(null, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
