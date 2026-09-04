import base64
import binascii
import hmac
import os
import tempfile
from pathlib import Path
from typing import Any

from fastapi import FastAPI, Header, HTTPException
from paddleocr import PaddleOCR
from pydantic import BaseModel, Field

MAX_FILE_BYTES = int(os.getenv("MAX_FILE_BYTES", str(10 * 1024 * 1024)))
MAX_BASE64_CHARS = ((MAX_FILE_BYTES + 2) // 3) * 4
SERVICE_TOKEN = os.getenv("PADDLE_OCR_SERVICE_TOKEN", "")
ALLOWED_MIME_TYPES = {
    "application/pdf": ".pdf",
    "image/jpeg": ".jpg",
    "image/png": ".png",
}

app = FastAPI(title="Warrantee PaddleOCR", docs_url=None, redoc_url=None)
ocr = PaddleOCR(
    lang="ar",
    ocr_version="PP-OCRv5",
    use_doc_orientation_classify=True,
    use_doc_unwarping=True,
    use_textline_orientation=True,
)


class OCRRequest(BaseModel):
    data_base64: str = Field(min_length=1, max_length=MAX_BASE64_CHARS)
    mime_type: str
    languages: list[str] = Field(default_factory=lambda: ["ar", "en"], max_length=2)


def require_bearer(authorization: str | None) -> None:
    supplied = (authorization or "").removeprefix("Bearer ").strip()
    if not SERVICE_TOKEN or not hmac.compare_digest(supplied, SERVICE_TOKEN):
        raise HTTPException(status_code=401, detail="Unauthorized")


def result_payload(result: Any) -> dict[str, Any]:
    value = getattr(result, "json", result)
    if callable(value):
        value = value()
    if not isinstance(value, dict):
        return {}
    nested = value.get("res")
    return nested if isinstance(nested, dict) else value


def content_matches_mime(content: bytes, mime_type: str) -> bool:
    if mime_type == "application/pdf":
        return content.startswith(b"%PDF-")
    if mime_type == "image/jpeg":
        return content.startswith(b"\xff\xd8\xff")
    if mime_type == "image/png":
        return content.startswith(b"\x89PNG\r\n\x1a\n")
    return False


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok", "engine": "paddleocr", "model": "PP-OCRv5-arabic"}


@app.post("/v1/ocr")
def recognize(
    request: OCRRequest,
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    require_bearer(authorization)
    suffix = ALLOWED_MIME_TYPES.get(request.mime_type.lower())
    if not suffix:
        raise HTTPException(status_code=415, detail="Unsupported media type")

    try:
        content = base64.b64decode(request.data_base64, validate=True)
    except (binascii.Error, ValueError):
        raise HTTPException(status_code=400, detail="Invalid base64 content") from None
    if not content or len(content) > MAX_FILE_BYTES:
        raise HTTPException(status_code=413, detail="File size is outside the allowed range")
    if not content_matches_mime(content, request.mime_type.lower()):
        raise HTTPException(status_code=415, detail="File signature does not match media type")

    path: Path | None = None
    try:
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as temporary:
            temporary.write(content)
            path = Path(temporary.name)

        predictions = ocr.predict(input=str(path))
        texts: list[str] = []
        scores: list[float] = []
        page_count = 0
        for prediction in predictions:
            page_count += 1
            data = result_payload(prediction)
            rec_texts = data.get("rec_texts", [])
            rec_scores = data.get("rec_scores", [])
            if isinstance(rec_texts, list):
                texts.extend(str(text) for text in rec_texts if str(text).strip())
            if isinstance(rec_scores, list):
                scores.extend(float(score) for score in rec_scores if isinstance(score, (int, float)))

        return {
            "text": "\n".join(texts),
            "confidence": sum(scores) / len(scores) if scores else 0,
            "page_count": max(1, page_count),
            "model": "PP-OCRv5-arabic",
        }
    finally:
        if path:
            path.unlink(missing_ok=True)
