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
warrantee --version
warrantee doctor --pretty
warrantee ops health --pretty
warrantee ops status --pretty
warrantee ops capabilities --pretty
warrantee warranties list --status active --pretty
warrantee warranties get WARRANTY_ID
warrantee warranties create \
  --product-name "Laptop" \
  --start-date 2026-01-01 \
  --end-date 2027-01-01 \
  --idempotency-key erp-order-102044
warrantee claims list --status pending --pretty
warrantee claims get CLAIM_ID
warrantee documents list --query receipt --pretty
warrantee documents get DOCUMENT_ID
warrantee intelligence summary --limit 5000 --pretty
warrantee verify WR-12345
```

`doctor` checks the public platform health, public agent capabilities, the configured
integration token, its scopes and rate limit, and the CLI release status. It never
prints the token, user ID, company ID, or private records. A warning exit code (`2`)
means a non-critical check was skipped or a newer release is available; exit code
`1` means a required check failed.

Document commands return metadata only. They do not expose private file URLs or storage paths.

The intelligence command returns portfolio-level lifecycle health, supplier risk, expiry pressure, missing data, claim pressure, and suggested next actions for the authenticated account. It requires a scoped token with `warranties:read`.

## Updates

Check for a release without changing the machine:

```bash
warrantee update --check --pretty
```

Install an available update only after explicit approval:

```bash
warrantee update --confirm --pretty
```

The updater accepts only the official `warrantee` package from
`registry.npmjs.org`, requires SHA-512 integrity and registry-signature metadata,
pins the exact version, disables package lifecycle scripts, and never updates
silently. Warrantee agents must propose CLI source changes through Git review,
tests, and release gates; they must not rewrite the installed CLI at runtime.

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

## Release integrity

CLI releases are verified from the public Warrantee repository, staged through
GitHub Actions with npm trusted publishing and provenance, then require an npm
maintainer approval before becoming installable. Registry publication is not
complete until `npm view warrantee version` returns the approved version.
