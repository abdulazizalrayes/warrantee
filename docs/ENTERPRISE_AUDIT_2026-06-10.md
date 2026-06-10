# Warrantee.io Enterprise Software Audit

Date: 2026-06-10  
Scope: Warrantee.io repository only  
Repository: `/Users/abdulazizalrayes/Documents/New project/warrantee`

## Executive Position

Warrantee is a strong early-stage SaaS foundation, but it is not yet enterprise-grade for global multi-tenant warranty, claims, recall, underwriting, marketplace, insurance, and asset lifecycle operations.

The current platform is operationally credible for controlled SMB launch usage if monitored carefully. The main blocker to enterprise readiness is not the frontend polish. It is the domain model: the system is still centered on user-owned warranties with ad hoc company/team behavior, not a formal tenant, asset, policy, vendor, recall, underwriting, and claims operating model.

The most important near-term theme is: harden core trust boundaries before expanding marketplace, underwriting, insurance, API, or government use cases.

## Verification Performed

Passed:

- `npm run guard:loopback`
- `npm audit --omit=dev --json`
- `npm test -- src/lib/__tests__/api-v1.test.ts --reporter=dot`
- `npm test -- src/lib/__tests__/ingestion-attachments.test.ts --reporter=dot`
- `npm test -- src/lib/__tests__/warranty-access.test.ts --reporter=dot`
- `npm test -- src/lib/__tests__/profile-role-hardening.test.ts --reporter=dot`

Blocked or limited:

- Authenticated production E2E could not be fully executed from this shell because production secrets and E2E credentials are not present.
- Live Stripe, Supabase production mutation, Resend webhook replay, Mistral/Google OCR, and real browser purchase flows were not executed.
- A broad multi-file Vitest run previously hung; targeted tests were used instead.
- This is a single-agent code audit. It did not use external penetration testing infrastructure, real traffic traces, or database production EXPLAIN plans.

## Phase 1 - Repository Review

### Architecture Map

| Area | Implementation | Assessment |
|---|---|---|
| Web application | Next.js App Router, localized `/en` and `/ar` routes | Good modern baseline |
| Auth | Supabase Auth through server clients and middleware | Good baseline, needs enterprise tenant model |
| Database | Supabase Postgres with RLS migrations | Good MVP baseline, insufficient formal multi-tenancy |
| Storage | Supabase Storage for warranty documents and ingestion files | Needs stricter private-file posture and upload architecture |
| Payments | Stripe checkout/webhook plus Moyasar extension path | Good start, webhook reconciliation needs more defense-in-depth |
| Email | Resend inbound webhook for email-based ingestion | Useful differentiator, needs spoofing/authentication safeguards |
| OCR | PDF text extraction, Mistral, Google, Tesseract-style local fallback | Good launch path, needs benchmark suite and review queue |
| Public verification | Public API with rate limiting and minimal fields | Good, but needs enumeration resistance and proof model |
| API | User-scoped API tokens and `/api/v1/warranties` | Useful, but not tenant-scoped enterprise API yet |
| Monitoring | Sentry, health, production gates, readiness scripts | Good, but some health semantics expose too much |
| SEO/GEO/AEO | llms.txt, agent-card, API catalog, hreflang/schema work | Strong foundation |

### Major Modules

| Module | Important Files | Purpose | Main Risk |
|---|---|---|---|
| Warranty CRUD | `src/app/api/warranties/route.ts`, `src/app/api/warranties/[id]/route.ts` | Core warranty records | Search, validation, overfetching, ownership race hardening |
| Claims | `src/app/api/claims/route.ts` | File and list claims | Loads all visible warranty IDs; scaling risk |
| Documents | `src/app/api/warranties/[id]/documents/route.ts`, `src/app/api/documents/[id]/download/route.ts` | Upload and download evidence | Large memory upload and public URL posture |
| Email ingestion | `src/app/api/ingest/email/route.ts`, `src/lib/ingestion/*` | Register warranties from emails and attachments | Spoofing, duplicate detection, auto-confirm logic |
| OCR | `src/app/api/ocr/route.ts`, `src/lib/ingestion/ocr-pipeline.ts` | Extract fields from invoices/receipts | No golden benchmark corpus; duplicate extraction logic |
| API tokens | `src/app/api/integration-tokens/*`, `src/lib/api-v1.ts` | External system access | Per-user tokens, legacy static token, no tenant scopes |
| Team/admin | `src/app/api/team/members/route.ts`, `src/app/api/admin/*` | Team and admin workflows | Domain bootstrap and global role model |
| Payments | `src/app/api/payments/create/route.ts`, `src/app/api/stripe/webhook/route.ts` | Extension purchases and subscriptions | Metadata and amount verification gaps |
| RLS | `supabase/migrations/*lock_down_warranty_rls.sql` | Database isolation | Implicit nested-RLS assumptions |
| Security perimeter | `middleware.ts`, `src/lib/rate-limit.ts`, `src/lib/request-origin.ts` | Headers, origin checks, rate limits | API headers inconsistent; rate limits memory fallback |

