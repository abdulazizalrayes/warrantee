import { describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
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
  it("uses the public concierge endpoint for stdio MCP questions", async () => {
    const calls: FetchCall[] = [];
    const { callTool } = await import(toolModule("mcp-server.mjs"));
    const result = await callTool(
      "ask_warrantee",
      { question: "How does API access work?", locale: "en" },
      {
        env: { WARRANTEE_BASE_URL: "https://warrantee.io" },
        fetchImpl: mockFetch(
          {
            intent: "api_cli_mcp_integration",
            answer: "Use a scoped token, not a password.",
          },
          calls,
        ),
      },
    );

    expect(result.intent).toBe("api_cli_mcp_integration");
    expect(calls[0]?.url).toBe("https://warrantee.io/api/agent-concierge");
    expect(JSON.parse(String(calls[0]?.init.body))).toMatchObject({
      question: "How does API access work?",
      locale: "en",
      source: "mcp",
    });
  });

  it("reports the CLI version without network access", async () => {
    const stdout: string[] = [];
    const { runCli } = await import(toolModule("cli.mjs"));

    const code = await runCli(["--version"], {
      stdout: { write: (value: string) => stdout.push(value) },
      env: {},
    });

    expect(code).toBe(0);
    expect(stdout.join("").trim()).toBe("0.1.0");
  });

  it("executes through an npm-style binary symlink", () => {
    const directory = mkdtempSync(join(tmpdir(), "warrantee-cli-"));
    const executable = join(directory, "warrantee");

    try {
      symlinkSync(join(process.cwd(), "tools/warrantee/cli.mjs"), executable);
      const result = spawnSync(process.execPath, [executable, "--version"], {
        encoding: "utf8",
      });

      expect(result.status).toBe(0);
      expect(result.stderr).toBe("");
      expect(result.stdout.trim()).toBe("0.1.0");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("runs the MCP server through an npm-style binary symlink", () => {
    const directory = mkdtempSync(join(tmpdir(), "warrantee-mcp-"));
    const executable = join(directory, "warrantee-mcp");

    try {
      symlinkSync(join(process.cwd(), "tools/warrantee/mcp-server.mjs"), executable);
      const request = `${JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-06-18",
          capabilities: {},
          clientInfo: { name: "release-test", version: "1.0.0" },
        },
      })}\n`;
      const result = spawnSync(process.execPath, [executable], {
        input: request,
        encoding: "utf8",
      });

      expect(result.status).toBe(0);
      expect(result.stderr).toBe("");
      const response = JSON.parse(result.stdout.trim());
      expect(response.result.serverInfo.name).toBe("warrantee-mcp");
      expect(response.result.protocolVersion).toBe("2025-06-18");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("can be imported when the runtime argv entry is not a real file", () => {
    const moduleUrl = toolModule("mcp-server.mjs");
    const result = spawnSync(
      process.execPath,
      [
        "--input-type=module",
        "--eval",
        `process.argv[1] = "/vercel"; const module = await import(${JSON.stringify(moduleUrl)}); if (typeof module.handleMcpRequest !== "function") process.exit(1);`,
      ],
      { encoding: "utf8" },
    );

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
  });

  it("runs read-only operational status with a scoped integration token", async () => {
    const calls: FetchCall[] = [];
    const stdout: string[] = [];
    const stderr: string[] = [];
    const { runCli } = await import(toolModule("cli.mjs"));

    const code = await runCli(
      ["--api-key", "wrt_ops_secret", "ops", "status", "--pretty"],
      {
        fetchImpl: mockFetch(
          {
            ok: true,
            apiVersion: "v1",
            credential: {
              kind: "api_key",
              scopes: ["warranties:read"],
              rateLimitPerMinute: 100,
            },
          },
          calls
        ),
        stdout: { write: (value: string) => stdout.push(value) },
        stderr: { write: (value: string) => stderr.push(value) },
        env: {},
      }
    );

    expect(code).toBe(0);
    expect(stderr.join("")).toBe("");
    expect(stdout.join("")).toContain("\"warranties:read\"");
    expect(calls[0]?.url).toBe("https://warrantee.io/api/v1/status");
    expect(calls[0]?.init.headers).toMatchObject({ "x-api-key": "wrt_ops_secret" });
  });

  it("runs doctor checks without exposing credentials and warns before the first npm release", async () => {
    const calls: FetchCall[] = [];
    const stdout: string[] = [];
    const stderr: string[] = [];
    const { runCli } = await import(toolModule("cli.mjs"));
    const fetchImpl = async (url: URL | RequestInfo, init?: RequestInit) => {
      calls.push({ url: String(url), init: init || {} });
      if (String(url).endsWith("/api/health")) {
        return jsonResponse({ status: "ok", checks: { database: { status: "ok" } } });
      }
      if (String(url).endsWith("/.well-known/agent-card.json")) {
        return jsonResponse({
          name: "Warrantee Agent",
          capabilities: { hostedMcp: true },
          skills: [{ name: "API" }],
        });
      }
      if (String(url).endsWith("/api/v1/status")) {
        return jsonResponse({
          ok: true,
          credential: {
            kind: "api_key",
            scopes: ["warranties:read"],
            rateLimitPerMinute: 100,
          },
        });
      }
      return jsonResponse({ error: "not found" }, { status: 404 });
    };

    const code = await runCli(
      ["--api-key", "wrt_doctor_secret", "doctor", "--pretty"],
      {
        fetchImpl,
        stdout: { write: (value: string) => stdout.push(value) },
        stderr: { write: (value: string) => stderr.push(value) },
        env: {},
      }
    );

    expect(code).toBe(2);
    expect(stderr.join("")).toBe("");
    expect(stdout.join("")).toContain("\"status\": \"warning\"");
    expect(stdout.join("")).toContain("\"published\": false");
    expect(stdout.join("")).not.toContain("wrt_doctor_secret");
    expect(
      JSON.stringify(
        calls
          .filter((call) => !call.url.endsWith("/api/v1/status"))
          .map((call) => call.init.headers)
      )
    ).not.toContain("wrt_doctor_secret");
    expect(calls.find((call) => call.url.endsWith("/api/v1/status"))?.init.headers).toMatchObject({
      "x-api-key": "wrt_doctor_secret",
    });
  });

  it("checks and installs only exact signed npm registry versions after confirmation", async () => {
    const stdout: string[] = [];
    const stderr: string[] = [];
    const spawnCalls: Array<{ command: string; args: string[] }> = [];
    const { runCli } = await import(toolModule("cli.mjs"));
    const registryMetadata = {
      name: "warrantee",
      version: "0.2.0",
      dist: {
        tarball: "https://registry.npmjs.org/warrantee/-/warrantee-0.2.0.tgz",
        integrity: "sha512-test",
        signatures: [{ keyid: "SHA256:test", sig: "test" }],
      },
    };

    const code = await runCli(["update", "--confirm"], {
      fetchImpl: mockFetch(registryMetadata),
      spawnImpl: (command: string, args: string[]) => {
        spawnCalls.push({ command, args });
        return { status: 0 };
      },
      stdout: { write: (value: string) => stdout.push(value) },
      stderr: { write: (value: string) => stderr.push(value) },
      env: {},
    });

    expect(code).toBe(0);
    expect(stderr.join("")).toBe("");
    expect(stdout.join("")).toContain("\"updated\":true");
    expect(spawnCalls).toHaveLength(1);
    expect(spawnCalls[0]?.args).toEqual([
      "install",
      "--global",
      "warrantee@0.2.0",
      "--ignore-scripts",
      "--registry=https://registry.npmjs.org",
    ]);
  });

  it("refuses update metadata from an untrusted tarball host", async () => {
    const stderr: string[] = [];
    const spawnCalls: unknown[] = [];
    const { runCli } = await import(toolModule("cli.mjs"));

    const code = await runCli(["update", "--confirm"], {
      fetchImpl: mockFetch({
        name: "warrantee",
        version: "0.2.0",
        dist: {
          tarball: "https://evil.example/warrantee-0.2.0.tgz",
          integrity: "sha512-test",
          signatures: [{ keyid: "SHA256:test", sig: "test" }],
        },
      }),
      spawnImpl: (...args: unknown[]) => {
        spawnCalls.push(args);
        return { status: 0 };
      },
      stdout: { write: () => undefined },
      stderr: { write: (value: string) => stderr.push(value) },
      env: {},
    });

    expect(code).toBe(1);
    expect(stderr.join("")).toContain("trusted Warrantee registry path");
    expect(spawnCalls).toHaveLength(0);
  });

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

  it("exposes asset lifecycle intelligence through API client, CLI, and MCP", async () => {
    const clientCalls: FetchCall[] = [];
    const cliCalls: FetchCall[] = [];
    const mcpCalls: FetchCall[] = [];
    const stdout: string[] = [];
    const stderr: string[] = [];
    const { getAssetIntelligence } = await import(toolModule("api-client.mjs"));
    const { runCli } = await import(toolModule("cli.mjs"));
    const { handleMcpRequest } = await import(toolModule("mcp-server.mjs"));

    await getAssetIntelligence({
      baseUrl: "https://warrantee.io",
      apiKey: "wrt_test_secret",
      limit: 250,
      fetchImpl: mockFetch({ data: { lifecycleHealthScore: 88 } }, clientCalls),
    });

    const cliCode = await runCli(["--api-key", "wrt_cli_secret", "intelligence", "summary", "--limit", "250"], {
      fetchImpl: mockFetch({ data: { lifecycleHealthScore: 88 } }, cliCalls),
      stdout: { write: (value: string) => stdout.push(value) },
      stderr: { write: (value: string) => stderr.push(value) },
      env: {},
    });

    const listResponse = (await handleMcpRequest({
      jsonrpc: "2.0",
      id: 7,
      method: "tools/list",
    })) as JsonRpcResponse;
    const callResponse = (await handleMcpRequest(
      {
        jsonrpc: "2.0",
        id: 8,
        method: "tools/call",
        params: { name: "get_asset_intelligence", arguments: { limit: 250 } },
      },
      {
        env: { WARRANTEE_API_KEY: "wrt_mcp_secret" },
        fetchImpl: mockFetch({ data: { lifecycleHealthScore: 88 } }, mcpCalls),
      }
    )) as JsonRpcResponse;

    expect(clientCalls[0]?.url).toBe("https://warrantee.io/api/v1/intelligence?limit=250");
    expect(clientCalls[0]?.init.headers).toMatchObject({ "x-api-key": "wrt_test_secret" });
    expect(cliCode).toBe(0);
    expect(stderr.join("")).toBe("");
    expect(stdout.join("")).toContain("lifecycleHealthScore");
    expect(cliCalls[0]?.url).toBe("https://warrantee.io/api/v1/intelligence?limit=250");
    expect(listResponse.result.tools.map((tool: { name: string }) => tool.name)).toContain("get_asset_intelligence");
    expect(callResponse.result.isError).toBe(false);
    expect(mcpCalls[0]?.url).toBe("https://warrantee.io/api/v1/intelligence?limit=250");
    expect(mcpCalls[0]?.init.headers).toMatchObject({ "x-api-key": "wrt_mcp_secret" });
    expect(JSON.stringify([clientCalls, cliCalls, mcpCalls])).not.toContain("password");
    expect(JSON.stringify([clientCalls, cliCalls, mcpCalls])).not.toContain("username");
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
    expect(listResponse.result.tools.map((tool: { name: string }) => tool.name)).toContain(
      "prepare_project_inquiry"
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

  it("classifies public MCP inquiries without requiring an integration token", async () => {
    const { handleMcpRequest } = await import(toolModule("mcp-server.mjs"));

    const response = (await handleMcpRequest({
      jsonrpc: "2.0",
      id: 6,
      method: "tools/call",
      params: {
        name: "match_project_scope",
        arguments: { request: "I want to apply for an internship at Warrantee" },
      },
    })) as JsonRpcResponse;

    expect(response.result.isError).toBe(false);
    expect(response.result.content[0].text).toContain("\"fit\": false");
    expect(response.result.content[0].text).toContain("career_or_internship");
  });
});
