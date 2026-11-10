export const APP_URL = 'http://127.0.0.1:3100';
export const SUPABASE_URL = 'http://127.0.0.1:54321';
export const MAIL_URL = 'http://127.0.0.1:54324';

export function assertLoopback(value, expectedOrigin) {
  let url;
  try { url = new URL(value); } catch { throw new Error('Invalid isolated destination'); }
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' ||
      url.username || url.password || (expectedOrigin && url.origin !== expectedOrigin)) {
    throw new Error('Isolated journey refuses a non-loopback or unexpected target');
  }
  return url;
}

export function assertIsolatedEnvironment(env = process.env) {
  if (env.WARRANTEE_ISOLATED_E2E !== '1' || env.VERCEL !== undefined || env.VERCEL_ENV !== undefined) {
    throw new Error('Isolated journey requires explicit local-only opt-in');
  }
  for (const [key, origin] of [
    ['NEXT_PUBLIC_APP_URL', APP_URL], ['E2E_BASE_URL', APP_URL],
    ['NEXT_PUBLIC_SUPABASE_URL', SUPABASE_URL], ['ISOLATED_MAIL_URL', MAIL_URL],
  ]) {
    const url = assertLoopback(env[key], origin);
    if (url.href !== `${origin}/`) throw new Error(`Unexpected isolated ${key}`);
  }
  for (const key of ['NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'ISOLATED_RUN_ID']) {
    if (!env[key]) throw new Error(`Missing isolated ${key}`);
  }
  if (!/^[a-f0-9]{32}$/.test(env.ISOLATED_RUN_ID)) throw new Error('Invalid disposable run identity');
  return env;
}

// The marker exists only in the disposable bootstrap, never in production.
export async function assertDisposableBackend(env = process.env) {
  assertIsolatedEnvironment(env);
  const response = await fetch(`${SUPABASE_URL}/rest/v1/isolated_journey_marker?select=run_id`, {
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` },
    redirect: 'error', signal: AbortSignal.timeout(5000),
  });
  const rows = await response.json();
  if (!response.ok || rows.length !== 1 || rows[0].run_id !== env.ISOLATED_RUN_ID) {
    throw new Error('Disposable backend marker mismatch; refusing test mutations');
  }
}
