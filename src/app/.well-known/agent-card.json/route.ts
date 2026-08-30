import { NextResponse } from "next/server";

const BASE_URL = "https://warrantee.io";

const agentCard = {
  name: "Warrantee Agent Concierge",
  description:
    "Public read-only concierge for evidence-backed questions about Warrantee plans, warranty operations, seller onboarding, API / CLI / MCP integrations, security, markets, and product fit. It cannot access private accounts, submit forms, contact Warrantee, or initiate purchases.",
  supportedInterfaces: [
    {
      url: `${BASE_URL}/api/a2a`,
      protocolBinding: "HTTP+JSON",
      protocolVersion: "1.0",
    },
  ],
  version: "1.0.0",
  provider: {
    organization: "Warrantee",
    url: BASE_URL,
  },
  documentationUrl: `${BASE_URL}/en/api-docs`,
  capabilities: {
    streaming: false,
    pushNotifications: false,
    stateTransitionHistory: false,
  },
  defaultInputModes: ["text/plain", "application/json"],
  defaultOutputModes: ["text/plain", "application/json"],
  skills: [
    {
      id: "ask-warrantee",
      name: "Ask Warrantee",
      description:
        "Answer public questions using deterministic, cited Warrantee sources and record only a privacy-redacted question for service improvement.",
      tags: ["warranty", "plans", "integration", "seller", "security", "bilingual"],
      examples: [
        "Which Warrantee plan fits a small seller?",
        "How does an agent integrate without collecting a password?",
      ],
    },
    {
      id: "public-company-discovery",
      name: "Public Company Discovery",
      description:
        "Read Warrantee services, capabilities, service areas, current-versus-planned status, and routing rules without private account access.",
      tags: ["company", "services", "capabilities", "procurement"],
    },
    {
      id: "api-cli-mcp-integration",
      name: "API / CLI / MCP Integration",
      description:
        "Explain scoped integration tokens and public discovery. Private account tools require a user-generated x-api-key and never a username or password.",
      tags: ["api", "cli", "mcp", "integration", "developer"],
    },
    {
      id: "asset-lifecycle-intelligence",
      name: "Asset Lifecycle Intelligence",
      description:
        "Use authenticated API / CLI / MCP access to summarize warranty portfolio health, supplier risk, expiry windows, unresolved claims, missing values, and recommended next actions.",
      tags: ["asset-lifecycle", "portfolio", "supplier-risk", "claims", "expiry"],
    },
    {
      id: "canonical-markdown",
      name: "Canonical Markdown Representation",
      description:
        "Request a canonical sitemap URL with Accept: text/markdown or use the noindex direct companion listed in /data/agent-markdown-manifest.json.",
      tags: ["markdown", "discovery", "crawler", "canonical"],
    },
    {
      id: "inquiry-preparation",
      name: "Inquiry Preparation",
      description:
        "Explain fit and prepare a draft concept. The agent cannot submit, send, upload, contact, or purchase without a separate explicitly approved workflow.",
      tags: ["inquiry", "enterprise", "seller", "approval-required"],
    },
    {
      id: "warranty-verification",
      name: "Warranty Verification",
      description: "Explain Warrantee's public warranty-reference verification workflow.",
      tags: ["warranty", "verification", "product-passport", "public"],
    },
    {
      id: "claims-intake",
      name: "Claims Intake",
      description:
        "Explain how signed-in users capture claim details and supporting evidence for review workflows.",
      tags: ["claims", "evidence", "workflow", "authenticated"],
    },
    {
      id: "warranty-extensions",
      name: "Warranty Extensions",
      description:
        "Explain the current extension-interest and eligibility workflows without implying that payment activation is live.",
      tags: ["extension", "eligibility", "interest", "current-status"],
    },
    {
      id: "document-ingestion",
      name: "Document Ingestion",
      description:
        "Explain authenticated extraction of warranty data from uploaded files and OCR-supported documents.",
      tags: ["documents", "ocr", "ingestion", "authenticated"],
    },
  ],
  "x-warrantee": {
    hostedMcp: `${BASE_URL}/api/mcp`,
    conciergeHttp: `${BASE_URL}/api/agent-concierge`,
    openapi: `${BASE_URL}/openapi.json`,
    structuredData: {
      company: `${BASE_URL}/data/company.json`,
      services: `${BASE_URL}/data/services.json`,
      capabilities: `${BASE_URL}/data/capabilities.json`,
      serviceAreas: `${BASE_URL}/data/service-areas.json`,
      inquirySchema: `${BASE_URL}/data/project-inquiry-schema.json`,
      routing: `${BASE_URL}/data/agent-routing.json`,
    },
    privacy:
      "Questions are redacted before storage. No IP address, raw user-agent, credentials, private warranty data, or full request body is retained.",
    boundaries: {
      readOnly: true,
      privateAccountAccess: false,
      submissions: false,
      purchases: false,
      modelInference: false,
    },
  },
} as const;

const headers = {
  "Content-Type": "application/agent-card+json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
};

export function GET() {
  return NextResponse.json(agentCard, { headers });
}

export function HEAD() {
  return new NextResponse(null, { headers });
}
