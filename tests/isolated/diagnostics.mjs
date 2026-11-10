const steps = new Set(['docker_preflight', 'cli_version', 'stack_init', 'stack_start', 'stack_status', 'database_identity', 'bootstrap', 'source_inventory', 'database_contracts', 'build', 'journey', 'cleanup']);
const sourcePath = /(?:^|\s|\.\/)((?:src|scripts|tests)\/[\w\-./[\]]+\.(?:ts|tsx|js|mjs))(?::(\d+)(?::(\d+))?|\((\d+),(\d+)\))(?::|\s)/gm;
export const DATABASE_CONTRACT_MINIMUMS = {
  'src/lib/__tests__/warranty-creation-db.test.ts': 50,
  'src/lib/__tests__/oauth-signup-setup-db.test.ts': 13,
};

export function safeDiagnostics(step, output) {
  if (!steps.has(step)) throw new Error('Unregistered isolated diagnostic step');
  const diagnostics = [];
  if (step === 'bootstrap') {
    for (const match of output.matchAll(/psql:<stdin>:(\d+):\s*(?:ERROR|FATAL):\s*([A-Z0-9]{5})\b/g)) {
      diagnostics.push({ step, line: Number(match[1]), sqlstate: match[2] });
    }
  }
  if (step === 'build') {
    for (const match of output.matchAll(sourcePath)) {
      if (match[1].split('/').includes('..')) continue;
      const tail = output.slice(match.index + match[0].length, match.index + match[0].length + 100);
      const code = tail.match(/\bTS\d{3,5}\b/)?.[0] || 'COMPILE_ERROR';
      diagnostics.push({ step, file: match[1], line: Number(match[2] || match[4]), column: Number(match[3] || match[5] || 0), code });
    }
  }
  return diagnostics.slice(0, 12);
}

export function safeTestOutput(output) {
  const lines = [];
  for (const line of output.split('\n')) {
    if (line.startsWith('{')) {
      try {
        const item = JSON.parse(line);
        if (['passed', 'failed', 'skipped', 'flaky', 'globalErrors'].every((key) => Number.isSafeInteger(item[key]) && item[key] >= 0 && item[key] < 100000) && ['passed', 'failed', 'timedout', 'interrupted'].includes(item.runStatus)) {
          lines.push(`ISOLATED_LEGACY_SUMMARY ${JSON.stringify({ passed: item.passed, failed: item.failed, skipped: item.skipped, flaky: item.flaky, globalErrors: item.globalErrors, status: item.runStatus, syntheticOnly: true })}`);
        }
      } catch { /* Only allowlisted numeric summary fields leave the process. */ }
    }
    if (line.startsWith('ISOLATED_CASE ')) {
      try {
        const item = JSON.parse(line.slice('ISOLATED_CASE '.length));
        if (Number.isSafeInteger(item.line) && item.line > 0 && ['passed', 'failed', 'timedOut', 'skipped', 'interrupted'].includes(item.status)) {
          lines.push(`ISOLATED_CASE ${JSON.stringify({ line: item.line, status: item.status })}`);
        }
      } catch { /* Raw output is never forwarded. */ }
    }
    if (line.startsWith('ISOLATED_SUMMARY ') || line.startsWith('ISOLATED_LEGACY_SUMMARY ')) {
      try {
        const prefix = line.startsWith('ISOLATED_LEGACY_SUMMARY ') ? 'ISOLATED_LEGACY_SUMMARY ' : 'ISOLATED_SUMMARY ';
        const item = JSON.parse(line.slice(prefix.length));
        if (['passed', 'failed', 'skipped', 'flaky', 'globalErrors'].every((key) => Number.isSafeInteger(item[key]) && item[key] >= 0 && item[key] < 100000) && ['passed', 'failed'].includes(item.status)) {
          lines.push(`${prefix}${JSON.stringify({ passed: item.passed, failed: item.failed, skipped: item.skipped, flaky: item.flaky, globalErrors: item.globalErrors, status: item.status, syntheticOnly: true, externalOAuthHandshake: 'not_tested' })}`);
        }
      } catch { /* Raw output is never forwarded. */ }
    }
  }
  return lines.slice(-40);
}

