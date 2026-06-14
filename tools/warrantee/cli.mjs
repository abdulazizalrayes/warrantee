#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createWarranty,
  deleteWarranty,
  getWarranty,
  listWarranties,
  resolveApiKey,
  updateWarranty,
  verifyWarranty,
  WarranteeApiError,
} from "./api-client.mjs";
import { runMcpServer } from "./mcp-server.mjs";

const HELP = `Warrantee CLI

Usage:
  npm run warrantee:cli -- auth status [--api-key KEY] [--base-url URL]
  npm run warrantee:cli -- warranties list [--page N] [--limit N] [--status STATUS] [--category CATEGORY]
  npm run warrantee:cli -- warranties get <id>
  npm run warrantee:cli -- warranties create --product-name NAME --start-date YYYY-MM-DD --end-date YYYY-MM-DD [options]
  npm run warrantee:cli -- warranties update <id> [options]
  npm run warrantee:cli -- warranties delete <id> --confirm
  npm run warrantee:cli -- verify <reference-or-serial-or-id>
  npm run warrantee:mcp --

Global options:
  --api-key KEY       Warrantee integration token. Prefer WARRANTEE_API_KEY env.
  --base-url URL      Defaults to WARRANTEE_BASE_URL or https://warrantee.io.
  --pretty            Pretty-print JSON output.

Create/update options:
  --product-name VALUE
  --start-date VALUE
  --end-date VALUE
  --description VALUE
  --serial-number VALUE
  --reference-number VALUE
  --status VALUE
  --category VALUE
  --supplier VALUE
  --coverage-type VALUE
  --purchase-price VALUE
  --language en|ar
  --seller-name VALUE
  --seller-email VALUE
  --idempotency-key VALUE
  --json-body JSON_OR_FILE

Security:
  Generate keys from Warrantee Settings > API / CLI / MCP. Do not pass or store
  a Warrantee username or password in external systems.
`;

function takeOption(args, name) {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new WarranteeApiError(`${name} requires a value`);
  }
  args.splice(index, 2);
  return value;
}

function takeFlag(args, name) {
  const index = args.indexOf(name);
  if (index === -1) return false;
  args.splice(index, 1);
  return true;
}

function parseNumber(value, name) {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new WarranteeApiError(`${name} must be a number`);
  return parsed;
}

function parseJsonBody(value) {
  if (!value) return {};
  const source = value.startsWith("@") ? readFileSync(value.slice(1), "utf8") : value;
  const parsed = JSON.parse(source);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new WarranteeApiError("--json-body must be a JSON object");
  }
  return parsed;
}

function collectWarrantyInput(args) {
  const jsonBody = parseJsonBody(takeOption(args, "--json-body"));
  const input = {
    ...jsonBody,
    product_name: takeOption(args, "--product-name") ?? jsonBody.product_name,
    start_date: takeOption(args, "--start-date") ?? jsonBody.start_date,
    end_date: takeOption(args, "--end-date") ?? jsonBody.end_date,
    description: takeOption(args, "--description") ?? jsonBody.description,
    serial_number: takeOption(args, "--serial-number") ?? jsonBody.serial_number,
    reference_number: takeOption(args, "--reference-number") ?? jsonBody.reference_number,
    status: takeOption(args, "--status") ?? jsonBody.status,
    category: takeOption(args, "--category") ?? jsonBody.category,
    supplier: takeOption(args, "--supplier") ?? jsonBody.supplier,
    coverage_type: takeOption(args, "--coverage-type") ?? jsonBody.coverage_type,
    purchase_price:
      parseNumber(takeOption(args, "--purchase-price"), "--purchase-price") ??
      jsonBody.purchase_price,
    language: takeOption(args, "--language") ?? jsonBody.language,
    seller_name: takeOption(args, "--seller-name") ?? jsonBody.seller_name,
    seller_email: takeOption(args, "--seller-email") ?? jsonBody.seller_email,
  };

  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}

function parseContext(args, env = process.env) {
  return {
    apiKey: takeOption(args, "--api-key") || env.WARRANTEE_API_KEY,
    baseUrl: takeOption(args, "--base-url") || env.WARRANTEE_BASE_URL,
    pretty: takeFlag(args, "--pretty"),
  };
}

function assertNoUnknownOptions(args) {
  const unknown = args.find((arg) => arg.startsWith("--"));
  if (unknown) throw new WarranteeApiError(`Unknown option: ${unknown}`);
}

