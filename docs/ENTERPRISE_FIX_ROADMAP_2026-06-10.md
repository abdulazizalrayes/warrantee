# Warrantee.io Proposed Fixes, Enhancements, and Uplifts

Date: 2026-06-10  
Scope: Warrantee.io only  
Source audit: `docs/ENTERPRISE_AUDIT_2026-06-10.md`

## Executive Principle

Do not expand Warrantee into marketplace, underwriting, insurance, recall, or enterprise sales until the core platform is tenant-safe, document-safe, fraud-aware, auditable, and operationally measurable.

The right sequence is:

1. Protect trust boundaries.
2. Stabilize core workflows.
3. Improve buyer/seller/admin usability.
4. Add scalable infrastructure.
5. Then expand into higher-revenue enterprise and marketplace products.

## Priority 1 - Critical Security and Tenant Fixes

### 1. Add First-Class Tenants and Tenant Memberships

Proposed fix:

- Add a real `tenants` or `companies` table.
- Add `tenant_memberships` with `tenant_id`, `user_id`, `role`, `status`, `invited_by`, `accepted_at`.
- Add `tenant_id` to warranties, claims, documents, extensions, API clients, audit events, invitations, and future asset records.
- Resolve active tenant context on every protected request.
- Update RLS policies to check tenant membership, not only scattered user ownership fields.

Why:

- Current access logic is user-centric and spread across fields like `user_id`, `created_by`, `recipient_user_id`, `buyer_id`, `seller_id`, and `issuer_user_id`.
- That works for MVP usage, but it is fragile for SMB teams, enterprise clients, government customers, insurers, and multi-branch sellers.

Benefit:

- Prevents cross-tenant leakage.
- Makes enterprise sales credible.
- Enables company dashboards, branch roles, audit logs, API clients, and billing per tenant.

### 2. Remove Email-Domain-Based Admin Bootstrap

Proposed fix:

- Stop assigning company/admin access based only on inferred email domain.
- Require verified company ownership through one of:
  - DNS TXT verification
  - admin-approved invite
  - verified business email domain workflow
  - manual internal approval for early enterprise accounts

Why:

- Email domain inference is convenient but not enterprise-safe.
- Domains can be shared, mistyped, acquired, or abused.

Benefit:

- Prevents accidental or malicious team access.
- Creates a clean onboarding path for serious business customers.

### 3. Make Roles Tenant-Scoped

Proposed fix:

- Keep platform roles separate from tenant roles.
- Use global roles only for Warrantee internal staff.
- Use tenant roles for customer teams: owner, admin, manager, support, viewer, API-only.

Why:

- A user can be an admin in one company and a viewer in another.
- Current global profile-role behavior cannot safely model that.

Benefit:

- Safer B2B collaboration.
- Better fit for enterprise and reseller workflows.

### 4. Remove Legacy Static API Token Path

Proposed fix:

- Remove or permanently disable the legacy `WARRANTEE_API_INTEGRATION_TOKEN` fallback.
- Require generated hashed API tokens only.
- Add tenant-scoped API clients, scopes, usage logs, and revocation.

Why:

- Static shared tokens are hard to rotate, audit, limit, and attribute.

Benefit:

- Safer integrations.
- Clear accountability per client/system.
- Better enterprise API story.

### 5. Require Distributed Rate Limiting in Production

Proposed fix:

- Require Redis/Upstash-backed rate limits in production.
- Fail closed if distributed rate limiting is unavailable.
- Add stricter limits for OCR, email ingestion, verification, auth, uploads, and payments.

Why:

- In-memory rate limits do not protect distributed serverless deployments.

Benefit:

- Better DDoS resistance.
- Lower abuse and cost risk.

## Priority 2 - Email, OCR, and Document Trust

### 6. Add Email Authentication Gates

Proposed fix:

- Parse inbound email authentication results.
- Require aligned SPF or DKIM before auto-confirming warranties.
- Treat unauthenticated email as pending review.
- Preserve manual review for seller-forwarded or ambiguous emails.

Why:

- A matching `From` address alone is not enough to prove sender identity.

Benefit:

- Prevents spoofed invoices from creating fraudulent warranties.
- Improves trust in email-based registration.

### 7. Fix Auto-Confirmed Warranty Ownership

Proposed fix:

- Ensure auto-confirmed warranties assign ownership fields consistently.
- Decide the canonical owner model:
  - consumer-owned warranty
  - seller-issued warranty
  - tenant-owned business asset
- Update mutation access checks accordingly.

Why:

- Current email-created warranty ownership can become viewable but not editable in some paths.

Benefit:

- Fewer support tickets.
- Better user confidence.
- Cleaner claims and extension workflows.

### 8. Build OCR Golden Test Corpus

Proposed fix:

