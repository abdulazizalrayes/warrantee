# Warrantee CodeQL Recovery Runbook

## Scope And Safety

- Repository: `abdulazizalrayes/warrantee`; production branch: `main`.
- GitHub-managed default setup scans GitHub Actions, JavaScript/TypeScript, and Python with the `extended` query suite on standard GitHub runners.
- Keep the existing scanning coverage, threat model, alert thresholds, and schedule enabled. Do not manufacture successful checks, dismiss alerts to clear a run, change application code solely to trigger scanning, or disable/re-enable protection as a retry shortcut.
- This runbook does not authorize other maintenance, spending, credentials, database recovery, billing, OCR, or other postponed work.

## Classify The Failure Before Changing Anything

1. Confirm the repository and current `main` SHA.
2. Inspect the failed jobs and their analysis steps, not only the overall red status.
3. Distinguish scanner initialization/download failures from completed analyses reporting findings. A skipped analysis is not a passing scan.
4. Record the run URL, exact commit, affected languages, failed step, and provider response. Do not copy secrets or private data from logs.

```sh
gh api repos/abdulazizalrayes/warrantee/branches/main --jq .commit.sha
gh run list --repo abdulazizalrayes/warrantee --workflow CodeQL --limit 5
gh run view RUN_ID --repo abdulazizalrayes/warrantee --json headSha,status,conclusion,jobs,url
gh api repos/abdulazizalrayes/warrantee/code-scanning/default-setup
```

## Retry Without Weakening Protection

1. Attempt the normal failed-job retry once. If GitHub rejects the managed dynamic workflow as non-retryable, do not repeatedly submit the same request.
2. Re-saving the unchanged default configuration may return a historical validation run rather than start a new scan. Verify the returned run's commit and creation time; do not count the historical success as current evidence.
3. GitHub's default-setup UI identifies pushes/pull requests to `main` and protected branches, plus scheduled runs, as scan triggers. Use the next genuinely scoped reviewed change or the existing schedule when direct retries are unsupported. Do not broaden repository access or replace default setup with an advanced workflow just to retry a transient download failure.
4. For an owner-approved incident documentation update, use the normal pull-request path. Verify its diff is documentation-only and leaves all application, workflow, dependency, and public-content trees unchanged. The resulting fresh analysis, not the documentation commit itself, supplies evidence.
5. After any merge, verify the new `main` scan separately. A pull-request success or an identical source tree does not clear a failed default-branch scan.

```sh
gh run rerun RUN_ID --failed --repo abdulazizalrayes/warrantee
git diff --name-only BASE_SHA HEAD
git diff --exit-code BASE_SHA HEAD -- . ':!docs/CODEQL_RECOVERY_RUNBOOK.md'
gh run watch NEW_RUN_ID --exit-status --repo abdulazizalrayes/warrantee
```

## Completion Evidence

- The fresh run targets the intended current `main` SHA and concludes `success`.
- All three language jobs finish successfully, including `Perform CodeQL Analysis`; no language is silently skipped or removed.
- Code-scanning analyses for `refs/heads/main` identify that same commit, report no analysis error, and have completed result processing.
- Review open code-scanning alert counts separately. A successful scanner execution alone is not a zero-findings certification.
- Re-read default setup and confirm coverage, query suite, threat model, runner, and schedule remain unchanged.
- Record final run/analysis IDs, alert counts, any residual limitations, and deployment identity in the associated PR closeout. Preserve failed historical evidence rather than deleting it.
- For documentation-only recovery, no application rollback is needed; any source rollback should be a reviewed revert, not a history rewrite. If hosting rebuilds automatically, verify the assigned production deployment and public health before closing the task.

## Incident: 8 November 2026

- Main commit: `6edad681edf605af05fde2293bead31650ff8a05`.
- Failed run: [42469568153](https://github.com/abdulazizalrayes/warrantee/actions/runs/42469568153).
- GitHub Actions analysis succeeded. JavaScript/TypeScript and Python failed in `Initialize CodeQL` while downloading the CodeQL 2.27.4 bundles from GitHub; streaming and fallback downloads returned HTTP 504. Their analysis steps were skipped. This establishes a provider-download failure, not a completed clean scan or a vulnerability finding.
- Direct full-run, failed-job, and individual-job retries were rejected as non-retryable. Re-submitting the unchanged default-setup configuration returned September validation run `33909062318` and did not create a current scan. The UI's run options likewise exposed no retry action.
- Prior PR analysis [42468688854](https://github.com/abdulazizalrayes/warrantee/actions/runs/42468688854) passed the identical application tree. This is supporting evidence only, not a substitute for a successful current `main` analysis.
- The recovery PR and its final closeout must record the fresh main result before this incident is described as resolved.

## Official References

- [GitHub default setup](https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/configure-code-scanning/configure-code-scanning)
- [Editing default setup](https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/manage-your-configuration/edit-default-setup)
- [Default setup REST API](https://docs.github.com/en/rest/code-scanning/code-scanning#update-a-code-scanning-default-setup-configuration)
- [Workflow retries](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/re-run-workflows-and-jobs)
