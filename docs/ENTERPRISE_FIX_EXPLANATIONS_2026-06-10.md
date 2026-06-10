# Warrantee.io Fix Explanations

Date: 2026-06-10  
Scope: Warrantee.io only  
Purpose: Explain each proposed fix in plain decision language.

## How To Read This

Each item answers:

- Problem: what is wrong or risky now.
- Why fix it: business, security, scalability, product, or trust reason.
- Recommendation: what should be done.

## Critical Security and Tenant Fixes

### 1. First-Class Tenants and Tenant Memberships

Problem: Warrantee currently behaves mostly like a user-owned warranty app, with ownership spread across fields such as `user_id`, `buyer_id`, `seller_id`, `recipient_user_id`, and `issuer_user_id`. That becomes fragile when one company has many users, branches, sellers, admins, API clients, and documents.

Why fix it: Enterprise customers, government customers, insurers, and large sellers need strict company-level isolation. Without a formal tenant model, cross-company permissions become harder to reason about and harder to prove.

Recommendation: Add first-class `tenants` or `companies`, tenant memberships, tenant-scoped roles, and `tenant_id` on all core business objects. Update RLS and APIs to use tenant membership as the primary access boundary.

### 2. Remove Email-Domain-Based Admin Bootstrap

Problem: Some team logic can infer company access from email domains. This is convenient, but a domain match alone is not a strong proof of company authority.

Why fix it: A wrong domain assumption can accidentally give a user visibility or admin control they should not have. This is especially dangerous for enterprise, government, and multi-branch organizations.

Recommendation: Replace domain inference with verified company onboarding. Use DNS verification, verified admin invite, or manual internal approval for early high-value accounts.

### 3. Tenant-Scoped Roles

Problem: Global roles do not fit B2B SaaS. A user may be an owner in one company, a viewer in another, and a platform admin only if they work for Warrantee.

Why fix it: Global roles create permission confusion and future cross-tenant risk.

Recommendation: Separate platform roles from tenant roles. Tenant roles should include owner, admin, manager, support, viewer, and API-only.

### 4. Remove Legacy Static API Token

Problem: A legacy static API token path exists. Static shared tokens are difficult to rotate, audit, scope, or attribute to a specific customer system.

Why fix it: Enterprise APIs need accountability. If an integration misbehaves, you need to know which client did it, revoke only that client, and preserve everyone else.

Recommendation: Remove the legacy static token path and require hashed, generated, scoped API tokens tied to a tenant API client.

### 5. Distributed Production Rate Limiting

Problem: In-memory rate limiting is not enough for serverless, multi-region, or distributed production systems.

Why fix it: Abuse, scraping, OCR cost attacks, verification enumeration, and DDoS-style bursts can bypass per-instance memory limits.

Recommendation: Require Redis/Upstash-backed rate limiting in production and fail closed if unavailable. Add stronger limits for OCR, email ingestion, public verification, auth, uploads, and payments.

## Email, OCR, and Document Trust

### 6. Email Authentication Gates

Problem: Email ingestion can trust sender identity too much if it relies on the displayed sender address.

Why fix it: Email can be spoofed. A spoofed invoice could create a fraudulent warranty or assign ownership incorrectly.

Recommendation: Parse inbound email authentication results and require aligned SPF or DKIM before auto-confirming. If alignment is missing, send the item to review.

### 7. Auto-Confirmed Warranty Ownership

Problem: Email-created warranties can be assigned in a way that makes ownership and edit rights inconsistent.

Why fix it: A user might be able to see a warranty but not properly manage it, file claims, or extend it in all expected paths.

Recommendation: Define one canonical ownership model for email-created warranties and enforce it consistently across create, view, edit, claim, transfer, and extension flows.

### 8. OCR Golden Test Corpus

Problem: OCR quality is not measurable without a repeatable test set.

Why fix it: Poor OCR can create wrong warranty dates, products, serial numbers, prices, or merchants. That damages trust and creates support work.

Recommendation: Build a private test corpus of invoices, receipts, Arabic/English/mixed-language documents, poor scans, handwritten samples, and corrupted PDFs. Track extraction accuracy field by field.

### 9. OCR Confidence and Review Queue

Problem: OCR extraction currently needs stronger per-field confidence and review routing.

Why fix it: Not every extracted warranty should be auto-approved. Some documents need human confirmation.

Recommendation: Add per-field confidence, send low-confidence records to review, and create a correction UI with audit history.

### 10. Scalable Duplicate Detection

Problem: Duplicate detection based on scanning old fingerprints will not scale.

Why fix it: As ingestion volume grows, duplicate checks become slow and may miss fraud patterns.

Recommendation: Use indexed hash buckets, normalized invoice keys, normalized serial numbers, and perceptual/fuzzy duplicate detection during ingestion.

### 11. Direct Signed Document Uploads

Problem: Large document uploads are currently risky because they can be buffered through the app server.

