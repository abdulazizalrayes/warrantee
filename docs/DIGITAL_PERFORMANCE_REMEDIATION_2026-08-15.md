# Warrantee Digital Performance Remediation - 2026-08-15

Scope: Warrantee only (`warrantee.io`). This report records the approved 1-10 remediation set. It does not claim external assurance that has not occurred.

## Executive Status

| Item | Status | Evidence |
| --- | --- | --- |
| 1. GA4/GTM repair | Implemented and live-verified | Correct Web container `GTM-WFLBH83M` is published under the recorded owner; live HTML uses it and GA4 Realtime received the consented production page view |
| 2. Dependency security | Implemented | `pdfjs-dist` pinned to `6.2.108`; vulnerable transitive packages upgraded; production and full `npm audit` return zero vulnerabilities |
| 3. Traffic separation | Implemented | Browser and server funnel events classify `human`, `crawler`, `qa`, and `monitoring`; Playwright identifies as Warrantee QA |
| 4. Mobile performance | Implemented and live-measured without visual changes | Live mobile performance: EN home 86, Arabic home 91, pricing 87, and demo passport 91; all scored 100 for best practices |
| 5. Indexing and IndexNow | Live submission accepted; Google validation started | Sitemap contains 50 canonical localized URLs; both IndexNow endpoints accepted all 50 URLs with HTTP 200 and Search Console started revalidation on August 15 |
| 6. Social images | Implemented | All long-form resource and comparison metadata use the canonical Warrantee 1200x630 Open Graph image and Twitter image |
| 7. Urdu direction | Implemented | Urdu locale corrected to RTL with regression coverage |
| 8. Category authority | Existing implementation verified | Resource and comparison hubs already cover warranty management, spreadsheets, build-with-AI, recalls, lifecycle intelligence, and bilingual/GCC use cases |
| 9. OCR and pentest | Internal controls implemented; external evidence remains | Private-corpus gate now validates expected extraction fields; pentest readiness packet exists. Real approved scan samples and an independent signed pentest still require external parties |
| 10. Billing classification | Postponed by owner and fail-closed | Pro checkout remains unavailable while `STRIPE_PRO_PRICE_ID` is absent; no false paid-plan operational claim is allowed |

## Analytics Repair

- Authorized account: `abdulaziz.alrayes@gmail.com`.
- Existing GA4 property retained: `Warrantee / Warrantee.io`, measurement `G-ZQJ4LRG4GN`.
- Correct Web GTM container created: `warrantee.io web`, `GTM-WFLBH83M`.
- Published GTM version: 2, `Initial Warrantee web analytics`.
- Incorrect prior iOS container `GTM-N6G95MQL` is retired from Warrantee configuration.
- `NEXT_PUBLIC_GTM_ID` was updated in Vercel Development, Preview, and Production and in GitHub Actions.
- App events retain structured data-layer context and queue one GA4 business-event command through GTM. Explicit app page views are not sent a second time because the Google tag provides the standard page view. Direct GA loading is only the no-GTM fallback.
- Traffic classification is derived server-side from the request user agent, so a client cannot label automated traffic as human.
- The pricing checkout no longer relies on an absent public-page auth provider. The protected checkout endpoint now determines the real session, sends signed-out visitors to signup, and permits signed-in sessions to continue to the server-owned Stripe flow.
- Live GA4 Realtime verification showed one Warrantee homepage view plus `page_view` and `session_start` in property `530040415`. This proves collection, not customer acquisition; QA and automated traffic remain classified separately in Warrantee's own funnel telemetry.

## Security And OCR

- `pdfjs-dist` moved from `5.6.205` to `6.2.108`.
- Project Node support is aligned to `>=22.13 <25`, matching the PDF engine and current CI runtime.
- Full and production dependency audits report zero vulnerabilities after lockfile remediation.
- The private OCR command now performs two checks: manifest/file integrity and expected warranty-field extraction regression.
- Current local private fixtures are redacted text cases. They improve parser regression coverage but are not a substitute for real image/PDF OCR quality evidence.
- Independent pentest readiness can be verified internally. Only an unrelated qualified vendor can execute and sign the independent assessment.

## SEO, GEO, AEO And Discovery