- Create a private test set of invoices, receipts, warranties, PDFs, poor scans, Arabic receipts, English receipts, mixed-language documents, corrupted PDFs, and handwritten samples.
- Score extraction by field:
  - product name
  - merchant
  - serial number
  - purchase date
  - warranty term
  - price
  - currency
  - customer
- Track provider accuracy and cost.

Why:

- OCR quality cannot be trusted by feeling. It needs repeatable evidence.

Benefit:

- Safer automation.
- Lower manual review cost.
- Better provider decisions.

### 9. Add OCR Confidence and Review Queue

Proposed fix:

- Assign per-field confidence.
- Auto-confirm only high-confidence, authenticated, non-duplicate documents.
- Send uncertain documents to review.
- Add correction UI and audit trail.

Why:

- One wrong date or serial number can break claims, extensions, and verification.

Benefit:

- Protects trust.
- Lets humans correct AI safely.
- Creates training data for future automation.

### 10. Replace Simhash O(N) Duplicate Detection

Proposed fix:

- Use locality-sensitive hash buckets or indexed fingerprint columns.
- Run duplicate checks during ingestion, not only store fingerprints.
- Normalize invoice numbers, serials, merchant names, and dates.

Why:

- Scanning every old attachment will not scale.

Benefit:

- Better fraud detection.
- Faster ingestion at scale.

### 11. Move Document Uploads to Direct Signed Upload

Proposed fix:

- Reduce API upload size.
- Use signed upload URLs to Supabase Storage or another object store.
- Process uploads asynchronously.
- Scan files before making them downloadable.

Why:

- Large uploads currently risk memory spikes and poor reliability.

Benefit:

- Better performance.
- Lower outage risk.
- Cleaner mobile upload experience.

### 12. Add Malware Scanning and Metadata Stripping

Proposed fix:

- Scan uploaded files.
- Strip unsafe metadata.
- Quarantine suspicious files.
- Show safe failure reasons to users/admins.

Why:

- Warranty documents are untrusted user input.

Benefit:

- Reduces security risk.
- Increases enterprise confidence.

## Priority 3 - Core Product Workflow Fixes

### 13. Strengthen Public Verification

Proposed fix:

- Move from plain serial/reference lookup to proof-token verification.
- Certificates and QR codes should include a non-guessable verification token.
- Public response should remain minimal.

Why:

- Serial numbers and references can be guessed or enumerated.

Benefit:

- Stronger public product passport.
- Better trust with buyers, sellers, and regulators.

### 14. Add Claims Timeline and SLA Workflow

Proposed fix:

- Add claim events:
  - submitted
  - received
  - evidence requested
  - approved
  - rejected
  - replacement issued
  - repair scheduled
  - closed
- Add SLA timers and notification triggers.

Why:

- Claims are where users judge whether the platform is serious.

Benefit:

- More enterprise-ready.
- Better customer experience.
- Creates data for vendor reliability intelligence.

### 15. Add Bulk Import Preview and Rollback

Proposed fix:

- Parse CSV/XLSX into an import job.
- Show validation preview.
- Let user approve before commit.
- Support rollback or correction.

Why:

- Business customers will import messy data.

Benefit:

- Reduces errors.
- Makes onboarding safer.
- Improves sales conversion for businesses with existing spreadsheets.

### 16. Improve Warranty State Machine

Proposed fix:

- Define allowed status transitions.
- Separate self-created, seller-issued, pending review, active, expired, claimed, transferred, revoked, and renewed states.
- Enforce transitions in backend, not just UI.

Why:

- Warranties become business/legal records.

Benefit:

- Fewer contradictions.
- Better auditability.
- Safer claims and extensions.

### 17. Add Audit Events Everywhere

Proposed fix:

- Log key events:
  - warranty created/updated/deleted
  - document uploaded/downloaded
  - OCR corrected
  - claim changed
  - API token created/revoked
  - payment completed/refunded
  - team member added/removed
  - admin action

Why:

- Enterprise customers need evidence of who did what and when.

Benefit:

- Stronger compliance.
- Easier debugging.
- Better support and dispute handling.

## Priority 4 - API and Integration Uplift

### 18. Convert API Tokens into API Clients

Proposed fix:

- Add `api_clients`.
- Add scoped tokens per client.
- Add scopes such as:
  - `warranties:read`
  - `warranties:write`
  - `claims:read`
  - `claims:write`
  - `documents:read`
  - `verify:read`
- Add IP allowlists and optional webhook signing.

Why:

- Enterprise integrations require more than a personal token.

Benefit:

- Safer ERP/POS integrations.
- Better monetization.
- Lower support risk.

### 19. Add API Usage Metering

Proposed fix:

- Store API request logs by tenant/client/endpoint/status.
- Show usage in dashboard.
- Enforce plan limits.

Why:

