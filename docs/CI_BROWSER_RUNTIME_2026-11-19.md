# Pinned Browser CI Runtime

## Evidence And Scope

The personal-warranty completion release passed its full pre-deployment checks in PR #51. A synthetic CI attempt then timed out during Ubuntu package installation before its tests ran. Its unchanged fresh-runner rerun passed. The post-merge repeat also experienced a very slow Playwright dependency-install step; refreshing that runner did not reliably eliminate the delay.

This follow-up changes only the browser runtime for CI's build and synthetic UI jobs. It does not change application code, assertions, browser coverage, database/SMTP test stacks, production security workflows, hosting, secrets, permissions, live data, or postponed work.

## Runtime Contract

- Use Microsoft's official public `mcr.microsoft.com/playwright:v1.60.0-noble` image, pinned to registry manifest digest `sha256:9bd26ad900bb5e0f4dee75839e957a89ae89c2b7ab1e76050e559790e946b948` verified on November 19, 2026.
- The image matches the locked Playwright 1.60.0 package. Future package upgrades must update the runtime pin and pass the guard, rather than silently downloading another browser.
- The image supplies browser binaries and OS dependencies; the repository still installs its own locked Node dependencies with `npm ci`. See the [official Playwright Docker documentation](https://playwright.dev/docs/docker).
- Do not execute apt/browser installation in these two jobs. Verify version metadata, executable ownership/path, and actual Chromium, Firefox, and WebKit startup instead.
- Keep the GitHub-hosted Ubuntu runner. Use a separate one-GiB shared-memory allocation, not privileged mode, host IPC, host mounts, or a shared production runner.
- Keep Node 24, all existing tests, zero-flake rules, privacy collector interception, and synthetic/disposable test identities unchanged.
- The build job has a 25-minute deadline; synthetic UI keeps its existing 20-minute deadline.
- Docker-dependent database jobs retain their existing host execution and guard checks. The production security schedule is not manually dispatched or modified.

## Validation

Run `node --test scripts/check-ci-browser-runtime.test.mjs` locally for deterministic guards without Docker, browser launches, or production services. The live runtime check is intentionally Linux-CI-only and refuses a local Mac or Vercel environment.

The candidate CI must prove all three browsers launch from the pinned image and then pass the unchanged unit, build, CSP, performance, privacy, synthetic UI, real-backend regression and signup-to-first-warranty suites before merge. Final run and deployment evidence is recorded in the linked follow-up PR.

## Cost And Rollback

No new account, paid provider, paid hosting, subscription, secret, or production service is enabled. This uses the existing public GitHub Actions workflow and a public Microsoft image. Restore the previous workflow through a reviewed revert if the image/guard fails; do not waive or skip browser tests. The application source tree is unchanged by this follow-up.
