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
- `/.well-known/http-message-signatures-directory`
- `/.well-known/acp.json`
- `/.well-known/ucp`
- `/.well-known/agent-skills/index.json`
- `/openapi.json`
- `/.well-known/openapi.json`
- `/auth.md`

MCP:

- Hosted endpoint: `/api/mcp`
- Public read-only tools:
  - `ask_warrantee`
  - `get_company_overview`
  - `list_services`
  - `match_project_scope`
  - `prepare_project_inquiry`
  - `list_service_areas`
  - `read_public_resource`

Agent Concierge and A2A:

- Public HTTP contract and endpoint: `/api/agent-concierge`
- A2A 1.0 HTTP+JSON interface: `/api/a2a`
- A2A synchronous send endpoint: `/api/a2a/message:send`
- Protected owner report for regular browsers: `/en/owner/service-report` or `/ar/owner/service-report`
- API owner-report aliases: `/api/admin/agent-concierge/report` and `/api/admin/agent-concierge/questions`
- Shared deterministic answer engine: `src/lib/agent-concierge.ts`
- Privacy redaction: `src/lib/agent-question-privacy.ts`
- Server-side recording: `src/lib/server/agent-question-recorder.ts`
- Question ledger migration: `supabase/migrations/20260830200356_agent_concierge_questions.sql`

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
- The Agent Concierge is public and read-only. It has no model inference, private account access, task execution, form submission, contact, upload, or purchase capability.
- Concierge answers must cite public Warrantee sources and distinguish current features from planned commercial or asset-intelligence directions.
- Questions are redacted before storage. Do not retain IP addresses, raw user-agents, credentials, private warranty data, or full request bodies.

## How The Pieces Work Together

- `llms.txt` is the short machine-readable overview.
- `llms-full.txt` is the fuller agent brief with routing and safety rules.
- `/data/*.json` gives stable structured facts for crawlers and procurement agents.
- `agent-card.json` gives high-level agent capabilities and links to data.
- `api-catalog` points machines to APIs, docs, OpenAPI, MCP, and structured data.
- `mcp.json` describes tools and resources available to MCP clients.
- `/api/mcp` provides hosted JSON-RPC MCP access.
- `/api/agent-concierge` provides the same deterministic public answer engine over plain HTTP.
- `/api/a2a` and `/api/a2a/message:send` provide a bounded A2A 1.0 HTTP+JSON interface for synchronous public questions.
- `/openapi.json` documents public discovery endpoints plus authenticated API boundaries.
- `/auth.md` explains public versus private access and the no-password rule.
- `robots.txt` allows public content, blocks private API surfaces, permits the hosted public MCP endpoint, and declares `Content-Signal` preferences for search, AI input, and AI training.
- `/.well-known/http-message-signatures-directory` is a Web Bot Auth/JWKS-style public-key directory. It stays empty unless real Warrantee-operated signed bot or agent public keys are configured through `WEB_BOT_AUTH_PUBLIC_JWKS`.
- `/.well-known/acp.json` and `/.well-known/ucp` publish truthful discovery-only status that agent-native commerce is not enabled yet. They must not be changed to `enabled` until real payment rails, approval rules, and checkout verification are implemented.

## Markdown For Agents

Every canonical, indexable URL in `/sitemap.xml` has one deterministic Markdown companion. The companions are generated from rendered HTML with Cheerio and Turndown; the generator does not use regex-based page conversion.

- Canonical negotiation: send `Accept: text/markdown` to the normal page URL.
- Browser behavior: ordinary browser requests and `text/markdown;q=0` continue to receive HTML.
- Safe fallback: routes without a generated sitemap companion continue to receive HTML.
- Direct sidecars: use `/data/agent-markdown-manifest.json` to discover `/agent-markdown/.../*.md` locations.
- Duplicate-index protection: direct sidecars return `X-Robots-Tag: noindex, follow`.
- Content scope: the deepest public `<main>` is retained; navigation, footer, forms, scripts, styles, hidden UI, controls, admin material, and private application links are excluded.
- Preserved semantics: title, description, canonical URL, language, public links, meaningful images, headings, lists, tables, details, and valid public JSON-LD.
- Content policy: `search=yes, ai-input=yes, ai-train=no` is centralized in `src/lib/agent-content-policy.ts` and applied consistently.

Source and validation:

- Generator: `scripts/generate-agent-markdown.mjs`
- Structured parser/converter: `scripts/lib/agent-markdown-generator.mjs`
- Generated source: `src/generated/agent-markdown-pages.json`
- Runtime negotiation: `src/middleware.ts` and `src/app/api/agent-markdown/route.ts`
- Static sidecars: `src/app/agent-markdown/[...segments]/route.ts`
- Manifest: `src/app/data/agent-markdown-manifest.json/route.ts`
- Coverage and response validator: `scripts/check-agent-markdown.mjs`
- HTML preservation validator: `scripts/check-html-preservation.mjs`
- Local production release gate: `scripts/run-agent-markdown-local-gate.mjs`

