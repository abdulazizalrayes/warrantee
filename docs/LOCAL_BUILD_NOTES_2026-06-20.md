# Local Build Notes - 2026-06-20

Scope: Warrantee only.

## Issue Found

Local `npm run build` on this Mac had two separate local-environment problems:

1. Duplicate generated dependency folders existed under `node_modules/@types` with names ending in ` 2`.
2. Local production builds loaded `.env.production.local`, which can contain Sentry release-upload credentials. That caused local builds to attempt Sentry-related build work and eventually stall or time out.

CI and Vercel production builds were healthy because they run from a clean dependency install and are expected to use Sentry release-upload configuration.

## Fix Applied

- Removed the duplicate generated `node_modules/@types/* 2` folders locally.
- Updated `next.config.ts` so Sentry's Next.js wrapper is enabled only when:
  - `CI=true`, or
  - `VERCEL=1`, or
  - `WARRANTEE_ENABLE_LOCAL_SENTRY_UPLOAD=1`.

This keeps source-map/release behavior active for GitHub/Vercel while making local builds deterministic.

## Verification

The following passed locally after the fix:

```bash
npm run lint
npm run type-check
npm run guard:loopback
npm run test -- src/lib/__tests__/seo-readiness.test.ts src/lib/__tests__/agent-ready.test.ts tests/unit/hosted-mcp.test.ts tests/unit/cli-mcp.test.ts
NEXT_TELEMETRY_DISABLED=1 WARRANTEE_DISABLE_SENTRY_NEXT_CONFIG=1 NODE_ENV=production ./node_modules/.bin/next build
AGENT_READINESS_BASE_URL="$LOCAL_WARRANTEE_URL" npm run qa:agent-readiness
E2E_BASE_URL="$LOCAL_WARRANTEE_URL" npx playwright test tests/e2e/seo-agent-ready.spec.ts --project=chromium
```

## Optional Local Sentry Upload

Only use local Sentry release uploads when intentionally testing Sentry artifacts:

```bash
WARRANTEE_ENABLE_LOCAL_SENTRY_UPLOAD=1 npm run build
```

