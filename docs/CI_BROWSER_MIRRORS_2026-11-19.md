# Browser CI Mirror Reliability

## Observed Failure

The approved four personal-warranty fixes passed all pre-deployment gates in PR #51 and are deployed. Later CI repetitions spent tens of minutes fetching browser system packages from a regional EC2 Ubuntu mirror. The initial synthetic job timed out before tests started; its unchanged fresh-runner retry passed. Refreshing the later build runner did not reliably avoid slow installation.

An unmerged prebuilt-image candidate successfully launched Chromium but could not launch Firefox in the runner configuration. It was rejected, not deployed. No sandbox bypass, privileged container, host IPC, broad Git trust exception or disabled browser assertion is retained.

## Minimal Host-Runner Fix

- Retain the existing GitHub-hosted Ubuntu 24.04 jobs and browser versions.
- Parse only the runner's Ubuntu Deb822 source file. Change recognized Ubuntu mirror URIs to official HTTPS Ubuntu endpoints.
- Support the exact `mirror+file:/etc/apt/apt-mirrors.txt` reference used by the current [GitHub runner source setup](https://github.com/actions/runner-images/blob/main/images/ubuntu/scripts/build/configure-apt-sources.sh). Never read or follow arbitrary local mirror files; replace this recognized URI directly. Other file references remain rejected.
- Preserve source types, suites, components, signing key, and every other repository field. Do not touch Microsoft or other third-party source files.
- Bound apt HTTP/HTTPS timeouts and retry count without disabling TLS or signature verification.
- Bound Playwright installation steps to five minutes instead of allowing indefinite package installation. Keep all existing tests, assertions, browsers and zero-flake policies.
- Guard the preparer before OS access: exact Warrantee GitHub repository, CI, GitHub Actions, Linux runner, Linux process, root. Preserve only those four non-secret environment markers through sudo, not the entire job environment.
- Do not run the preparer against the owner's Mac, Vercel, a production host, another repository, or another company.
- The production security workflow and its schedule are unchanged and are not manually dispatched.

## Validation And Rollback

`python3 scripts/prepare-ci-browser-mirrors.test.py` exercises parsing, preservation, hostile-source rejection, environment guards and fixed-category reporting without touching system configuration. Existing full CI and real isolated signup/database gates must pass before merge.

This changes ephemeral CI runner setup only. No new account, paid provider, service, subscription, secrets, production data, application code, visual content or postponed feature is introduced. Revert this CI-only change through a reviewed PR if needed; do not waive tests. Runtime and release evidence is retained in PR #52.

## Completed Release Evidence

[PR #52](https://github.com/abdulazizalrayes/warrantee/pull/52) merged as `6c99592c1584639ae328eb2850f9d996facd3c0c`, with a tree identical to tested candidate `c7c3f479b2ba1a44051e105766fdcf31dfa6ed85`. Candidate [CI 44505848048](https://github.com/abdulazizalrayes/warrantee/actions/runs/44505848048), [signup 44505848002](https://github.com/abdulazizalrayes/warrantee/actions/runs/44505848002), all CodeQL analyses and exact-SHA preview passed before merge. The eight offline mirror tests and sixteen isolated guard contracts passed.

The automatic post-merge [CI 44507643848](https://github.com/abdulazizalrayes/warrantee/actions/runs/44507643848), [signup 44507643762](https://github.com/abdulazizalrayes/warrantee/actions/runs/44507643762) and [CodeQL 44507643485](https://github.com/abdulazizalrayes/warrantee/actions/runs/44507643485) also completed successfully. Ready deployment `dpl_FXb8ypmHnQ3eXh1gNHb6339DrrBY` serves `warrantee.io`; 16 final read-only live checks and all 50 deterministic sitemap Markdown checks passed. No manual Production Security Gates run was triggered, and those scheduled results are not claimed by this CI record.
