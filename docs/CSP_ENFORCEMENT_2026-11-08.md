# Final-build CSP script enforcement

Scope: Warrantee / warrantee.io / abdulazizalrayes/warrantee only. Candidate implementation; production release requires CI, deployed packaging, browser, and production gate evidence.

## Implementation

- Production script-src no longer permits unsafe-inline or unsafe-eval. Existing external origin restrictions are retained; this is not a strict-dynamic policy or a complete XSS defense.
- Build preparatory scripts generate same-origin GA/GTM and WebMCP files from reviewed source. Analytics identifiers are validated; bootstraps preserve consent ordering, denial/withdrawal, one-time loading, and GA/GTM deduplication. Their source text matches the former inline bootstraps.
- Postbuild hashes exact final inline-script text with a structured HTML parser. Each static path receives only its own approved hashes. Final HTML bytes, route inventory, build ID, policies, and Proxy dependency trace are bound by a repeatable --check gate.
- Proxy reads a private packaged map, applies static hash policies, and forwards fresh cryptographic nonces to Next.js rendering on dynamic document requests. Incoming nonce/CSP headers are replaced. Dynamic documents are private/no-store; missing or unfinished manifests fail closed with 503.
- Existing supported locale routes and fixed editorial slugs are prebuilt so cached fallback HTML cannot retain an old request nonce. This changes build strategy, not translation quality or search eligibility. INDEXED_LOCALES, sitemap, canonical/hreflang rules, and beta noindex status are unchanged. Unknown editorial slugs remain 404.
- The private map is explicitly included in the Node Proxy NFT and validated in Vercel's filePathMap. It is not a public resource. Vercel output keeps finalized HTML bytes unchanged.
- Inline style attributes remain allowed for existing layout compatibility. This release does not claim a style-attribute migration, independent pentest, or elimination of all injection risks.

## Verification Before Publishing

- Unit tests, type-check, lint, dependency audit, architecture-map validation, frontend budgets, and nonce/attribute browser checks.
- Local EN/AR static pages: injected inline scripts/handlers denied; hydration and consent controls work.
- Dynamic passport: fresh nonces, forged request nonce ignored, no-store, working hydration. Passport lookup is synthetic/stubbed in the focused browser test, not real-document or customer proof.
- Desktop/mobile regression tests cover public JavaScript MIME types and prevent accidental auth redirects for bootstrap assets.
- Semantic HTML comparison: all 50 canonical pages equal the existing production baseline; scripts/styles/framework-generated attributes are normalized by the existing comparison tool. This is not byte-identical full HTML.
- Local Vercel production packaging dry run: 1,025 mapped HTML routes, 1,023 packaged HTML comparisons, 311 routing rules. No paid service was activated. Existing beta routes remain noindexed; this does not claim 17 fully translated languages.

## Repeatable Commands

```sh
npm run build
npm run qa:csp-build
npm run qa:security-headers
npm test
npm run type-check
npm run lint
npm run qa:architecture-map
npm run qa:frontend-budget
```

For an authorized local packaging dry run, use the existing linked Warrantee Vercel project and disable local Sentry uploads. Vercel may create ignored environment files; keep them private and never commit or print their values. Then run `npm run qa:csp-package`. Non-standalone Vercel output uses filePathMap references rather than copying every dependency into each function directory; deployed preview checks remain mandatory.

After deployment, verify canonical static policies, two fresh dynamic nonces, analytics consent/loading, API denial, private-map non-exposure, all 50 Markdown pages, CI, and Production Security Gates. Never hash arbitrary response content at the edge to authorize it.

## Provider Boundaries And Rollback

Cloudflare owns /cdn-cgi/ responses. Its official guidance recommends excluding their missing-header observations from scanner findings; they are not fixable Next.js headers. Opaque provider-script ownership remains unestablished and is not covered by this disposition.

References:
- https://developers.cloudflare.com/fundamentals/reference/cdn-cgi-endpoint/
- https://nextjs.org/docs/app/guides/content-security-policy
- https://developers.google.com/tag-platform/security/guides/csp

Rollback the entire deployment, not just its CSP map. Current pre-release rollback target: dpl_FAYWBaJXWxrBASTm1PRdjKFgm6ND / main 8081c254a45dc7b4baed98178aa2ecbc6956d978. No migrations, credentials, DNS, billing, or data changes are required. Backup restore testing and every previously postponed item remain postponed.
