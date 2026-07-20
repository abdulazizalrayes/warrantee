import generatedPages from "@/generated/agent-markdown-pages.json";
import {
  buildAgentMarkdownHeaders,
  resolveAgentMarkdownPage,
} from "@/lib/agent-markdown-response";
import { NextResponse } from "next/server";

export const dynamic = "force-static";
export const dynamicParams = false;

type RouteContext = {
  params: Promise<{ segments: string[] }>;
};

function segmentsToCanonicalPath(segments: string[]) {
  const joined = segments.join("/");
  if (!joined.endsWith(".md")) return null;
  return `/${joined.slice(0, -3)}`;
}

async function response(context: RouteContext, includeBody: boolean) {
  const { segments } = await context.params;
  const canonicalPath = segmentsToCanonicalPath(segments);
  const page = canonicalPath ? resolveAgentMarkdownPage(canonicalPath) : null;

  if (!page || page.sidecarPath !== `/agent-markdown/${segments.join("/")}`) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(includeBody ? page.markdown : null, {
    headers: buildAgentMarkdownHeaders(page, { directSidecar: true }),
  });
}

export function generateStaticParams() {
  return generatedPages.pages.map((page) => ({
    segments: page.sidecarPath.replace(/^\/agent-markdown\//, "").split("/"),
  }));
}

export function GET(_request: Request, context: RouteContext) {
  return response(context, true);
}

export function HEAD(_request: Request, context: RouteContext) {
  return response(context, false);
}
