# Warrantee Agent Readiness Layer

Date: 2026-06-20

Scope: Warrantee only. Do not copy Paperclip, Hadhr, Haya, or any other company account, content, analytics property, Search Console property, or credentials into this layer.

## What Was Added

This layer makes Warrantee easier for search engines, LLMs, procurement agents, AI assistants, API clients, CLI users, and MCP clients to understand without changing the visual website.

Public structured data:

- `/data/company.json`
- `/data/services.json`
- `/data/capabilities.json`
- `/data/service-areas.json`
- `/data/project-inquiry-schema.json`
- `/data/agent-routing.json`

Discovery:

- `/llms.txt`
- `/llms-full.txt`
- `/.well-known/agent-card.json`
- `/.well-known/api-catalog`
- `/.well-known/mcp.json`
- `/.well-known/mcp/server-card.json`
- `/.well-known/mcp/server-cards.json`
- `/.well-known/agent-skills/index.json`
- `/openapi.json`
- `/.well-known/openapi.json`
- `/auth.md`

MCP:

- Hosted endpoint: `/api/mcp`
- Public read-only tools:
  - `get_company_overview`
  - `list_services`
  - `match_project_scope`
  - `prepare_project_inquiry`
  - `list_service_areas`
  - `read_public_resource`

## Warrantee-Specific Adaptation

The generic "project inquiry" idea was adapted for Warrantee as a SaaS warranty and asset lifecycle platform. Agents should prepare drafts for:

- enterprise demos
- seller onboarding
- API / CLI / MCP integration
- warranty operations consultation
- partnerships
- insurance or underwriting discussions
- support requests

Agents must route these away from enterprise or seller inquiry forms:

- careers
- internships
- training requests
- vendor pitches
- backlink or SEO sales outreach
- spam
- retail shopping
- unrelated product support

## Safety Rules

- Do not make visual website changes for this layer unless approved.
- Do not invent coordinates, legal registration details, certification claims, or social links.
- Do not publish private account ownership details in public endpoints.
- Do not ask users for Warrantee usernames or passwords.
- Use scoped integration tokens from Settings > API / CLI / MCP.
- Agents may prepare inquiry drafts only.
- Agents must not submit forms, send emails, upload files, or contact Warrantee unless the user explicitly approves the exact action.

## How The Pieces Work Together

- `llms.txt` is the short machine-readable overview.
- `llms-full.txt` is the fuller agent brief with routing and safety rules.
- `/data/*.json` gives stable structured facts for crawlers and procurement agents.
- `agent-card.json` gives high-level agent capabilities and links to data.
- `api-catalog` points machines to APIs, docs, OpenAPI, MCP, and structured data.
- `mcp.json` describes tools and resources available to MCP clients.
- `/api/mcp` provides hosted JSON-RPC MCP access.
- `/openapi.json` documents public discovery endpoints plus authenticated API boundaries.
- `/auth.md` explains public versus private access and the no-password rule.
- `robots.txt` allows public content while blocking private/admin/internal areas.

## Authenticated Asset Intelligence

Warrantee now exposes asset lifecycle intelligence through the same authenticated integration model used by the API / CLI / MCP layer.

- Shared model: `src/lib/asset-intelligence.ts`
- REST endpoint: `GET /api/v1/intelligence`
- Required access: scoped integration token or bearer session with `warranties:read`
- CLI command: `warrantee intelligence summary --limit 5000`
- MCP tool: `get_asset_intelligence`
- OpenAPI path: `/api/v1/intelligence`

The intelligence model returns portfolio-level warranty, claim, supplier, expiry, data-quality, lifecycle-health, and next-action signals. It does not ask integrators for Warrantee usernames or passwords. Agents and systems should use a scoped `x-api-key` generated from Settings > API / CLI / MCP.

## Analytics And Privacy

Agent-readiness route handlers log privacy-safe events through the app logger:

- crawler visits
- `llms.txt` reads
- `llms-full.txt` reads
- OpenAPI reads
- auth doc reads
- public data reads
- MCP tool calls
- MCP resource reads
- inquiry preparation events

The logger does not record request bodies, IP addresses, emails, API keys, passwords, or private warranty data. It records event type, path, bounded user-agent hint, and a broad user-agent class.

Operational checks:

- In Vercel logs, search for `agent_readiness_event`.
- Count events by `event`.
- Filter `user_agent_class = ai_or_search_crawler` to understand AI/search crawler activity.
- Review `mcp_tool_call` and `inquiry_preparation` counts for agent usage.

## Validation Commands

After a local production server is running, set `AGENT_READINESS_BASE_URL` to that local server URL:

```bash
AGENT_READINESS_BASE_URL="$LOCAL_WARRANTEE_URL" npm run qa:agent-readiness
```

Against production:

```bash
AGENT_READINESS_BASE_URL=https://warrantee.io npm run qa:agent-readiness
```

Standard verification:

```bash
npm run guard:loopback
npm run test -- src/lib/__tests__/agent-ready.test.ts src/lib/__tests__/seo-readiness.test.ts src/lib/__tests__/asset-intelligence.test.ts tests/unit/hosted-mcp.test.ts tests/unit/cli-mcp.test.ts
npm run build
E2E_BASE_URL="$LOCAL_WARRANTEE_URL" npx playwright test tests/e2e/seo-agent-ready.spec.ts
```

## What To Copy To Other Companies

Copy the pattern, not Warrantee-specific content:

- public structured data routes
- `llms.txt` and `llms-full.txt`
- agent card
- API catalog
- MCP card and server-card collection
- OpenAPI root endpoint
- auth guide
- privacy-safe agent usage logger
- validation script
- docs file

Before copying, rewrite:

- company name
- domain
- market/category
- services
- capabilities
- service areas
- inquiry routing
- support email
- account ownership references
- Search Console and analytics ownership records

Account ownership must be recorded per company in the correct private operational record. Do not mix Warrantee accounts with Paperclip, Hadhr, Haya, or any other company.