export function databaseTestSummary(output) {
  try {
    const report = JSON.parse(output);
    const counts = { total: report.numTotalTests, passed: report.numPassedTests, failed: report.numFailedTests, skipped: report.numPendingTests, todo: report.numTodoTests };
    if (!Object.values(counts).every((value) => Number.isSafeInteger(value) && value >= 0 && value < 100000)) throw new Error('Invalid counters');
    const files = Object.entries(DATABASE_CONTRACT_MINIMUMS);
    const minimum = files.reduce((sum, [, count]) => sum + count, 0);
    const failedCases = [];
    for (const [file] of files) {
      const result = report.testResults?.find((result) => typeof result.name === 'string' && result.name.replaceAll('\\', '/').endsWith(`/${file}`));
      if (!Array.isArray(result?.assertionResults)) continue;
      let included = 0;
      for (let index = 0; index < result.assertionResults.length && included < 6 && failedCases.length < 12; index++) {
        if (result.assertionResults[index]?.status !== 'passed') {
          const failure = (result.assertionResults[index]?.failureMessages || []).filter(value => typeof value === 'string').join('\n');
          const permittedCodes = new Set(['42501', '42P01', '42703', '42883', '23502', '23503', '23505', '23514', '22P02', '22007', '22008', '22023', '40P01', 'P0001']);
          const sqlstate = [...failure.matchAll(/["']?code["']?\s*:\s*["']([A-Z0-9]{5})["']/g)]
            .map(match => match[1]).find(code => permittedCodes.has(code));
          const categories = [
            [/row-level security/i, 'row_security'],
            [/permission denied for function/i, 'function_permission'],
            [/permission denied for (?:table|schema)/i, 'relation_permission'],
            [/does not exist/i, 'missing_schema'],
            [/invalid input syntax/i, 'invalid_type'],
            [/violates check constraint/i, 'check_constraint'],
            [/duplicate key/i, 'duplicate_key'],
            [/deadlock detected/i, 'deadlock'],
            [/violates not-null/i, 'null_constraint'],
          ];
          const category = categories.find(([pattern]) => pattern.test(failure))?.[1];
          failedCases.push({ file, assertionIndex: index + 1, ...(sqlstate ? { sqlstate } : {}), ...(category ? { category } : {}) });
          included++;
        }
      }
    }
    const fileCoverage = Array.isArray(report.testResults) && report.testResults.length === files.length && files.every(([file, count]) => {
      const result = report.testResults.find((result) => typeof result.name === 'string' && result.name.replaceAll('\\', '/').endsWith(`/${file}`));
      return result && Array.isArray(result.assertionResults) && result.assertionResults.length >= count && result.assertionResults.every((assertion) => assertion.status === 'passed');
    });
    return { ...counts, status: report.success === true && fileCoverage && counts.total >= minimum && counts.total === counts.passed && counts.failed === 0 && counts.skipped === 0 && counts.todo === 0 ? 'passed' : 'failed', failedCases, syntheticOnly: true };
  } catch { return { status: 'failed', syntheticOnly: true }; }
}

export function validateJourneySummary(output, minimum, legacy = false) {
  if (!Number.isSafeInteger(minimum) || minimum < 1 || minimum > 100000) return false;
  const prefix = legacy ? 'ISOLATED_LEGACY_SUMMARY ' : 'ISOLATED_SUMMARY ';
  const summaries = safeTestOutput(output).filter((line) => line.startsWith(prefix));
  if (summaries.length !== 1) return false;
  const summary = JSON.parse(summaries[0].slice(prefix.length));
  return summary.status === 'passed' && summary.passed >= minimum && summary.failed === 0 &&
    summary.flaky === 0 && summary.globalErrors === 0 && summary.skipped === 0;
}
