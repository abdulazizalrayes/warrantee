import { PUBLIC_DATA_PATHS } from "@/lib/agent-public-data";

const BASE_URL = "https://warrantee.io";

export function buildPublicOpenApi() {
  const dataPaths = Object.fromEntries(
    PUBLIC_DATA_PATHS.map((path) => [
      path,
      {
        get: {
          summary: `Read ${path}`,
          description: "Public read-only structured data for search engines, LLMs, procurement agents, and AI assistants.",
          responses: {
            "200": { description: "Public structured data returned" },
          },
        },
      },
    ]),
  );

  return {
    openapi: "3.1.0",
    info: {
      title: "Warrantee Public Discovery And Integration API",
      version: "1.3.0",
      description:
        "Public OpenAPI description for Warrantee structured data, agent discovery, warranty verification, API / CLI / MCP integration guidance, and authenticated warranty-management APIs.",
    },
    servers: [{ url: BASE_URL }],
    paths: {
      ...dataPaths,
      "/llms.txt": {
        get: { summary: "Read LLM summary", responses: { "200": { description: "LLM summary returned" } } },
      },
      "/llms-full.txt": {
        get: { summary: "Read full LLM brief", responses: { "200": { description: "Full LLM brief returned" } } },
      },
      "/auth.md": {
        get: { summary: "Read integration auth guide", responses: { "200": { description: "Auth guide returned" } } },
      },
      "/data/agent-markdown-manifest.json": {
        get: {
          summary: "Read canonical Markdown companion manifest",
          description:
            "Lists every canonical indexable sitemap page, its language, direct noindex Markdown companion, content hash, and response-size reduction.",
          responses: { "200": { description: "Markdown companion manifest returned" } },
        },
      },
      "/.well-known/agent-card.json": {
        get: { summary: "Read agent discovery card", responses: { "200": { description: "Agent card returned" } } },
      },
      "/.well-known/ai-catalog.json": {
        get: {
          summary: "Read agentic resource catalog",
          description:
            "AI Catalog 1.0 manifest referencing Warrantee's live MCP card, skills, generic agent card, OpenAPI description, and API catalog.",
          responses: { "200": { description: "Agentic resource catalog returned" } },
        },
      },
      "/.well-known/api-catalog": {
        get: { summary: "Read API catalog linkset", responses: { "200": { description: "API catalog returned" } } },
      },
      "/.well-known/oauth-protected-resource/api": {
        get: {
          summary: "Read OAuth protected-resource metadata",
          description:
            "RFC 9728 metadata for the protected Warrantee API resource.",
          responses: { "200": { description: "Protected-resource metadata returned" } },
        },
      },
      "/.well-known/mcp.json": {
        get: { summary: "Read MCP server card", responses: { "200": { description: "MCP server card returned" } } },
      },
      "/.well-known/mcp/server-card.json": {
        get: { summary: "Read MCP server card alias", responses: { "200": { description: "MCP server card returned" } } },
      },
      "/.well-known/mcp/server-cards.json": {
        get: { summary: "Read MCP server card collection", responses: { "200": { description: "MCP server cards returned" } } },
      },
      "/.well-known/http-message-signatures-directory": {
        get: {
          summary: "Read Web Bot Auth public key directory",
          description:
            "JWKS-style directory for Warrantee-operated signed bot or agent traffic. Returns an empty key set unless public JWKs are explicitly configured; private signing keys are never exposed.",
          responses: { "200": { description: "Web Bot Auth key directory returned" } },
        },
      },
      "/.well-known/acp.json": {
        get: {
          summary: "Read ACP discovery status",
          description:
            "Discovery-only ACP metadata. Warrantee does not currently support ACP payments, and agents must not attempt purchases or checkout automation through ACP until the status changes to enabled.",
          responses: { "200": { description: "ACP discovery status returned" } },
        },
      },
      "/.well-known/ucp": {
        get: {
          summary: "Read UCP discovery status",
          description:
            "Discovery-only UCP metadata. Warrantee does not currently support UCP content payments or checkout, and agents may use this only to learn that commerce is not enabled.",
          responses: { "200": { description: "UCP discovery status returned" } },
        },
      },
      "/api/mcp": {
        get: {
          summary: "Describe hosted MCP endpoint",
          responses: { "200": { description: "Hosted MCP transport metadata returned" } },
        },
        post: {
          summary: "Call hosted MCP JSON-RPC endpoint",
          description:
            "Public read-only discovery tools do not require account credentials. Private warranty, claim, document, seller, and account tools require a scoped x-api-key generated by a signed-in Warrantee user. Agents must not ask for usernames or passwords.",
          responses: {
            "200": { description: "MCP JSON-RPC response returned" },
            "429": { description: "Rate limit exceeded" },
          },
        },
      },
      "/api/agent-concierge": {
        get: {
          summary: "Describe the public Warrantee Agent Concierge",
          description:
            "Returns the supported topics, privacy policy, boundaries, and request contract for the deterministic read-only concierge.",
          responses: { "200": { description: "Concierge contract returned" } },
        },
        post: {
          summary: "Ask a public question about Warrantee",
          description:
            "Answers from verified public sources without model inference or private account access. The question is redacted before privacy-safe recording for service improvement. The endpoint cannot submit forms, contact Warrantee, or initiate purchases.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  additionalProperties: false,
                  required: ["question"],
                  properties: {
                    question: { type: "string", minLength: 1, maxLength: 2000 },
                    locale: { type: "string", enum: ["en", "ar"] },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Cited public answer returned" },
            "400": { description: "Invalid question" },
            "429": { description: "Rate limit exceeded" },
          },
        },
      },
      "/api/a2a": {
        get: {
          summary: "Describe the Warrantee A2A interface",
          description:
            "A2A 1.0 HTTP+JSON interface metadata for synchronous public read-only message responses.",
          responses: { "200": { description: "A2A interface metadata returned" } },
        },
      },
      "/api/a2a/message:send": {
        post: {
          summary: "Send a public A2A question",
          description:
            "Requires A2A-Version: 1.0 and a ROLE_USER message with text parts. Returns a ROLE_AGENT message; tasks, streaming, push, private actions, submissions, and purchases are not supported.",
          parameters: [
            {
              name: "A2A-Version",
              in: "header",
              required: true,
              schema: { type: "string", const: "1.0" },
            },
          ],
          responses: {
            "200": { description: "A2A SendMessageResponse returned" },
            "400": { description: "Unsupported version or invalid message" },
            "429": { description: "Rate limit exceeded" },
          },
        },
      },
      "/api/admin/agent-concierge/questions": {
        get: {
          summary: "Read the protected agent-question improvement report",
          description:
            "Admin-only aggregate report containing privacy-redacted questions, repeated themes, answer gaps, locales, protocols, and improvement tags. No IP addresses, raw user-agents, credentials, or private warranty payloads are returned.",
          security: [{ SessionCookie: [] }],
          parameters: [
            { name: "days", in: "query", schema: { type: "integer", minimum: 1, maximum: 180, default: 30 } },
            { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 200, default: 50 } },
            { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
            { name: "includeAutomation", in: "query", schema: { type: "boolean", default: false } },
          ],
          responses: {
            "200": { description: "Privacy-safe improvement report returned" },
            "401": { description: "Not signed in" },
            "403": { description: "Administrator role required" },
          },
        },
      },
      "/api/v1/warranties/verify": {
        get: {
          summary: "Verify warranty",
          description: "Public warranty verification. Does not expose private account data.",
          responses: { "200": { description: "Verification result returned" } },
        },
      },
      "/api/v1/warranties": {
        get: {
          summary: "List authenticated warranties",
          security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
          responses: { "200": { description: "Visible warranties returned" } },
        },
        post: {
          summary: "Create authenticated warranty",
          security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
          responses: { "201": { description: "Warranty created" } },
        },
      },
      "/api/v1/status": {
        get: {
          summary: "Inspect integration-token capabilities",
          description:
            "Returns the authenticated credential kind, granted scopes, rate limit, and safety boundaries without exposing user, company, token, or private record identifiers.",
          security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
          responses: {
            "200": { description: "Integration capability status returned" },
            "401": { description: "Missing or invalid authentication" },
            "429": { description: "Rate limit exceeded" },
          },
        },
      },
      "/api/v1/intelligence": {
        get: {
          summary: "Read authenticated asset lifecycle intelligence",
          description:
            "Returns portfolio-level warranty, claim, supplier, expiry, data-quality, and next-action signals for the authenticated account. Requires a scoped integration token or bearer token with warranties:read access.",
          security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
          parameters: [
            {
              name: "limit",
              in: "query",
              required: false,
              schema: { type: "integer", minimum: 1, maximum: 10000, default: 5000 },
              description: "Maximum warranties included in the intelligence calculation.",
            },
          ],
          responses: {
            "200": { description: "Asset intelligence summary returned" },
            "401": { description: "Missing or invalid authentication" },
            "403": { description: "Token lacks required scope" },
            "429": { description: "Rate limit exceeded" },
          },
        },
      },
      "/api/claims": {
        post: {
          summary: "Submit claim",
          security: [{ BearerAuth: [] }],
          responses: { "201": { description: "Claim created" } },
        },
      },
    },
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: "apiKey",
          in: "header",
          name: "x-api-key",
          description:
            "Scoped integration token generated from a signed-in Warrantee account. Do not use a username or password.",
        },
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          description: "Supabase-backed session or service token for approved authenticated workflows.",
        },
        SessionCookie: {
          type: "apiKey",
          in: "cookie",
          name: "sb-access-token",
          description: "Authenticated Warrantee browser session; administrator role is also required.",
        },
      },
    },
    "x-agent-policy": {
      approvalRequiredBeforeSubmission: true,
      nonFitRouting:
        "Careers, vendors, internships, training, spam, retail shopping, and unrelated requests should not be routed into Warrantee enterprise or seller inquiry flows.",
      agentConcierge: {
        readOnly: true,
        modelInference: false,
        questionRecording: "privacy-redacted for service improvement",
        privateAccountAccess: false,
        submissionOrPurchase: false,
      },
    },
  };
}
