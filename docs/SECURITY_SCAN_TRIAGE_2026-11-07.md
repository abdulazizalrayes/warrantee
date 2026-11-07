# Warrantee Passive Security Scan Triage - 2026-11-07

## Scope And Result

- Target: Warrantee only, `https://warrantee.io`; repository `abdulazizalrayes/warrantee`.
- Checkout: `/private/tmp/warrantee-crawlers-20261107`, branch `codex/operational-assurance-1-5`, inspected HEAD `fcab224afe0054e7c63a4912720ddd75c3ae2082`.
- Evidence refreshed around 15:57-16:02 UTC on 2026-11-07. Live responses are a separate observation from local source; deployment/HEAD equality was not established.
- No currently exploitable defect validated in the assigned alert families. No application safety fix was warranted. This is not an exhaustive security certification.
- Only this report was added. No source, analytics, package, backlog, operational-status, configuration, or visual changes; no commit/deploy, issue writeback, form submission, contact creation, or outbound communication.

## Evidence And Method

1. Read [issue 14](https://github.com/abdulazizalrayes/warrantee/issues/14), including the August 31 remediation comment and October 5 resolved-alert comment. Neither scanner output nor the earlier owner's conclusion was accepted as current proof.
2. Retrieved original [run 33387656972](https://github.com/abdulazizalrayes/warrantee/actions/runs/33387656972) artifact `warrantee-zap-passive-baseline` using read-only GitHub CLI commands. Parsed `report_json.json` with JSON APIs. Report identifies ZAP 2.17.0, generated August 31 at 11:41:43. Download retained outside the repository at `/private/tmp/warrantee-zap-issue14-20261107`.
3. Reviewed `CLAUDE.md`, architecture identity/boundaries, relevant source, and existing tests. No repository `SECURITY.md` was found; the security-policy resolver for `src/app` returned no applicable content. Product instructions therefore provide the local boundary context, not a scanner severity label.
4. Performed bounded unauthenticated GETs only, with `User-Agent: Warrantee-QA/1.0`, no cookies, no credentials, no redirects followed automatically, and 20-second per-request timeouts. Main path checks included `Origin: https://security-check.invalid`. Parsed returned HTML with Cheerio; no scripts were executed. No browser tabs were opened.
5. Did not replay scanner-generated name/email/message query URLs, send attack payloads, submit native forms, call POST APIs, authenticate, or probe third-party origins. The pre-hydration conclusion follows the actual server-rendered form method, not a live submission.

## Assigned Alert Verdicts

| # | Alert | Verdict | Evidence And Disposition |
| --- | --- | --- | --- |
| 1 | 10055 script-src unsafe-inline | Confirmed policy weakness; deferred hardening, not confirmed XSS | `next.config.ts:4-21` explicitly allows inline scripts. Live public app pages carry this policy and contain executable inline framework scripts. No attacker-controlled executable sink was established. Nonce/hash migration requires a separately scoped rendering/cache/framework design and regression verification; deleting the directive blindly could break hydration. |
| 2 | 10055 style-src unsafe-inline | Confirmed policy weakness; deferred hardening | `next.config.ts:23` permits inline styles; `src/app/[locale]/support/page.tsx:82` uses React inline styling. This does not establish script execution or data theft. No CSP rewrite made. |
| 3 | 10098 public CORS | Not actionable for the reported public resources | `/`, `/en`, `/.well-known/api-catalog`, and `/robots.txt` returned `Access-Control-Allow-Origin: *` without `Access-Control-Allow-Credentials`. They expose public marketing/discovery content, not an established IP-restricted or cookie-private resource. `src/app/.well-known/api-catalog/route.ts:102` deliberately permits public reads. Blanket restrictions would impede public agents. `next.config.ts:132-138` separately configures API origins. Public HTML wildcard provenance beyond the observed edge response was not determined; do not extrapolate this verdict to every authenticated API. |
| 4 | 10038/10063/10035/10021 on Cloudflare paths | Confirmed header observations; provider-owned hardening review, not app exploit proof | `/cdn-cgi/l/email-protection` is a Cloudflare 404 without CSP/HSTS/Permissions-Policy/nosniff; Cloudflare static CSS/JS and GET `/cdn-cgi/rum` also omit several headers. App routes carry the expected headers (`next.config.ts:119-129`; `src/proxy.ts:19-34`). Editing Next headers does not establish control over provider-generated responses. No redirect/override introduced. |
| 5 | 10044 redirect-size | Not actionable as sensitive-data disclosure on checked anonymous paths | Original evidence consists of body-size heuristics: root 11,844 bytes and warranty redirect 521 bytes, not identified secrets. Current root is 307 to `/en`, 11,984-byte framework/script response; `/en/warranties/new` is 307 to same-origin `/en/auth?redirect=%2Fen%2Fwarranties%2Fnew`, 15-byte `Redirecting...` body. No private warranty form/data observed. Auth redirect construction is in `src/proxy.ts:48-74`. Size alone is not disclosure proof. |
| 6 | 10024 contact/support sensitive form fields in URL | Historical defect, currently resolved; no pre-hydration GET fallback | All four live EN/AR contact/support documents explicitly render `<form method="post">`, with no action override. Source agrees at `src/app/[locale]/contact/page.tsx:234` and `src/app/[locale]/support/page.tsx:114`. Hydrated handlers prevent default and POST JSON to `/api/contact` (`contact/page.tsx:126-138`; `support/page.tsx:25-40`). Without hydration, native POST targets the current page rather than placing controls in a GET query. Successful no-JS processing is NOT proved or claimed. The original scanner evidence really contains synthetic email/name/message query fields; it is not proof those fields still leak today. |
| 7 | 10031 intent attribute potential XSS | Not actionable for the supplied source-to-sink claim | Artifact reports `intent=enterprise` matching an existing `<option value="enterprise">`; it supplies no execution evidence. The option is fixed markup (`contact/page.tsx:293-298`) and exists even without the query. The only query read (`contact/page.tsx:103-123`) accepts exact enterprise/api aliases and sets fixed localized strings; arbitrary intent, name, email, company, subject, and message query values are not interpolated into HTML. User edits use React `value` props, not raw HTML (`contact/page.tsx:249-308`, `support/page.tsx:128-168`). `SearchableSelect.tsx` introduces no raw-HTML sink. Benign enterprise/unknown-intent GETs returned the same fixed option vocabulary; hydration/execution was not dynamically tested. |

No confirmed or needs-review exploit queue was established for the supplied form/XSS/CORS/redirect claims. CSP and edge header observations remain real hardening work, not false header detections. Their exploitability has not been established; no severity was invented from the passive labels.

## Checked Paths And Statuses

| # | Path | GET Status | Observation |
| --- | --- | --- | --- |
| 1 | `/` (covers issue's bare-origin and slash entries) | 307 | Location `/en`; CSP/HSTS/Permissions-Policy/nosniff present; public wildcard CORS, no credential grant. |
| 2 | `/en` | 200 | Public HTML; same app security headers and non-credentialed wildcard CORS. |
| 3 | `/en/api-docs` | 200 | Public documentation; same app security headers. |
| 4 | `/en/contact` | 200 | POST form; fields name/email/company/subject/message. |
| 5 | `/ar/contact` | 200 | POST form; same field vocabulary. |
| 6 | `/en/support` | 200 | POST form; fields name/email/subject/message. |
| 7 | `/ar/support` | 200 | POST form; same field vocabulary. |
| 8 | `/.well-known/api-catalog` | 200 | Public discovery; wildcard CORS without credentials; app security headers. |
| 9 | `/robots.txt` | 200 | Public crawler policy; wildcard CORS without credentials; app security headers. |
| 10 | `/en/warranties/new` | 307 | Same-origin auth redirect; 15-byte body, no private form. |
| 11 | `/cdn-cgi/l/email-protection` | 404 | Cloudflare error HTML; app security headers absent. |
| 12 | `/cdn-cgi/scripts/5c5dd728/cloudflare-static/email-decode.min.js` | 200 | Cloudflare static JS; nosniff present, CSP/HSTS/Permissions-Policy absent. |
| 13 | `/cdn-cgi/styles/cf.errors.css` | 200 | Cloudflare CSS; CSP/HSTS/Permissions-Policy/nosniff absent. |
| 14 | `/cdn-cgi/styles/cf.errors.ie.css` | 200 | Same header gaps as preceding CSS. |
| 15 | `/cdn-cgi/rum` | 405 | GET only; no telemetry POST attempted; app security headers absent. |
| 16 | `/b2ace9a62c8262f0/script.js` | 200 | Public JS; HSTS present; CSP/Permissions-Policy/nosniff absent; exact provider ownership not established merely from `Server: cloudflare`. |
| 17 | `/d5675252cce015d8/script.js` | 200 | Same header observations as preceding script. |
| 18 | `/en/contact?intent=enterprise` | 200 | Explicit POST and fixed subject option vocabulary. |
| 19 | `/ar/contact?intent=enterprise` | 200 | Same form/option invariants. |
| 20 | `/en/contact?intent=triage-unknown` | 200 | Same fixed option vocabulary; no arbitrary option injection observed. |

## Other Issue Observations And Limits

- The later anti-CSRF-token comment is not proof of CSRF: `/api/contact` accepts JSON and checks trusted origin/referer before parsing or contact-processing side effects (`src/app/api/contact/route.ts:102-106`; `src/lib/request-origin.ts:1-36`). Rate-limit accounting occurs before that guard. Existing tests cover canonical/hostile/missing origins. Public form abuse is a separate concern; no production POST was attempted.
- COOP/COEP, cache diagnostics, Base64-looking strings, missing browser Sec-Fetch request headers, modern-web-app detection, and non-storable MCP responses do not establish vulnerabilities without a sensitive-data or isolation boundary. These were not exhaustively re-investigated. COOP/COEP rollout needs OAuth/payment/embedding compatibility review, not unconditional header insertion.
- Original issue lists external infrastructure-provider origins as discovered sites, not authorized scan targets. No third-party target requests were made in this work.
- Authenticated CORS/data isolation, alternate cache variants, browser execution with hostile payloads, no-JS successful processing, and provider configuration access remain UNTESTED. No claim that CSP inline allowances are harmless under an unrelated future injection defect.
- Contact failure currently constructs an encoded `mailto:` URI (`contact/page.tsx:145-148`). That is a different, intentional client mail handoff, not the scanned HTTP GET fallback; no mail client was opened and no email sent.

## Verification And Changes

PASS: `npm test -- src/lib/__tests__/passive-dast-safety.test.ts src/lib/__tests__/request-origin.test.ts src/lib/__tests__/auth-redirect.test.ts src/lib/__tests__/validation.test.ts src/lib/__tests__/untrusted-boundaries.test.ts` - 5 files, 47 tests passed. Existing Vite config-loader warning was non-failing. These tests support existing boundaries; they are not browser XSS execution tests or dedicated pre-hydration form submission tests.

PASS: Read-only live GET checks and server-rendered form parsing described above. All requests completed; no form submitted or production record intentionally created.

Application fixes: none, because no current assigned defect was validated. Exact task-owned changed file: `docs/SECURITY_SCAN_TRIAGE_2026-11-07.md`. No full build/typecheck/visual gate run for this report-only change. Issue 14 remains open and untouched externally.
