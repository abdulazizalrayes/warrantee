import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { GET, OPTIONS, POST } from "@/app/api/mcp/route";

function mcpRequest(body: unknown, headers: HeadersInit = {}) {
  return new NextRequest("https://warrantee.io/api/mcp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe("hosted Warrantee MCP endpoint", () => {
  it("describes the hosted HTTP transport without asking for passwords", async () => {
    const response = await GET(new NextRequest("https://warrantee.io/api/mcp"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.transport.endpoint).toBe("https://warrantee.io/api/mcp");
    expect(body.authentication.header).toBe("x-api-key");
    expect(body.authentication.instructions).toContain("Do not send a Warrantee username or password");
  });

  it("supports MCP initialize and tools/list over HTTP JSON-RPC", async () => {
    const initialize = await POST(
      mcpRequest({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {},
      })
    );
    const initializeBody = await initialize.json();
    expect(initialize.status).toBe(200);
    expect(initializeBody.result.serverInfo.name).toBe("warrantee-mcp");

    const tools = await POST(
      mcpRequest(
        {
          jsonrpc: "2.0",
          id: 2,
          method: "tools/list",
          params: {},
        },
        { "x-api-key": "wrt_test_secret" }
      )
    );
    const toolsBody = await tools.json();
    expect(tools.status).toBe(200);
    expect(toolsBody.result.tools.map((tool: { name: string }) => tool.name)).toContain(
      "list_warranties"
    );
  });

  it("sets CORS headers for MCP clients", async () => {
    const response = OPTIONS();

    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Headers")).toContain("x-api-key");
    expect(response.headers.get("Access-Control-Allow-Methods")).toContain("POST");
  });
});
