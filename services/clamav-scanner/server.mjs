import { createServer } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { connect } from "node:net";
import { pathToFileURL } from "node:url";

const PORT = Number(process.env.PORT || 8080);
const MAX_FILE_BYTES = Number(process.env.MAX_FILE_BYTES || 10 * 1024 * 1024);
const MAX_JSON_BYTES = 32 * 1024;
const CLAMD_HOST = process.env.CLAMD_HOST || "clamav";
const CLAMD_PORT = Number(process.env.CLAMD_PORT || 3310);

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left || ""));
  const rightBuffer = Buffer.from(String(right || ""));
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function authorized(header, expected = process.env.SCANNER_TOKEN || "") {
  const supplied = String(header || "").replace(/^Bearer\s+/i, "").trim();
  return Boolean(expected) && safeEqual(supplied, expected);
}

export function validateSignedUrl(value, allowedOrigin = process.env.ALLOWED_DOCUMENT_ORIGIN || "") {
  try {
    const url = new URL(String(value || ""));
    const allowed = new URL(allowedOrigin);
    if (
      url.protocol !== "https:" ||
      url.origin !== allowed.origin ||
      url.username ||
      url.password ||
      !url.pathname.startsWith("/storage/v1/object/sign/warranty-documents/")
    ) return null;
    return url;
  } catch {
    return null;
  }
}

export function parseClamdScanResponse(value) {
  const response = String(value || "").replace(/\0/g, "").trim();
  if (/:\s+OK$/i.test(response)) return { verdict: "clean", engine: "clamav" };
  const infected = response.match(/:\s+(.+)\s+FOUND$/i);
  if (infected) {
    return {
      verdict: "blocked",
      engine: "clamav",
      reason: "malware_detected",
      signature: infected[1].slice(0, 200),
    };
  }
  return { verdict: "scan_failed", engine: "clamav", reason: "invalid_scanner_response" };
}

export function validateDownloadedSize(actualSize, declaredSize) {
  if (!Number.isFinite(actualSize) || actualSize <= 0 || actualSize > MAX_FILE_BYTES) {
    return "invalid_download_size";
  }
  if (actualSize !== declaredSize) return "document_size_mismatch";
  return null;
}

async function readBoundedResponse(response) {
  if (!response.body) throw new Error("empty_document_response");
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_FILE_BYTES) {
      await reader.cancel("document_too_large");
      throw new Error("document_too_large");
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks, size);
}

function clamdCommand(command, payload) {
  return new Promise((resolve, reject) => {
    const socket = connect({ host: CLAMD_HOST, port: CLAMD_PORT });
    const chunks = [];
    const timer = setTimeout(() => socket.destroy(new Error("clamd_timeout")), 30_000);
    socket.on("connect", () => {
      socket.write(Buffer.from(`z${command}\0`));
      if (payload) {
        for (let offset = 0; offset < payload.length; offset += 64 * 1024) {
          const chunk = payload.subarray(offset, Math.min(payload.length, offset + 64 * 1024));
          const length = Buffer.alloc(4);
          length.writeUInt32BE(chunk.length);
          socket.write(length);
          socket.write(chunk);
        }
        socket.write(Buffer.alloc(4));
      }
    });
    socket.on("data", (chunk) => chunks.push(chunk));
    socket.on("end", () => {
      clearTimeout(timer);
      resolve(Buffer.concat(chunks).toString("utf8"));
    });
    socket.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_JSON_BYTES) throw new Error("request_too_large");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function send(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(JSON.stringify(payload));
}

async function handle(request, response) {
  if (request.method === "GET" && request.url === "/healthz") {
    try {
      const version = String(await clamdCommand("VERSION")).replace(/\0/g, "").trim().slice(0, 200);
      return send(response, 200, { status: "ok", engine: "clamav", version });
    } catch {
      return send(response, 503, { status: "unavailable", engine: "clamav" });
    }
  }
  if (request.method !== "POST" || request.url !== "/v1/scan") {
    return send(response, 404, { error: "not_found" });
  }
  if (!authorized(request.headers.authorization)) {
    return send(response, 401, { error: "unauthorized" });
  }

  try {
    const payload = await readJson(request);
    const signedUrl = validateSignedUrl(payload.signed_url);
    const declaredSize = Number(payload.file_size || 0);
    if (!signedUrl || !Number.isFinite(declaredSize) || declaredSize <= 0 || declaredSize > MAX_FILE_BYTES) {
      return send(response, 400, { verdict: "blocked", reason: "invalid_scan_request", engine: "clamav" });
    }

    const download = await fetch(signedUrl, {
      redirect: "error",
      signal: AbortSignal.timeout(20_000),
    });
    if (!download.ok) {
      return send(response, 502, { verdict: "scan_failed", reason: "document_fetch_failed", engine: "clamav" });
    }
    const contentLength = Number(download.headers.get("content-length") || declaredSize);
    if (!Number.isFinite(contentLength) || contentLength <= 0 || contentLength > MAX_FILE_BYTES) {
      return send(response, 400, { verdict: "blocked", reason: "invalid_content_length", engine: "clamav" });
    }
    const bytes = await readBoundedResponse(download);
    const sizeError = validateDownloadedSize(bytes.length, declaredSize);
    if (sizeError) {
      return send(response, 400, { verdict: "blocked", reason: sizeError, engine: "clamav" });
    }

    const result = parseClamdScanResponse(await clamdCommand("INSTREAM", bytes));
    return send(response, result.verdict === "clean" ? 200 : result.verdict === "blocked" ? 422 : 502, result);
  } catch (error) {
    const reason = error instanceof Error && error.message === "request_too_large"
      ? "request_too_large"
      : "scan_failed";
    return send(response, reason === "request_too_large" ? 413 : 502, {
      verdict: "scan_failed",
      reason,
      engine: "clamav",
    });
  }
}

export function createScannerServer() {
  return createServer((request, response) => void handle(request, response));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  createScannerServer().listen(PORT, "0.0.0.0");
}