## Phase 2 - Major File Review

Scores are 1-10, where 10 is excellent.

| File | Purpose | Maint. | Sec. | Scale | Perf. | Key Finding |
|---|---:|---:|---:|---:|---:|---|
| `src/app/api/ingest/email/route.ts` | Inbound email warranty registration | 6 | 5 | 5 | 6 | Auto-confirm trust depends too much on sender match |
| `src/lib/ingestion/sender-matcher.ts` | Match sender/CC/domain to users | 7 | 5 | 6 | 7 | No SPF/DKIM/DMARC alignment gate |
| `src/lib/ingestion/fraud-detection.ts` | Duplicate/fraud checks | 6 | 6 | 3 | 3 | Simhash duplicate check is O(N) and not active in flow |
| `src/lib/ingestion/ocr-pipeline.ts` | OCR orchestration | 6 | 6 | 5 | 5 | Needs corpus tests and review thresholds |
| `src/app/api/ocr/route.ts` | User OCR endpoint | 6 | 6 | 5 | 5 | Duplicate extraction logic from ingestion path |
| `src/app/api/warranties/route.ts` | Warranty list/create | 7 | 6 | 4 | 4 | Broad `ilike` search and exact count will degrade |
| `src/app/api/warranties/[id]/route.ts` | Warranty detail/update/delete | 6 | 6 | 5 | 5 | Overfetches nested data and mutation query lacks final ACL filter |
| `src/app/api/warranties/bulk-import/route.ts` | CSV/XLSX import | 6 | 6 | 4 | 4 | Partial imports, sequential writes, no job transaction |
| `src/app/api/warranties/[id]/documents/route.ts` | Document upload/list | 5 | 5 | 3 | 2 | 250MB in-memory upload and public URL posture |
| `src/app/api/documents/[id]/download/route.ts` | Signed downloads | 7 | 7 | 6 | 6 | Good access check; add audit and shorter TTL by sensitivity |
| `src/app/api/claims/route.ts` | Claims list/create | 7 | 6 | 4 | 4 | Fetches all warranty IDs before claim query |
| `src/app/api/v1/warranties/route.ts` | External warranties API | 7 | 7 | 5 | 5 | User-scoped, not tenant-scoped; count/page risk |
| `src/app/api/v1/warranties/[id]/route.ts` | External warranty item API | 7 | 7 | 5 | 5 | Add ACL filter to final mutations |
| `src/lib/api-v1.ts` | API auth/tokens | 7 | 6 | 6 | 7 | Legacy static bearer token should be removed |
| `src/app/api/integration-tokens/route.ts` | Token management | 8 | 7 | 6 | 7 | Good baseline; missing tenant scopes/IP allowlist |
| `src/app/api/payments/create/route.ts` | Extension checkout | 7 | 7 | 6 | 6 | Good same-origin return URLs; amount needs integer normalization |
| `src/app/api/stripe/webhook/route.ts` | Stripe webhook handling | 7 | 7 | 6 | 6 | Verify metadata ownership, price, amount, currency before fulfillment |
| `src/app/api/team/members/route.ts` | Team management | 4 | 4 | 3 | 4 | Domain bootstrap and global roles are not enterprise-safe |
| `src/app/api/admin/team/role/route.ts` | Platform role assignment | 7 | 7 | 6 | 6 | Good super-admin gate; keep audit strict |
| `src/app/api/admin/ingestion/route.ts` | Admin ingestion review | 6 | 6 | 5 | 5 | Uses normal client after admin check; search filter needs hardening |
| `src/app/api/health/route.ts` | Health checks | 7 | 6 | 7 | 7 | Public deep DB status should be split from private health |
| `src/app/api/v1/warranties/verify/route.ts` | Public warranty verification | 8 | 7 | 5 | 5 | Minimal fields good; serial lookup can enumerate |
| `src/app/api/certificates/generate/route.ts` | Certificate HTML generation | 6 | 6 | 5 | 6 | Admin update after RLS read lacks final ACL filter |
| `src/lib/rate-limit.ts` | Rate limiting | 7 | 6 | 4 | 7 | In-memory fallback is not DDoS-grade |
| `middleware.ts` | Routing/security headers | 8 | 6 | 8 | 8 | API routes are excluded from centralized headers |
| `src/lib/warranty-access.ts` | User access predicates | 7 | 6 | 4 | 7 | User-field ACL is not sufficient for enterprise tenancy |
| `supabase/migrations/20260520142000_lock_down_warranty_rls.sql` | Warranty RLS | 7 | 7 | 5 | 6 | Relies on implicit nested RLS for child records |
| `supabase/migrations/20260604130000_operational_support_schema.sql` | Support/team schema | 6 | 5 | 4 | 5 | `company_members.company_id` is text without company FK |
| `supabase/migrations/20260604140412_api_integration_tokens.sql` | API token schema | 8 | 7 | 6 | 7 | Good hash-only storage; needs tenant/API audit model |

