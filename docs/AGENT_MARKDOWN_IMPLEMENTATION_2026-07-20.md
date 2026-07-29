# Warrantee Markdown For Agents Implementation

Date: 2026-07-20

Scope: Warrantee and `warrantee.io` only.

## Handover Verdict

Ready. The final production deployment and all live post-deploy checks completed successfully. No visual or product-content change is included.

## Identity And Architecture Lock

- Canonical origin: `https://warrantee.io`
- Source and deployment repository: `abdulazizalrayes/warrantee`
- Branch: `main`
- Hosting: the existing Warrantee Next.js project on Vercel
- Edge: existing Vercel middleware with Cloudflare in front of the domain
- Vercel project: `warrantee` in the `abdulazizalrayes-3914s-projects` team
- Repository separation: none; the same repository owns application source and public deployment
- Sitemap at audit time: 50 canonical, indexable pages, split evenly across English and Arabic
- Account credentials and private ownership emails are intentionally excluded from public files. They belong only in Warrantee's private operational record.

## Pre-Implementation Audit

Existing discovery was strong: `llms.txt`, `llms-full.txt`, OpenAPI, API catalog, agent card, MCP cards, agent skills, public data, and hosted MCP were already present.

Validated gaps:

1. Markdown responses were manually maintained summaries rather than deterministic representations of rendered public pages.
2. Only about 30 paths were represented; 20 canonical sitemap pages had no Markdown companion.
3. `Accept: text/markdown;q=0` incorrectly returned Markdown.
4. Required `Content-Location`, `Content-Language`, canonical `Link`, and `Content-Signal` headers were incomplete.
5. There was no direct sidecar indexation guard, exact sitemap coverage audit, or generated-content freshness gate.
6. There was no application-HTML preservation comparison between the approved production site and the release candidate.

## Implementation

- Cheerio parses rendered HTML and sitemap XML structurally.
- Turndown with the GFM plugin converts sanitized public main content to Markdown.
- The converter selects the deepest public `<main>` because some existing pages contain nested main elements.
- It excludes navigation, footers, forms, controls, scripts, styles, hidden content, private application links, and non-meaningful images.
- It preserves metadata, public links, meaningful-alt images, headings, lists, tables, details, and valid public JSON-LD.
- Cloudflare email protection is deterministically normalized before conversion and HTML hashing.
- The generated artifact covers exactly the sitemap and is committed for deterministic builds.
- Middleware negotiates Markdown only for known generated paths and safely leaves all other paths as HTML.
- Direct static sidecars are discoverable through `/data/agent-markdown-manifest.json` and return `noindex, follow`.
- Negotiated reads emit privacy-safe `agent_markdown_read` telemetry without IPs, emails, tokens, request bodies, or private account data.

## Content Policy

The implementation preserves Warrantee's existing policy:

```text
search=yes, ai-input=yes, ai-train=no
```

This allows public search indexing and use as input for AI answers while declining model-training use. The policy is centralized in `src/lib/agent-content-policy.ts` and is not copied from another company.

## Verification Evidence

Pre-release evidence recorded during implementation:

- Sitemap coverage: 50 of 50 canonical pages
- Languages: 25 English and 25 Arabic pages
- Structured generator check: passed
- Canonical Markdown negotiation: passed for every sitemap URL
- Ordinary HTML response: passed for every sitemap URL
- `q=0` HTML fallback: passed for every sitemap URL
- Direct sidecar body and `noindex, follow`: passed for every sitemap URL
- Canonical, content-location, language, vary, content type, and Content-Signal headers: passed
- Unsupported-route HTML fallback: passed
- Local semantic HTML tree versus approved production: 50 of 50 identical after normalizing Cloudflare email protection
- Aggregate local response size: HTML 3,547,620 bytes; Markdown 435,200 bytes; 87.73% reduction
- Generator semantic-content size reduction: 51.47%

Final type-check, lint, unit, build, E2E, visual regression, CI, deployment, and live-production evidence is recorded below.

Additional pre-release gates:

- TypeScript: passed
- ESLint: passed
- Vitest: 25 files and 150 tests passed
- Next.js production build: passed; 246 static pages generated
- Focused agent/SEO Playwright suite: 10 of 10 passed across desktop and mobile
- Wider browser regression: 62 passed and 40 authenticated tests skipped because QA credentials were not loaded into the shell; no test failed
- Loopback production-reference guard: passed
- Growth and agent-readiness validation: passed
- npm production and full dependency audit: 0 vulnerabilities
- Visual freeze in regular Chrome: 0 changed pixels for `/en`, `/en/pricing`, `/en/api-docs`, and `/ar` at 1440x1000 and 390x844

