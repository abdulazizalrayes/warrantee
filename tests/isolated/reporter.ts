import type { FullResult, Reporter, Suite, TestCase, TestResult } from '@playwright/test/reporter';
import { browserSourceFile, safeBrowserFailure } from './diagnostics.mjs';

// No raw browser errors, emails, confirmation tokens, traces, or saved artifacts.
export default class IsolatedReporter implements Reporter {
  private suite?: Suite;
  private globalErrors = 0;
  printsToStdio() { return true; }
  onBegin(_config: unknown, suite: Suite) { this.suite = suite; }
  onStdOut() {}
  onStdErr() {}
  onError() { this.globalErrors++; }
  onTestEnd(test: TestCase, result: TestResult) {
    process.stdout.write(`ISOLATED_CASE ${JSON.stringify({ line: test.location.line, status: result.status,
      file: browserSourceFile(test.location.file),
      ...(result.errors[0] ? { failure: safeBrowserFailure(result.errors[0]) } : {}),
    })}\n`);
  }
  async onEnd(result: FullResult) {
    const counts = { passed: 0, failed: 0, skipped: 0, flaky: 0 };
    for (const test of this.suite?.allTests() || []) {
      const outcome = test.outcome();
      counts[outcome === 'expected' ? 'passed' : outcome === 'unexpected' ? 'failed' : outcome]++;
    }
    const legacy = process.env.E2E_SUITE === 'isolated-regression';
    const minimum = Number(process.env.ISOLATED_MIN_CASES || (legacy ? '1' : '10'));
    const failed = !Number.isSafeInteger(minimum) || minimum < 1 || minimum > 100000 || result.status !== 'passed' || this.globalErrors > 0 || counts.failed > 0 || counts.skipped > 0 || counts.flaky > 0 || counts.passed < minimum;
    process.stdout.write(`${legacy ? 'ISOLATED_LEGACY_SUMMARY' : 'ISOLATED_SUMMARY'} ${JSON.stringify({ ...counts, globalErrors: this.globalErrors, status: failed ? 'failed' : 'passed', syntheticOnly: true, externalOAuthHandshake: 'not_tested' })}\n`);
    return failed ? { status: 'failed' as const } : undefined;
  }
}
