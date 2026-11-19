# Browser CI Mirror Reliability

## Observed Failure

The approved four personal-warranty fixes passed all pre-deployment gates in PR #51 and are deployed. Later CI repetitions spent tens of minutes fetching browser system packages from a regional EC2 Ubuntu mirror. The initial synthetic job timed out before tests started; its unchanged fresh-runner retry passed. Refreshing the later build runner did not reliably avoid slow installation.

An unmerged prebuilt-image candidate successfully launched Chromium but could not launch Firefox in the runner configuration. It was rejected, not deployed. No sandbox bypass, privileged container, host IPC, broad Git trust exception or disabled browser assertion is retained.

## Minimal Host-Runner Fix

- Retain the existing GitHub-hosted Ubuntu 24.04 jobs and browser versions.
- Parse only the runner's Ubuntu Deb822 source file. Change recognized Ubuntu mirror URIs to official HTTPS Ubuntu endpoints.
- Preserve source types, suites, components, signing key, and every other repository field. Do not touch Microsoft or other third-party source files.
- Bound apt HTTP/HTTPS timeouts and retry count without disabling TLS or signature verification.
- Bound Playwright installation steps to five minutes instead of allowing indefinite package installation. Keep all existing tests, assertions, browsers and zero-flake policies.
- Guard the preparer before OS access: exact Warrantee GitHub repository, CI, GitHub Actions, Linux runner, Linux process, root. Preserve only those four non-secret environment markers through sudo, not the entire job environment.
- Do not run the preparer against the owner's Mac, Vercel, a production host, another repository, or another company.
- The production security workflow and its schedule are unchanged and are not manually dispatched.

## Validation And Rollback

`python3 scripts/prepare-ci-browser-mirrors.test.py` exercises parsing, preservation, hostile-source rejection, environment guards and fixed-category reporting without touching system configuration. Existing full CI and real isolated signup/database gates must pass before merge.

This changes ephemeral CI runner setup only. No new account, paid provider, service, subscription, secrets, production data, application code, visual content or postponed feature is introduced. Revert this CI-only change through a reviewed PR if needed; do not waive tests. Runtime and release evidence is retained in PR #52.
