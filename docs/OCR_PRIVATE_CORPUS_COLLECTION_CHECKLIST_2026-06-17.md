# Warrantee Private OCR Corpus Collection Checklist - 2026-06-17

Scope: Warrantee only.

This checklist closes the operational preparation work for private OCR regression testing. It does not claim that real private documents have been collected. The actual private samples must come from approved Warrantee test users, internal redacted business documents, or customer-approved QA material.

## Why This Exists

The committed synthetic corpus protects parser logic from regressions, but it cannot prove enterprise-grade OCR robustness against real-world receipts, invoices, warranty certificates, scans, mobile photos, handwritten notes, duplicate forwards, and corrupted files.

Private OCR evidence is required before Warrantee should claim full production confidence for high-volume OCR onboarding, enterprise procurement, or provider-switch benchmarking.

## Local Ignored Workspace

Use this ignored local folder:

```text
tests/fixtures/ocr-corpus/private
```

The folder is intentionally excluded from Git. Never commit real receipts, invoices, warranty certificates, raw OCR text from customers, or private fixture manifests.

Local helper files have been placed there:

```text
tests/fixtures/ocr-corpus/private/README.md
tests/fixtures/ocr-corpus/private/manifest.template.json
```

Copy `manifest.template.json` to `manifest.json` only inside the ignored private folder after approved redacted documents are available.

## Minimum Required Cases

Collect at least 12 cases before marking private OCR coverage complete:

1. English Saudi/GCC retail receipt, clean PDF or photo.
2. English Saudi/GCC invoice with VAT and warranty duration.
3. English e-commerce invoice with order number and serial number.
4. Arabic retail receipt, clean PDF or photo.
5. Arabic invoice with Arabic supplier/product fields.
6. Arabic warranty certificate.
7. Mixed Arabic/English invoice.
8. Mixed Arabic/English receipt with model/serial number.
9. Poor scan or low-light mobile photo.
10. Skewed/blurred receipt photo.
11. Duplicate or forwarded invoice chain.
12. Corrupted or unsupported PDF.

Recommended extra cases:

- Multi-page invoice.
- Multiple invoices in one PDF.
- Handwritten warranty-note case, only if handwritten notes are accepted in product scope.
- Very long supplier name.
- Missing purchase date.
- No explicit warranty duration.
- Non-Saudi/GCC language sample from an approved launch language.

## Redaction Rules

Before placing a file in the private corpus:

- Remove or mask buyer names.
- Remove phone numbers.
- Remove email addresses.
- Remove home or business addresses unless necessary for extraction.
- Remove full payment card details.
- Remove QR codes that expose private records.
- Keep only the minimum fields required to test extraction.
- Prefer synthetic replacements for buyer details while preserving invoice layout.

Do not use customer files unless the customer has explicitly approved QA use.

## Manifest Rules

Each entry in `manifest.json` must include:

- `id`
- `locale`
- `kind`
- `sensitivity`
- `file` or `text`
- `expectedFields`
- optional `minConfidence`

The validator requires all referenced files to exist and remain inside the ignored private corpus folder.

## Commands

Run the public synthetic gate:

```bash
npm run qa:ocr-corpus
```

Run the private gate after approved private documents are present:

```bash
npm run qa:ocr-corpus:private
```

The private gate is expected to fail until `tests/fixtures/ocr-corpus/private/manifest.json` and its referenced private files exist. That fail-fast behavior is intentional.

## Completion Criteria

Private OCR coverage can be marked complete only when:

- At least 12 approved private or redacted cases are present.
- `npm run qa:ocr-corpus:private` passes.
- Targeted parser/OCR tests pass against representative private cases.
- Any provider benchmark uses the same corpus across providers.
- The corpus location and custodian are recorded in Warrantee operational docs without exposing file contents.

