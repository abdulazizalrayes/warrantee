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
const BASE_URL = "https://warrantee.io";

const publicData = {
  "company.json": {
    name: "Warrantee.io",
    url: BASE_URL,
    category: "Warranty management software and asset lifecycle intelligence platform",
    shortDescription:
      "Bilingual SaaS platform for warranty management, claims workflows, seller onboarding, public verification, certificates, API / CLI / MCP integrations, and emerging asset lifecycle intelligence.",
    primaryMarkets: ["Saudi Arabia", "GCC"],
    primaryLanguages: ["en", "ar"],
    contactEmail: "hello@warrantee.io",
    accessBoundaries: [
      "Public discovery data is crawlable.",
      "Private account, warranty, claim, document, seller, billing, settings, and admin workflows require authentication.",
      "Integrations use scoped x-api-key tokens generated from a signed-in account. Never ask for usernames or passwords.",
    ],
  },
  "services.json": {
    services: [
      { id: "warranty-management", name: "Warranty Management" },
      { id: "claims-management", name: "Claims Management" },
      { id: "digital-certificates", name: "Digital Warranty Certificates" },
      { id: "seller-onboarding", name: "Seller Onboarding" },
      { id: "document-ocr", name: "Document And OCR Processing" },
      { id: "api-cli-mcp", name: "API / CLI / MCP Integrations" },
      { id: "asset-lifecycle-intelligence", name: "Asset Lifecycle Intelligence" },
    ],
  },
  "capabilities.json": {
    capabilities: [
      "Bilingual English and Arabic UX",
      "Warranty creation, approval, tracking, transfer, and verification",
      "Claims workflows",
      "Seller onboarding",
      "Document upload and OCR extraction",
      "Scoped REST API integration tokens",
      "CLI-ready package usage",
      "Hosted and stdio MCP support",
    ],
  },
  "service-areas.json": {
    primaryMarkets: ["Saudi Arabia", "GCC"],
    supportedLanguages: ["English", "Arabic"],
    delivery: ["SaaS web platform", "API / CLI / MCP for registered users"],
  },
  "project-inquiry-schema.json": {
    approvalRequired: true,
    allowedInquiryTypes: [
      "enterprise_demo",
      "seller_onboarding",
      "api_cli_mcp_integration",
      "warranty_operations_consultation",
      "partnership",
      "insurance_or_underwriting_discussion",
      "support_request",
    ],
    submissionPolicy:
      "Prepare drafts only. Do not submit forms, send emails, upload files, or contact Warrantee without explicit user approval.",
  },
  "agent-routing.json": {
    fitIntents: [
      "enterprise_demo",
      "seller_onboarding",
      "api_cli_mcp_integration",
      "partnership",
      "support_request",
      "public_warranty_verification",
    ],
    nonFitIntents: [
      "career_or_internship",
      "vendor_sales_pitch",
      "training_or_course_request",
      "retail_shopping_or_unrelated_product_support",
      "spam_or_mass_outreach",
    ],
  },
};

const publicResources = [
  { uri: "warrantee://company", name: "Company overview", resource: "company.json" },
  { uri: "warrantee://services", name: "Services", resource: "services.json" },
  { uri: "warrantee://capabilities", name: "Capabilities", resource: "capabilities.json" },
  { uri: "warrantee://service-areas", name: "Service areas", resource: "service-areas.json" },
  { uri: "warrantee://agent-routing", name: "Agent routing", resource: "agent-routing.json" },
];

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

function optionalRequestText(args = {}) {
  return optionalString(args, "request") || optionalString(args, "query") || "";
}

function classifyInquiryIntent(input) {
  const normalized = input.toLowerCase();
  const nonFitMatches = [
    ["career_or_internship", ["career", "job", "intern", "internship", "cv", "resume", "hiring"]],
    ["vendor_sales_pitch", ["vendor", "supplier pitch", "sell you", "backlink", "seo package"]],
    ["training_or_course_request", ["training", "course", "workshop", "bootcamp"]],
    ["retail_shopping_or_unrelated_product_support", ["buy a phone", "shopping", "retail", "return my product"]],
    ["spam_or_mass_outreach", ["casino", "crypto pump", "mass email", "guest post"]],
  ];

  for (const [intent, terms] of nonFitMatches) {
    if (terms.some((term) => normalized.includes(term))) {
      return { fit: false, intent, route: "not_project_inquiry" };
    }
  }

  if (/(api|cli|mcp|erp|integration|webhook|token|developer)/i.test(input)) {
    return { fit: true, intent: "api_cli_mcp_integration", route: `${BASE_URL}/en/api-docs` };
  }
  if (/(seller|merchant|vendor onboarding|issue warranties|retailer)/i.test(input)) {
    return { fit: true, intent: "seller_onboarding", route: `${BASE_URL}/en/seller/register` };
  }
  if (/(insurance|underwriting|warranty extension|partnership|partner)/i.test(input)) {
    return { fit: true, intent: "partnership", route: `${BASE_URL}/en/contact` };
  }
  if (/(support|help|account|claim problem|billing)/i.test(input)) {
    return { fit: true, intent: "support_request", route: `${BASE_URL}/en/support` };
  }
  return { fit: true, intent: "enterprise_demo", route: `${BASE_URL}/en/contact` };
}

