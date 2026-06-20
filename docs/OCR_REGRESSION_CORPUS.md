# OCR Regression Corpus

Warrantee needs repeatable evidence before changing OCR providers or extraction logic.

There are two corpus layers:

1. A committed synthetic corpus that is safe for Git and runs in normal QA.
2. A private real-document corpus that must stay ignored locally or in a secure QA store.

The synthetic corpus is not a replacement for real documents. It prevents parser regressions and proves English, Arabic, mixed-language, poor OCR text, and duplicate-invoice cases keep extracting expected fields.

Committed synthetic corpus:

```text
tests/fixtures/ocr-corpus/synthetic/manifest.json
```

Private local path for real receipts, invoices, warranty certificates, and bad scans:


```text
tests/fixtures/ocr-corpus/private
```

Private manifest:

```text
tests/fixtures/ocr-corpus/private/manifest.json
```

Private files must never be committed. The directory is ignored by Git.

The private intake checklist is tracked at:

```text
docs/OCR_PRIVATE_CORPUS_COLLECTION_CHECKLIST_2026-06-17.md
```

The ignored private folder includes local helper templates:

```text
tests/fixtures/ocr-corpus/private/README.md
tests/fixtures/ocr-corpus/private/manifest.template.json
```

These helper files are intentionally local-only because the whole private fixture folder is ignored. They prepare the workflow but do not count as real private OCR coverage.

## Manifest Contract

Each entry must include:

- `id`: stable unique case id.
- `locale`: for example `en-SA`, `ar-SA`, or `mixed`.
- `kind`: for example `receipt`, `invoice`, `warranty_certificate`, `poor_scan`, `handwritten_note`, `duplicate_invoice`, or `corrupted_pdf`.
- `sensitivity`: `synthetic`, `redacted`, or `private`.
- `text` or `file`: text-only cases can run without private files; file cases must point inside the corpus directory.
- `expectedFields`: field/value assertions.
- `minConfidence`: optional parser confidence floor from `0` to `1`.

Private manifest example:

```json
{
  "requirements": {
    "minEntries": 12,
    "locales": ["en-SA", "ar-SA", "mixed"],
    "kinds": ["receipt", "invoice", "poor_scan", "duplicate_invoice", "corrupted_pdf"]
  },
  "entries": [
    {
      "id": "sa-en-receipt-clean-001",
      "locale": "en-SA",
      "kind": "receipt",
      "sensitivity": "private",
      "file": "sa-en-receipt-clean-001.pdf",
      "minConfidence": 0.65,
      "expectedFields": {
        "product_name": "Laptop",
        "supplier": "Example Store",
        "purchase_date": "2026-06-01",
        "warranty_months": 24
      }
    },
    {
      "id": "ar-sa-receipt-text-001",
      "locale": "ar-SA",
      "kind": "receipt",
      "sensitivity": "redacted",
      "text": "نص إيصال اختباري بدون بيانات حقيقية",
      "expectedFields": {
        "supplier": "متجر تجريبي"
      }
    }
  ]
}
```

## Commands

Validate the committed synthetic corpus shape:

```bash
npm run qa:ocr-corpus
```

Run parser field regression tests against the synthetic corpus:

```bash
npx vitest run src/lib/ocr/__tests__/warranty-field-parser.test.ts
```

Require the private real-document corpus:

```bash
npm run qa:ocr-corpus:private
```

The private command intentionally fails if `tests/fixtures/ocr-corpus/private/manifest.json` or any referenced private fixture is missing. That fail-fast behavior prevents Warrantee from claiming real OCR torture coverage when no private evidence exists.

## Minimum Private Corpus Before Enterprise Handover

Add at least:

- 3 English Saudi/GCC receipts or invoices.
- 3 Arabic receipts or invoices.
- 2 mixed Arabic/English invoices.
- 2 poor scans or low-light/mobile photos.
- 1 duplicate/forwarded invoice chain.
- 1 corrupted or unsupported PDF case.
- 1 handwritten-note edge case if handwritten warranty notes are accepted.

All private samples should be redacted where possible. Keep original private files only in an approved secure QA location, never in Git.

## Current Synthetic Coverage

The committed synthetic gate now covers:

- English Saudi/GCC receipt text.
- Arabic receipt text.
- Mixed Arabic/English invoice text.
- Poor-scan OCR text with common character confusion.
- Duplicate/forwarded invoice text.
- Warranty certificate text.
- Handwritten-note fallback text.
- Corrupted-PDF fallback text.

This is still not a substitute for the private real-document corpus. It is a release gate that prevents obvious parser regressions while private evidence is collected.
