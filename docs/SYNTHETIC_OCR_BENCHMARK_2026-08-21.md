# Warrantee Synthetic OCR Media Benchmark

Date: 2026-08-21

Data classification: synthetic, non-customer, safe for repository use.

## Purpose

The previous committed corpus mostly tested extraction from prepared text. That is useful for field-parser regression, but it does not exercise image decoding, bilingual OCR, PDF text extraction, low-quality scans, or corrupt-file rejection.

The media corpus adds:

- a clean English receipt PNG;
- a degraded/rotated English scan PNG;
- a clean Arabic receipt PNG;
- a mixed Arabic/English invoice PNG;
- a two-page embedded-text warranty PDF;
- a deliberately corrupt PDF.

Every fixture is visibly marked synthetic, uses invented businesses and identifiers, and is pinned by SHA-256 in the manifest.

## Commands

```bash
npm run generate:ocr-media
npm run qa:ocr-corpus
npm run qa:ocr-media
npm test -- --run src/lib/ocr/__tests__/warranty-field-parser.test.ts --maxWorkers=1
```

`qa:ocr-media` uses the free local Tesseract and PDF.js paths. It does not require a customer document or a paid OCR call. The product's authenticated production OCR route, rate limit, telemetry, and cleanup remain covered by the operational E2E gate.

## Current Result

The 2026-08-21 run passed all six media cases. It also exposed and led to a parser correction: incidental words such as `Equipment` inside an issuer name can no longer be treated as an unanchored product label; `Covered Product` is now recognized as an explicit field label.

## Honest Limitation

Synthetic documents prove repeatability and failure handling, not real-world accuracy. They do not reproduce every phone camera, handwriting style, thermal receipt, vendor layout, compression artifact, or Arabic typeface. Once users exist, collect a small consented and redacted sample and compare field accuracy, latency, fallback rate, and review rate before making OCR accuracy claims.