- You cannot sell an API without usage visibility.

Benefit:

- Enables paid API tiers.
- Helps detect abuse.
- Improves customer support.

### 20. Add Idempotency for External Creates

Proposed fix:

- Add an idempotency table keyed by tenant, API client, idempotency key, method, endpoint.
- Store response hash/status.

Why:

- Integrations retry requests. Retried creates must not duplicate warranties.

Benefit:

- Cleaner ERP/POS integrations.
- Fewer duplicate warranties.

## Priority 5 - Payment and Marketplace Readiness

### 21. Harden Stripe Webhook Fulfillment

Proposed fix:

- On webhook, re-fetch extension/warranty/user/customer from database.
- Verify amount, currency, product, extension ID, warranty ID, Stripe customer, and expected status.
- Use idempotent transaction behavior.

Why:

- Payment metadata should not be the only source of truth.

Benefit:

- Prevents incorrect extension activation.
- Makes revenue events auditable.

### 22. Add Payment Reconciliation

Proposed fix:

- Scheduled job compares Stripe/Moyasar payments with internal records.
- Flag missing, duplicate, failed, refunded, or disputed payments.

Why:

- Payment systems eventually disagree unless reconciled.

Benefit:

- Cleaner finance operations.
- Better readiness for marketplace commissions.

### 23. Delay Full Marketplace Until Ledger Exists

Proposed fix:

- Before marketplace launch, add:
  - offer approval
  - provider contracts
  - commission ledger
  - settlement states
  - refund/dispute handling
  - tax/VAT fields

Why:

- Marketplace payments create financial and regulatory obligations.

Benefit:

- Avoids expensive operational mistakes.

## Priority 6 - Performance and Scaling Uplift

### 24. Replace Broad Search with Search Infrastructure

Proposed fix:

- Add Postgres full-text/trigram indexes for launch scale.
- Later consider dedicated search for global scale.

Why:

- `ilike` across many fields will become slow.

Benefit:

- Faster dashboards.
- Better user experience.

### 25. Replace Claims/Documents Listing with Paginated RPCs

Proposed fix:

- Query claims/documents through tenant-aware paginated SQL functions or direct joins.
- Avoid loading all warranty IDs into the app layer.

Why:

- Users with thousands of warranties will break current list patterns.

Benefit:

- Scales to business accounts.

### 26. Add Async Job Queue

Proposed fix:

- Queue OCR, email ingestion, fraud checks, notifications, bulk import, and reconciliation.
- Store job status and retry counts.

Why:

- Long-running work does not belong in user-facing request cycles.

Benefit:

- Faster app.
- Better reliability.
- Easier failure recovery.

### 27. Add Analytics Rollups

Proposed fix:

- Precompute dashboard metrics by tenant/day/product/vendor/status.
- Avoid expensive live aggregation.

Why:

- Analytics become slow at scale.

Benefit:

- Faster dashboards.
- Enables reliability intelligence.

## Priority 7 - Product and Revenue Uplift

### 28. Add Tenant Onboarding Wizard

Proposed fix:

- Guide business users through:
  - company setup
  - domain verification
  - team invitation
  - first warranty import
  - API token creation
  - certificate branding

Why:

- Conversion improves when the path to value is obvious.

Benefit:

- Higher activation.
- Lower support.

### 29. Add Asset Lifecycle Timeline

Proposed fix:

- Each product/asset should have a timeline:
  - purchased
  - warranty started
  - document attached
  - claim filed
  - repair/replacement
  - extension purchased
  - recall alert
  - transferred/sold

Why:

- This moves Warrantee beyond “warranty tracker” into asset lifecycle management.

Benefit:

- Stronger differentiation.
- Better B2B value.

### 30. Add Vendor and Product Reliability Intelligence

Proposed fix:

- Normalize vendors/products.
- Track claim rates, failure categories, warranty durations, response times, repeat issues.
- Show internal reliability insights first.

Why:

- This is where the data becomes valuable.

Benefit:

- Enterprise differentiation.
- Future underwriting and insurance value.

### 31. Add Recall Management

Proposed fix:

- Add recall records by product, model, serial range, manufacturer, country, severity, and recommended action.
- Notify affected users/tenants.

Why:

- Recall management is a natural expansion from warranty data.

Benefit:

- Higher-value enterprise use case.
- Better consumer safety.

### 32. Add Warranty Policy Templates

Proposed fix:

- Let sellers create reusable policy templates:
  - coverage term
  - exclusions
  - claim window
  - repair/replacement rules
  - extension eligibility

Why:

- Manual warranty terms create inconsistency.

Benefit:

- Easier seller onboarding.
- Better certificate consistency.

## Priority 8 - UX, Trust, and Brand Uplift

### 33. Make Trust Visible

Proposed fix:

