import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';

const files = {
  auth: '20260325101757_add_auth_trigger_and_functions.sql',
  subscriptions: '20260325133112_create_subscriptions_table.sql',
  subscriptionUnique: '20260327230856_upsert_subscription_function.sql',
  profileRls: '20260520142000_lock_down_warranty_rls.sql',
  authorization: '20260714171612_harden_authorization_and_invitation_delivery.sql',
  optimize: '20260715152933_optimize_rls_and_indexes.sql',
  tenant: '20260724214205_harden_tenant_and_storage_access.sql',
  onboarding: '20260724214305_self_service_business_onboarding.sql',
  plans: '20260830143000_account_aware_plans_and_warranty_quotas.sql',
  onboardingRpc: '20260830151500_harden_business_onboarding_rpc.sql',
  state: '20260406080746_enforce_warranty_state_machine.sql',
  documentSecurity: '20260610194500_document_security_status.sql',
  activity: '20260405000159_security_rls_fixes.sql',
  activityRead: '20260329172132_optimize_rls_auth_uid_initplan_batch1.sql',
  operational: '20260823131801_operational_scale_foundations.sql',
  servicePolicies: '20260823132007_post_advisor_hardening.sql',
  manual: '20261110151140_manual_warranty_creation_transaction.sql',
};

function section(source, start, end) {
  const first = source.indexOf(start);
  if (first < 0 || source.indexOf(start, first + start.length) >= 0) {
    throw new Error(`Source contract anchor missing/ambiguous: ${start}`);
  }
  const last = end ? source.indexOf(end, first + start.length) : source.length;
  if (last < first) throw new Error(`Source contract end anchor missing: ${end}`);
  return source.slice(first, last);
}

function statement(source, start) {
  const tail = section(source, start);
  const end = tail.indexOf(';');
  if (end < 0) throw new Error('Missing policy terminator');
  return tail.slice(0, end + 1);
}

function property(node, name) {
  const result = node.members.find((member) => member.name?.getText().replaceAll('"', '') === name);
  if (!result || !ts.isPropertySignature(result)) throw new Error(`Missing type contract ${name}`);
  return result.type;
}

export function validateBaseAgainstTypes(root, base) {
  const source = ts.createSourceFile('database.ts', readFileSync(resolve(root, 'src/types/database.ts'), 'utf8'), ts.ScriptTarget.Latest, true);
  const database = source.statements.find((node) => ts.isTypeAliasDeclaration(node) && node.name.text === 'Database').type;
  const schema = property(database, 'public');
  const tables = property(schema, 'Tables');
  let columns = 0;
  for (const match of base.matchAll(/create table public\.(\w+) \(([\s\S]*?)\n\);/g)) {
    const row = property(property(tables, match[1]), 'Row');
    for (const column of match[2].matchAll(/(?:^|,|\n)\s*(\w+)\s+(uuid|text|integer|bigint|numeric|boolean|timestamptz|date|jsonb|inet|public\.\w+)\b/g)) {
      property(row, column[1]);
      columns++;
    }
  }
  for (const match of base.matchAll(/create type public\.(\w+) as enum \(([^;]+)\);/g)) {
    const enumNode = property(property(schema, 'Enums'), match[1]);
    const values = enumNode.types.map((node) => node.literal.text);
    const declared = [...match[2].matchAll(/'([^']+)'/g)].map((item) => item[1]);
    if (JSON.stringify(values) !== JSON.stringify(declared)) throw new Error(`Enum drift: ${match[1]}`);
  }
  if (columns < 100) throw new Error('Incomplete base-schema contract inspection');
  return columns;
}

