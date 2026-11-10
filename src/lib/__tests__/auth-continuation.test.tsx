import { afterEach, beforeEach, expect, test, vi } from 'vitest';

const harness = vi.hoisted(() => ({ slots: [] as unknown[], cursor: 0,
  effects: [] as Array<() => (() => void) | void>,
  locale: 'en', user: { id: 'synthetic-user' } as { id: string } | null, loading: false,
  lookup: vi.fn(), replace: vi.fn(), search: '?redirect=%2Fen%2Fonboarding',
}));
vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  const state = (initial: unknown) => {
    const slot = harness.cursor++;
    if (slot >= harness.slots.length) harness.slots.push(initial);
    return [harness.slots[slot], (value: unknown) => { harness.slots[slot] = value; }];
  };
  return { ...actual, useState: state, useRef: (initial: unknown) => state({ current: initial })[0],
    useEffect: (effect: () => (() => void) | void) => { harness.effects.push(effect); } };
});
vi.mock('next/navigation', () => ({ useParams: () => ({ locale: harness.locale }), useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/lib/auth-context', () => ({ useAuth: () => ({ user: harness.user, loading: harness.loading }) }));
vi.mock('@/lib/supabase-browser', () => ({ createSupabaseBrowserClient: () => ({ auth: { getUser: harness.lookup } }) }));
vi.mock('@/components/PageViewTracker', () => ({ PageViewTracker: () => null }));
vi.mock('@/lib/ga4-events', () => ({ trackAuthIntent: vi.fn(), trackAuthJourney: vi.fn(), trackSignup: vi.fn(), trackSignupSubmit: vi.fn() }));
import AuthPage from '@/app/[locale]/auth/page';

function render() { harness.cursor = 0; harness.effects = []; AuthPage(); }
function mount() {
  render(); harness.effects[0](); harness.effects[1]();
  render(); return harness.effects[2]();
}
async function flush() { for (let i = 0; i < 20; i++) await Promise.resolve(); }
beforeEach(() => {
  vi.clearAllMocks(); harness.slots = []; harness.cursor = 0; harness.effects = [];
  harness.locale = 'en'; harness.user = { id: 'synthetic-user' }; harness.loading = false;
  harness.search = '?redirect=%2Fen%2Fonboarding';
  harness.lookup.mockResolvedValue({ data: { user: harness.user }, error: null });
  vi.stubGlobal('window', { location: { search: harness.search, replace: harness.replace } });
});
afterEach(() => vi.unstubAllGlobals());

for (const locale of ['en', 'ar']) test(`re-verifies the ${locale} late session before a fresh same-origin navigation`, async () => {
  harness.locale = locale;
  window.location.search = `?redirect=%2F${locale}%2Fonboarding`;
  mount(); await flush();
  expect(harness.lookup).toHaveBeenCalledOnce();
  expect(harness.replace).toHaveBeenCalledExactlyOnceWith(`/${locale}/onboarding`);
});
test('normalizes an untrusted destination before navigation', async () => {
  window.location.search = '?redirect=https%3A%2F%2Fattacker.invalid%2Fprivate';
  mount(); await flush(); expect(harness.replace).toHaveBeenCalledExactlyOnceWith('/en/dashboard');
});
for (const query of ['?tab=signup&redirect=%2Fen%2Fdashboard', '?error=business_setup_error&redirect=%2Fen%2Fdashboard', '']) {
  test(`preserves explicit signup/errors/ordinary login: ${query || 'no redirect'}`, async () => {
    window.location.search = query; mount(); await flush();
    expect(harness.lookup).not.toHaveBeenCalled(); expect(harness.replace).not.toHaveBeenCalled();
  });
}
test('does not navigate while auth is uninitialized or absent', async () => {
  harness.loading = true; harness.user = null; mount(); await flush();
  expect(harness.lookup).not.toHaveBeenCalled(); expect(harness.replace).not.toHaveBeenCalled();
});
test('a different verified identity cannot continue the captured user', async () => {
  harness.lookup.mockResolvedValue({ data: { user: { id: 'different-synthetic-user' } }, error: null });
  mount(); await flush(); expect(harness.replace).not.toHaveBeenCalled();
});
test('a rejected verification leaves manual sign-in available', async () => {
  harness.lookup.mockRejectedValue(new Error('synthetic local failure'));
  mount(); await flush(); expect(harness.replace).not.toHaveBeenCalled();
});
test('an unmounted or changed session cannot navigate from a late verification response', async () => {
  let release!: (value: unknown) => void;
  harness.lookup.mockReturnValue(new Promise(done => { release = done; }));
  const cleanup = mount(); cleanup?.();
  release({ data: { user: harness.user }, error: null }); await flush();
  expect(harness.replace).not.toHaveBeenCalled();
});