Why fix it: Large files can cause memory pressure, failed uploads, slow requests, and higher infrastructure risk.

Recommendation: Move to direct signed uploads into storage, then process files asynchronously.

### 12. Malware Scanning and Metadata Stripping

Problem: Uploaded receipts, invoices, and warranties are untrusted files.

Why fix it: Documents can contain malware, unsafe metadata, or hidden sensitive information.

Recommendation: Scan files, strip unsafe metadata, quarantine suspicious files, and show safe user-facing failure messages.

## Core Product Workflow Fixes

### 13. Stronger Public Verification

Problem: Plain serial/reference verification can be guessed or enumerated.

Why fix it: Public verification should prove authenticity without leaking private records.

Recommendation: Use non-guessable verification tokens in certificates and QR codes. Keep public output minimal.

### 14. Claims Timeline and SLA Workflow

Problem: Claims are currently too basic for serious business operations.

Why fix it: Customers judge warranty platforms by claim resolution, not just record keeping.

Recommendation: Add claim states, timeline events, SLA timers, evidence requests, approvals, rejections, replacements, repairs, and closure tracking.

### 15. Bulk Import Preview and Rollback

Problem: Bulk imports can create messy data if users upload imperfect spreadsheets.

Why fix it: Businesses will import old warranty data. Mistakes at this stage create support issues and distrust.

Recommendation: Add import jobs, validation preview, approve-before-commit, partial error reporting, and rollback/correction.

### 16. Warranty State Machine

Problem: Warranty statuses can become inconsistent without strict transition rules.

Why fix it: Warranties are business records. A warranty should not jump between states in ways that contradict claims, expiration, renewal, or transfer logic.

Recommendation: Define allowed transitions and enforce them in backend code and database constraints where possible.

### 17. Audit Events Everywhere

Problem: Not every important action has a durable audit event.

Why fix it: Enterprise customers need to know who did what, when, from where, and why.

Recommendation: Add audit events for warranty changes, uploads, downloads, OCR corrections, claims, payments, team changes, API tokens, and admin actions.

## API and Integration Uplift

### 18. API Clients Instead of Personal Tokens

Problem: Personal/user API tokens are useful but not enough for enterprise integrations.

Why fix it: ERP, POS, and partner integrations need named clients, scopes, owners, rotation, limits, and usage visibility.

Recommendation: Add tenant-level API clients with scoped tokens, IP allowlists, expiration, rotation, and audit logs.

### 19. API Usage Metering

Problem: API usage is not yet a clear billable/observable product surface.

Why fix it: You cannot confidently sell API access without knowing usage by tenant, client, endpoint, status, and error rate.

Recommendation: Add API request logs, dashboards, limits, alerts, and plan-based usage controls.

### 20. Idempotency for External Creates

Problem: External systems retry failed requests, which can create duplicate warranties.

Why fix it: Integrations need safe retries.

Recommendation: Add idempotency keys scoped by tenant, API client, method, and endpoint. Return the same result for safe retries.

## Payment and Marketplace Readiness

### 21. Stripe Webhook Fulfillment Hardening

Problem: Webhook fulfillment should not rely only on metadata from a payment session.

Why fix it: Payment events affect revenue, extensions, and entitlement. They must be reconciled against internal records.

Recommendation: On webhook, verify extension ID, warranty ID, user/customer, amount, currency, expected price, and current state before fulfilling.

### 22. Payment Reconciliation

Problem: Payment systems and internal records can drift.

Why fix it: Missed, duplicated, failed, refunded, or disputed payments affect money and customer trust.

Recommendation: Add a scheduled reconciliation job comparing Stripe/Moyasar data with internal records.

### 23. Delay Full Marketplace Until Ledger Exists

Problem: A warranty extension marketplace creates financial obligations before the platform has a full ledger and settlement system.

Why fix it: Marketplace payments require refunds, disputes, commissions, provider payouts, taxes, and reconciliation.

Recommendation: Build offer approval, commission ledger, settlement states, refunds, disputes, and tax/VAT fields before a broad marketplace launch.

## Performance and Scaling Uplift

### 24. Search Infrastructure

Problem: Broad `ilike` searching across warranty fields will become slow.

Why fix it: Business users may have thousands or millions of warranties.

Recommendation: Add Postgres full-text/trigram indexing for launch scale and consider a dedicated search service later.

### 25. Paginated Claims and Documents Queries

Problem: Some list flows load warranty IDs first and then query related records.

Why fix it: This pattern breaks when a tenant has many warranties.

Recommendation: Replace with tenant-aware paginated SQL functions or optimized joins.

### 26. Async Job Queue

Problem: OCR, ingestion, bulk imports, notifications, and reconciliation are too heavy for request/response flows.

Why fix it: Long-running work causes timeouts, slow UX, and hard-to-recover failures.

Recommendation: Add job queues with status, retries, dead-letter handling, and admin visibility.

### 27. Analytics Rollups