## Phase 3 - Email Ingestion Audit

### Failure Modes

| Failure Mode | Current Exposure | Safeguard |
|---|---|---|
| Spoofed From address | High if provider payload lacks enforced SPF/DKIM/DMARC alignment checks | Parse `Authentication-Results`; require aligned SPF or DKIM before auto-confirm |
| Seller sends invoice to wrong CC | Medium | Require buyer confirmation before ownership assignment |
| Duplicate invoice image | Partially covered by file hash | Add perceptual hash and normalized invoice key |
| Duplicate invoice text | Weak; simhash check is O(N) and not active | Bucketed LSH/indexed simhash and call it during ingestion |
| Multiple invoices in one email | Weak | Split document pages and create review bundle |
| OCR wrong merchant/product/date | Medium | Field-level confidence, human review threshold, correction UI |
| Corrupted PDF/image | Medium | Explicit failed attachment status and user-facing retry |
| Huge attachment | 20MB ingestion limit is reasonable | Keep hard limit; reject decompression bombs |
| Fraudulent warranty period | Partially covered | Vendor/product policy constraints and anomaly scoring |
| Malicious attachment | Medium | Virus scanning/sandboxing before storage exposure |
| PII retention in raw payload | Medium | Redact/minimize raw email fields and define retention |
| Wrong language extraction | Medium | Language detection and locale-specific parsers |

### Exact Fixes

- `src/app/api/ingest/email/route.ts:50-63`: require a verified inbound provider signature and extract email-auth headers.
- `src/app/api/ingest/email/route.ts:104-156`: block auto-confirm unless SPF/DKIM/DMARC alignment passes and trust source is strong.
- `src/lib/ingestion/sender-matcher.ts:36-58`: do not treat exact sender email as sufficient by itself.
- `src/lib/ingestion/fraud-detection.ts:232-249`: replace O(N) simhash scan with indexed LSH buckets.
- `src/app/api/ingest/email/route.ts:429-453`: set ownership fields consistently or adjust mutation ACL so auto-confirmed recipient warranties are editable by the rightful owner.

## Phase 4 - OCR & Document Processing Audit

| Test Case | Current Expected Result | Weakness | Safeguard |
|---|---|---|---|
| Clean PDF with embedded text | Good | Regex extraction may miss fields | Add invoice-layout parser |
| Scanned receipt | Depends on OCR provider | No benchmark data | Golden corpus with pass/fail thresholds |
| Poor scan/skew/blur | Risky | No image preprocessing pipeline | Deskew, contrast, denoise, retry |
| Multiple invoices in one PDF | Risky | Could merge fields incorrectly | Page segmentation and review bundle |
| Arabic receipt | Medium | Mixed parser quality | Arabic-specific field extraction and date parsing |
| Japanese/Chinese receipt | Unknown | Not benchmarked | Provider benchmark before language rollout |
| Handwritten notes | Weak | OCR likely unreliable | Mark low confidence; never auto-confirm |
| Corrupted PDF | Should fail | Error classification not rich | User-facing retry reason |
| Image with malicious metadata | Unknown | No scanning step | Strip metadata and virus scan |

