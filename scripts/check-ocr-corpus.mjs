import fs from "node:fs";
import path from "node:path";

const corpusDir = path.resolve(
  process.env.OCR_CORPUS_DIR || "tests/fixtures/ocr-corpus/private"
);
const manifestPath = path.resolve(
  process.env.OCR_CORPUS_MANIFEST || path.join(corpusDir, "manifest.json")
);
const required = process.env.OCR_CORPUS_REQUIRED === "1";

function fail(message, details = {}) {
  console.error(JSON.stringify({ ok: false, error: message, ...details }, null, 2));
  process.exit(1);
}

function loadManifest() {
  if (!fs.existsSync(manifestPath)) {
    if (required) {
      fail("OCR regression corpus manifest is missing.", {
        manifestPath,
        hint: "Create a private manifest or unset OCR_CORPUS_REQUIRED.",
      });
    }

    console.log(
      JSON.stringify(
        {
          ok: true,
          skipped: true,
          reason: "OCR regression corpus is not configured locally.",
          manifestPath,
        },
        null,
        2
      )
    );
    process.exit(0);
  }

  return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
}

function assertString(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    fail(`Invalid OCR corpus entry: ${label} must be a non-empty string.`);
  }
}

const manifest = loadManifest();
const entries = Array.isArray(manifest) ? manifest : manifest.entries;

if (!Array.isArray(entries) || entries.length === 0) {
  fail("OCR regression corpus manifest must contain a non-empty entries array.");
}

const seen = new Set();
let fileBackedEntries = 0;

for (const [index, entry] of entries.entries()) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    fail(`Invalid OCR corpus entry at index ${index}.`);
  }

  assertString(entry.id, `entries[${index}].id`);
  assertString(entry.locale, `entries[${index}].locale`);
  assertString(entry.kind, `entries[${index}].kind`);

  if (seen.has(entry.id)) {
    fail("OCR regression corpus entry ids must be unique.", { id: entry.id });
  }
  seen.add(entry.id);

  if (entry.file) {
    assertString(entry.file, `entries[${index}].file`);
    fileBackedEntries += 1;
    const filePath = path.resolve(corpusDir, entry.file);
    if (!filePath.startsWith(`${corpusDir}${path.sep}`)) {
      fail("OCR corpus files must stay inside the private corpus directory.", { id: entry.id });
    }
    if (!fs.existsSync(filePath)) {
      fail("OCR corpus file is missing.", { id: entry.id, file: entry.file });
    }
  } else {
    assertString(entry.text, `entries[${index}].text`);
  }

  if (!entry.expectedFields || typeof entry.expectedFields !== "object" || Array.isArray(entry.expectedFields)) {
    fail("OCR corpus entries must define expectedFields.", { id: entry.id });
  }
}

console.log(
  JSON.stringify(
    {
      ok: true,
      manifestPath,
      entries: entries.length,
      fileBackedEntries,
      textOnlyEntries: entries.length - fileBackedEntries,
    },
    null,
    2
  )
);
