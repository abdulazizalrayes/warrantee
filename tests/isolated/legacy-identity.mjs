import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, assertDisposableBackend } from './guard.mjs';

// Opt-in custom-command support, never used to replace the real signup journey.
export async function createLegacyIdentity(env) {
  await assertDisposableBackend(env);
  const admin = createClient(SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const email = `isolated-legacy-${randomUUID()}@example.test`;
  const password = `Synthetic-local-only-${randomUUID()}!`;
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true,
    user_metadata: { full_name: 'Synthetic local legacy UI', account_type: 'consumer' } });
  if (created.error || !created.data.user) throw new Error('Disposable legacy identity creation failed');
  await assertDisposableBackend(env);
  const profile = await admin.from('profiles').update({ role: 'super_admin', onboarding_completed: true,
    preferred_locale: 'en', preferred_language: 'en' }).eq('id', created.data.user.id).select('id').single();
  if (profile.error || !profile.data) throw new Error('Disposable legacy profile setup failed');
  return { E2E_USER_EMAIL: email, E2E_USER_PASSWORD: password };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  if (args[0] !== '--' || !args[1]) throw new Error('Usage: node tests/isolated/legacy-identity.mjs -- command args...');
  const env = { ...process.env, ...await createLegacyIdentity(process.env), E2E_SUITE: 'isolated-regression' };
  const child = spawn(args[1], args.slice(2), { env, stdio: ['ignore', 'inherit', 'inherit'] });
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => child.kill(signal));
  child.once('error', () => { console.error('Isolated legacy command could not start'); process.exitCode = 1; });
  child.once('exit', (code) => { process.exitCode = code ?? 1; });
}
