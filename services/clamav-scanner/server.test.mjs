import assert from "node:assert/strict";
import test from "node:test";

import {
  authorized,
  parseClamdScanResponse,
  validateDownloadedSize,
  validateSignedUrl,
} from "./server.mjs";

test("authorization requires the exact bearer token", () => {
  assert.equal(authorized("Bearer secret", "secret"), true);
  assert.equal(authorized("Bearer other", "secret"), false);
  assert.equal(authorized("Bearer secret", ""), false);
});

test("signed URLs are restricted to the configured private bucket origin and path", () => {
  const allowed = "https://project.supabase.co";
  assert.ok(validateSignedUrl(
    "https://project.supabase.co/storage/v1/object/sign/warranty-documents/a.pdf?token=x",
    allowed,
  ));
  assert.equal(validateSignedUrl("https://attacker.example/file", allowed), null);
  assert.equal(validateSignedUrl("https://project.supabase.co/other", allowed), null);
});

test("clamd responses fail closed", () => {
  assert.deepEqual(parseClamdScanResponse("stream: OK\0"), {
    verdict: "clean",
    engine: "clamav",
  });
  assert.deepEqual(parseClamdScanResponse("stream: Eicar-Signature FOUND\0"), {
    verdict: "blocked",
    engine: "clamav",
    reason: "malware_detected",
    signature: "Eicar-Signature",
  });
  assert.equal(parseClamdScanResponse("unexpected").verdict, "scan_failed");
});

test("downloaded documents must match their bounded declared size", () => {
  assert.equal(validateDownloadedSize(1024, 1024), null);
  assert.equal(validateDownloadedSize(1025, 1024), "document_size_mismatch");
  assert.equal(validateDownloadedSize(0, 0), "invalid_download_size");
});
