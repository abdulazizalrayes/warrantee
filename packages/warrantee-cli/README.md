# Warrantee CLI and MCP

Official command-line and Model Context Protocol tools for Warrantee API / CLI / MCP integrations.

## Install

```bash
npm install -g warrantee
```

Or run without a global install:

```bash
npx warrantee auth status
```

## Authentication

Do not use a Warrantee username or password in integrations.

Sign in to Warrantee, open Settings > API / CLI / MCP, generate a scoped integration token, and store it as `WARRANTEE_API_KEY`.

```bash
export WARRANTEE_API_KEY="wrt_..."
warrantee auth status
```

## CLI

```bash
warrantee warranties list --status active --pretty
warrantee warranties get WARRANTY_ID
warrantee warranties create \
  --product-name "Laptop" \
  --start-date 2026-01-01 \
  --end-date 2027-01-01 \
  --idempotency-key erp-order-102044
warrantee verify WR-12345
```

## MCP

For local stdio MCP clients:

```json
{
  "mcpServers": {
    "warrantee": {
      "command": "warrantee-mcp",
      "env": {
        "WARRANTEE_API_KEY": "wrt_..."
      }
    }
  }
}
```

Hosted MCP is also available at:

```text
https://warrantee.io/api/mcp
```

Discovery and full integration docs:

- https://warrantee.io/en/api-docs
- https://warrantee.io/.well-known/mcp.json
- https://warrantee.io/llms.txt
