import { buildAgentMarkdown } from "@/lib/agent-ready";
import { NextRequest, NextResponse } from "next/server";

export function GET(request: NextRequest) {
  const pathname = request.nextUrl.searchParams.get("path") ?? "/";
  const markdown = buildAgentMarkdown(pathname);

  if (!markdown) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(markdown, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      Vary: "Accept",
      "X-Robots-Tag": "noindex",
    },
  });
}
