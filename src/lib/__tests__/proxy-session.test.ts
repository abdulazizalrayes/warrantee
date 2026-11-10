import { beforeEach, afterEach, expect, test, vi } from 'vitest';
import { NextRequest } from 'next/server';

const state = vi.hoisted(() => ({ user: { id: 'synthetic-user' } as { id: string } | null, expired: false }));
vi.mock('@supabase/ssr', () => ({
  createServerClient: (_url: string, _key: string, options: { cookies: { setAll: (cookies: unknown[], headers: Record<string, string>) => void } }) => ({
    auth: {
      getUser: async () => {
        options.cookies.setAll([{ name: 'sb-fixture-auth-token', value: state.expired ? '' : 'synthetic-fresh-token',
          options: { path: '/', sameSite: 'lax', maxAge: state.expired ? 0 : 3600 } }], {
          'Cache-Control': 'private, no-cache, no-store, must-revalidate, max-age=0', Expires: '0', Pragma: 'no-cache',
        });
        return { data: { user: state.user }, error: null };
      },
    },
    from: () => {
      const query = { select: () => query, eq: () => query, in: () => query,
        limit: () => query, maybeSingle: async () => ({ data: null, error: null }), single: async () => ({ data: { role: 'user' }, error: null }) };
      return query;
    },
  }),
}));

import { proxy } from '../../proxy';

beforeEach(() => {
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://synthetic-fixture.supabase.co');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'synthetic-public-key');
  vi.stubEnv('WARRANTEE_ISOLATED_E2E', '');
  state.user = { id: 'synthetic-user' };
  state.expired = false;
});
afterEach(() => vi.unstubAllEnvs());

for (const [path, signedIn, destination] of [
  ['/en/auth', true, '/en/dashboard'], ['/ar/auth', true, '/ar/dashboard'],
  ['/en/admin', true, '/en/dashboard'], ['/en/approval', true, '/en/dashboard'],
  ['/en/dashboard', false, '/en/auth'], ['/en/warranties', true, null],
] as const) {
  test(`session cookies and no-cache survive ${path} ${signedIn ? 'signed-in' : 'signed-out'}`, async () => {
    state.user = signedIn ? { id: 'synthetic-user' } : null;
    const response = await proxy(new NextRequest(`https://warrantee.io${path}`));
    expect(response.cookies.get('sb-fixture-auth-token')).toMatchObject({ value: 'synthetic-fresh-token', sameSite: 'lax', secure: true, path: '/' });
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(response.headers.get('expires')).toBe('0');
    expect(response.headers.get('pragma')).toBe('no-cache');
    expect(response.headers.has('x-warrantee-isolated-auth')).toBe(false);
    if (destination) expect(new URL(response.headers.get('location')!).pathname).toBe(destination);
    else expect(response.headers.get('x-middleware-next')).toBe('1');
  });
}

test('session deletion survives the anonymous redirect instead of retaining a stale cookie', async () => {
  state.user = null;
  state.expired = true;
  const response = await proxy(new NextRequest('https://warrantee.io/en/dashboard'));
  expect(response.cookies.get('sb-fixture-auth-token')).toMatchObject({ value: '', maxAge: 0 });
  expect(new URL(response.headers.get('location')!).searchParams.get('redirect')).toBe('/en/dashboard');
});
