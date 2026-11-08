# CSP event-handler hardening - 8 November 2026

Scope: Warrantee only. No visual, page-copy, database, billing, crawler-policy, or account changes.

## Current Evidence Pointer - 2026-11-08

This is the historical PR #41 event-attribute hardening record. PR #42 subsequently removed production script unsafe-inline/eval; PR #45 completed the four follow-ups, including style-element hardening. [Operational status](OPERATIONAL_STATUS.md#current-release-evidence---2026-11-08) is the single evidence pointer for that dated baseline, not a latest-live-deployment claim. Statements below that unsafe-inline remains or release checks are outstanding apply only to this historical patch. Do not roll back a later release by removing one directive; revalidate and restore an approved whole deployment. All postponements remain unchanged.

## Historical Patch Record - 2026-11-08

## Change

Add `script-src-attr 'none'` to the existing application Content-Security-Policy. This blocks string-based HTML event attributes, such as `onclick`, while preserving framework script elements and React event listeners.

This is incremental hardening, not remediation of a demonstrated exploitable XSS. The existing `script-src 'unsafe-inline'` and inline-style allowances remain. Removing them requires a separately verified nonce/hash rendering and cache design; this patch does not claim that broader work is complete. Older browsers may ignore the new directive.

Cloudflare-owned `/cdn-cgi/` responses are outside Next.js header control. Their observed missing headers are not fixed by this patch. No account-wide edge rules were changed.

## Verification

- Independent read-only review found no blocking repository compatibility issue; existing generated HTML had no event attributes. Published GTM Custom HTML and edge-injected markup remain separate compatibility boundaries.
- Type-check: passed.
- Unit tests: 49 files, 303 tests passed.
- Lint: zero errors, two pre-existing navigation warnings.
- Full dependency audit: zero vulnerabilities.
- Production-mode local build: passed; existing metadataBase warnings remain outside this security patch.
- Browser fixture using the actual configured CSP: Chromium, Firefox, and WebKit all passed. Inline event attributes did not execute; allowed inline script elements and addEventListener handlers executed. All fixture requests are intercepted locally, with no application or production-data access.
- Local HTTP checks: EN/AR home/contact, auth, API docs, and robots all returned 200 with the new directive.
- Public local UI run: 24 passed, 6 failed; cookie customization run: 2 failed. Failure traces identify local `/api/funnel/events` 429 responses under missing backend/rate-limit configuration, not an attribute-CSP violation. These runs are not a release pass or evidence of working production telemetry.

Repeat the isolated browser checks with `npm run qa:security-headers`; install Chromium, Firefox, and WebKit through Playwright first. CI executes these checks before its existing authenticated E2E and cleanup gates.

## Release boundary and rollback

Do not merge/deploy on failed configured CI gates. After any release, verify the actual CSP on canonical production URLs and check hydration, navigation, consent, and analytics for compatibility. Provider-injected markup is not covered by the local fixture.

Rollback is removal of the single `script-src-attr` directive or restoration of the previously verified deployment. No migration or credential change is involved. Backup restore testing and all previously postponed work remain postponed.
