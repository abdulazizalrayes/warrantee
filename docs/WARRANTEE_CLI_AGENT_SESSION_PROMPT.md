# Warrantee CLI Agent Session Prompt

Use this prompt in a new Codex, Claude Code, Cursor, or other coding-agent session.

```text
You are working on Warrantee only.

Repository:
/Users/abdulazizalrayes/Documents/New project/warrantee

Production:
https://warrantee.io

Goal:
Use the Warrantee CLI/API/MCP operational layer to inspect, diagnose, verify, and
improve Warrantee safely. Do not treat a page load, successful command, push, or
deployment URL as proof of an end-to-end working journey.

Before acting:
1. Read CLAUDE.md and docs/WARRANTEE_CLI_OPERATIONS.md.
2. Confirm the repository, branch, remote, git status, production domain, and
   account all belong to Warrantee. Do not mix another company or account.
3. Run `npm run qa:cli-release`, `npm run pack:cli`, and the focused CLI/MCP tests.
4. Run `npm run warrantee:cli -- doctor --pretty`. Never print secrets.
5. If using private commands, use a scoped integration token generated from the
   signed-in Warrantee account. Never request or store a username or password.

Operating rules:
- Use read-only CLI commands first.
- Respect scopes, tenant isolation, ownership, rate limits, and revocation.
- Do not expose tokens, private records, storage paths, user IDs, or company IDs.
- Never bypass auth, RLS, validation, idempotency, confirmation, or audit controls.
- Never let an agent silently self-modify or auto-update the CLI.
- CLI source improvements must be proposed as code, reviewed, tested, committed,
  and released through normal CI and the governed npm staging workflow.
- `warrantee update --check` is read-only.
- `warrantee update --confirm` requires explicit owner approval.
- Do not publish an npm package, create a GitHub release/tag, change licenses,
  rotate credentials, or alter production data without explicit owner approval.
- Do not make visual website changes unless separately approved.
- Leave unrelated dirty files untouched.

For every proposed change:
1. Map frontend, backend, database/RLS, auth/session, API/CLI/MCP, security,
   integrations, analytics, mobile, Arabic/RTL, and production boundaries.
2. Make the smallest change that solves the validated problem.
3. Add negative tests for missing auth, missing scope, wrong tenant, revoked token,
   rate limit, malformed input, dependency failure, and update tampering where
   relevant.
4. Run type-check, lint, unit tests, CLI/MCP tests, package dry-run, build, and
   production-safe smoke/readiness checks as applicable.
5. Verify the custom production domain and exact live commit after deployment.
6. Confirm disposable QA data is removed.

Final report:
- What changed and why
- Exact files and commands
- Tests that passed or failed
- Production evidence
- Security and tenant-boundary evidence
- Release/rollback instructions
- Remaining external or owner-only actions
```
