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
    expect(body.authentication.required).toBe("private tools only");
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
    expect(toolsBody.result.tools.map((tool: { name: string }) => tool.name)).toContain(
      "get_company_overview"
    );
  });

  it("allows public discovery tools and resources without an API key", async () => {
    const inquiry = await POST(
      mcpRequest({
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: {
          name: "prepare_project_inquiry",
          arguments: { request: "We need ERP API integration for warranty operations" },
        },
      })
    );
    const inquiryBody = await inquiry.json();
    expect(inquiry.status).toBe(200);
    expect(inquiryBody.result.isError).toBe(false);
    expect(inquiryBody.result.content[0].text).toContain("approvalRequiredBeforeSubmission");

    const resources = await POST(
      mcpRequest({
        jsonrpc: "2.0",
        id: 4,
        method: "resources/list",
      })
    );
    const resourcesBody = await resources.json();
    expect(resourcesBody.result.resources.map((resource: { uri: string }) => resource.uri)).toContain(
      "warrantee://company"
    );

    const resource = await POST(
      mcpRequest({
        jsonrpc: "2.0",
        id: 5,
        method: "resources/read",
        params: { uri: "warrantee://company" },
      })
    );
    const resourceBody = await resource.json();
    expect(resourceBody.result.contents[0].text).toContain("Warrantee.io");
  });

  it("sets CORS headers for MCP clients", async () => {
    const response = OPTIONS();

    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Headers")).toContain("x-api-key");
    expect(response.headers.get("Access-Control-Allow-Methods")).toContain("POST");
  });
});
