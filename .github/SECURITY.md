# Warrantee Security Policy

Warrantee welcomes responsible reports that help protect its users, warranty records, documents, and integrations.

## Supported Service

Security reports should concern the production service at `https://warrantee.io`, the public API/MCP surfaces documented there, or code in the current `main` branch of this repository.

## Report Privately

Do not open a public GitHub issue for a suspected vulnerability.

Use [GitHub private vulnerability reporting](https://github.com/abdulazizalrayes/warrantee/security/advisories/new). If that is unavailable, email `hello@warrantee.io` with the subject `[SECURITY] Warrantee vulnerability report`.

Include the affected URL or component, reproduction steps, expected impact, and the smallest evidence needed to validate the issue. Remove credentials, access tokens, personal information, and customer documents from the report.

## In Scope

- Authentication, session, password-reset, and account-recovery weaknesses
- Cross-user or cross-company authorization and tenant-isolation failures
- Exposure of private warranties, claims, certificates, files, or storage paths
- API, CLI, MCP, token-scope, rate-limit, or revocation weaknesses
- Unsafe document upload, OCR, webhook, email-ingestion, or payment behavior
- Injection, request-forgery, cross-site scripting, secret exposure, and privilege escalation

## Testing Rules

- Use accounts and records you own or are explicitly authorized to test.
- Stop when you can demonstrate impact; do not access, alter, download, or retain another person's data.
- Do not perform denial-of-service, load, spam, social-engineering, phishing, physical, or destructive testing.
- Do not test third-party providers or infrastructure that Warrantee does not own.
- Do not upload malware, executable payloads, or sensitive real-world documents.
- Keep the report confidential while Warrantee validates and remediates it.

## Safe Harbor

Warrantee will not pursue action against good-faith research that follows this policy, avoids privacy harm and service disruption, and provides reasonable time to investigate and remediate. This policy does not authorize activity prohibited by law or by a third party's terms.

Warrantee does not currently operate a paid bug-bounty program and cannot promise a reward. We aim to acknowledge valid reports within five business days and will provide progress updates when practical.
