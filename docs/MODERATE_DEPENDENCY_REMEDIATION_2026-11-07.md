# Moderate dependency remediation

Scope: Warrantee only. No visual, crawler-policy, account, data, or telemetry changes.

The five production audit warnings represent two advisories inherited through
Sentry bundler tooling: glob cancellation bypass and minimatch amplification.
Development tooling also inherited vulnerable minimatch versions.

Use scoped npm overrides for @sentry/bundler-plugins -> glob 14.0.2 and
@typescript-eslint/typescript-estree -> minimatch 11.0.1. The Sentry glob path
resolves minimatch 11.0.5. Keep unrelated minimatch 3.x dependencies untouched;
they are outside the affected range. Preserve the supported Node 22/24 runtime.

Sentry 10.78.0 and its application configuration remain unchanged. A Sentry 11
upgrade would change telemetry/data-collection defaults and is not required for
this narrowly scoped dependency repair. Review these overrides when upstream
packages adopt fixed versions; do not remove them until audit and tests pass.

CI now rejects moderate-or-higher production dependency advisories. It does not
silence advisories, exclude affected packages, or use npm audit force fixes.

Regression tests resolve the actual parent dependencies and exercise artifact
matching, ignore/hidden-file behavior, pre-aborted traversal, and TypeScript
matching. Also require a clean npm ci, full audit, unit suite, lint, type-check,
real Sentry-enabled CI/preview build, HTML-preservation and browser gates before
production deployment. Run production smoke/readiness/security gates after release.

Sources:
- https://github.com/advisories/GHSA-3g3m-2fjr-6pw4
- https://github.com/advisories/GHSA-g3hv-75wg-m249
- https://github.com/getsentry/sentry-javascript/releases/tag/11.11.0
- https://docs.sentry.io/platforms/javascript/guides/nextjs/migration/v10-to-v11/

Rollback: revert this scoped change or restore the previously verified production
deployment dpl_Dz3VkGLsZaNCAHPhvrkgCj5xarpP. That version retains the prior moderate
warnings but keeps the critical fixes and no-training crawler policy.
