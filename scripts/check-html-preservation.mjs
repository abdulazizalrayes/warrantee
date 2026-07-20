import { generateAgentMarkdownPages } from "./lib/agent-markdown-generator.mjs";

const baselineUrl = (process.env.HTML_BASELINE_URL || "https://warrantee.io").replace(/\/$/, "");
const candidateUrl = (process.env.HTML_CANDIDATE_URL || process.env.AGENT_MARKDOWN_BASE_URL || "").replace(/\/$/, "");

if (!candidateUrl) {
  throw new Error("Set HTML_CANDIDATE_URL to the local or preview deployment being verified.");
}

const [baseline, candidate] = await Promise.all([
  generateAgentMarkdownPages({ baseUrl: baselineUrl }),
  generateAgentMarkdownPages({ baseUrl: candidateUrl }),
]);
const candidateByPath = new Map(candidate.pages.map((page) => [page.path, page]));
const failures = [];

for (const page of baseline.pages) {
  const comparison = candidateByPath.get(page.path);
  if (!comparison) {
    failures.push({ path: page.path, issue: "missing from candidate" });
  } else if (comparison.htmlTreeSha256 !== page.htmlTreeSha256) {
    failures.push({ path: page.path, issue: "semantic HTML tree changed" });
  }
}

for (const page of candidate.pages) {
  if (!baseline.pages.some((baselinePage) => baselinePage.path === page.path)) {
    failures.push({ path: page.path, issue: "missing from baseline" });
  }
}

if (failures.length > 0) {
  console.error(JSON.stringify({ ok: false, baselineUrl, candidateUrl, failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  baselineUrl,
  candidateUrl,
  pages: baseline.pages.length,
  result: "semantic HTML trees are identical",
}, null, 2));
