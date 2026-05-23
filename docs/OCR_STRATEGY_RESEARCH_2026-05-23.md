# OCR strategy research - 2026-05-23

This note captures the OCR recheck for Warrantee: current Google options, subscription rumors, open-source candidates from GitHub, paid OCR pricing, and a small local benchmark.

## Launch update

Google Cloud billing is operationally blocked by the regional partner document request, so Warrantee should not wait on Google for launch image OCR. The launch path is now:

1. Use Mistral OCR first when `MISTRAL_API_KEY` is configured.
2. Keep embedded-text PDFs local/free with `pdfjs-dist`.
3. Keep Google Vision as an optional later fallback after billing is unblocked.
4. Keep Tesseract only as a local/dev fallback, not the production image OCR path.

Reasoning: the latest public document parsing benchmarks put open-weight models such as PaddleOCR-VL/GLM/MinerU near the top, but self-hosting them would add deployment and tuning work. Mistral OCR is the best launch compromise: direct API key setup, clear OCR endpoint, current hosted OCR model, PDF/image support, confidence scores, and no Google reseller paperwork.

Sources:

- https://www.codesota.com/ocr/benchmark/omnidocbench
- https://www.codesota.com/tasks/document-ocr
- https://arxiv.org/abs/2601.21957
- https://docs.mistral.ai/capabilities/OCR/basic_ocr
- https://docs.mistral.ai/api/endpoint/ocr

## Current Warrantee behavior

- `/api/ocr` extracts embedded text from PDFs locally through `pdfjs-dist`.
- Production image/scanned-PDF OCR uses Mistral OCR when `OCR_PROVIDER=mistral` or `OCR_PROVIDER=auto` with `MISTRAL_API_KEY`.
- Google Vision remains an optional fallback when `OCR_PROVIDER=google`, `OCR_PROVIDER=google-vision`, or `OCR_PROVIDER=auto` without Mistral and with `GOOGLE_CLOUD_VISION_API_KEY`.
- Without a hosted OCR provider, local development can fall back to `tesseract.js` with `eng+ara`.
- In production on Vercel, missing hosted OCR config is treated as a service configuration error instead of silently falling back to slow in-process OCR.
- Email ingestion uses the same provider order: Mistral first, then Google Vision if configured, then local/dev fallback.

## Google recheck

### Cloud Vision

Google Cloud Vision OCR still uses Google-hosted APIs and still needs billing enabled on the Cloud project. Pricing for Text Detection and Document Text Detection is:

- First 1,000 units/month: free.
- Units 1,001 to 5,000,000/month: USD 1.50 per 1,000.
- Units above 5,000,000/month: USD 0.60 per 1,000.

Source: https://cloud.google.com/vision/pricing

Google's API billing help says some APIs require billing before use, billing is enabled at the project level, and requests beyond free courtesy limits are billed after billing is enabled.

Source: https://support.google.com/googleapi/answer/6158867

### Google AI Pro / Ultra subscription credits

The subscription rumor is partly real as of the current Google docs. Google announced Google Developer Program premium benefits inside Google AI Pro and Google AI Ultra:

- Google AI Pro: USD 10/month Google Cloud credits.
- Google AI Ultra: USD 100/month Google Cloud credits.
- Google says those credits can be used to build/deploy through Google Cloud, including Cloud Run, Vertex AI, and Gemini API usage through AI Studio or Vertex AI.

Source: https://blog.google/innovation-and-ai/technology/developers-tools/gdp-premium-ai-pro-ultra/

Practical meaning for Warrantee:

- The credits may offset Cloud Vision OCR charges after the benefit is activated and attached to a billing account/project.
- It does not bypass the current production blocker: the Google Cloud project still needs billing enabled/linked.
- It is a credit, not an OCR-specific free product.
- It does not provide a self-hostable Google OCR model.

At Vision's USD 1.50 per 1,000 OCR units, a USD 10/month Pro credit could theoretically cover about 6,666 paid OCR units/month, plus the normal 1,000-unit free tier, assuming the credits apply to the active Cloud project and Cloud Vision usage. The USD 100/month Ultra credit would theoretically cover about 66,666 paid units/month.

### Google One AI credits

Separate from Google Cloud credits, Google AI Pro also has app-level AI credits used across products such as Antigravity and Flow. These are not the same thing as Cloud Vision OCR usage.

