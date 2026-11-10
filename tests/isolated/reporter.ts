import type { FullResult, Reporter, Suite, TestCase, TestResult, TestError } from '@playwright/test/reporter';
import { browserSourceFile, safeBrowserFailure, JOURNEY_STAGES } from './diagnostics.mjs';

// No raw browser errors, emails, confirmation tokens, traces, or saved artifacts.
export default class IsolatedReporter implements Reporter {
  private suite?: Suite;
  private globalErrors = 0;
  private stages = new Map<string, string>();
  printsToStdio() { return true; }
  onBegin(_config: unknown, suite: Suite) { this.suite = suite; }
  onStdOut(chunk: string | Buffer, test?: TestCase) {
    if (!test) return;
    for (const line of chunk.toString().split('\n')) {
      const stage = line.startsWith('ISOLATED_STAGE ') ? line.slice('ISOLATED_STAGE '.length).trim() : '';
      if (JOURNEY_STAGES.has(stage)) this.stages.set(test.id, stage);
    }
  }
  onStdErr() {}
  onError(error: TestError) {
    this.globalErrors++;
    process.stdout.write(`ISOLATED_ERROR ${JSON.stringify(safeBrowserFailure(error))}\n`);
  }
  onTestEnd(test: TestCase, result: TestResult) {
    const failures = result.errors.map(safeBrowserFailure);
    const failure = failures.find(value => value?.file || value?.expectedStatus) || failures[0];
    const stage = this.stages.get(test.id);
    process.stdout.write(`ISOLATED_CASE ${JSON.stringify({ line: test.location.line, status: result.status,
      file: browserSourceFile(test.location.file),
      ...(stage ? { stage } : {}), ...(failure ? { failure } : {}),
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