- The sitemap inventory is 50 canonical public URLs across supported locales.
- Long-form pages have page-specific title/description metadata plus a valid Warrantee social image.
- Existing structured discovery includes robots, sitemap, JSON-LD, `llms.txt`, `llms-full.txt`, OpenAPI, MCP, agent card, structured public data, and negotiated Markdown companions.
- Existing authority content already addresses the high-intent category and alternatives. This remediation avoids publishing duplicate thin pages.
- Pre-release and post-release IndexNow submissions: 50 URLs accepted by the IndexNow API and Bing endpoint with HTTP 200.
- Search Console currently reports 45 of the 50 sitemap URLs indexed. The five crawled but not indexed URLs are `/en/faq`, `/en/guide`, `/en/cookies`, `/en/about`, and `/en/pricing`; none is blocked or broken. Validation is repeated after production release.
- Google Search Console accepted the post-release validation request and now reports `Validation Started`, dated August 15, 2026. Indexing remains Google's asynchronous decision rather than an application-side guarantee.

## Performance

The approved changes do not redesign the site:

- Cookie consent is no longer intentionally delayed by 1.5 seconds after hydration.
- The footer no longer forces its entire tree into client rendering.
- Authentication and protected-page bundles are no longer prefetched from the public navigation or demo passport CTAs before the visitor asks for them.
- Local throttled mobile Lighthouse for the demo passport improved from 76 to 84. Script requests fell from 20 to 13, transferred weight from about 593 KB to 478 KB, and total blocking time from about 482 ms to 209 ms. The demo remains intentionally `noindex`, so its Lighthouse SEO score is not a search defect.
- Local throttled mobile results before production release: English homepage 85 performance / 96 accessibility / 100 best practices / 92 SEO; Arabic homepage 94 / 100 / 100 / 92; pricing 79 / 98 / 100 / 92. Lighthouse is synthetic and varies between runs, so live Core Web Vitals remain the outcome metric.
- Post-release throttled mobile Lighthouse: English homepage 86 performance / 96 accessibility / 100 best practices / 100 SEO; Arabic homepage 91 / 100 / 100 / 100; pricing 87 / 98 / 100 / 100; demo passport 91 / 96 / 100 / 63. The demo's SEO score is intentionally reduced by `noindex` and is not an indexing defect.
- The post-release runs recorded zero layout shift on English home and pricing, and approximately 0.006 CLS on Arabic home. Synthetic Lighthouse varies; live Core Web Vitals remain the durable outcome metric.

## Pre-release Verification

- Semantic HTML preservation: 50/50 sitemap pages identical to production.
- Unit/regression tests: 27 files, 172 tests passed.
- Desktop/mobile browser journeys: 80 checks passed, including the signed-out Professional checkout redirect.
- Type-check, lint, and production build: passed; 245 static pages generated.
- Dependency audit: zero full or production vulnerabilities.
- OCR private-corpus gate: 12 file-backed redacted cases passed extraction assertions.
- Architecture map: 62 components, 68 dependencies, 13 flows, 36 tables, and 129 source references validated.
- Loopback guard, migration integrity, agent readiness, Markdown negotiation, SEO metadata, growth readiness, and pentest readiness: passed.

## External Boundaries

These items cannot be truthfully marked complete by the application developer alone:

1. An independent third-party penetration test, signed report, remediation, and retest.
2. A representative owner-approved OCR corpus containing real redacted scans/PDFs across languages and failure modes.
3. Paid Professional billing activation. This remains postponed by owner decision.

## Production Release Evidence

- GitHub `main` commit: `794432b9219bba959c6f6fcb26bd3da809b1ca14`.
- GitHub CI: run `31898201051` passed all required jobs before release.
- Vercel production deployment: `dpl_G7pxAzMga7UQ6kjuvxvx6gKTBEyn`, status `READY`, aliased to `https://warrantee.io`.
- Vercel's Git metadata still named the correct repository and branch but automatic delivery did not start from the push. The existing project-owned `deploy-main` hook was used to deploy the clean GitHub `main` tree; the unrelated local untracked file was never included.
- Live production smoke: passed public pages, discovery files, redirects, protected API boundaries, cron boundaries, and callback-open-redirect defenses.
- Production Security Gates: run `31898890592` passed in 2m10s. It created a disposable QA identity, passed authenticated readiness, operational E2E, OCR and billing boundaries, RLS and load checks, removed all artifacts, and proved no persistent QA identity remained.
- Agent readiness and Markdown production checks passed; the live page exposes `GTM-WFLBH83M` and no retired Warrantee GTM identifier.
- Rollback: promote the previous known-ready deployment `dpl_9Zu5Gadd8V1tVrGW5snwwKUbMjiP` in Vercel, or revert the remediation commits and redeploy `main`. The previous deployment lacks the fixes documented here and should be used only for incident rollback.

## Release Gate Result

All five release-gate stages passed. The implementation is live. The external boundaries above remain deliberately open and are not represented as completed assurance.
