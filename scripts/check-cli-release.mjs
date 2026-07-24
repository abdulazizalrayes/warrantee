import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { CLI_VERSION } from "../tools/warrantee/update-client.mjs";

const root = process.cwd();
const packageRoot = resolve(root, "packages/warrantee-cli");
const packageJson = JSON.parse(readFileSync(resolve(packageRoot, "package.json"), "utf8"));
const expectedFiles = [
  "api-client.mjs",
  "cli.mjs",
  "mcp-server.mjs",
  "update-client.mjs",
];
const failures = [];

function fail(message) {
  failures.push(message);
}

if (packageJson.name !== "warrantee") fail("Package name must be warrantee");
if (packageJson.version !== CLI_VERSION) {
  fail(`Package version ${packageJson.version} does not match CLI version ${CLI_VERSION}`);
}
if (packageJson.license !== "Apache-2.0") {
  fail("CLI package license must be Apache-2.0");
}
if (packageJson.scripts && Object.keys(packageJson.scripts).length > 0) {
  fail("CLI package must not contain lifecycle scripts");
}
if (packageJson.repository?.url !== "git+https://github.com/abdulazizalrayes/warrantee.git") {
  fail("Package repository identity does not match Warrantee");
}
if (!packageJson.files?.includes("LICENSE")) {
  fail("CLI package must include its Apache-2.0 LICENSE");
}

for (const file of expectedFiles) {
  const source = readFileSync(resolve(root, "tools/warrantee", file), "utf8");
  const distributable = readFileSync(resolve(packageRoot, file), "utf8");
  if (source !== distributable) fail(`${file} differs between repository and package copies`);
  if (!packageJson.files?.includes(file)) fail(`${file} is missing from package files`);
}

const tagIndex = process.argv.indexOf("--tag");
if (tagIndex !== -1) {
  const tag = process.argv[tagIndex + 1];
  const expectedTag = `warrantee-cli-v${CLI_VERSION}`;
  if (tag !== expectedTag) fail(`Release tag must be ${expectedTag}, received ${tag || "(missing)"}`);
}

if (failures.length > 0) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      package: packageJson.name,
      version: CLI_VERSION,
      synchronizedFiles: expectedFiles.length,
      lifecycleScripts: 0,
      releaseTag: tagIndex === -1 ? null : process.argv[tagIndex + 1],
    },
    null,
    2
  )
);
