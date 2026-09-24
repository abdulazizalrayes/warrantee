# Arabic OCR fixture repair

## Finding

Visual inspection showed missing-glyph boxes in the Arabic synthetic receipt.
The generator depended on the host's sans-serif font. Existing assertions only
required Latin identifiers and prices, so passing was not evidence of Arabic OCR.

## Change

- Bundle Noto Sans Arabic from google/fonts (ofl/notosansarabic) with its OFL license.
- Register it explicitly for RTL synthetic receipts; fail if registration fails.
- Regenerate Arabic and mixed receipts without changing English or PDF fixtures:
  `node scripts/generate-synthetic-ocr-media.mjs --arabic-only`.
- Update manifest hashes and require Arabic product words in corpus checks and
  tests using the production Tesseract wrapper.

## Verification and limits

The four runtime tests passed. All six synthetic media benchmark cases passed,
including Arabic words, English, degraded scans, PDF extraction and corrupt-PDF
rejection. The Arabic receipt was visually inspected after regeneration.
These are synthetic regression tests, not a real-world accuracy certification.
No production settings, customer records, provider subscriptions or website UI
were changed. Rollback is a revert of this test-only change.

Commands:

```sh
npx vitest run src/lib/ocr/__tests__/tesseract-runtime.test.ts
node scripts/run-synthetic-ocr-media-benchmark.mjs
```
