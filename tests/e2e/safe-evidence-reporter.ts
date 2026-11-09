import { rmSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import type { FullConfig, FullResult, Reporter, Suite, TestCase, TestResult } from "@playwright/test/reporter";
import { evidenceDirectory, limits, numericAudit, prepareSafeDirectory, routeAlias, safeFiles, safeProjects, validateSafeDirectory } from "./safe-evidence.ts";

export default class SafeEvidenceReporter implements Reporter {
  private globalErrors = 0;
  private records: { file: string; line: number; project: string; route: string; audits: Record<string, number>[] }[] = [];
  private suite?: Suite;
  printsToStdio() { return true; }
  onBegin(_config: FullConfig, suite: Suite) {
    this.suite = suite;
    rmSync(evidenceDirectory, { recursive: true, force: true });
    prepareSafeDirectory();
  }
  onStdOut() {}
  onStdErr() {}
  onError() { this.globalErrors = Math.min(100000, this.globalErrors + 1); }
  onTestEnd(test: TestCase, result: TestResult) {
    if (result.status === test.expectedStatus || result.status === "skipped" || this.records.length >= limits.records) return;
    const audits: Record<string, number>[] = [];
    const route = routeAlias(test.title);
    for (const attachment of result.attachments) {
      if (audits.length >= 16) break;
      if (!attachment.body || attachment.contentType !== "application/json") continue;
      if (attachment.name === "semantic-audit" && route === "unknown") continue;
      const audit = numericAudit(attachment.name, attachment.body);
      if (audit) audits.push(audit);
    }
    const file = basename(test.location.file);
    const project = test.parent.project()?.name || "unknown";
    this.records.push({ file: safeFiles.includes(file) && resolve("tests/e2e", file) === test.location.file ? file : "unknown", line: Math.max(0, Math.min(100000, test.location.line)), project: safeProjects.includes(project) ? project : "unknown", route, audits });
  }
  onEnd(result: FullResult) {
    const counts = { passed: 0, failed: 0, flaky: 0, skipped: 0 };
    for (const test of this.suite?.allTests() || []) {
      const outcome = test.outcome();
      counts[outcome === "expected" ? "passed" : outcome === "unexpected" ? "failed" : outcome]++;
    }
    const runStatus = result.status === "passed" && (this.globalErrors || counts.flaky) ? "failed" : result.status;
    const summary = JSON.stringify({ counts, records: this.records, globalErrors: this.globalErrors, runStatus });
    if (runStatus !== "passed") {
      if (Buffer.byteLength(summary) <= limits.jsonBytes) writeFileSync(`${evidenceDirectory}/summary.json`, summary, { flag: "wx", mode: 0o600 });
      if (!validateSafeDirectory()) rmSync(evidenceDirectory, { recursive: true, force: true });
    } else rmSync(evidenceDirectory, { recursive: true, force: true });
    process.stdout.write(`${JSON.stringify({ ...counts, globalErrors: this.globalErrors, runStatus })}\n`);
  }
}
