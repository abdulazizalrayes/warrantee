# Warrantee Digital Performance Remediation - 2026-08-15

Scope: Warrantee only (`warrantee.io`). This report records the approved 1-10 remediation set. It does not claim external assurance that has not occurred.

## Executive Status

| Item | Status | Evidence |
| --- | --- | --- |
| 1. GA4/GTM repair | Implemented; production deployment verification pending | Correct Web container `GTM-WFLBH83M` created and published under the recorded owner; app and GitHub/Vercel configuration updated |
| 2. Dependency security | Implemented | `pdfjs-dist` pinned to `6.2.108`; vulnerable transitive packages upgraded; production and full `npm audit` return zero vulnerabilities |
| 3. Traffic separation | Implemented | Browser and server funnel events classify `human`, `crawler`, `qa`, and `monitoring`; Playwright identifies as Warrantee QA |
| 4. Mobile performance | Implemented non-visually; production remeasurement pending | Cookie delay and unnecessary public-route auth prefetch removed; footer server-rendered; local passport score improved from 76 to 84 |
| 5. Indexing and IndexNow | Submission accepted; Search Console validation pending release | Sitemap contains 50 canonical localized URLs; both IndexNow endpoints accepted all 50 URLs with HTTP 200 |
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
- Pre-release IndexNow submission: 50 URLs accepted by the IndexNow API and Bing endpoint with HTTP 200.
- Search Console currently reports 45 of the 50 sitemap URLs indexed. The five crawled but not indexed URLs are `/en/faq`, `/en/guide`, `/en/cookies`, `/en/about`, and `/en/pricing`; none is blocked or broken. Validation is repeated after production release.

## Performance

The approved changes do not redesign the site:

- Cookie consent is no longer intentionally delayed by 1.5 seconds after hydration.
- The footer no longer forces its entire tree into client rendering.
- Authentication and protected-page bundles are no longer prefetched from the public navigation or demo passport CTAs before the visitor asks for them.
- Local throttled mobile Lighthouse for the demo passport improved from 76 to 84. Script requests fell from 20 to 13, transferred weight from about 593 KB to 478 KB, and total blocking time from about 482 ms to 209 ms. The demo remains intentionally `noindex`, so its Lighthouse SEO score is not a search defect.
- Local throttled mobile results before production release: English homepage 85 performance / 96 accessibility / 100 best practices / 92 SEO; Arabic homepage 94 / 100 / 100 / 92; pricing 79 / 98 / 100 / 92. Lighthouse is synthetic and varies between runs, so live Core Web Vitals remain the outcome metric.
- Production mobile Lighthouse and live Core Web Vitals must be remeasured after the deployment before claiming a numeric improvement.

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

## Release Gate

Before merge and production rollout:

1. Run focused unit tests, full tests, type-check, lint, build, OCR and pentest readiness, agent/SEO gates, loopback guard, and architecture validation.
2. Run browser regression on desktop, mobile, English, Arabic, Urdu RTL, consent behavior, pricing, auth, and public discovery routes.
3. Publish through `main`, wait for GitHub CI and Production Security Gates, then run production smoke and operational readiness.
4. Confirm the live page uses `GTM-WFLBH83M`, normal browsers remain unchanged, and consented analytics requests reach the correct GA4 property.
5. Submit the 50 live sitemap URLs through IndexNow and record the acceptance response.