## Phase 5 - Database Audit

### Current Strengths

- RLS is present for core warranty tables.
- API tokens are hash-only.
- Storage policies restrict user-owned upload paths.
- Operational tables and support/ticket schema exist.

### Scaling Simulation

| Scale | Expected Behavior | Risk |
|---|---|---|
| 100,000 assets | Mostly workable with indexes and modest traffic | Exact counts and broad search start hurting |
| 1 million assets | Search, claims listing, documents listing, admin review degrade | Need full-text/search service, tenant indexes, async jobs |
| 100 million assets | Current model is not suitable | Need tenant partitioning/sharding, warehouse, event bus, asset identity model |

### Required Data Model Evolution

Add first-class tables for:

- `tenants`
- `tenant_memberships`
- `assets`
- `asset_events`
- `products`
- `manufacturers`
- `vendors`
- `warranty_policies`
- `coverage_terms`
- `claims`
- `claim_events`
- `recalls`
- `underwriting_quotes`
- `insurance_policies`
- `marketplace_offers`
- `audit_events`
- `api_clients`

## Phase 6 - Security Audit

### Critical / High Findings

| Severity | File:Line | Finding | Exact Fix |
|---|---|---|---|
| High | `src/app/api/team/members/route.ts:74-110` | Company admin bootstrap by inferred email domain is not enterprise-safe | Require verified tenant/domain ownership and explicit invite/approval |
| High | `src/app/api/team/members/route.ts:165-187` | Domain bootstrap can promote users based on weak company inference | Remove auto-promotion; use tenant membership table |
| High | `src/app/api/warranties/[id]/documents/route.ts:19,79-86` | 250MB in-memory document upload can exhaust memory/cost | Reduce limit and move to signed direct upload with async scan |
| High | `src/app/api/ingest/email/route.ts:104-156` | Email auto-confirm can trust sender identity too strongly | Require aligned SPF/DKIM/DMARC plus duplicate/fraud checks |
| High | `src/lib/api-v1.ts:142-171` | Legacy static integration token path is powerful and hard to govern | Remove legacy token before enterprise API launch |
| High | `src/lib/rate-limit.ts` | In-memory fallback is not distributed DDoS protection | Require Redis/Upstash in production and configure edge firewall |
| Medium-High | `src/app/api/stripe/webhook/route.ts:189-220` | Extension fulfillment does not fully re-verify amount/currency/user ownership | Verify extension, warranty, user, Stripe customer, amount, and currency |
| Medium-High | `middleware.ts` | API routes do not inherit centralized security headers | Add API response wrapper/security headers across APIs |
| Medium-High | `supabase/migrations/20260604130000_operational_support_schema.sql:42-52` | Company membership lacks real company FK/domain verification | Create `companies`/`tenants` source of truth |
| Medium | `src/app/api/v1/warranties/verify/route.ts:28-42` | Public serial/reference lookup can support enumeration | Add proof token/QR secret or stricter lookup design |

## Phase 7 - Multi-Tenancy Audit

Current state: not enterprise multi-tenant yet.

The platform can support B2C and limited SMB usage. It is not ready for enterprise/government multi-tenant deployment until tenant identity is made explicit. Today, access is distributed across `user_id`, `created_by`, `recipient_user_id`, `buyer_id`, `seller_id`, and `issuer_user_id`. That is flexible but brittle.

Required:

- Every business object gets `tenant_id`.
- Every request resolves active tenant context.
- Membership and role are tenant-scoped, not global profile-scoped.
- RLS policies use tenant membership helpers.
- API tokens belong to tenant clients, not only users.
- Audit logs include tenant, actor, subject, source IP, user agent, and request ID.

## Phase 8 - Performance Audit

| Area | Risk | Fix |
|---|---|---|
| Warranty list | Exact counts and broad `ilike` search | Full-text/trigram index or external search |
| Claims | Fetches all visible warranty IDs | Join/RPC with pagination |
| Documents | Fetches first 500 warranty IDs in list path | Tenant-aware paginated query |
| Uploads | Large in-memory buffering | Direct-to-storage signed uploads |
| OCR | Synchronous expensive processing | Queue and async job state |
| Fraud detection | O(N) simhash scan | Indexed locality-sensitive hash buckets |
| Team list | Email-domain `ilike` across profiles | Tenant membership join |
| Public verify | Serial lookup can be hot/enumerated | Cache, proof token, rate limits |

