import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { generateAgentMarkdownPages } from "./lib/agent-markdown-generator.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = path.join(repositoryRoot, "src/generated/agent-markdown-pages.json");
const checkMode = process.argv.includes("--check");
const baseUrlArgument = process.argv.find((value) => value.startsWith("--base-url="));
const baseUrl = (
  baseUrlArgument?.slice("--base-url=".length) ||
  process.env.AGENT_MARKDOWN_BASE_URL ||
  "https://warrantee.io"
).replace(/\/$/, "");

const generated = await generateAgentMarkdownPages({ baseUrl });
const serialized = `${JSON.stringify(generated, null, 2)}\n`;

if (checkMode) {
  let current = "";
  try {
    current = await readFile(outputPath, "utf8");
  } catch {
    console.error(`Generated Markdown data is missing: ${outputPath}`);
    process.exit(1);
  }

  if (current !== serialized) {
    console.error("Generated Markdown companions are stale. Run npm run agent-markdown:generate against the intended local build.");
    process.exit(1);
  }
} else {
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, serialized, "utf8");
}

const htmlBytes = generated.pages.reduce((total, page) => total + page.htmlBytes, 0);
const markdownBytes = generated.pages.reduce((total, page) => total + page.markdownBytes, 0);
console.log(JSON.stringify({
  ok: true,
  mode: checkMode ? "check" : "write",
  source: baseUrl,
  pages: generated.pages.length,
  htmlBytes,
  markdownBytes,
  reductionPercent: Number((((htmlBytes - markdownBytes) / htmlBytes) * 100).toFixed(2)),
  output: path.relative(repositoryRoot, outputPath),
}, null, 2));
