import { describe, expect, it } from "vitest";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

type FetchCall = {
  url: string;
  init: RequestInit;
};

type JsonRpcResponse = {
  result?: any;
};

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status || 200,
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
  });
}

function mockFetch(body: unknown, calls: FetchCall[] = []) {
  return async (url: URL | RequestInfo, init?: RequestInit) => {
    calls.push({ url: String(url), init: init || {} });
    return jsonResponse(body);
  };
}

function toolModule(path: string) {
  return pathToFileURL(join(process.cwd(), "tools/warrantee", path)).href;
}

describe("Warrantee CLI and MCP", () => {
  it("sends generated integration tokens as x-api-key without usernames or passwords", async () => {
    const calls: FetchCall[] = [];
    const { listWarranties } = await import(toolModule("api-client.mjs"));

    const result = await listWarranties({
      baseUrl: "https://warrantee.io",
      apiKey: "wrt_test_secret",
      page: 2,
      limit: 10,
      fetchImpl: mockFetch({ data: [], pagination: { page: 2, limit: 10 } }, calls),
    });

    expect(result.pagination.page).toBe(2);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://warrantee.io/api/v1/warranties?page=2&limit=10");
    expect(calls[0]?.init.headers).toMatchObject({
      Accept: "application/json",
      "x-api-key": "wrt_test_secret",
    });
    expect(JSON.stringify(calls[0]?.init.headers)).not.toContain("password");
    expect(JSON.stringify(calls[0]?.init.headers)).not.toContain("username");
  });

  it("blocks private API calls when no integration token is configured", async () => {
    const { listWarranties } = await import(toolModule("api-client.mjs"));

    await expect(
      listWarranties({
        baseUrl: "https://warrantee.io",
        apiKey: "",
        fetchImpl: mockFetch({ data: [] }),
      })
    ).rejects.toThrow("WARRANTEE_API_KEY is required");
  });

  it("runs CLI warranty list commands against the authenticated API", async () => {
    const calls: FetchCall[] = [];
    const stdout: string[] = [];
    const stderr: string[] = [];
    const { runCli } = await import(toolModule("cli.mjs"));

    const code = await runCli(
      ["--api-key", "wrt_cli_secret", "warranties", "list", "--status", "active", "--pretty"],
      {
        fetchImpl: mockFetch({ data: [{ id: "w1", product_name: "Laptop" }] }, calls),
        stdout: { write: (value: string) => stdout.push(value) },
        stderr: { write: (value: string) => stderr.push(value) },
        env: {},
      }
    );

    expect(code).toBe(0);
    expect(stderr.join("")).toBe("");
    expect(stdout.join("")).toContain("\"product_name\": \"Laptop\"");
    expect(calls[0]?.url).toBe("https://warrantee.io/api/v1/warranties?status=active");
    expect(calls[0]?.init.headers).toMatchObject({ "x-api-key": "wrt_cli_secret" });
  });

  it("runs CLI claims and document metadata commands against scoped API routes", async () => {
    const claimCalls: FetchCall[] = [];
    const documentCalls: FetchCall[] = [];
    const stdout: string[] = [];
    const stderr: string[] = [];
    const { runCli } = await import(toolModule("cli.mjs"));

    const claimsCode = await runCli(
      ["--api-key", "wrt_cli_secret", "claims", "list", "--status", "pending"],
      {
        fetchImpl: mockFetch({ data: [{ id: "c1", status: "pending" }] }, claimCalls),
        stdout: { write: (value: string) => stdout.push(value) },
        stderr: { write: (value: string) => stderr.push(value) },
        env: {},
      }
    );
    const documentsCode = await runCli(
      ["--api-key", "wrt_cli_secret", "documents", "list", "--query", "receipt"],
      {
        fetchImpl: mockFetch({ data: [{ id: "d1", file_name: "receipt.pdf" }] }, documentCalls),
        stdout: { write: (value: string) => stdout.push(value) },
        stderr: { write: (value: string) => stderr.push(value) },
        env: {},
      }
    );

    expect(claimsCode).toBe(0);
    expect(documentsCode).toBe(0);
    expect(stderr.join("")).toBe("");
    expect(claimCalls[0]?.url).toBe("https://warrantee.io/api/v1/claims?status=pending");
    expect(documentCalls[0]?.url).toBe("https://warrantee.io/api/v1/documents?q=receipt");
    expect(claimCalls[0]?.init.headers).toMatchObject({ "x-api-key": "wrt_cli_secret" });
    expect(documentCalls[0]?.init.headers).toMatchObject({ "x-api-key": "wrt_cli_secret" });
  });

  it("targets claims and document metadata from the API client without exposing passwords", async () => {
    const calls: FetchCall[] = [];
    const { listClaims, listDocuments } = await import(toolModule("api-client.mjs"));

    await listClaims({
      baseUrl: "https://warrantee.io",
      apiKey: "wrt_test_secret",
      status: "pending",
      fetchImpl: mockFetch({ data: [] }, calls),
    });
    await listDocuments({
      baseUrl: "https://warrantee.io",
      apiKey: "wrt_test_secret",
      query: "receipt",
      fetchImpl: mockFetch({ data: [] }, calls),
    });

    expect(calls[0]?.url).toBe("https://warrantee.io/api/v1/claims?status=pending");
    expect(calls[1]?.url).toBe("https://warrantee.io/api/v1/documents?q=receipt");
    expect(JSON.stringify(calls.map((call) => call.init.headers))).not.toContain("password");
    expect(JSON.stringify(calls.map((call) => call.init.headers))).not.toContain("username");
  });

  it("exposes MCP tools and calls private tools through the API key", async () => {
    const calls: FetchCall[] = [];
    const { handleMcpRequest } = await import(toolModule("mcp-server.mjs"));

    const listResponse = (await handleMcpRequest({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list",
    })) as JsonRpcResponse;
    expect(listResponse.result.tools.map((tool: { name: string }) => tool.name)).toContain(
      "list_warranties"
    );
    expect(listResponse.result.tools.map((tool: { name: string }) => tool.name)).toContain(
      "list_claims"
    );
    expect(listResponse.result.tools.map((tool: { name: string }) => tool.name)).toContain(
      "list_documents"
    );

    const callResponse = (await handleMcpRequest(
      {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: { name: "get_warranty", arguments: { id: "abc" } },
      },
      {
        env: { WARRANTEE_API_KEY: "wrt_mcp_secret" },
        fetchImpl: mockFetch({ data: { id: "abc" } }, calls),
      }
    )) as JsonRpcResponse;

    expect(callResponse.result.isError).toBe(false);
    expect(callResponse.result.content[0].text).toContain("\"id\": \"abc\"");
    expect(calls[0]?.url).toBe("https://warrantee.io/api/v1/warranties/abc");
    expect(calls[0]?.init.headers).toMatchObject({ "x-api-key": "wrt_mcp_secret" });
  });

  it("calls MCP claim and document metadata tools through scoped API routes", async () => {
    const calls: FetchCall[] = [];
    const { handleMcpRequest } = await import(toolModule("mcp-server.mjs"));

    await handleMcpRequest(
      {
        jsonrpc: "2.0",
        id: 4,
        method: "tools/call",
        params: { name: "list_claims", arguments: { status: "pending" } },
      },
      {
        env: { WARRANTEE_API_KEY: "wrt_mcp_secret" },
        fetchImpl: mockFetch({ data: [] }, calls),
      }
    );
    await handleMcpRequest(
      {
        jsonrpc: "2.0",
        id: 5,
        method: "tools/call",
        params: { name: "list_documents", arguments: { query: "receipt" } },
      },
      {
        env: { WARRANTEE_API_KEY: "wrt_mcp_secret" },
        fetchImpl: mockFetch({ data: [] }, calls),
      }
    );

    expect(calls[0]?.url).toBe("https://warrantee.io/api/v1/claims?status=pending");
    expect(calls[1]?.url).toBe("https://warrantee.io/api/v1/documents?q=receipt");
    expect(calls[0]?.init.headers).toMatchObject({ "x-api-key": "wrt_mcp_secret" });
    expect(calls[1]?.init.headers).toMatchObject({ "x-api-key": "wrt_mcp_secret" });
  });

  it("requires explicit confirmation before MCP delete_warranty", async () => {
    const { handleMcpRequest } = await import(toolModule("mcp-server.mjs"));

    const response = (await handleMcpRequest({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: { name: "delete_warranty", arguments: { id: "abc" } },
    })) as JsonRpcResponse;

    expect(response.result.isError).toBe(true);
    expect(response.result.content[0].text).toContain("confirm=true");
  });
});