## Phase 9 - QA/QC Defect Register

| ID | Severity | Defect | Evidence | Fix |
|---|---|---|---|---|
| QA-001 | High | Auto-confirm email warranty may not be mutable by recipient | `recipient_user_id` set but mutation fields exclude it | Align ownership and mutation ACL |
| QA-002 | High | Document upload can fail/exhaust memory | 250MB `arrayBuffer()` | Direct upload |
| QA-003 | High | Full user journey not fully automated | E2E secrets missing locally | Add CI-safe seeded test tenant |
| QA-004 | Medium | Claims list can become slow | all warranty IDs fetched first | Paginated RPC |
| QA-005 | Medium | Public verification can leak existence | UUID/reference/serial lookup | Proof-token verification |
| QA-006 | Medium | OCR quality unknown for poor scans/languages | No corpus evidence | Golden OCR benchmark |
| QA-007 | Medium | Stripe webhook reconciliation lacks full defense-in-depth | Metadata-driven fulfillment | Re-verify from DB and Stripe |
| QA-008 | Medium | Team role UX/security can drift | global roles | Tenant-scoped RBAC |
| QA-009 | Medium | API security headers inconsistent | middleware excludes `/api` | API wrapper |
| QA-010 | Low | Certificate styling uses older brand colors | hard-coded red/navy | Align certificate brand system |

## Phase 10 - Product Audit

### Keep and Improve

- Warranty registration and dashboard
- Public verification/product passport
- Email ingestion
- Bilingual certificates
- Claims workflow
- API tokens and API docs
- Seller/provider extension offers

### Simplify Before Scale

- Team management until tenant model is formal
- Extension marketplace until pricing/eligibility/settlement are controlled
- OCR auto-confirm until fraud and confidence gates mature
- Admin ingestion review until queue/status model is clearer

### Missing Expected Features

- Tenant/company setup wizard
- Asset identity and lifecycle timeline
- Claim SLA/status timeline
- Recall alerts
- Vendor/manufacturer profile
- Product reliability score
- Warranty policy templates
- Bulk import preview/rollback
- Admin audit log viewer
- API usage dashboard
- Data export and deletion workflows

## Phase 11 - Future Readiness

| Future Capability | Current Readiness | Gap |
|---|---|---|
| Warranty management | Good SMB baseline | Tenant model and validation |
| Claims management | Early baseline | SLA, evidence, adjudication workflow |
| Recall management | Not ready | Product/manufacturer/recall event model |
| Asset lifecycle | Not ready | Asset/event/timeline model |
| Extension marketplace | Partial | Offer, settlement, provider compliance |
| Underwriting | Not ready | Risk model, policy terms, insurer data |
| Insurance partnerships | Not ready | Regulated data flows and audit trails |
| Vendor intelligence | Not ready | Normalized vendor/product taxonomy |
| Reliability intelligence | Not ready | Event warehouse and analytics |
| Global SaaS | Partial | Tenant, region, privacy, localization, billing tax |

## Top 25 Critical Findings

1. Tenant model is not formal enough for enterprise/global SaaS.
2. Company/team role logic depends on inferred email domains.
3. Global profile roles can conflict with tenant-scoped enterprise roles.
4. Email auto-confirm lacks explicit sender authentication alignment.
5. Auto-confirmed email warranties may not be editable by intended owner.
6. Document upload buffers large files in memory.
7. API tokens are user-scoped, not tenant/client-scoped.
8. Legacy static API token remains in code.
9. Public verification lookup can support enumeration.
10. Stripe webhook fulfillment needs stronger amount/ownership checks.
11. RLS relies on implicit nested filtering for child objects.
12. Claims/documents listing patterns do not scale.
13. Broad warranty search is not search-engineered.
14. OCR has no golden benchmark corpus.
15. Simhash duplicate detection is not production-scale.
16. Fraud detection is too shallow for marketplace/insurance flows.
17. File scanning/malware pipeline is missing.
18. API security headers are inconsistent.
19. Rate limiting fallback is not distributed.
20. Audit log coverage is incomplete.
21. Bulk import lacks preview/rollback transaction behavior.
22. Product model lacks assets, vendors, manufacturers, recalls, policies.
23. Marketplace settlement and provider compliance models are absent.
24. Support/admin workflows rely heavily on service role application checks.
25. Full production journey test automation is not yet complete.