- Add a trust/security page.
- Explain verification, privacy, document security, API security, and business controls.
- Add links from pricing, API docs, and signup.

Why:

- Warranty and document platforms require confidence before conversion.

Benefit:

- Better sales conversion.
- Better enterprise credibility.

### 34. Improve Empty States and Guided Actions

Proposed fix:

- For each empty dashboard area, show the next best action:
  - upload receipt
  - import warranties
  - invite seller
  - create API token
  - verify certificate

Why:

- Empty dashboards feel unfinished.

Benefit:

- Higher activation and retention.

### 35. Align Certificates with Current Brand

Proposed fix:

- Update certificate colors, typography, layout, and verification CTA to match current Warrantee branding.

Why:

- Certificates are customer-facing trust documents.

Benefit:

- More professional output.
- Better brand consistency.

### 36. Strengthen Arabic and RTL QA

Proposed fix:

- Test every core journey in English and Arabic:
  - signup
  - create warranty
  - upload document
  - email ingestion review
  - claim submission
  - payment
  - certificate
  - public verification

Why:

- Saudi/GCC users will judge the product heavily through Arabic quality.

Benefit:

- Better local trust.
- Higher conversion.

## Priority 9 - Enterprise and Compliance Uplift

### 37. Add Data Retention and Deletion Controls

Proposed fix:

- Define retention windows for raw emails, documents, OCR text, audit logs, inactive accounts, and deleted warranties.
- Add deletion/export workflows.

Why:

- Documents and receipts contain personal and commercial data.

Benefit:

- Better compliance posture.
- Safer enterprise conversations.

### 38. Add Compliance Export

Proposed fix:

- Export tenant audit logs, warranties, claims, documents metadata, API usage, and team history.

Why:

- Enterprise buyers often ask for auditability.

Benefit:

- Improves procurement readiness.

### 39. Add SSO Architecture Later

Proposed fix:

- Plan for SAML/OIDC SSO for enterprise plans.
- Do not build it before tenant roles are fixed.

Why:

- SSO depends on clean tenant membership.

Benefit:

- Future enterprise sales without rework.

### 40. Add Data Residency Strategy Later

Proposed fix:

- Plan for regional deployment/data residency if selling globally or to government/regulated industries.

Why:

- Insurance, government, and enterprise customers may require regional controls.

Benefit:

- Strategic readiness.

## What To Do First

### Immediate Fix Batch

Do these before heavy growth:

1. Remove legacy static API token path.
2. Require distributed rate limiting in production.
3. Add email SPF/DKIM/DMARC alignment before auto-confirm.
4. Fix auto-confirmed warranty ownership/mutation rights.
5. Reduce document upload memory risk.
6. Harden Stripe webhook amount/ownership verification.
7. Add API security headers wrapper.
8. Add audit events for documents, payments, team actions, and API tokens.

Why this batch:

- It directly reduces security, fraud, support, and reliability risk.
- It does not require the full future product rebuild.
- It protects the launch while preserving momentum.

### Next Architecture Batch

Do these before enterprise/API-heavy sales:

1. Add tenants and tenant memberships.
2. Convert company/team flows to verified tenant membership.
3. Convert API tokens to tenant API clients.
4. Update RLS policies around tenant access.
5. Add cross-tenant automated tests.

Why this batch:

- It is the foundation for SMB, enterprise, government, API clients, and future marketplace work.

### Next Product Batch

Do these after the trust model is safe:

1. Claims timeline and SLA workflow.
2. Bulk import preview/rollback.
3. Asset lifecycle timeline.
4. Vendor/product normalization.
5. Warranty policy templates.

Why this batch:

- These features increase customer value and revenue potential without jumping too early into regulated insurance/underwriting complexity.

## What To Avoid For Now

Avoid:

- Full warranty marketplace before ledger/settlement/refund/dispute controls.
- Insurance partnership workflows before policy and audit models exist.
- Underwriting before reliability data is normalized and trustworthy.
- Government sales claims before tenant isolation, audit logs, compliance exports, and data retention are stronger.
- Adding many visual pages before core trust and workflow issues are fixed.
- Auto-confirming uncertain OCR/email ingestion cases.

Why:

- These areas create legal, financial, support, and trust exposure if built on top of weak foundations.

## Final Recommendation

The best next move is not more marketing polish. It is a focused hardening sprint.

Recommended first sprint name:

`Enterprise Core Trust Hardening`

Sprint outcome:

- No weak legacy API token.
- Distributed production rate limiting required.
- Email ingestion cannot auto-confirm spoofable senders.
- Uploaded documents are safer.
- Stripe extension fulfillment is reconciled.
- Key business actions are auditable.
- The team/company model has a clear path toward tenant-grade architecture.

This is the shortest practical path from “promising SaaS” to “credible infrastructure product.”
