import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { validateBaseAgainstTypes } from './bootstrap.mjs';

const migrations = {
  claims: '20260327190110_claims_workflow_tables_and_policies.sql',
  claimFks: '20260327225428_fix_claim_events_fk_to_profiles.sql',
  support: '20260604130000_operational_support_schema.sql',
  tokens: '20260604140412_api_integration_tokens.sql',
  usage: '20260610193000_api_usage_events.sql',
  tokenScopes: '20260616120000_expand_api_integration_token_scopes.sql',
  tenant: '20260724214205_harden_tenant_and_storage_access.sql',
  transition: '20260724214245_atomic_claim_transitions.sql',
  constraints: '20260724214255_atomic_billing_and_data_constraints.sql',
  growth: '20260823131754_growth_lifecycle_foundations.sql',
  scale: '20260823131801_operational_scale_foundations.sql',
  service: '20260823132007_post_advisor_hardening.sql',
  simhash: '20260823132449_index_simhash_duplicate_candidates.sql',
  duplicateIndexes: '20260823170000_scale_bulk_import_duplicate_matching.sql',
  duplicates: '20260823171500_harden_bulk_import_duplicate_date_parsing.sql',
  optimize: '20260715152933_optimize_rls_and_indexes.sql',
  adminRead: '20260329172132_optimize_rls_auth_uid_initplan_batch1.sql',
  fraud: '20260329172145_optimize_rls_auth_uid_initplan_batch2.sql',
  revenue: '20260329172211_optimize_rls_auth_uid_initplan_batch4.sql',
  config: '20260329172224_optimize_rls_auth_uid_initplan_batch5.sql',
  concierge: '20260830200356_agent_concierge_questions.sql',
  conciergeDeny: '20260830203311_agent_concierge_explicit_deny_policy.sql',
  untrusted: '20260904120000_harden_untrusted_content_telemetry.sql',
  manual: '20261110151140_manual_warranty_creation_transaction.sql',
};

function section(source, start, end) {
  const first = source.indexOf(start);
  if (first < 0 || source.indexOf(start, first + start.length) >= 0) throw new Error(`Legacy source anchor missing/ambiguous: ${start}`);
  const last = end ? source.indexOf(end, first + start.length) : source.length;
  if (last < first) throw new Error(`Legacy source end missing: ${end}`);
  return source.slice(first, last);
}

function statement(source, start) {
  const tail = section(source, start);
  const end = tail.indexOf(';');
  if (end < 0) throw new Error('Unterminated legacy policy');
  return tail.slice(0, end + 1);
}

function property(node, name) {
  const member = node?.members?.find((item) => item.name?.getText().replaceAll('"', '') === name);
  if (!member || !ts.isPropertySignature(member)) throw new Error(`Legacy type contract missing: ${name}`);
  return member.type;
}

function validateLegacyBase(root, base) {
  const columns = validateBaseAgainstTypes(root, base);
  const source = ts.createSourceFile('database.ts', readFileSync(resolve(root, 'src/types/database.ts'), 'utf8'), ts.ScriptTarget.Latest, true);
  const database = source.statements.find((item) => ts.isTypeAliasDeclaration(item) && item.name.text === 'Database');
  const tables = property(property(database.type, 'public'), 'Tables');
  for (const match of base.matchAll(/alter table public\.(\w+)\s+([\s\S]*?);/g)) {
    const row = property(property(tables, match[1]), 'Row');
    for (const column of match[2].matchAll(/add column (\w+)\b/g)) property(row, column[1]);
  }
  return columns;
}

