#!/usr/bin/env node

import { createInterface } from "node:readline";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createWarranty,
  deleteWarranty,
  getClaim,
  getDocument,
  getWarranty,
  listClaims,
  listDocuments,
  listWarranties,
  updateWarranty,
  verifyWarranty,
  WarranteeApiError,
} from "./api-client.mjs";

const SERVER_NAME = "warrantee-mcp";
const SERVER_VERSION = "1.0.0";
const PROTOCOL_VERSION = "2025-06-18";

function textResult(data, isError = false) {
  return {
    content: [
      {
        type: "text",
        text: typeof data === "string" ? data : JSON.stringify(data, null, 2),
      },
    ],
    isError,
  };
}

function requireString(args, key) {
  const value = args?.[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new WarranteeApiError(`${key} is required`);
  }
  return value.trim();
}

function optionalString(args, key) {
  const value = args?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function optionalNumber(args, key) {
  const value = args?.[key];
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new WarranteeApiError(`${key} must be a number`);
  return parsed;
}

function buildClientOptions(args = {}, env = process.env, fetchImpl = globalThis.fetch) {
  return {
    baseUrl: optionalString(args, "baseUrl") || env.WARRANTEE_BASE_URL,
    apiKey: optionalString(args, "apiKey") || env.WARRANTEE_API_KEY,
    fetchImpl,
  };
}

function warrantyInput(args = {}) {
  return {
    product_name: args.product_name,
    start_date: args.start_date,
    end_date: args.end_date,
    description: args.description,
    serial_number: args.serial_number,
    reference_number: args.reference_number,
    status: args.status,
    category: args.category,
    supplier: args.supplier,
    coverage_type: args.coverage_type,
    purchase_price: args.purchase_price,
    language: args.language,
    seller_name: args.seller_name,
    seller_email: args.seller_email,
  };
}

function removeUndefined(input) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}

const warrantyFieldsSchema = {
  product_name: { type: "string", description: "Warranty product name." },
  start_date: { type: "string", description: "Warranty start date as YYYY-MM-DD or ISO date." },
  end_date: { type: "string", description: "Warranty end date as YYYY-MM-DD or ISO date." },
  description: { type: "string" },
  serial_number: { type: "string" },
  reference_number: { type: "string" },
  status: { type: "string", enum: ["active", "expired", "pending", "claimed", "cancelled"] },
  category: { type: "string" },
  supplier: { type: "string" },
  coverage_type: { type: "string" },
  purchase_price: { type: "number" },
  language: { type: "string", enum: ["en", "ar"] },
  seller_name: { type: "string" },
  seller_email: { type: "string" },
};

const authProperties = {
  baseUrl: {
    type: "string",
    description: "Optional Warrantee base URL. Defaults to WARRANTEE_BASE_URL or https://warrantee.io.",
  },
  apiKey: {
    type: "string",
    description:
      "Optional x-api-key override. Prefer configuring WARRANTEE_API_KEY in the MCP client environment instead of passing secrets in tool arguments.",
  },
};

export const tools = [
  {
    name: "list_warranties",
    title: "List warranties",
    description: "List warranties visible to the authenticated Warrantee integration token.",
    inputSchema: {
      type: "object",
      properties: {
        ...authProperties,
        page: { type: "number", minimum: 1, default: 1 },
        limit: { type: "number", minimum: 1, maximum: 100, default: 20 },
        status: { type: "string" },
        category: { type: "string" },
      },
    },
  },
  {
    name: "get_warranty",
    title: "Get warranty",
    description: "Fetch one warranty by ID using the authenticated Warrantee integration token.",
    inputSchema: {
      type: "object",
      properties: {
        ...authProperties,
        id: { type: "string" },
      },
      required: ["id"],
    },
  },
  {
    name: "create_warranty",
    title: "Create warranty",
    description: "Create a warranty for the authenticated Warrantee user.",
    inputSchema: {
      type: "object",
      properties: {
        ...authProperties,
        idempotencyKey: { type: "string" },
        ...warrantyFieldsSchema,
      },
      required: ["product_name", "start_date", "end_date"],
    },
  },
  {
    name: "update_warranty",
    title: "Update warranty",
    description: "Update a warranty visible to the authenticated Warrantee integration token.",
    inputSchema: {
      type: "object",
      properties: {
        ...authProperties,
        id: { type: "string" },
        ...warrantyFieldsSchema,
      },
      required: ["id"],
    },
  },
  {
    name: "delete_warranty",
    title: "Delete warranty",
    description: "Soft-delete a warranty. Requires confirm=true to prevent accidental deletion.",
    inputSchema: {
      type: "object",
      properties: {
        ...authProperties,
        id: { type: "string" },
        confirm: { type: "boolean" },
      },
      required: ["id", "confirm"],
    },
  },
  {
    name: "verify_warranty",
    title: "Verify warranty",
    description: "Publicly verify a warranty by reference, serial number, or ID without private account data.",
    inputSchema: {
      type: "object",
      properties: {
        baseUrl: authProperties.baseUrl,
        query: { type: "string" },
      },
      required: ["query"],
    },
  },
  {
    name: "list_claims",
    title: "List claims",
    description:
      "List warranty claims visible to the authenticated Warrantee integration token. Requires claims:read.",
    inputSchema: {
      type: "object",
      properties: {
        ...authProperties,
        page: { type: "number", minimum: 1, default: 1 },
        limit: { type: "number", minimum: 1, maximum: 100, default: 20 },
        status: { type: "string" },
        warranty_id: { type: "string" },
      },
    },
  },
  {
    name: "get_claim",
    title: "Get claim",
    description:
      "Fetch one warranty claim by ID when the related warranty is visible to the authenticated integration token.",
    inputSchema: {
      type: "object",
      properties: {
        ...authProperties,
        id: { type: "string" },
      },
      required: ["id"],
    },
  },
  {
    name: "list_documents",
    title: "List document metadata",
    description:
      "List warranty document metadata visible to the authenticated integration token. Does not expose private file URLs or storage paths. Requires documents:read.",
    inputSchema: {
      type: "object",
      properties: {
        ...authProperties,
        page: { type: "number", minimum: 1, default: 1 },
        limit: { type: "number", minimum: 1, maximum: 100, default: 20 },
        warranty_id: { type: "string" },
        query: { type: "string" },
      },
    },
  },
  {
    name: "get_document",
    title: "Get document metadata",
    description:
      "Fetch one warranty document metadata record when the related warranty is visible to the authenticated integration token. Private file URLs are not returned.",
    inputSchema: {
      type: "object",
      properties: {
        ...authProperties,
        id: { type: "string" },
      },
      required: ["id"],
    },
  },
];

