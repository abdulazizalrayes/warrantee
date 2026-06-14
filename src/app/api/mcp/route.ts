import { NextRequest, NextResponse } from "next/server";
import { apiJson } from "@/lib/api-response";
import { getClientIp, getRateLimitHeaders, rateLimit } from "@/lib/rate-limit";

type JsonRpcMessage = {
  id?: string | number | null;
  method?: string;
  params?: unknown;
};

type McpModule = {
  handleMcpRequest: (
    message: JsonRpcMessage,
    context?: {
      env?: Record<string, string | undefined>;
      fetchImpl?: typeof fetch;
    }
  ) => Promise<unknown>;
};

const MCP_HTTP_RATE_LIMIT_PER_MINUTE = 120;

function mcpHeaders(extra?: HeadersInit) {
  const headers = new Headers(extra);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, HEAD, POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, x-api-key");
  headers.set("Access-Control-Max-Age", "86400");
  return headers;
}

function jsonRpcError(id: JsonRpcMessage["id"], code: number, message: string, status = 400) {
  return apiJson(
    {
      jsonrpc: "2.0",
      id: id ?? null,
      error: { code, message },
    },
    { status, headers: mcpHeaders() }
  );
}

function getBaseUrl(request: NextRequest) {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

async function enforceMcpRateLimit(request: NextRequest) {
  const result = await rateLimit(getClientIp(request), {
    maxRequests: MCP_HTTP_RATE_LIMIT_PER_MINUTE,
    windowMs: 60_000,
    identifier: "mcp-http",
  });

  if (result.success) return null;

  return apiJson(
    { error: "Too many requests" },
    {
      status: 429,
      headers: mcpHeaders({
        ...getRateLimitHeaders(result),
        "X-RateLimit-Limit": String(MCP_HTTP_RATE_LIMIT_PER_MINUTE),
      }),
    }
  );
}

async function loadMcpModule(): Promise<McpModule> {
  const mcpModule = (await import("../../../../tools/warrantee/mcp-server.mjs")) as McpModule;
  return mcpModule;
}

export async function GET(request: NextRequest) {
  const baseUrl = getBaseUrl(request);

  return apiJson(
    {
      name: "warrantee-mcp-http",
      title: "Warrantee Hosted MCP",
      version: "1.0.0",
      protocolVersion: "2025-06-18",
      transport: {
        type: "http-json-rpc",
        endpoint: `${baseUrl}/api/mcp`,
        method: "POST",
      },
      authentication: {
        required: true,
        header: "x-api-key",
        instructions:
          "Generate a scoped integration token from Warrantee Settings > API / CLI / MCP and send it as x-api-key. Do not send a Warrantee username or password.",
      },
      publicMethods: ["initialize", "tools/list", "resources/list", "prompts/list", "ping"],
    },
    { headers: mcpHeaders() }
  );
}

export function HEAD() {
  return new NextResponse(null, {
    headers: mcpHeaders({
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    }),
  });
}

export function OPTIONS() {
  return new NextResponse(null, {
    headers: mcpHeaders({
      "Cache-Control": "public, max-age=86400",
    }),
  });
}

export async function POST(request: NextRequest) {
  const rateLimitResponse = await enforceMcpRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  let message: JsonRpcMessage;
  try {
    message = (await request.json()) as JsonRpcMessage;
  } catch {
    return jsonRpcError(null, -32700, "Parse error");
  }

  if (!message || typeof message !== "object" || typeof message.method !== "string") {
    return jsonRpcError(message?.id, -32600, "Invalid Request");
  }

  const apiKey = request.headers.get("x-api-key")?.trim() || undefined;
  const { handleMcpRequest } = await loadMcpModule();
  const response = await handleMcpRequest(message, {
    env: {
      WARRANTEE_API_KEY: apiKey,
      WARRANTEE_BASE_URL: getBaseUrl(request),
    },
    fetchImpl: fetch,
  });

  if (!response) {
    return new NextResponse(null, { status: 202, headers: mcpHeaders() });
  }

  return apiJson(response, { headers: mcpHeaders() });
}
