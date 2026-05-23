# Warrantee Implementation Notes

## Team Workspace Limitation

- Recorded on: 2026-04-19
- Area: company team management / teammate onboarding

Current behavior:

- Company team management is now enforced server-side.
- Teammates can only be added if they already have a Warrantee account.
- Team additions are restricted to the same approved business email domain as the company workspace.
- Team roles exposed in the company settings flow are `superadmin`, `manager`, and `viewer`.

Why this was done:

- The previous browser-side flow was unsafe and allowed direct client mutations.
- There was no reliable existing acceptance pipeline for brand-new company teammates that was safe enough to keep in production.
- The current implementation favors production safety and company isolation over automatic invitation onboarding.

What to remember for the future:

- If we want true end-to-end teammate invitations for brand-new users, we should add a dedicated company invitation lifecycle rather than bypassing this rule.
- That future flow should include:
  - secure invitation records and expiry
  - same-domain validation
  - acceptance flow tied to the invited email
  - company assignment only after acceptance
  - audit logging for invite, accept, revoke, and role changes