export function buildLegacyBootstrap(root) {
  const load = (name) => readFileSync(resolve(root, 'supabase/migrations', migrations[name]), 'utf8');
  const base = readFileSync(resolve(root, 'tests/isolated/legacy-base.sql'), 'utf8');
  validateLegacyBase(root, base);
  const tenant = load('tenant');
  const scale = load('scale');
  const optimize = load('optimize');
  const chunks = [
    'set search_path = public, extensions;',
    base,
    section(load('claims'), '-- Add severity', '-- Enable RLS'),
    load('claimFks'),
    load('support'), load('tokens'), load('usage'), load('tokenScopes'),
    // Reapply current canonical policies, not the permissive historical ones.
    tenant,
    statement(load('manual'), 'alter policy warranties_authenticated_read on public.warranties'),
    load('transition'),
    section(load('constraints'), 'alter table public.warranties\n  drop constraint', 'create index if not exists idx_webhook_events_status_updated_at'),
    // Focused bootstrap already loads the same canonical passport policy.
    'drop policy warranty_passport_events_read on public.warranty_passport_events;',
    load('growth'),
    section(scale, 'alter table public.api_integration_tokens', 'create table if not exists public.api_idempotency_records'),
    section(scale, 'create table if not exists public.platform_audit_events', 'create table if not exists public.async_jobs'),
    'alter table public.platform_audit_events enable row level security; alter table public.platform_audit_events force row level security; revoke all on public.platform_audit_events from public, anon, authenticated; grant all on public.platform_audit_events to service_role; grant usage, select on sequence public.platform_audit_events_id_seq to service_role;',
    statement(load('service'), 'create policy api_integration_tokens_explicit_service_only'),
    statement(load('service'), 'create policy platform_audit_explicit_service_only'),
    statement(optimize, 'alter policy "Users can read their own API usage events"'),
    statement(load('adminRead'), 'CREATE POLICY "admin_audit_log_admin_read"'),
    statement(load('fraud'), 'CREATE POLICY "fraud_signals_admin"'),
    statement(load('revenue'), 'CREATE POLICY "revenue_events_admin"'),
    statement(load('config'), 'CREATE POLICY "system_config_read"'),
    statement(load('config'), 'CREATE POLICY "system_config_write"'),
    section(optimize, 'drop policy if exists "Admins manage all ingestion jobs"', 'drop policy if exists "Service role can manage subscriptions"'),
    load('simhash'),
    load('duplicateIndexes'), load('duplicates'),
    load('concierge'), load('conciergeDeny'), load('untrusted'),
    // Service-only routes keep real RLS/policies. No auth/browser bypass grants.
    'grant all on public.api_integration_tokens, public.claim_events, public.claim_attachments, public.support_tickets, public.push_subscriptions, public.seller_invitations, public.warranty_policy_templates, public.asset_lifecycle_events, public.recall_notices, public.recall_matches, public.warranty_extension_requests, public.warranty_passport_events, public.customer_feedback_events to service_role;',
    "notify pgrst, 'reload schema';",
  ];
  const latest = new Map();
  for (const file of readdirSync(resolve(root, 'supabase/migrations')).filter((file) => file.endsWith('.sql')).sort()) {
    for (const match of readFileSync(resolve(root, 'supabase/migrations', file), 'utf8').matchAll(/create\s+or\s+replace\s+function\s+(?:public|private)\.(transition_warranty_claim|match_warranty_import_duplicate_keys|record_platform_audit_event)\s*\(/gi)) latest.set(match[1].toLowerCase(), file);
  }
  for (const [name, key] of Object.entries({ transition_warranty_claim: 'transition', match_warranty_import_duplicate_keys: 'duplicates', record_platform_audit_event: 'scale' })) {
    if (latest.get(name) !== migrations[key]) throw new Error(`Refresh legacy source implementation: ${name}`);
  }
  return chunks.join('\n\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.argv.length !== 3 || process.argv[2] !== '--check') throw new Error('Usage: node tests/isolated/legacy-bootstrap.mjs --check');
  const sql = buildLegacyBootstrap(resolve(import.meta.dirname, '../..'));
  console.log(`PASS: typed legacy prerequisites and unchanged canonical source contracts (${sql.length} SQL bytes); no services contacted`);
}