Source: https://support.google.com/googleone/answer/16476811

### ML Kit

ML Kit Text Recognition is the closest "free Google OCR" technology, but it is an on-device mobile/client SDK, not a backend API. It is useful later if Warrantee builds a native mobile app that can OCR before upload. It is not a direct replacement for server-side OCR on Vercel. Its Text Recognition v2 supported-script list emphasizes Latin plus Chinese, Devanagari, Japanese, and Korean; Arabic was not listed as a supported language in the checked page.

Sources:

- https://developers.google.com/ml-kit/vision/text-recognition/v2
- https://developers.google.com/ml-kit/vision/text-recognition/v2/languages

### Google Drive / Docs OCR

Google Drive conversion can OCR images/PDFs when converting them to Google Docs. This is the other "free-ish Google OCR" path people often mean.

Source: https://developers.google.com/workspace/drive/api/guides/manage-uploads

Practical meaning for Warrantee:

- It requires Drive/Docs API auth and temporary document storage in Google Workspace/Drive.
- It returns text through a generated Google Doc, not a purpose-built OCR response with confidences and page geometry.
- It is not the clean production path for private user receipts/warranties.
- It may be acceptable only as an internal/admin fallback experiment, not the default upload path.

### Self-hosting Google OCR

I found no official downloadable/self-hostable Cloud Vision or Document AI OCR model. For backend OCR, Google's production options remain Google-hosted Cloud Vision or Document AI. ML Kit is local but mobile/client-oriented and not equivalent to Cloud Vision.

## Paid OCR benchmark pricing

These are current public prices checked on 2026-05-23:

| Provider | Basic OCR price | Notes |
| --- | ---: | --- |
| Google Cloud Vision | Free first 1,000/month, then USD 1.50 / 1,000, then USD 0.60 / 1,000 at high volume | Current Warrantee integration. Requires Cloud billing. |
| Google Document AI OCR | USD 1.50 / 1,000 pages, then USD 0.60 / 1,000 | More document-oriented; same basic OCR cost band. |
| AWS Textract DetectDocumentText | USD 0.0015/page first 1M, USD 0.0006/page after | Same basic OCR cost band, with 3-month free tier for new AWS customers. |
| Mistral OCR 3 | USD 2 / 1,000 pages; USD 3 / 1,000 annotated pages | Better fit for layout/markdown document extraction than cheapest raw OCR. |
| Veryfi | USD 0.08/receipt, USD 0.16/invoice, free up to 100/month | Much more expensive, but gives receipt/invoice extraction, not just OCR text. |
| Mindee | Starter 44 EUR/month for 500 credits, extras 0.05 EUR/credit | More expensive than raw OCR; useful if we want field extraction as a service. |

Sources:

- https://cloud.google.com/vision/pricing
- https://cloud.google.com/document-ai/pricing
- https://aws.amazon.com/textract/pricing/
- https://docs.mistral.ai/models/model-cards/ocr-3-25-12
- https://www.veryfi.com/pricing/
- https://www.mindee.com/pricing

## GitHub/open-source candidates

Snapshot from GitHub API on 2026-05-23:

| Project | Stars | License | Fit for Warrantee |
| --- | ---: | --- | --- |
| PaddlePaddle/PaddleOCR | 78.4k | Apache-2.0 | Best primary open-source candidate. Strong multilingual OCR, Arabic support in newer PP-OCRv5 family, Docker/service deployment path. |
| tesseract-ocr/tesseract | 74.2k | Apache-2.0 | Mature, already used through Tesseract.js, but cold starts are painful in serverless and accuracy is weaker on receipts. |
| opendatalab/MinerU | 64.6k | No GitHub SPDX assertion | Strong complex document-to-Markdown pipeline; heavier than needed for receipts. |
| docling-project/docling | 60.2k | MIT | Good PDF/document parsing ecosystem; candidate for richer document pipelines, not first choice for raw image OCR. |
| OCRmyPDF | 33.7k | MPL-2.0 | Excellent for scanned PDFs/searchable PDF workflow; Tesseract-based. |
| EasyOCR | 29.5k | Apache-2.0 | Simple PyTorch OCR with Arabic support; possible baseline, heavier for serverless. |
| surya | 19.8k | GPL-3.0 | Strong OCR/layout/table recognition, but GPL/commercial model terms are a product risk for Warrantee. |
| RapidOCR | 6.6k | Apache-2.0 | Very practical deployment wrapper around PaddleOCR-style models via ONNX Runtime/OpenVINO/etc. Best near-term self-hosted service candidate. |
| mindee/doctr | 6.1k | Apache-2.0 | Good document OCR toolkit; worth testing, but less directly proven for our Arabic/receipt mix than PaddleOCR/RapidOCR. |

