# OCR And Approval Recovery

## Identity And Scope

Warrantee only: `abdulazizalrayes/warrantee`, active Developer checkout,
`warrantee.io`, existing Vercel project `prj_fZIC1oJjpaZ4E8IqLm3UJTbMxlrx`.
Baseline application release: `b615a62267db618b42581d214b215df558f6ddf3`.

Owner authorized finishing the November 26 OCR blocker and reviewing the
approval-to-certificate path. No customer warranty may be approved, changed or
used as a fixture. No communications, paid activation, credential changes,
schema migration, redesign or postponed initiative is included.

## Evidence And Changes

- Scheduled Gates [45616664217](https://github.com/abdulazizalrayes/warrantee/actions/runs/45616664217)
  failed readiness after Mistral returned HTTP 402. Its browser E2E was skipped;
  both QA cleanup steps passed. Do not call that a successful production E2E.
- A typed subscription-unavailable error discards provider error wording. Only
  HTTP 402 takes the new path: browser and ingestion images/scanned PDFs recover
  directly through bundled Tesseract/PDF.js, without another hosted provider.
  Existing authentication, rate limits, file validation, size/page limits,
  timeout behavior, unsafe-output rejection and manual entry remain intact.
  HTTP 401/403 remain explicit failures, not a reason to bypass provider auth.
- Actual synthetic image and scanned-PDF recovery exercises the native engines,
  with the hosted failure mocked and no external service or real document.
  The stronger PDF test initially exposed a native worker crash: the application
  and PDF.js loaded different major canvas bindings. A shared explicit canvas
  factory keeps temporary and destination canvases on the same implementation.
  Failed attempts remain failures; no test retry or assertion weakening is used.
- Pending approval without a certificate is a valid business state, not proof
  of a defect or authority to approve it. Static review separately found UI
  permission checks based on global profile roles rather than issuer-company
  membership, silent failed approval requests, and missing private certificate
  state guards. These source fixes preserve server authorization and the
  existing visual design; error states use the established presentation.
- Private certificate generation and retrieval reject ineligible pending/draft
  states before rendering, metadata changes or storage access. Rejection also
  uses cancelled, so cancelled records require a valid approval timestamp;
  old certificate metadata alone is not proof of issuance. Existing eligible
  issued/expired states retain certificate access under existing authorization.

## Verification And Release Contract

Require typed 402/privacy/no-hosted-retry tests, actual bundled-engine synthetic
recovery, negative certificate-state/no-write tests, company-scoped approval
controls, failure/network recovery with no false success events, full unit and
isolated journey/browser gates, CodeQL, build/CSP and applicable seven-width
English/Arabic UI screenshots before merging. Existing customer records are not
production test fixtures. Live reads do not prove authenticated production OCR.

The first local approval browser attempt failed on test selectors: off-canvas
mobile navigation was included in page-content geometry and Next's route
announcer matched the action-alert locator. Retain that failed attempt; correct
the fixture selectors without removing visible-control or width assertions,
then require a new complete run before release.

Record exact final candidate, CI, deployment and live evidence in the release
PR closeout. Do not manually dispatch or rerun Production Security Gates; its
next natural result is separate evidence and must distinguish actual execution
from skipped E2E and cleanup. Real-document accuracy, external identity-provider
handshakes and owner/user intent remain unproven by synthetic tests.

Issue [#53](https://github.com/abdulazizalrayes/warrantee/issues/53) retains the
separate missing Arabic fixture-word assertions. Identifier extraction from an
existing Arabic-labelled image does not establish Arabic text accuracy. Private
OCR corpus/provider activation, billing, ClamAV, backup/restore, credential
searches, paid pentest, npm publication and all other postponements remain.
The content-use policy stays `search=yes, ai-input=yes, ai-train=no`.

## Rollback

Use a reviewed source revert for the scoped changes or the prior Ready Vercel
deployment `dpl_7jmX3MbWAHxd2xqKSTSYbQGnPFjk`, then verify the canonical domain,
auth redirects and policy. No data or schema rollback is required. Returning to
the baseline also returns its known OCR subscription and certificate-state gaps;
do not characterize that rollback as resolving those issues.