## Cost

- New provider cost: SAR 0
- Runtime provider: existing Vercel/Cloudflare deployment
- New libraries: Cheerio, Turndown, and Turndown GFM; open-source npm dependencies
- Sidecars are statically generated to minimize function invocations and cost.

## Rollback

1. Revert the implementation commit in `abdulazizalrayes/warrantee`.
2. Push the revert to `main`.
3. Confirm Vercel promotes the reverted production deployment.
4. Run `npm run smoke:prod`, `npm run readiness:operational`, and `AGENT_READINESS_BASE_URL=https://warrantee.io npm run qa:agent-readiness`.
5. Confirm ordinary canonical URLs still return HTML and discovery files remain valid.

No database migration, secret rotation, paid service, DNS change, or destructive operation is part of this release.

## Final Release Record

- Implementation commit: `1a42b75922d687b0d3636678b3a3a7e831b24a05`
- Exhaustive E2E timeout correction: `9f302b8ec8bf77e4f56d411b88e1fd17fc2299bc`
- Vercel deployment: `dpl_FmAVvyEgDP2YsLS9wdQ74mokT3LQ` (`Ready`, production, aliased to `warrantee.io`)
- GitHub CI: run `29730768408` passed type-check, lint, unit tests, build, the local Markdown release gate, and full E2E
- Production Security Gates: run `29731251398` passed smoke, live Markdown audit, anonymous RLS, operational readiness, authenticated E2E, and controlled load
- Production Markdown audit: 50 of 50 canonical URLs passed HTML, canonical, HTML-tree, Markdown headers/body, CORS, `q=0`, and direct-sidecar noindex checks
- Production response size: HTML 3,613,833 bytes; Markdown 435,200 bytes; 87.96% reduction
- Visual regression: regular Chrome desktop/mobile checks remained pixel-identical on the approved representative English and Arabic routes
- Paperclip: completed Warrantee-only release record `WAR-141`, verified under Paperclip `v2026.707.0+2.git.ee83e6698`

## Protocol Remediation — 2026-07-29

The implementation was re-audited against stricter HTTP negotiation and
discovery requirements before this release. The approved owner policy remains:

```text
search=yes, ai-input=yes, ai-train=no
```

Validated production gaps before remediation:

1. Equal explicit HTML and Markdown preferences selected Markdown instead of
   the safer HTML default.
2. Wildcard precedence and representation-specific `q=0` exclusions were not
   handled correctly in every combination.
3. Canonical companions such as `/en/pricing.md` returned 404; only the legacy
   `/agent-markdown/en/pricing.md` form was available.
4. Canonical HTML and HEAD responses did not advertise their page-specific
   Markdown alternate.
5. The legacy sidecar did not reliably retain `Vary: Accept` at the deployed
   edge.

Remediation:

- Added standards-correct parsing for `text/markdown`, `text/x-markdown`,
  `text/html`, `application/xhtml+xml`, `text/*`, and `*/*`.
- Added quality, specificity, equal-preference, wildcard, and `q=0` handling;
  ambiguous or equal explicit requests default to HTML.
- Added canonical direct sidecars for every generated sitemap page while
  retaining the legacy sidecars for compatibility.
- Added page-specific Markdown alternate `Link` headers to canonical HTML and
  HEAD responses.
- Added canonical `Content-Location`, language, `Vary: Accept`,
  `X-Robots-Tag: noindex, follow`, CORS, and the approved `Content-Signal` to
  direct sidecars.
- Expanded unit, release-gate, and desktop/mobile browser coverage for all
  supported negotiation cases.

Pre-deployment verification:

- TypeScript: passed
- ESLint: passed
- Vitest: 26 files and 167 tests passed
- Next.js production build: passed; 245 static pages generated
- Local Markdown release gate: 50 of 50 English/Arabic sitemap pages passed
- Agent discovery validation: 17 JSON endpoints and 6 text endpoints passed
- Playwright: 10 of 10 focused checks passed on desktop and mobile Chrome
- HTML preservation: 50 of 50 semantic HTML trees were identical to the
  approved production site
- Local response size: HTML 3,491,378 bytes; Markdown 436,031 bytes; 87.51%
  reduction
- Production dependency audit: 0 vulnerabilities
- Loopback guard: no prohibited localhost or loopback references

Release commit, deployment, CI, production-gate, live endpoint, and rollback
evidence are recorded after production promotion.