Sources:

- https://github.com/PaddlePaddle/PaddleOCR
- https://github.com/RapidAI/RapidOCR
- https://github.com/tesseract-ocr/tesseract
- https://github.com/JaidedAI/EasyOCR
- https://github.com/ocrmypdf/OCRmyPDF
- https://github.com/docling-project/docling
- https://github.com/opendatalab/MinerU
- https://github.com/datalab-to/surya
- https://github.com/mindee/doctr

## Local synthetic benchmark

Environment:

- Hardware: local Mac/workspace environment.
- Inputs: three generated synthetic images:
  - simple English warranty
  - dense English receipt/warranty
  - mixed English/Arabic warranty
- Metrics: character error rate (CER), wall-clock time.
- Caveat: synthetic images are useful for direction, but real Warrantee uploads should be collected for final provider selection.

### Tesseract.js

| Mode | Case | Time | CER |
| --- | --- | ---: | ---: |
| Cold current style, `eng` | simple English | 4,138 ms | 0.0% |
| Warm, `eng` | simple English | 194 ms | 0.0% |
| Warm, `eng` | dense English | 390 ms | 1.5% |
| Warm, `eng` | mixed English/Arabic | 137 ms | 39.5% |
| Warm, `eng+ara` | simple English | 190 ms | 0.0% |
| Warm, `eng+ara` | dense English | 426 ms | 4.3% |
| Warm, `eng+ara` | mixed English/Arabic | 180 ms | 11.8% |

Takeaway: Tesseract can be fine when warm and images are clean, but the current per-request worker creation is too slow for serverless production. Arabic improves with `eng+ara` but remains fragile.

### RapidOCR / Paddle-style ONNX

| Model | Case | Time | CER |
| --- | --- | ---: | ---: |
| Default Chinese/English | simple English | 304 ms | 0.5% |
| Default Chinese/English | dense English | 500 ms | 1.7% |
| Default Chinese/English | mixed English/Arabic | 251 ms | 40.1% |
| PP-OCRv5 English | simple English | 280 ms | 0.0% |
| PP-OCRv5 English | dense English | 478 ms | 0.2% |
| PP-OCRv5 English | mixed English/Arabic | 250 ms | 45.1% |
| PP-OCRv5 Arabic | simple English | 897 ms | 0.0% |
| PP-OCRv5 Arabic | dense English | 475 ms | 0.2% |
| PP-OCRv5 Arabic | mixed English/Arabic | 247 ms | 21.4% |

Takeaway: RapidOCR/Paddle-style OCR is promising for English receipts and likely better than Tesseract as a self-hosted service. Arabic/mixed-language still needs real samples, language routing, and tuning before it replaces Google.

## Recommendation for Warrantee

Short term:

1. Keep Mistral OCR as the launch production provider because it is already enabled, avoids the Google regional billing paperwork blocker, and passed live production OCR checks.
2. Revisit Google Vision later as a lower-cost fallback once billing is unblocked and any Google AI Pro/Ultra Cloud credits are attached to the right project.
3. Do not use Drive/Docs OCR for customer uploads by default because of privacy, storage, and operational awkwardness.

Medium term:

1. Keep the provider abstraction pluggable: `mistral`, `google-vision`, `rapidocr-service`, `tesseract-local`.
2. Deploy RapidOCR/PaddleOCR as a separate Dockerized service on Cloud Run/Fly/Render/Railway, not inside Vercel functions.
3. Route low-confidence or Arabic/mixed-language cases to the best-performing hosted provider until the self-hosted model proves better on real Warrantee uploads.
4. Keep local PDF embedded-text extraction before OCR; it is almost free and avoids OCR calls for digital PDFs.

Decision:

For launch, Mistral OCR is the best operational tradeoff because it is live now and does not depend on the delayed Google partner paperwork. Open-source OCR should be the next cost-control layer, with RapidOCR/PaddleOCR as the best candidate, but it should be benchmarked on real Saudi/Arabic/English receipts before replacing hosted OCR.
