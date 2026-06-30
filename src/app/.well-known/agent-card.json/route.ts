import { NextResponse } from "next/server";

const BASE_URL = "https://warrantee.io";

export function GET() {
  return NextResponse.json({
    name: "Warrantee Agent",
    description:
      "Public discovery card for Warrantee's warranty verification, API / CLI / MCP integrations, claims, extension, seller onboarding, and document-ingestion workflows.",
    version: "1.0.0",
    url: `${BASE_URL}/en`,
    provider: {
      organization: "Warrantee",
      url: BASE_URL,
    },
    documentationUrl: `${BASE_URL}/en/api-docs`,
    structuredData: {
      company: `${BASE_URL}/data/company.json`,
      services: `${BASE_URL}/data/services.json`,
      capabilities: `${BASE_URL}/data/capabilities.json`,
      serviceAreas: `${BASE_URL}/data/service-areas.json`,
      inquirySchema: `${BASE_URL}/data/project-inquiry-schema.json`,
      routing: `${BASE_URL}/data/agent-routing.json`,
      llmsFull: `${BASE_URL}/llms-full.txt`,
      openapi: `${BASE_URL}/openapi.json`,
      auth: `${BASE_URL}/auth.md`,
    },
    capabilities: {
      streaming: false,
      pushNotifications: false,
      hostedMcp: true,
    },
    authentication: {
      schemes: ["x-api-key", "Bearer", "OAuth2"],
      instructions:
        "For private account workflows, the user must sign in to Warrantee and generate a scoped integration token from Settings > API / CLI / MCP. Never ask users for passwords. Do not request or store Warrantee usernames or passwords.",
    },
    defaultInputModes: ["text/plain", "application/json"],
    defaultOutputModes: ["text/plain", "application/json", "text/markdown"],
    skills: [
      {
        id: "api-cli-mcp-integration",
        name: "API / CLI / MCP Integration",
        description: "Use scoped x-api-key integration tokens with the REST API, Warrantee CLI commands, the Warrantee stdio MCP server, and the hosted https://warrantee.io/api/mcp endpoint while respecting rate limits, owner-isolated warranty APIs, and the no-password integration rule.",
      },
      {
        id: "asset-lifecycle-intelligence",
        name: "Asset Lifecycle Intelligence",
        description:
          "Use authenticated API / CLI / MCP access to summarize warranty portfolio health, supplier risk, expiry windows, unresolved claims, missing values, and recommended next actions.",
      },
      {
        id: "public-company-discovery",
        name: "Public Company Discovery",
        description:
          "Read public structured data, services, capabilities, service areas, and routing rules without private account access.",
      },
      {
        id: "inquiry-preparation",
        name: "Inquiry Preparation",
        description:
          "Prepare enterprise, seller, partnership, support, or API / CLI / MCP inquiry drafts. Do not submit or contact Warrantee without explicit user approval.",
      },
      {
        id: "warranty-verification",
        name: "Warranty Verification",
        description: "Verify a warranty reference and return its public validity status.",
      },
      {
        id: "claims-intake",
        name: "Claims Intake",
        description: "Capture claim details and supporting evidence for review workflows.",
      },
      {
        id: "warranty-extensions",
        name: "Warranty Extensions",
        description: "Support extension-request and extension-offer workflows for eligible warranties.",
      },
      {
        id: "seller-onboarding",
        name: "Seller Onboarding",
        description: "Support invite-driven seller onboarding and issuance workflow setup.",
      },
      {
        id: "document-ingestion",
        name: "Document Ingestion",
        description: "Extract warranty data from uploaded files and OCR-supported documents.",
      },
    ],
  });
}
