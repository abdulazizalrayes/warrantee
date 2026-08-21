# Warrantee Internal Security Assurance

Date: 2026-08-21
Scope: Warrantee and `warrantee.io` only.

## Decision

A paid independent penetration test is deferred while Warrantee has no real users. The temporary control is a repeatable internal adversarial assurance gate:

```bash
npm run qa:security-assurance
npm run qa:security-assurance -- --production
```

The first command verifies production dependency advisories, production URL protection, migration integrity, the formal pentest scope packet, and focused security regressions for authentication, email ingestion, attachment handling, profile-role escalation, tenant access, document provenance, and document scanning.

The production mode also runs the public production smoke check, operational readiness, and live Supabase anonymous/authenticated RLS probe. It requires the approved local QA credentials for the authenticated portion; CI remains the authoritative environment when those credentials are absent locally.

## Current Evidence

The 2026-08-21 local run passed:

- zero known production dependency vulnerabilities;
- no disallowed local development or loopback references;
- 58 production migration sources match the integrity ledger with zero pending rollout;
- pentest scope and execution packet completeness;
- 9 focused security test files and 58 tests.
- production smoke and operational readiness;
- anonymous and authenticated RLS/privilege probes;
- disposable QA identity creation, cleanup, and zero-persistent-identity verification.

## What This Does Not Prove

This is not independent because it is designed and executed from the same engineering environment as the product. It cannot provide an external attestation, remove developer blind spots, or replace an authorized manual attack by a separate specialist.

Reopen an independent pentest before any of these triggers:

1. Enterprise or government security review.
2. Material customer document volume or sensitive commercial data.
3. A paid cohort whose contracts require external assurance.
4. A major authentication, tenancy, storage, payment, or API architecture change.
5. A credible incident, disclosure, or cross-tenant anomaly.

Until then, run the internal gate before production releases that touch auth, RLS, storage, OCR, payments, webhooks, API tokens, admin access, or public verification.
