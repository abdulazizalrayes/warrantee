import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const compose = await readFile(new URL("./docker-compose.yml", import.meta.url), "utf8");
const nginx = await readFile(new URL("./nginx-scanner.conf", import.meta.url), "utf8");

test("uses a named Warrantee-only container boundary", () => {
  assert.match(compose, /^name: warrantee-clamav$/m);
  assert.match(compose, /name: warrantee-clamav-internal/);
  assert.match(compose, /name: warrantee-clamav-egress/);
  assert.match(compose, /name: warrantee-clamav-signatures/);
  assert.doesNotMatch(compose, /paperclip|jfco|hadhr|haya|crm/i);
});

test("does not publish clamd and binds the wrapper to localhost only", () => {
  const publishedPorts = compose.match(/ports:[\s\S]*?(?=\n\S|$)/g) || [];
  assert.equal(publishedPorts.length, 1);
  assert.match(publishedPorts[0], /127\.0\.0\.1:\$\{SCANNER_BIND_PORT:-8787\}:8080/);
  assert.doesNotMatch(compose, /3310:3310/);
  assert.match(compose, /internal: true/);
});

test("bounds resources, logs, privileges, and document size", () => {
  assert.match(compose, /mem_limit: 4g/);
  assert.match(compose, /mem_limit: 512m/);
  assert.match(compose, /pids_limit: 512/);
  assert.match(compose, /pids_limit: 128/);
  assert.match(compose, /read_only: true/);
  assert.match(compose, /cap_drop:\n\s+- ALL/);
  assert.match(compose, /no-new-privileges:true/);
  assert.match(compose, /MAX_FILE_BYTES: "10485760"/);
  assert.match(compose, /max-size: 10m/);
});

test("exposes only the scanner health and scan routes through the Warrantee hostname", () => {
  assert.match(nginx, /server_name scanner\.warrantee\.io;/);
  assert.match(nginx, /location = \/healthz/);
  assert.match(nginx, /location = \/v1\/scan/);
  assert.match(nginx, /limit_except POST \{ deny all; \}/);
  assert.match(nginx, /proxy_pass http:\/\/127\.0\.0\.1:8787;/);
  assert.match(nginx, /client_max_body_size 64k;/);
  assert.match(nginx, /location \/ \{\n\s+return 404;/);
});
