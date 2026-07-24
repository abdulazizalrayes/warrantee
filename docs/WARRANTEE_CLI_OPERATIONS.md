# Warrantee CLI Operations

Last reviewed: 2026-07-25

## Purpose

The Warrantee CLI gives registered users and approved agents a typed operational
surface over the same tenant-scoped API used by MCP. It is not a privileged
backdoor and never accepts a Warrantee username or password.

## Safety Contract

- Private commands require a scoped `wrt_...` integration token.
- Tenant ownership is derived server-side from the authenticated credential.
- Tokens, user IDs, company IDs, and private records are excluded from diagnostics.
- Destructive commands require explicit confirmation.
- Writes use the existing API authorization, validation, rate-limit, audit, and
  idempotency controls.
- Agents may observe, diagnose, and propose changes. They may not silently modify
  or replace the CLI.
- Updates require `warrantee update --confirm`, an exact semantic version, the
  official npm registry host, SHA-512 integrity metadata, registry signatures, and
  disabled lifecycle scripts.

## Operational Commands

```bash
warrantee --version
warrantee doctor --pretty
warrantee ops health --pretty
warrantee ops status --pretty
warrantee ops capabilities --pretty
warrantee update --check --pretty
```

`doctor` returns:

- `0`: all configured checks healthy.
- `2`: no required check failed, but a check was skipped or needs attention.
- `1`: a required health, discovery, or authentication check failed.

## Release Process

### First public release only

The npm registry does not allow staged publishing for a brand-new package.
Therefore, the first `warrantee@0.1.0` release must be performed interactively
by the npm owner:

1. Sign in to npm and enable publishing 2FA.
2. Run all repository and package release checks.
3. Publish `packages/warrantee-cli` directly with `npm publish --access public`.
4. Verify the package name, version, license, contents, installation, and
   read-only diagnostics.
5. Configure the package's trusted publisher for stage-only GitHub OIDC.
6. Require 2FA and disallow traditional publishing tokens.
7. Create the matching GitHub release after the initial package is verified.

The initial direct publish is the sole exception. Do not store an npm token in
GitHub or Vercel.

### Subsequent releases

1. Update `CLI_VERSION` and `packages/warrantee-cli/package.json` together.
2. Run `npm run qa:cli-release`.
3. Run focused CLI/MCP tests and `npm run pack:cli`.
4. Commit and pass normal CI.
5. Create a GitHub release tagged `warrantee-cli-v<version>`.
6. The `release-cli.yml` workflow verifies the tag, package synchronization,
   tests, and package contents.
7. GitHub OIDC stages the package through npm trusted publishing.
8. The npm maintainer reviews and approves the staged package with 2FA.
9. Verify `npm view warrantee version`, provenance, signatures, installation,
   `warrantee doctor`, token revocation, and one read-only account call.

After the first public release, configure this trusted publisher:

- GitHub owner: `abdulazizalrayes`
- Repository: `warrantee`
- Workflow: `release-cli.yml`
- Allowed action: stage publish
- GitHub environment: `npm-production`
- Recommended npm policy: require 2FA and disallow traditional publish tokens

No long-lived npm publishing token should be stored in GitHub.

## Rollback

For a faulty CLI release:

1. Deprecate the affected npm version with a clear replacement message.
2. Restore the previous known-good `latest` version through an approved release.
3. Do not unpublish a version unless it exposes secrets or creates an exceptional
   legal/security emergency.
4. Revoke affected integration tokens only if credential exposure is confirmed.
5. Record the incident, affected version, corrective commit, and verification.

Server API rollback remains independent of CLI rollback. A CLI release must not
silently change server contracts.
