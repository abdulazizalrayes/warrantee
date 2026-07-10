export function buildAuthMarkdown() {
  return `# auth.md - Warrantee API / CLI / MCP Authentication

Warrantee integrations use scoped tokens. Agents and integrators must not ask users for Warrantee usernames or passwords.

## Public Access

These resources are public and read-only:

- /llms.txt
- /llms-full.txt
- /data/company.json
- /data/services.json
- /data/capabilities.json
- /data/service-areas.json
- /data/project-inquiry-schema.json
- /data/agent-routing.json
- /.well-known/agent-card.json
- /.well-known/api-catalog
- /.well-known/mcp.json
- /openapi.json

## Private Account Access

Private warranty, claim, document, seller, billing, settings, admin, and account data requires authentication.

1. Sign in to Warrantee.
2. Open Settings > API / CLI / MCP.
3. Generate a scoped integration token.
4. Store it in a secret manager or environment variable.
5. Send it as the \`x-api-key\` header for API, CLI, or hosted MCP requests.
6. Rotate or revoke unused tokens.

## Agent Rules

- Never request or store a Warrantee username or password.
- Never submit forms, send emails, upload files, or contact Warrantee unless the user explicitly approves that exact action.
- Use public read-only MCP tools for discovery.
- Use authenticated MCP/API tools only when the user provides an approved scoped token.
- Respect scopes, rate limits, tenant isolation, and ownership boundaries.
`;
}
