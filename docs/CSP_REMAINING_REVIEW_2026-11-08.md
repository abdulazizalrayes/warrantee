# Remaining CSP and provider-header review

## Latest Release Reconciliation - 2026-11-08

Recorded release evidence: PR #42 merged to main `961e911663286d28d4af85df9a106a129c3ed667`, deployed as `dpl_8fonqoJLZrqqiqKaD8ek6kgbsQUY`. CI `42465567801`, CodeQL `42465568079`, and Production Security Gate `42465831058` all passed: 354 unit tests, 236 E2E passes, and 92 intentional skips (not executed coverage). Release checks record 50 sitemap pages, 240 hashes, 56 EN/AR views, Sentry unresolved issues 0, and persistent QA records 0.

The deployed implementation in `docs/CSP_ENFORCEMENT_2026-11-08.md` supersedes the inventory-only requirements below for its recorded scope. Durable evidence: [PR #42 release record](https://github.com/abdulazizalrayes/warrantee/pull/42#issuecomment-6719739042). These release snapshots do not establish complete XSS defense or independent penetration testing.

GA4 pre-deployment verification checkpoint as of 2026-11-08: verify one controlled consented QA event's actual transport and correct-property reporting receipt after the next code deployment. Final outcome to be linked in that release PR's closeout once its PR number is assigned; no documentation-only redeployment is required. Inline-style migration, opaque provider-script ownership, and untested boundaries are not closed by the script-CSP release. All owner postponements in `docs/BACKLOG.md` remain in force, including backup/restore task 5 and tasks 6-10.

## Historical Pre-Release Review (Preserved)

Warrantee only. The sections below retain the earlier review and its then-current status; their candidate/pending wording is superseded only where the release record above establishes completion.

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

## Historical Required Work Before Enforcement

1. Bind route-specific trusted hashes to final static HTML in the Vercel build adapter, then prove deployed headers match that exact artifact and rollback atomically.
2. Inventory client-inserted GA/GTM bootstrap scripts and the published container; test consent ordering without adding unsafe-eval.
3. Apply nonces only to already-dynamic/private routes without making the shared public layout dynamic; explicitly authorize custom scripts.
4. Keep inline-style allowance until attribute-to-class replacements have visual regression evidence. Nonces do not authorize style attributes.
5. Test candidate policy on EN/AR cold loads, navigation, authenticated pages, analytics, and provider-injected content before enforcement.

At the time of this review these were unresolved implementation/verification requirements, not owner access steps or a validated exploit. PR #42 now supplies the recorded script-enforcement implementation and release checks above; the inventory tool alone remains insufficient production proof. The historical production baseline was the verified event-attribute block from PR 41. Inline-style work, opaque-provider boundaries, and other untested scopes remain separate. Backup restore testing and other owner-postponed work remain postponed.