export async function callTool(name, args = {}, context = {}) {
  const options = buildClientOptions(args, context.env, context.fetchImpl);

  switch (name) {
    case "list_warranties":
      return listWarranties({
        ...options,
        page: optionalNumber(args, "page"),
        limit: optionalNumber(args, "limit"),
        status: optionalString(args, "status"),
        category: optionalString(args, "category"),
      });
    case "get_warranty":
      return getWarranty(requireString(args, "id"), options);
    case "create_warranty":
      return createWarranty(removeUndefined(warrantyInput(args)), {
        ...options,
        idempotencyKey: optionalString(args, "idempotencyKey"),
      });
    case "update_warranty":
      return updateWarranty(requireString(args, "id"), removeUndefined(warrantyInput(args)), options);
    case "delete_warranty":
      if (args.confirm !== true) {
        throw new WarranteeApiError("delete_warranty requires confirm=true");
      }
      return deleteWarranty(requireString(args, "id"), options);
    case "verify_warranty":
      return verifyWarranty(requireString(args, "query"), options);
    case "list_claims":
      return listClaims({
        ...options,
        page: optionalNumber(args, "page"),
        limit: optionalNumber(args, "limit"),
        status: optionalString(args, "status"),
        warrantyId: optionalString(args, "warranty_id"),
      });
    case "get_claim":
      return getClaim(requireString(args, "id"), options);
    case "list_documents":
      return listDocuments({
        ...options,
        page: optionalNumber(args, "page"),
        limit: optionalNumber(args, "limit"),
        warrantyId: optionalString(args, "warranty_id"),
        query: optionalString(args, "query"),
      });
    case "get_document":
      return getDocument(requireString(args, "id"), options);
    default:
      throw new WarranteeApiError(`Unknown tool: ${name}`);
  }
}

export async function handleMcpRequest(message, context = {}) {
  const { id, method, params } = message || {};

  if (method === "notifications/initialized") return null;

  if (method === "initialize") {
    return {
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: {
          tools: { listChanged: false },
          resources: { listChanged: false, subscribe: false },
          prompts: { listChanged: false },
        },
        serverInfo: {
          name: SERVER_NAME,
          title: "Warrantee API / CLI / MCP",
          version: SERVER_VERSION,
        },
        instructions:
          "Private Warrantee tools require WARRANTEE_API_KEY generated from Settings > API / CLI / MCP. Never ask users for their Warrantee username or password.",
      },
    };
  }

  if (method === "tools/list") {
    return { jsonrpc: "2.0", id, result: { tools } };
  }

  if (method === "tools/call") {
    try {
      const data = await callTool(params?.name, params?.arguments || {}, context);
      return { jsonrpc: "2.0", id, result: textResult(data) };
    } catch (error) {
      const messageText =
        error instanceof WarranteeApiError ? error.message : "Warrantee MCP tool failed";
      return { jsonrpc: "2.0", id, result: textResult({ error: messageText }, true) };
    }
  }

  if (method === "resources/list") {
    return { jsonrpc: "2.0", id, result: { resources: [] } };
  }

  if (method === "prompts/list") {
    return { jsonrpc: "2.0", id, result: { prompts: [] } };
  }

  if (method === "ping") {
    return { jsonrpc: "2.0", id, result: {} };
  }

  return {
    jsonrpc: "2.0",
    id,
    error: {
      code: -32601,
      message: `Method not found: ${method}`,
    },
  };
}

export async function runMcpServer({
  input = process.stdin,
  output = process.stdout,
  env = process.env,
  fetchImpl = globalThis.fetch,
} = {}) {
  const rl = createInterface({ input, crlfDelay: Infinity });

  for await (const line of rl) {
    if (!line.trim()) continue;

    let message;
    try {
      message = JSON.parse(line);
    } catch {
      output.write(
        `${JSON.stringify({
          jsonrpc: "2.0",
          id: null,
          error: { code: -32700, message: "Parse error" },
        })}\n`
      );
      continue;
    }

    const response = await handleMcpRequest(message, { env, fetchImpl });
    if (response) output.write(`${JSON.stringify(response)}\n`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  runMcpServer().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
