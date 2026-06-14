# OCR Regression Corpus

Warrantee needs repeatable evidence before changing OCR providers or extraction logic. Keep real receipts, invoices, and warranty documents in a private local folder that is ignored by Git.

Default local path:

```text
tests/fixtures/ocr-corpus/private
```

Default manifest:

```text
tests/fixtures/ocr-corpus/private/manifest.json
```

Example manifest:

```json
{
  "entries": [
    {
      "id": "sa-en-receipt-clean-001",
      "locale": "en-SA",
      "kind": "receipt",
      "file": "sa-en-receipt-clean-001.pdf",
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
      "text": "نص إيصال اختباري بدون بيانات حقيقية",
      "expectedFields": {
        "supplier": "متجر تجريبي"
      }
    }
  ]
}
```

Run:

```bash
npm run qa:ocr-corpus
```

Use `OCR_CORPUS_REQUIRED=1 npm run qa:ocr-corpus` in any environment where the private corpus must be present. The checker validates manifest shape and file presence only; it does not print customer document contents.
