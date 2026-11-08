# Remaining CSP and provider-header review

Implementation update: the candidate described in `docs/CSP_ENFORCEMENT_2026-11-08.md` supersedes the earlier inventory-only status below. Deployment and release verification must be recorded separately; the historical review is not current release proof.

Warrantee only. This is not a new production deployment or a completed strict-CSP migration.

## Provider-header disposition

Cloudflare explicitly manages `/cdn-cgi/*` and recommends excluding these endpoints from security scans when their missing headers generate alerts. The previously reported `/cdn-cgi/` header findings are therefore provider-managed observations, not pending Next.js fixes. Do not proxy, override, or break these endpoints to silence the scanner.

This disposition is limited to `/cdn-cgi/*`; it does not excuse headers on Warrantee HTML, authenticated APIs, or the opaque script paths whose ownership was not established. No Cloudflare setting was changed. Browser inspection could not establish the Warrantee Cloudflare account; unrelated owner tabs were preserved.

Reference: https://developers.cloudflare.com/fundamentals/reference/cdn-cgi-endpoint/

## Strict CSP readiness

Independent review and the offline parser found 123 emitted HTML files, 216 distinct inline-script hashes, at most seven per file, 43 inline-style attributes, and zero inline event attributes in the existing local build. This is an inventory of that build, not sitemap coverage or a fresh production export.

`node scripts/audit-csp-build.mjs` provides a repeatable read-only inventory. It rejects symlinks, hashes exact script bytes with SHA-256, uses a structured HTML parser, and does not output HTML or script contents. Four tests cover exact bytes, entity spelling, whitespace, deduplication, structural attribute counting, and deterministic output. It deliberately reports `enforcementReady: false`.

No request-time HTML should be blindly hashed or stamped with nonces: doing so could authorize injected content. Hashes must come from the exact trusted final deployment artifact, with no rebuild between hashing and delivery.

The shared locale document shell contains custom WebMCP/JSON-LD scripts and preserves static public pages. Next.js requires dynamic rendering for request-specific nonces; globally adopting them would disable static optimization/ISR and ordinary shared CDN caching. Experimental SRI alone does not establish compatibility for inline Flight payloads or client-inserted GA/GTM bootstraps. No experimental feature was enabled.

References:
- https://nextjs.org/docs/app/guides/content-security-policy
- https://developers.google.com/tag-platform/security/guides/csp

## Required work before enforcement

1. Bind route-specific trusted hashes to final static HTML in the Vercel build adapter, then prove deployed headers match that exact artifact and rollback atomically.
2. Inventory client-inserted GA/GTM bootstrap scripts and the published container; test consent ordering without adding unsafe-eval.
3. Apply nonces only to already-dynamic/private routes without making the shared public layout dynamic; explicitly authorize custom scripts.
4. Keep inline-style allowance until attribute-to-class replacements have visual regression evidence. Nonces do not authorize style attributes.
5. Test candidate policy on EN/AR cold loads, navigation, authenticated pages, analytics, and provider-injected content before enforcement.

These are unresolved implementation/verification requirements, not owner access steps and not a validated exploit. Do not represent the inventory tool as a production fix. Current production retains the verified event-attribute block from PR 41. Backup restore testing and other owner-postponed work remain postponed.
