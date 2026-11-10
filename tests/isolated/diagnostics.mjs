const steps = new Set(['docker_preflight', 'cli_version', 'stack_init', 'stack_start', 'stack_status', 'database_identity', 'bootstrap', 'source_inventory', 'database_contracts', 'build', 'journey', 'cleanup']);
const sourcePath = /(?:^|\s|\.\/)((?:src|scripts|tests)\/[\w\-./[\]]+\.(?:ts|tsx|js|mjs))(?::(\d+)(?::(\d+))?|\((\d+),(\d+)\))(?::|\s)/gm;
export const DATABASE_CONTRACT_MINIMUMS = {
  'src/lib/__tests__/warranty-creation-db.test.ts': 50,
  'src/lib/__tests__/oauth-signup-setup-db.test.ts': 13,
};

const browserFiles = new Set([
  'tests/e2e/signup-first-warranty.spec.ts', 'tests/e2e/signup-ui-recovery.spec.ts',
  'tests/e2e/authenticated-core-flows.spec.ts', 'tests/e2e/authenticated-shell.spec.ts',
  'tests/e2e/business-workflows.spec.ts', 'tests/e2e/public-routes.spec.ts',
  'tests/e2e/protected-routes.spec.ts', 'tests/e2e/release-regression.spec.ts',
  'tests/e2e/seo-agent-ready.spec.ts', 'tests/e2e/searchable-select.spec.ts',
  'tests/e2e/header-footer.spec.ts', 'tests/e2e/csp.spec.ts',
  'tests/e2e/helpers.ts', 'tests/isolated/helpers.ts', 'tests/isolated/guard.mjs',
]);

export function browserSourceFile(value) {
  if (typeof value !== 'string') return undefined;
  return [...browserFiles].find(file => value.replaceAll('\\', '/').endsWith(`/${file}`) || value === file);
}

function failureCoordinates(value) {
  if (!value || !['locator_ambiguous', 'timeout', 'network', 'assertion', 'unknown'].includes(value.category)) return undefined;
  const file = browserSourceFile(value.file);
  const confirmationState = ['callback_rejected', 'verification_rejected', 'sign_in', 'dashboard', 'onboarding', 'other'].includes(value.confirmationState) ? value.confirmationState : undefined;
  const transit = Object.fromEntries(['callbackSeen', 'callbackCookieSet', 'hasAuthCookie', 'authRedirect', 'cookieApplicable', 'cookieVerified', 'profileReadable', 'proxyInputCookie', 'browserSentCookie', 'explicitCookieAccepted', 'cspViolated', 'browserScriptError', 'browserHydrated', 'cookieVisible', 'documentScripts', 'documentHtml', 'httpOnlyCookie', 'sameAppOrigin'].filter(key => typeof value[key] === 'boolean').map(key => [key, value[key]]));
  const boundaries = Array.isArray(value.boundaries) ? [...new Set(value.boundaries.filter(value => ['client_http', 'server_http', 'page_error', 'csp', 'console_error'].includes(value)))].slice(0, 5) : [];
  const httpChecks = Array.isArray(value.httpChecks) ? value.httpChecks.filter(item => /^([45][0-9]{2}):(activity_log|warranty_claims|company_members|warranty_documents|warranties|notifications|profiles|subscriptions|companies)$/.test(item)).slice(0, 10) : [];
  const proxyState = /^(?:cookie|no_cookie):(?:no_session|auth_failure|none)$/.test(value.proxyState || '') ? value.proxyState : undefined;
  return { category: value.category, ...(boundaries.length ? { boundaries } : {}), ...(httpChecks.length ? { httpChecks } : {}), ...(confirmationState ? { confirmationState, ...transit, ...(proxyState ? { proxyState } : {}) } : {}), ...(file && Number.isSafeInteger(value.line) && value.line > 0 && value.line < 100000
    && Number.isSafeInteger(value.column) && value.column >= 0 && value.column < 100000
    ? { file, line: value.line, column: value.column } : {}) };
}

export function safeBrowserFailure(error) {
  const text = typeof error?.message === 'string' ? error.message : '';
  const category = /strict mode violation/i.test(text) ? 'locator_ambiguous'
    : /timeout|timed out/i.test(text) ? 'timeout'
      : /ECONNREFUSED|ECONNRESET/i.test(text) ? 'network'
        : /expect\(/i.test(text) ? 'assertion' : 'unknown';
  const direct = error?.location;
  let file = browserSourceFile(direct?.file);
  let line = direct?.line;
  let column = direct?.column;
  if (!file && typeof error?.stack === 'string') {
    for (const frame of error.stack.matchAll(/((?:tests\/e2e|tests\/isolated)\/[a-z-]+\.(?:ts|mjs)):(\d+):(\d+)/g)) {
      file = browserSourceFile(frame[1]);
      if (file) { line = Number(frame[2]); column = Number(frame[3]); break; }
    }
  }
  const confirmationState = text.match(/\bisolated_confirmation_destination:(callback_rejected|verification_rejected|sign_in|dashboard|onboarding|other)\b/)?.[1];
  const transit = Object.fromEntries([...text.matchAll(/;(callbackSeen|callbackCookieSet|hasAuthCookie|authRedirect|cookieApplicable|cookieVerified|profileReadable|proxyInputCookie|browserSentCookie|explicitCookieAccepted|cspViolated|browserScriptError|browserHydrated|cookieVisible|documentScripts|documentHtml|httpOnlyCookie|sameAppOrigin)=(true|false)\b/g)].map(match => [match[1], match[2] === 'true']));
  const boundaries = text.match(/\bisolated_browser_boundaries:([a-z_,]+)/)?.[1].split(',');
  const httpChecks = text.match(/\bisolated_http_checks:([a-z_,:0-9]+)/)?.[1].split(',');
  const proxyState = text.match(/;proxyState=((?:cookie|no_cookie):(?:no_session|auth_failure|none))\b/)?.[1];
  return failureCoordinates({ category, file, line, column, confirmationState, ...transit, boundaries, httpChecks, proxyState });
}

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
    if (line.startsWith('ISOLATED_PREFLIGHT ')) {
      try {
        const item = JSON.parse(line.slice('ISOLATED_PREFLIGHT '.length));
        if (['agent-markdown:check', 'qa:agent-markdown', 'qa:agent-readiness'].includes(item.check) && ['passed', 'failed'].includes(item.status)) {
          lines.push(`ISOLATED_PREFLIGHT ${JSON.stringify({ check: item.check, status: item.status })}`);
        }
      } catch { /* No arbitrary diagnostics leave the isolated process. */ }
    }
    if (line.startsWith('ISOLATED_ERROR ')) {
      try {
        const failure = failureCoordinates(JSON.parse(line.slice('ISOLATED_ERROR '.length)));
        if (failure) lines.push(`ISOLATED_ERROR ${JSON.stringify(failure)}`);
      } catch { /* No raw browser errors leave the process. */ }
    }
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
          const file = browserSourceFile(item.file);
          const failure = failureCoordinates(item.failure);
          lines.push(`ISOLATED_CASE ${JSON.stringify({ line: item.line, status: item.status, ...(file ? { file } : {}), ...(failure ? { failure } : {}) })}`);
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
