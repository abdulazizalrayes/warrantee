import {
  buildAgentMarkdownHeaders,
  resolveAgentMarkdownPage,
} from "@/lib/agent-markdown-response";
import { logAgentUsage } from "@/lib/server/agent-usage-logger";
import { NextRequest, NextResponse } from "next/server";

function response(request: NextRequest, includeBody: boolean) {
  const pathname =
    request.headers.get("x-warrantee-agent-markdown-path") ??
    request.nextUrl.searchParams.get("path") ??
    "/";
  const page = resolveAgentMarkdownPage(pathname);

  if (!page) {
    return new NextResponse("Not found", { status: 404 });
  }

  logAgentUsage(request, "agent_markdown_read", {
    representation:
      request.headers.get("x-warrantee-agent-markdown-direct") === "1"
        ? "direct"
        : "negotiated",
    resource_path: page.path,
  });

  const directSidecar =
    request.headers.get("x-warrantee-agent-markdown-direct") === "1";
  return new NextResponse(includeBody ? page.markdown : null, {
    status: 200,
    headers: buildAgentMarkdownHeaders(page, {
      contentLocationPath: directSidecar
        ? page.directSidecarPath
        : undefined,
      directSidecar,
    }),
  });
}

export function GET(request: NextRequest) {
  return response(request, true);
}

export function HEAD(request: NextRequest) {
  return response(request, false);
}