function writeJson(data, { pretty = false, stdout = process.stdout } = {}) {
  stdout.write(`${JSON.stringify(data, null, pretty ? 2 : 0)}\n`);
}

export async function runCli(argv = process.argv.slice(2), io = {}) {
  const stdout = io.stdout || process.stdout;
  const stderr = io.stderr || process.stderr;
  const env = io.env || process.env;
  const fetchImpl = io.fetchImpl || globalThis.fetch;
  const args = [...argv];

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    stdout.write(HELP);
    return 0;
  }

  const context = parseContext(args, env);
  const command = args.shift();
  if (command === "mcp") {
    assertNoUnknownOptions(args);
    await runMcpServer({ input: io.stdin || process.stdin, output: stdout, env, fetchImpl });
    return 0;
  }

  const clientOptions = {
    apiKey: context.apiKey,
    baseUrl: context.baseUrl,
    fetchImpl,
  };

  try {
    if (command === "auth") {
      const subcommand = args.shift();
      if (subcommand !== "status") throw new WarranteeApiError("Expected: warrantee auth status");
      assertNoUnknownOptions(args);
      writeJson(
        {
          ok: Boolean(resolveApiKey({ apiKey: clientOptions.apiKey, env })),
          baseUrl: clientOptions.baseUrl || env.WARRANTEE_BASE_URL || "https://warrantee.io",
          auth: resolveApiKey({ apiKey: clientOptions.apiKey, env })
            ? "integration-token-configured"
            : "missing-warrantee-api-key",
        },
        { pretty: context.pretty, stdout }
      );
      return 0;
    }

    if (command === "verify") {
      const query = args.shift();
      if (!query) throw new WarranteeApiError("Expected: warrantee verify <reference-or-serial-or-id>");
      assertNoUnknownOptions(args);
      writeJson(await verifyWarranty(query, clientOptions), { pretty: context.pretty, stdout });
      return 0;
    }

    if (command !== "warranties") {
      throw new WarranteeApiError(`Unknown command: ${command}`);
    }

    const subcommand = args.shift();
    if (subcommand === "list") {
      const page = parseNumber(takeOption(args, "--page"), "--page");
      const limit = parseNumber(takeOption(args, "--limit"), "--limit");
      const status = takeOption(args, "--status");
      const category = takeOption(args, "--category");
      assertNoUnknownOptions(args);
      writeJson(await listWarranties({ ...clientOptions, page, limit, status, category }), {
        pretty: context.pretty,
        stdout,
      });
      return 0;
    }

    if (subcommand === "get") {
      const id = args.shift();
      if (!id) throw new WarranteeApiError("Expected: warrantee warranties get <id>");
      assertNoUnknownOptions(args);
      writeJson(await getWarranty(id, clientOptions), { pretty: context.pretty, stdout });
      return 0;
    }

    if (subcommand === "create") {
      const input = collectWarrantyInput(args);
      const idempotencyKey = takeOption(args, "--idempotency-key");
      assertNoUnknownOptions(args);
      writeJson(await createWarranty(input, { ...clientOptions, idempotencyKey }), {
        pretty: context.pretty,
        stdout,
      });
      return 0;
    }

    if (subcommand === "update") {
      const id = args.shift();
      if (!id) throw new WarranteeApiError("Expected: warrantee warranties update <id> [options]");
      const input = collectWarrantyInput(args);
      assertNoUnknownOptions(args);
      writeJson(await updateWarranty(id, input, clientOptions), { pretty: context.pretty, stdout });
      return 0;
    }

    if (subcommand === "delete") {
      const id = args.shift();
      if (!id) throw new WarranteeApiError("Expected: warrantee warranties delete <id> --confirm");
      const confirmed = takeFlag(args, "--confirm");
      assertNoUnknownOptions(args);
      if (!confirmed) throw new WarranteeApiError("Delete requires --confirm");
      writeJson(await deleteWarranty(id, clientOptions), { pretty: context.pretty, stdout });
      return 0;
    }

    throw new WarranteeApiError(`Unknown warranties command: ${subcommand}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    writeJson({ ok: false, error: message }, { pretty: context.pretty, stdout: stderr });
    return error instanceof WarranteeApiError && error.status ? error.status : 1;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  runCli().then((code) => {
    process.exitCode = code;
  });
}