export function buildBootstrap(root, runId) {
  if (!/^[a-f0-9]{32}$/.test(runId)) throw new Error('Invalid disposable run ID');
  const load = (name) => readFileSync(resolve(root, 'supabase/migrations', files[name]), 'utf8');
  const base = readFileSync(resolve(root, 'tests/isolated/base.sql'), 'utf8');
  validateBaseAgainstTypes(root, base);
  const tenant = load('tenant');
  const optimize = load('optimize');
  const plans = load('plans');
  const chunks = [
    base,
    section(load('auth'), '-- 1. Auto-create profile on signup', '-- 3. Function'),
    load('subscriptions'),
    section(load('subscriptionUnique'), '-- Add unique constraint on user_id'),
    section(plans, 'alter table public.subscriptions', 'create or replace function public.upsert_subscription('),
    section(plans, 'create or replace function public.enforce_warranty_plan_quota()'),
    load('onboarding'), load('onboardingRpc'),
    load('state'), "alter function public.check_warranty_status_transition() set search_path = '';",
    load('documentSecurity'),
    section(tenant, 'create schema if not exists private;', '-- The legacy companies.api_key'),
    section(tenant, 'drop policy if exists "Anyone can view companies"', 'drop policy if exists warranties_authenticated_read'),
    section(tenant, 'drop policy if exists warranties_authenticated_read', 'drop policy if exists warranty_claims_authenticated_access'),
    section(tenant, 'drop policy if exists warranty_documents_authenticated_read', 'drop policy if exists warranty_extensions_authenticated_access'),
    section(tenant, 'create policy warranty_documents_storage_authenticated_read', 'create policy claim_attachments_storage_authenticated_read'),
    section(tenant, 'update storage.buckets\nset\n  public = false,\n  file_size_limit = 20971520', 'update storage.buckets\nset\n  public = false,\n  file_size_limit = 10485760'),
    statement(tenant, 'create policy warranty_claims_authenticated_read'),
    statement(load('profileRls'), 'create policy profiles_authenticated_owner_read'),
    statement(load('profileRls'), 'create policy profiles_authenticated_owner_update'),
    statement(load('profileRls'), 'create policy notifications_authenticated_owner_access'),
    section(optimize, 'alter policy profiles_authenticated_owner_read', 'alter policy company_members_authenticated_self_read'),
    statement(optimize, 'alter policy notifications_authenticated_owner_access'),
    section(load('authorization'), 'do $$\ndeclare\n  writable_columns text[]', 'drop policy if exists "Users can view claim attachments"'),
    section(optimize, 'drop policy if exists "Service role can manage subscriptions"'),
    statement(load('activity'), 'CREATE POLICY "Users can insert activity as themselves"'),
    statement(load('activityRead'), 'CREATE POLICY "Users can view relevant activity"'),
    section(load('operational'), 'create table if not exists public.api_clients', 'alter table public.api_integration_tokens'),
    section(load('operational'), 'create table if not exists public.api_idempotency_records', 'create index if not exists warranties_product_name_trgm_idx'),
    section(load('operational'), 'create table if not exists public.async_jobs', 'create or replace function public.recover_stale_async_jobs'),
    ...['api_clients', 'api_idempotency_records', 'async_jobs'].flatMap((table) => [
      `alter table public.${table} enable row level security;
       alter table public.${table} force row level security;
       revoke all on public.${table} from public, anon, authenticated;
       grant all on public.${table} to service_role;`,
      statement(load('servicePolicies'), `create policy ${table === 'api_idempotency_records' ? 'api_idempotency' : table}_explicit_service_only`),
    ]),
    load('manual'),
    `create table public.isolated_journey_marker (run_id text primary key);
     alter table public.isolated_journey_marker enable row level security;
     revoke all on public.isolated_journey_marker from anon, authenticated;
     grant select on public.isolated_journey_marker to service_role;
     insert into public.isolated_journey_marker values ('${runId}');
     notify pgrst, 'reload schema';`,
  ];

  // Fail closed if a later migration replaces a loaded critical implementation.
  const latest = new Map();
  for (const file of readdirSync(resolve(root, 'supabase/migrations')).filter((file) => file.endsWith('.sql')).sort()) {
    const sql = readFileSync(resolve(root, 'supabase/migrations', file), 'utf8');
    for (const match of sql.matchAll(/create\s+or\s+replace\s+function\s+public\.(handle_new_user|create_default_subscription|enforce_warranty_plan_quota|complete_business_onboarding|check_warranty_status_transition)\s*\(/gi)) {
      latest.set(match[1].toLowerCase(), file);
    }
  }
  for (const [name, key] of Object.entries({ handle_new_user: 'onboarding', create_default_subscription: 'plans', enforce_warranty_plan_quota: 'manual', complete_business_onboarding: 'onboardingRpc', check_warranty_status_transition: 'state' })) {
    if (latest.get(name) !== files[key]) throw new Error(`Refresh isolated source contract for ${name}`);
  }
  const latestPolicy = new Map();
  for (const file of readdirSync(resolve(root, 'supabase/migrations')).filter((file) => file.endsWith('.sql')).sort()) {
    const source = readFileSync(resolve(root, 'supabase/migrations', file), 'utf8');
    for (const match of source.matchAll(/(?:create|alter)\s+policy\s+(\w+)\s+on\s+(?:public\.|storage\.)?\w+/gi)) latestPolicy.set(match[1].toLowerCase(), file);
  }
  for (const [name, key] of Object.entries({
    profiles_authenticated_owner_read: 'optimize', profiles_authenticated_owner_update: 'optimize',
    companies_authenticated_read: 'tenant', companies_authenticated_insert: 'tenant',
    company_members_authenticated_company_read: 'tenant',
    warranties_authenticated_read: 'manual', warranties_authenticated_insert: 'tenant',
    warranties_authenticated_update: 'tenant', warranties_authenticated_delete: 'tenant',
    warranty_documents_authenticated_read: 'tenant', warranty_documents_authenticated_insert: 'tenant',
    warranty_documents_storage_authenticated_read: 'tenant', warranty_documents_storage_authenticated_insert: 'tenant',
    reserve_backend_funnel_events: 'manual',
  })) {
    if (latestPolicy.get(name) !== files[key]) throw new Error(`Refresh isolated source policy contract for ${name}`);
  }
  return chunks.join('\n\n');
}
