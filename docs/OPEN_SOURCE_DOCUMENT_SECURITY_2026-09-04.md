# Open-Source OCR And Document Security

Date: 2026-09-04
Scope: Warrantee only
Production behavior: unchanged until the new services are explicitly configured

## Decision

Warrantee keeps the verified Mistral OCR path active and adds PaddleOCR as the preferred open-source candidate for a controlled benchmark. It also adds a self-hosted ClamAV scanner compatible with the existing document-quarantine contract.

This is intentionally not a blind provider swap. Real approved warranty documents are still unavailable, so no production-accuracy claim can be made and `OCR_PROVIDER` must not be changed to `paddle` until the private benchmark passes.

## Why PaddleOCR

- PaddleOCR 3.7.0 is open source and its official project supports 100+ languages.
- The small PP-OCRv5 Arabic recognition model covers Arabic script and English, matching Warrantee's first two production languages.
- The service is self-hosted, so documents do not need to leave infrastructure selected by the owner.
- Larger PaddleOCR-VL, GLM-OCR, DeepSeek-OCR, and olmOCR models are useful research options but require substantially heavier inference infrastructure. They are not a practical free Vercel Function replacement.

Primary references:

- https://github.com/PaddlePaddle/PaddleOCR
- https://github.com/PaddlePaddle/PaddleOCR/blob/main/docs/version3.x/algorithm/PP-OCRv5/PP-OCRv5_multi_languages.md
- https://github.com/paddlepaddle/paddleocr/blob/main/docs/version3.x/inference_deployment/cross_platform/browser.md
- https://github.com/zai-org/glm-ocr

## OCR Integration

Application adapter: `src/lib/ocr/paddle.ts`
Reference service: `services/paddle-ocr/`

The service accepts only authenticated JSON requests at `/v1/ocr`, bounds decoded file size, writes a temporary file, runs PP-OCRv5 Arabic, returns text plus confidence/page/model telemetry, and deletes the temporary file.

Configuration:

```text
OCR_PROVIDER=paddle
PADDLE_OCR_URL=https://private-ocr.example.com/v1/ocr
PADDLE_OCR_TOKEN=<secret bearer token>
```

`PADDLE_OCR_URL` must be HTTPS in production. Loopback HTTP is accepted only outside production. The token must be stored as an encrypted deployment secret and must never be exposed to the browser.

Recommended rollout:

1. Deploy the service in a private environment with outbound access disabled except for controlled model/signature updates.
2. Run the approved private corpus through Mistral and PaddleOCR.
3. Compare exact warranty-field accuracy, Arabic/English recognition, latency, timeout rate, and memory cost.
4. Keep Paddle in shadow/manual mode until it meets the approved field-level thresholds.
5. Change `OCR_PROVIDER` only after owner approval and keep Mistral available for rollback.

## Malware Scanning

Reference service: `services/clamav-scanner/`
Application contract: `src/lib/server/document-security-scanner.ts`

The scanner wrapper:

- authenticates every request with a constant-time bearer check;
- accepts only short-lived signed URLs from the exact Warrantee Supabase origin and private warranty-document path;
- blocks redirects and enforces request, declared-size, response-size, and timeout limits;
- streams bytes to ClamAV `clamd` over an internal-only network;
- returns `clean`, `blocked`, or `scan_failed` and fails closed;
- does not log signed URLs, document content, credentials, or customer identifiers.

ClamAV is pinned to `1.5.3` in the reference Compose file. Its signature volume persists across restarts and is updated by the official image. `clamd` port 3310 is never published because the protocol has no authentication or transport encryption.

Primary references:

- https://github.com/Cisco-Talos/clamav/blob/main/README.Docker.md
- https://github.com/Cisco-Talos/clamav/releases
- https://vercel.com/docs/functions/limitations

Activation:

```text
DOCUMENT_SECURITY_SCANNER_URL=https://private-scanner.example.com/v1/scan
DOCUMENT_SECURITY_SCANNER_TOKEN=<same secret used by the scanner wrapper>
DOCUMENT_DOWNLOAD_REQUIRE_CLEAN=1
```

The existing internal heuristic scanner remains active until ClamAV has a verified container host. ClamAV is not suitable inside a Vercel Function because its daemon, signature database, memory footprint, writable state, and update lifecycle do not match serverless function limits.

A dedicated Warrantee-only, scale-to-zero Cloud Run deployment is now specified and tested in `services/clamav-scanner/cloud-run-config.mjs`; the operational procedure is in `services/clamav-scanner/CLOUD_RUN.md`. It is locked to project `warrantee-491217`, region `me-central2` (Dammam), a dedicated service account, Secret Manager, maximum one instance, and concurrency one. The application supports a bounded `DOCUMENT_SECURITY_SCANNER_TIMEOUT_MS` for cold-start verification.

The Google Cloud project displayed `Start your Free Trial` on 5 September 2026. No API, service, repository, secret, or billing relationship was created. Activating billing remains an external owner decision because even a scale-to-zero service can create charges after free allowances. The current internal scanner must remain configured until ClamAV passes health, clean-file, isolated EICAR, cold-start, log-privacy, CI, and Production Security Gate checks.

Email ingestion now applies the baseline check before storage, invokes the configured document scanner before OCR, and stops on scanner failure. This closes the prior gap where inbound attachments could reach OCR without the shared scanner contract.

## Untrusted Content Boundary

All external content is data, not instructions or authorization. The implementation:

- classifies prompt injection, instruction extraction, credential exfiltration, spoofed authorization, and consequential-action requests before public agent execution;
- returns a bounded bilingual refusal without tool execution;
- requires fresh `confirm=true` for every private MCP create, update, or delete operation;
- checks inbound email text before creating an ingestion job;
- checks OCR text before creating a provisional warranty, auto-confirming, or sending messages;
- stores no concierge question wording or hash;
- records blocked attacks only as hourly category/surface counts;
- removes old stored question text/hashes through migration `20260904120000_harden_untrusted_content_telemetry.sql`;
- throttles repeated unsafe HTTP/A2A sources;
- keeps unavoidable support and ingestion text schema-bounded, React-escaped, tagged as display-only untrusted data, and visibly labeled in the private administrator view. That text is never authorization and is not passed to an autonomous model or privileged tool.

## Verification

```bash
npm run qa:document-services
npm test -- --run src/lib/__tests__/untrusted-content.test.ts src/lib/ocr/__tests__/paddle.test.ts
npm run type-check
npm run lint
npm test
npm run build
npm run qa:migrations
npm run qa:cli-release
```

ClamAV integration test after deployment:

1. Confirm `/healthz` reports `ok` and a current engine version.
2. Submit the standard EICAR test artifact only in a disposable isolated QA bucket.
3. Verify `blocked`, no download access, no OCR execution, and no warranty creation.
4. Remove all QA artifacts and verify cleanup.

Do not use a real customer document, upload private data to a new provider, or run a malware test against production records without separate owner approval.