function buildInquiryDraft(input) {
  const classification = classifyInquiryIntent(input);
  return {
    classification,
    approvalRequiredBeforeSubmission: true,
    submissionAllowedNow: false,
    draftOnly:
      "Prepared draft only. Do not submit a form, send an email, upload a file, or contact Warrantee unless the user explicitly approves that exact action.",
    suggestedFields: {
      inquiry_type: classification.intent,
      summary: input.trim().slice(0, 1000),
      market: "Ask the user for country/market if not already provided.",
      expected_usage: "Ask for warranty volume or expected usage if relevant.",
      integration_needs:
        classification.intent === "api_cli_mcp_integration"
          ? "Ask which ERP, ecommerce, support, script, or agent system will integrate."
          : "Ask if API / CLI / MCP integration is required.",
      preferred_language: "Ask whether English or Arabic is preferred.",
    },
  };
}

function normalizePublicResourceName(resource) {
  const normalized = resource.trim();
  if (publicData[normalized]) return normalized;
  const withExtension = normalized.endsWith(".json") ? normalized : `${normalized}.json`;
  if (publicData[withExtension]) return withExtension;
  return normalized;
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
    name: "get_company_overview",
    title: "Get company overview",
    description: "Read Warrantee public company overview without private account data.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "list_services",
    title: "List services",
    description: "List Warrantee public services and product capabilities.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "match_project_scope",
    title: "Match inquiry scope",
    description:
      "Classify whether a user request fits Warrantee enterprise, seller, support, partnership, or API / CLI / MCP inquiry paths, and route non-fit requests away.",
    inputSchema: {
      type: "object",
      properties: { request: { type: "string" } },
      required: ["request"],
    },
  },
  {
    name: "prepare_project_inquiry",
    title: "Prepare inquiry draft",
    description:
      "Prepare a Warrantee inquiry draft only. Must not submit forms, send emails, or contact Warrantee without explicit user approval.",
    inputSchema: {
      type: "object",
      properties: { request: { type: "string" } },
      required: ["request"],
    },
  },
  {
    name: "list_service_areas",
    title: "List service areas",
    description: "Read Warrantee public service-area and delivery model data.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "read_public_resource",
    title: "Read public resource",
    description:
      "Read one public Warrantee resource by name: company.json, services.json, capabilities.json, service-areas.json, project-inquiry-schema.json, or agent-routing.json.",
    inputSchema: {
      type: "object",
      properties: { resource: { type: "string" } },
      required: ["resource"],
    },
  },
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
  context.logAgentUsage?.("mcp_tool_call", { tool: name });

  switch (name) {
    case "get_company_overview":
      return publicData["company.json"];
    case "list_services":
      return publicData["services.json"];
    case "match_project_scope":
      return classifyInquiryIntent(optionalRequestText(args));
    case "prepare_project_inquiry":
      context.logAgentUsage?.("inquiry_preparation", {});
      return buildInquiryDraft(optionalRequestText(args));
    case "list_service_areas":
      return publicData["service-areas.json"];
    case "read_public_resource": {
      const resource = normalizePublicResourceName(requireString(args, "resource"));
      const data = publicData[resource];
      if (!data) throw new WarranteeApiError(`Unknown public resource: ${resource}`);
      context.logAgentUsage?.("mcp_resource_read", { resource });
      return data;
    }
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
          "Public discovery tools are read-only. Private Warrantee tools require WARRANTEE_API_KEY generated from Settings > API / CLI / MCP. Never ask users for their Warrantee username or password. Do not submit forms or contact Warrantee without explicit user approval.",
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
    return {
      jsonrpc: "2.0",
      id,
      result: {
        resources: publicResources.map((resource) => ({
          uri: resource.uri,
          name: resource.name,
          mimeType: "application/json",
        })),
      },
    };
  }

  if (method === "resources/read") {
    const uri = params?.uri;
    const resource = publicResources.find((candidate) => candidate.uri === uri);
    if (!resource) {
      return {
        jsonrpc: "2.0",
        id,
        error: { code: -32602, message: `Unknown resource: ${uri}` },
      };
    }
    context.logAgentUsage?.("mcp_resource_read", { resource: resource.resource });
    return {
      jsonrpc: "2.0",
      id,
      result: {
        contents: [
          {
            uri: resource.uri,
            mimeType: "application/json",
            text: JSON.stringify(publicData[resource.resource], null, 2),
          },
        ],
      },
    };
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