Problem: Live analytics queries become expensive as data grows.

Why fix it: Dashboards must stay fast even when warranty volume grows.

Recommendation: Precompute daily tenant/product/vendor/status metrics and use rollups for dashboards.

## Product and Revenue Uplift

### 28. Tenant Onboarding Wizard

Problem: Business users may not know the best first steps.

Why fix it: A confused new user is less likely to convert.

Recommendation: Add guided setup for company, domain verification, team invites, import, API token, and branding.

### 29. Asset Lifecycle Timeline

Problem: Warrantee risks being perceived as only a warranty tracker.

Why fix it: The larger opportunity is asset lifecycle management.

Recommendation: Add asset timelines covering purchase, warranty, documents, claims, repairs, replacements, extensions, recalls, and transfers.

### 30. Vendor and Product Reliability Intelligence

Problem: Warranty data becomes much more valuable when normalized across vendors and products.

Why fix it: Reliability insights can support enterprise decisions, underwriting, and vendor performance management.

Recommendation: Normalize vendors/products and track claim rate, failure category, response time, warranty duration, and repeat issues.

### 31. Recall Management

Problem: The platform does not yet manage recall events.

Why fix it: Recall alerts are a natural extension of warranty and asset data.

Recommendation: Add recalls by product/model/serial range/manufacturer/country/severity, then notify affected users or tenants.

### 32. Warranty Policy Templates

Problem: Manually entered warranty terms can be inconsistent.

Why fix it: Sellers need repeatable policies for scale and cleaner certificates.

Recommendation: Add reusable policy templates for coverage, exclusions, claim window, repair/replacement rules, and extension eligibility.

## UX, Trust, and Brand Uplift

### 33. Trust and Security Page

Problem: Users may not immediately understand how Warrantee protects documents, verification, API access, and business records.

Why fix it: Trust is essential for warranty, receipt, and company data.

Recommendation: Add a trust/security page and link it from pricing, API docs, signup, and footer.

### 34. Better Empty States and Guided Actions

Problem: Empty dashboards can feel unfinished.

Why fix it: Users need a clear next action to reach value quickly.

Recommendation: Add contextual empty states for upload receipt, import warranties, invite seller, create API token, verify certificate, or file a claim.

### 35. Certificate Brand Alignment

Problem: Certificate styling can drift from the current website brand.

Why fix it: Certificates are customer-facing trust artifacts.

Recommendation: Update certificate colors, typography, spacing, and verification CTA to match the live Warrantee brand.

### 36. Arabic and RTL QA

Problem: Arabic behavior must be tested across full workflows, not only page rendering.

Why fix it: Saudi/GCC users will judge the product heavily through Arabic quality and RTL correctness.

Recommendation: Test signup, warranty creation, document upload, claim submission, payment, certificate, public verification, and dashboard on desktop/mobile in Arabic and English.

## Enterprise and Compliance Uplift

### 37. Data Retention and Deletion Controls

Problem: Raw emails, OCR text, documents, and audit records may contain sensitive data.

Why fix it: Businesses and regulators expect clear retention and deletion rules.

Recommendation: Define retention windows and implement export/delete workflows for personal and business data.

### 38. Compliance Export

Problem: Enterprise buyers often need evidence and exportable records.

Why fix it: Audits, disputes, and procurement reviews need structured data.

Recommendation: Add tenant exports for audit logs, warranties, claims, document metadata, API usage, and team history.

### 39. SSO Architecture Later

Problem: Enterprise customers may require SSO, but adding it too early can create rework.

Why fix it: SSO depends on clean tenant membership and roles.

Recommendation: Plan SAML/OIDC after the tenant model is fixed.

### 40. Data Residency Strategy Later

Problem: Global, government, insurance, and regulated customers may require regional data controls.

Why fix it: Data residency can affect architecture, storage, backups, logs, and vendors.

Recommendation: Document a future regional deployment strategy before pursuing regulated enterprise deals.

## Recommended First Approval Batch

Approve these first because they reduce the most risk without requiring the full future rebuild:

1. Remove legacy static API token.
2. Require distributed production rate limiting.
3. Add email authentication gates before auto-confirm.
4. Fix email-created warranty ownership.
5. Reduce document upload memory risk.
6. Harden Stripe webhook fulfillment.
7. Add API security headers wrapper.
8. Add audit events for documents, payments, team actions, and API tokens.

## Recommended Second Approval Batch

Approve these next because they turn Warrantee into a real B2B/enterprise platform:

1. Add tenants and tenant memberships.
2. Replace email-domain bootstrap with verified company onboarding.
3. Convert API tokens to tenant API clients.
4. Update RLS around tenant access.
5. Add cross-tenant regression tests.

## Recommended Third Approval Batch

Approve these after the trust model is safer:

1. Claims timeline and SLA workflow.
2. Bulk import preview and rollback.
3. Asset lifecycle timeline.
4. Vendor/product normalization.
5. Warranty policy templates.