After any canonical public page or sitemap change, rebuild locally, regenerate the companions, and run the release gate:

```bash
npm run build
```

Start that build in a separate terminal with a test-only `LOCAL_WARRANTEE_URL`, then run:

```bash
AGENT_MARKDOWN_BASE_URL="$LOCAL_WARRANTEE_URL" npm run agent-markdown:generate
npm run build
npm run qa:agent-markdown:local
HTML_CANDIDATE_URL="$LOCAL_WARRANTEE_URL" npm run qa:html-preservation
```

The CI workflow runs `qa:agent-markdown:local` after the production build. The Production Security Gates run the full live sitemap/Markdown audit against `https://warrantee.io`.

## Remaining External DNS Task

DNS-AID cannot be completed from the Next.js application. It requires DNS provider access for `warrantee.io` and, ideally, DNSSEC support. The remaining records to evaluate with the DNS provider are `_index._agents.warrantee.io`, `_a2a._agents.warrantee.io`, and `_mcp._agents.warrantee.io` using the current DNS-AID draft's SVCB/HTTPS guidance. Do not add placeholder DNS records unless they point to real maintained discovery endpoints.

## Agentic Resource And OAuth Discovery

- `/.well-known/ai-catalog.json` publishes a deterministic AI Catalog 1.0 envelope for Warrantee's live MCP server card, Agent Skills index, A2A agent card, OpenAPI description, and API catalog. It advertises only the implemented synchronous read-only A2A interface; commerce remains disabled.
- `/.well-known/oauth-protected-resource/api` publishes RFC 9728 protected-resource metadata for `https://warrantee.io/api`.
- Anonymous or invalid requests to `/api/v1/*` return a Bearer `WWW-Authenticate` challenge pointing to that protected-resource metadata while continuing to support scoped `x-api-key` integration tokens.
- The canonical-page discovery `Link` header advertises the AI catalog using `rel="ai-catalog"`.

## Authenticated Asset Intelligence

Warrantee now exposes asset lifecycle intelligence through the same authenticated integration model used by the API / CLI / MCP layer.

- Shared model: `src/lib/asset-intelligence.ts`
- REST endpoint: `GET /api/v1/intelligence`
- Required access: scoped integration token or bearer session with `warranties:read`
- CLI command: `warrantee intelligence summary --limit 5000`
- MCP tool: `get_asset_intelligence`
- OpenAPI path: `/api/v1/intelligence`

The intelligence model returns portfolio-level warranty, claim, supplier, expiry, data-quality, lifecycle-health, and next-action signals. It does not ask integrators for Warrantee usernames or passwords. Agents and systems should use a scoped `x-api-key` generated from Settings > API / CLI / MCP.

The public MCP card must also advertise `get_asset_intelligence` so discovery metadata stays aligned with the actual hosted and stdio MCP tools.

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
- public Agent Concierge questions by protocol, intent, and answer status

The logger does not record request bodies, IP addresses, emails, API keys, passwords, or private warranty data. It records event type, path, bounded user-agent hint, and a broad user-agent class.

Operational checks:

- In Vercel logs, search for `agent_readiness_event`.
- Count events by `event`.
- Filter `user_agent_class = ai_or_search_crawler` to understand AI/search crawler activity.
- Exclude `user_agent_class = automation` when measuring real agent adoption; release validators use this class intentionally.
- Review `mcp_tool_call` and `inquiry_preparation` counts for agent usage.
- As a signed-in Warrantee admin, request `/en/owner/service-report?days=30&limit=50&page=1` (or the Arabic locale path) to review redacted questions, repeated themes, partial answers, locale/protocol breakdowns, and improvement tags. This regular-browser path reuses the protected API handler because some client-side filters block direct navigation to raw `/api/*` URLs. It is explicitly marked `noindex, nofollow`; the API aliases remain available for authenticated integrations.
- Use the report's `pagination.hasNextPage` value and increment `page` to retrieve every sanitized question in the selected period. Add `includeAutomation=1` only when release-check traffic should be included.
- Retention defaults to 180 days and can be changed with `DATA_RETENTION_AGENT_QUESTION_DAYS` within the bounded retention configuration.
- Review `agent_markdown_read` for negotiated canonical Markdown usage. Direct sidecars remain statically served for cost and reliability; use platform request logs for aggregate direct-sidecar traffic.

## Validation Commands

After a local production server is running, set `AGENT_READINESS_BASE_URL` to that local server URL:

```bash
AGENT_READINESS_BASE_URL="$LOCAL_WARRANTEE_URL" npm run qa:agent-readiness
```

Against production:

```bash
AGENT_READINESS_BASE_URL=https://warrantee.io npm run qa:agent-readiness
AGENT_MARKDOWN_BASE_URL=https://warrantee.io npm run qa:agent-markdown
```

Standard verification:

```bash
npm run guard:loopback
npm run qa:growth-readiness
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
