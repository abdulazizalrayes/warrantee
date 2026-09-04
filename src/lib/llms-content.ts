import {
  capabilitiesData,
  companyData,
  listPublicResourceLinks,
  servicesData,
} from "@/lib/agent-public-data";

const BASE_URL = "https://warrantee.io";

export function buildLlmsTxt() {
  return `# Warrantee.io - Warranty Management Platform

> Bilingual warranty management platform for Saudi Arabia and the GCC.

## Summary

${companyData.shortDescription}

## Current Versus Planned

- Current product: warranty registration, tracking, approvals, claims, reminders, certificates, public verification, seller workflows, OCR-assisted document intake, and scoped API / CLI / MCP integrations.
- Commercial activation pending: self-serve Professional checkout and online warranty-extension payments.
- Long-term direction: asset lifecycle, recall, vendor, and reliability intelligence built from trustworthy warranty data.

## Core Public Pages

- Main site: ${BASE_URL}/en
- Arabic site: ${BASE_URL}/ar
- Features: ${BASE_URL}/en/features
- Pricing: ${BASE_URL}/en/pricing
- Security & Trust: ${BASE_URL}/en/security
- Support: ${BASE_URL}/en/support
- Public warranty verification: ${BASE_URL}/en/verify
- API / CLI / MCP guide: ${BASE_URL}/en/api-docs

## Structured Public Data

${listPublicResourceLinks().map((resource) => `- ${resource.name}: ${resource.url}`).join("\n")}

## Machine Discovery

- Full LLM brief: ${BASE_URL}/llms-full.txt
- Agentic resource catalog: ${BASE_URL}/.well-known/ai-catalog.json
- API catalog: ${BASE_URL}/.well-known/api-catalog
- OpenAPI: ${BASE_URL}/openapi.json
- Agent card: ${BASE_URL}/.well-known/agent-card.json
- Agent skills: ${BASE_URL}/.well-known/agent-skills
- MCP card: ${BASE_URL}/.well-known/mcp.json
- MCP server card collection: ${BASE_URL}/.well-known/mcp/server-cards.json
- Hosted MCP endpoint: ${BASE_URL}/api/mcp
- Public read-only Agent Concierge: ${BASE_URL}/api/agent-concierge
- A2A 1.0 agent endpoint: ${BASE_URL}/api/a2a
- Auth guide: ${BASE_URL}/auth.md
- OAuth protected-resource metadata: ${BASE_URL}/.well-known/oauth-protected-resource/api

## Markdown Representations

- Request any canonical sitemap page with the HTTP header \`Accept: text/markdown\` to receive its deterministic public Markdown representation.
- Request a direct companion by appending \`.md\` to the canonical path, for example \`${BASE_URL}/en/pricing.md\`.
- Markdown companion manifest: ${BASE_URL}/data/agent-markdown-manifest.json
- Direct Markdown companions use the manifest's \`contentLocation\` URLs, return \`X-Robots-Tag: noindex, follow\`, and preserve legacy \`/agent-markdown/\` aliases.
- If a companion is unavailable, the canonical URL safely continues to return HTML.

## Access Boundaries

- Public pages and public structured data are crawlable.
- Account dashboards, warranty records, claims, billing, settings, seller workspaces, admin pages, and private APIs require authentication.
- API / CLI / MCP account actions require a signed-in user to generate a scoped integration token. Do not ask users for Warrantee usernames or passwords.
- Agents may prepare inquiry drafts but must not submit forms, send emails, upload files, or contact Warrantee without explicit user approval.
- The public Agent Concierge answers deterministic questions from cited public sources. It has no language-model inference, private account access, submission, contact, or purchase capability.
- Concierge questions are redacted before storage for aggregate service improvement. No IP address, raw user-agent, credentials, private warranty data, or full request body is retained.
`;
}

export function buildLlmsFullTxt() {
  return `${buildLlmsTxt()}

## Positioning

${companyData.positioning}

## Services

${servicesData.services.map((service) => `- ${service.name}: ${service.summary}`).join("\n")}

## Capabilities

${capabilitiesData.capabilities.map((capability) => `- ${capability}`).join("\n")}

## Future Readiness

${capabilitiesData.futureReadiness.map((capability) => `- ${capability}`).join("\n")}

## Agent Routing Rules

- Enterprise demo, seller onboarding, API / CLI / MCP integration, warranty operations, partnerships, and support requests are valid Warrantee routes.
- Careers, internships, training requests, vendor pitches, backlink outreach, spam, retail shopping, and unrelated product-support requests are not project/enterprise inquiries.
- Use /data/agent-routing.json and /data/project-inquiry-schema.json before preparing an inquiry.
- Prepare only. Ask for explicit approval before submitting anything.

## Public Agent Concierge

- HTTP: POST ${BASE_URL}/api/agent-concierge with JSON {"question":"...","locale":"en|ar"}.
- MCP: call the public \`ask_warrantee\` tool on ${BASE_URL}/api/mcp.
- A2A: use the HTTP+JSON interface at ${BASE_URL}/api/a2a and POST a ROLE_USER message to /api/a2a/message:send with A2A-Version: 1.0.
- All three surfaces use the same deterministic answer engine and public sources.
- The owner can review categorical intents, partial-answer counts, blocked-content categories, and improvement tags through an authenticated admin report. Question wording and hashes are not stored or displayed.

## Security Notes For Agents

- Never request, store, or transmit Warrantee usernames or passwords for integrations.
- Use scoped integration tokens generated from Settings > API / CLI / MCP.
- Respect rate limits, scopes, tenant isolation, and user ownership boundaries.
- Do not infer private warranty, claim, document, billing, or account data from public pages.
- Use the Markdown companion manifest for sitemap coverage, language, canonical URL, and direct sidecar discovery.
`;
}