## Top 25 Security Risks

1. Weak tenant boundary model.
2. Domain-based team bootstrap.
3. Email sender spoofing in ingestion.
4. Large memory file upload.
5. Legacy static API bearer token.
6. Public verification enumeration.
7. Missing malware scanning.
8. Missing tenant-scoped API scopes.
9. Distributed rate limiting not mandatory.
10. API route security headers inconsistent.
11. Incomplete audit logging.
12. Webhook metadata trust.
13. Admin service-role routes requiring perfect app checks.
14. Raw email payload PII retention.
15. Missing CSP.
16. Weak fraud scoring.
17. No IP allowlist for enterprise API clients.
18. No API client rotation/grace-period model.
19. No signed upload pre-validation.
20. Potential public document URL misuse.
21. Missing object-level data export/delete governance.
22. No formal data retention policy in code.
23. No tenant-specific encryption/key model.
24. No security event dashboard.
25. Limited automated cross-tenant regression tests.

## Top 25 Scalability Risks

1. User-field ACL instead of tenant partitioning.
2. Warranty `ilike` search.
3. Exact counts on large warranty lists.
4. Claims query via full warranty ID list.
5. Documents query via limited warranty ID list.
6. O(N) simhash duplicate scan.
7. Synchronous OCR/doc processing.
8. Sequential bulk import writes.
9. Service role admin reads without queue/pagination strategy.
10. In-memory rate limit fallback.
11. Large upload memory buffering.
12. No event bus/job queue for ingestion.
13. No warehouse for reliability intelligence.
14. No normalized product/vendor taxonomy.
15. No asset event table.
16. No tenant shard/partition strategy.
17. No search service abstraction.
18. No analytics rollup tables.
19. No API usage metering table.
20. No webhook outbox/retry table for notifications.
21. No recall broadcast model.
22. No document lifecycle/archive policy.
23. No background reconciliation for payments.
24. No SLO/error-budget model.
25. No region/data residency architecture.

## Top 25 Product Risks

1. Users may not understand company/team setup.
2. Email ingestion can create wrong-owner warranties.
3. OCR errors may reduce trust.
4. Claims workflow is too thin for serious businesses.
5. Extension marketplace can create compliance/support burden.
6. Pricing/offer rules need tight consistency.
7. Public verification needs a stronger proof story.
8. No asset lifecycle timeline yet.
9. No recall workflow yet.
10. No vendor reliability intelligence yet.
11. No warranty policy templates.
12. No role-specific onboarding.
13. No enterprise admin console.
14. No API usage dashboard.
15. No bulk import review/rollback.
16. No correction workflow for OCR fields.
17. No insured/underwritten warranty policy object.
18. No settlement/reconciliation dashboard.
19. No compliance exports.
20. No SLA/claim escalation model.
21. No localization beyond current web copy depth for all future languages.
22. No self-serve domain verification.
23. No product catalog normalization.
24. No trust center/security page surfaced in product.
25. Too much future marketplace ambition before core trust model is locked.

## Top 50 Improvements

Rank key: Impact, Effort, Revenue, Strategic are High/Medium/Low.

| # | Improvement | Impact | Effort | Revenue | Strategic |
|---:|---|---|---|---|---|
| 1 | Introduce first-class `tenants` and tenant memberships | High | High | High | High |
| 2 | Replace domain bootstrap with verified domain ownership | High | Medium | High | High |
| 3 | Make all business objects tenant-scoped | High | High | High | High |
| 4 | Remove legacy static API token | High | Low | Medium | High |
| 5 | Require distributed Redis rate limiting in production | High | Low | Medium | High |
| 6 | Add Cloudflare/Vercel firewall rules for abusive endpoints | High | Medium | Medium | High |
| 7 | Move document upload to signed direct upload | High | Medium | Medium | High |
| 8 | Add malware scanning and metadata stripping | High | Medium | Medium | High |
| 9 | Add email SPF/DKIM/DMARC alignment gate | High | Medium | High | High |
| 10 | Add human review for low-confidence OCR | High | Medium | High | High |
| 11 | Build OCR benchmark corpus | High | Medium | Medium | High |
| 12 | Add asset lifecycle model | High | High | High | High |
| 13 | Add product/vendor/manufacturer taxonomy | High | High | High | High |
| 14 | Add claim timeline and SLA events | High | Medium | High | High |
| 15 | Add recall event model | High | Medium | High | High |
| 16 | Add tenant-scoped API clients and scopes | High | Medium | High | High |
| 17 | Add API usage metering dashboard | Medium | Medium | High | High |
| 18 | Add audit event table and admin viewer | High | Medium | Medium | High |
| 19 | Add API response security wrapper | Medium | Low | Medium | High |
| 20 | Add CSP and stricter security headers | Medium | Low | Medium | High |
| 21 | Add proof-token public verification | High | Medium | High | High |
| 22 | Replace warranty search with full-text/trigram search | Medium | Medium | Medium | Medium |
| 23 | Replace claims/docs list queries with paginated RPCs | Medium | Medium | Medium | Medium |
| 24 | Add async job queue for ingestion/OCR | High | Medium | High | High |
| 25 | Add idempotency table for API creates | Medium | Medium | Medium | Medium |
| 26 | Re-verify Stripe amounts/currency/user ownership in webhook | High | Low | High | High |
| 27 | Add payment reconciliation job | Medium | Medium | High | High |
| 28 | Add bulk import preview/commit/rollback | High | Medium | High | Medium |
| 29 | Add OCR correction UI and audit | High | Medium | High | Medium |
| 30 | Add tenant onboarding wizard | High | Medium | High | High |
| 31 | Add role-specific product tours | Medium | Medium | Medium | Medium |
| 32 | Add enterprise SSO plan architecture | Medium | High | High | High |
| 33 | Add data retention/deletion workflows | High | Medium | Medium | High |
| 34 | Add compliance export package | Medium | Medium | High | High |
| 35 | Add warehouse/analytics rollups | High | High | High | High |
| 36 | Add vendor reliability scoring | High | High | High | High |
| 37 | Add warranty policy templates | High | Medium | High | High |
| 38 | Add underwriting quote model | Medium | High | High | High |
| 39 | Add insurance policy object | Medium | High | High | High |
| 40 | Add marketplace offer approval workflow | High | High | High | High |
| 41 | Add settlement/commission ledger | High | High | High | High |
| 42 | Add background notification outbox | Medium | Medium | Medium | Medium |
| 43 | Add cross-tenant automated security tests | High | Medium | Medium | High |
| 44 | Add mobile/RTL E2E matrix | Medium | Medium | Medium | Medium |
| 45 | Add browser tests for every purchase/claim/upload flow | High | Medium | High | High |
| 46 | Add production-safe seeded smoke tenant | High | Medium | Medium | High |
| 47 | Add private deep health endpoint | Medium | Low | Low | Medium |
| 48 | Add public trust/security page | Medium | Low | High | Medium |
| 49 | Align certificate brand styling with current site | Low | Low | Medium | Low |
| 50 | Add launch readiness dashboard | Medium | Medium | Medium | Medium |

## Recommended Execution Order

1. Security and tenancy hardening: tenant model, verified domains, distributed rate limits, remove legacy API token.
2. Document/email/OCR hardening: direct uploads, malware scan, sender-auth gate, OCR benchmark and review queue.
3. Business workflow hardening: claims timeline, bulk import preview, public verification proof token, Stripe webhook reconciliation.
4. Scale architecture: search/indexing, paginated RPCs, async jobs, analytics/event warehouse.
5. Future product expansion: recall, marketplace, underwriting, insurance, reliability intelligence.

## Brutally Honest Readiness Verdict

Warrantee can be launched carefully as an early SaaS product for controlled users, but it should not yet be marketed as enterprise-grade infrastructure for insurers, governments, large marketplaces, or underwriting partners.

The product has a strong foundation and a good direction. The decisive next step is not adding more features. It is converting the current user-centric MVP architecture into a tenant-first, audit-first, document-safe, fraud-aware system. Once that is done, marketplace, insurance, recall, and reliability intelligence become realistic instead of risky.
