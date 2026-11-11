import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isValidElement, type ReactNode } from 'react';
import type { ActivationReport } from '../../src/lib/server/activation-report';

const fixture = vi.hoisted(() => ({
  hooks: [] as unknown[],
  cursor: 0,
  writes: 0,
  pathname: '/en/admin',
  router: { push: vi.fn() },
  getUser: vi.fn(),
  getRole: vi.fn(),
  readRows: vi.fn(),
  effects: [] as { run: () => void | (() => void); deps: unknown[] }[],
}));

function sameDeps(previous: unknown[], next: unknown[]) {
  return previous.length === next.length && previous.every((value, i) => Object.is(value, next[i]));
}

vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  useState(initial: unknown) {
    const index = fixture.cursor++;
    const state = fixture.hooks[index] as { value: unknown; set: (value: unknown) => void } | undefined ?? {
      value: initial, set(value: unknown) { fixture.writes++; state.value = value; },
    };
    fixture.hooks[index] = state;
    return [state.value, state.set];
  },
  useRef(initial: unknown) {
    return fixture.hooks[fixture.cursor++] ??= { current: initial };
  },
  useCallback(callback: unknown, deps: unknown[]) {
    const index = fixture.cursor++;
    const cached = fixture.hooks[index] as { callback: unknown; deps: unknown[] } | undefined;
    if (cached && sameDeps(cached.deps, deps)) return cached.callback;
    fixture.hooks[index] = { callback, deps };
    return callback;
  },
  useEffect(run: () => void | (() => void), deps: unknown[]) { fixture.effects.push({ run, deps }); },
}));
vi.mock('next/navigation', () => ({ usePathname: () => fixture.pathname, useRouter: () => fixture.router }));
vi.mock('next/link', () => ({ default: () => null }));
vi.mock('@/components/SearchableSelect', () => ({ SearchableSelect: () => null }));
vi.mock('@/lib/supabase-browser', () => ({
  createSupabaseBrowserClient: () => ({
    auth: { getUser: fixture.getUser },
    from(table: string) {
      const query = {
        select: () => query, eq: () => query, is: () => query, neq: () => query,
        order: () => query, limit: () => query, single: fixture.getRole,
        abortSignal: (signal: AbortSignal) => fixture.readRows(table, signal),
      };
      return query;
    },
  }),
}));

import AdminPage from '../../src/app/[locale]/admin/page';

let mountedEffects: { deps: unknown[]; cleanup: void | (() => void) }[];
function commit() {
  fixture.cursor = 0;
  fixture.effects = [];
  const view = AdminPage();
  fixture.effects.forEach(({ run, deps }, i) => {
    const mounted = mountedEffects[i];
    if (mounted && sameDeps(mounted.deps, deps)) return;
    mounted?.cleanup?.();
    mountedEffects[i] = { deps, cleanup: run() };
  });
  return view;
}

function unmount() {
  mountedEffects.forEach(({ cleanup }) => cleanup?.());
  mountedEffects = [];
}

type Props = { children?: ReactNode; label?: string; value?: number; onClick?: () => unknown };
function elements(node: ReactNode): { type: unknown; props: Props }[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!isValidElement<Props>(node)) return [];
  return [node, ...elements(node.props.children)];
}

function text(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(text).join('');
  return isValidElement<Props>(node) ? text(node.props.children) : '';
}

function refresh(view = commit()) {
  const button = elements(view).find(({ type, props }) => type === 'button' && text(props.children) === 'Refresh');
  expect(button?.props.onClick).toBeTypeOf('function');
  return button!.props.onClick!();
}

function usersCount(view: ReactNode) {
  return elements(view).find(({ props }) => props.label === 'Total Users')?.props.value;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

function activation(since: string) {
  const stock = { accounts: 1, setupResolved: 1, creatorUsers: 0, warranties: 0, newAccounts30d: 1, newWarranties30d: 0, unattributedWarranties: 0 };
  const hints = { total: 0, setup: { completed: 0, skipped: 0, unknown: 0 }, actions: [], campaigns: [] };
  const report: ActivationReport = {
    complete: true, period: { days: 30, since, until: '2026-11-11', bounds: '[since, until)' }, stockAsOf: '2026-11-11', gaps: [],
    stock: { real: stock, all: stock }, hints: { real: hints, all: hints }, excluded: { accounts: 0, warranties: 0, events: 0 },
    verified: { firstWarrantyCreatedScopes: 0, firstWarrantyIssuedScopes: 0 },
    coverage: { profiles: 1, warranties: 0, events30d: 0, historicalAutomationEvents: 0 },
  };
  return Response.json(report);
}

function userRows(count: number) {
  return { data: Array.from({ length: count }, (_, i) => ({ id: `synthetic-user-${i}`, account_type: 'personal' })) };
}

const fetchReport = vi.fn();
const adminUser = { data: { user: { id: 'synthetic-admin', email: 'admin@example.invalid' } } };
const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

beforeEach(() => {
  Object.assign(fixture, { hooks: [], writes: 0, pathname: '/en/admin' });
  mountedEffects = [];
  fixture.router.push.mockReset();
  fixture.getUser.mockReset().mockResolvedValue(adminUser);
  fixture.getRole.mockReset().mockResolvedValue({ data: { role: 'admin' } });
  fixture.readRows.mockReset().mockImplementation((table: string) => Promise.resolve(table === 'profiles' ? userRows(1) : { data: [] }));
  fetchReport.mockReset().mockImplementation(() => Promise.resolve(activation('2026-10-12')));
  vi.stubGlobal('fetch', fetchReport);
});

afterEach(() => { unmount(); vi.unstubAllGlobals(); });

describe('admin overview loading', () => {
  it('loads once after checking the admin role and refreshes without restarting auth', async () => {
    const role = deferred<{ data: { role: string } }>();
    fixture.getRole.mockReturnValueOnce(role.promise);
    expect(text(commit())).toContain('Loading admin portal...');
    await flush();
    expect(fixture.readRows).not.toHaveBeenCalled();
    expect(fetchReport).not.toHaveBeenCalled();
    role.resolve({ data: { role: 'admin' } });
    await flush();
    expect(usersCount(commit())).toBe(1);
    expect(fixture.readRows).toHaveBeenCalledTimes(10);
    expect(fetchReport).toHaveBeenCalledOnce();
    expect(fetchReport).toHaveBeenCalledWith('/api/admin/activation', { cache: 'no-store', signal: expect.any(AbortSignal) });

    fixture.readRows.mockImplementation((table: string) => Promise.resolve(table === 'profiles' ? userRows(2) : { data: [] }));
    await refresh();
    expect(usersCount(commit())).toBe(2);
    expect(fixture.readRows).toHaveBeenCalledTimes(20);
    expect(fetchReport).toHaveBeenCalledTimes(2);
    expect(fixture.getUser).toHaveBeenCalledOnce();
    expect(fixture.getRole).toHaveBeenCalledOnce();
  });

  it('shows the existing unavailable report state and recovers on refresh', async () => {
    fetchReport.mockResolvedValueOnce(Response.json({ complete: false }));
    commit();
    await flush();
    const failed = commit();
    expect(usersCount(failed)).toBe(1);
    expect(text(failed)).toContain('Report unavailable; no complete counts returned.');
    await refresh(failed);
    expect(text(commit())).toContain('2026-10-12 <= UTC < 2026-11-11');
  });

  it('keeps the previous rows if an overview refresh rejects', async () => {
    commit();
    await flush();
    fixture.readRows.mockRejectedValueOnce(new Error('Synthetic overview failure'));
    await refresh();
    expect(usersCount(commit())).toBe(1);
  });

  it.each(['success', 'error'])('ignores stale overview rows and activation %s after a newer refresh', async (outcome) => {
    commit();
    await flush();
    const oldReport = deferred<unknown>();
    const oldRows = deferred<ReturnType<typeof userRows>>();
    // The mocked transports ignore aborts, including a response body already being read.
    fetchReport.mockResolvedValueOnce({ ok: true, json: () => oldReport.promise });
    fixture.readRows.mockReturnValueOnce(oldRows.promise);
    const older = refresh();
    await flush();
    const signal = fetchReport.mock.calls[1][1].signal as AbortSignal;
    expect(fixture.readRows.mock.calls[10][1]).toBe(signal);
    fetchReport.mockResolvedValueOnce(activation('2026-10-13'));
    fixture.readRows.mockReturnValueOnce(Promise.resolve(userRows(2)));
    await refresh();
    expect(signal.aborted).toBe(true);
    expect(usersCount(commit())).toBe(2);
    const writes = fixture.writes;
    oldRows.resolve(userRows(3));
    if (outcome === 'error') oldReport.reject(new Error('Synthetic stale failure'));
    else oldReport.resolve(await activation('2026-10-01').json());
    await older;
    expect(fixture.writes).toBe(writes);
    const view = commit();
    expect(usersCount(view)).toBe(2);
    expect(text(view)).toContain('2026-10-13 <= UTC < 2026-11-11');
  });

  it('cancels the active refresh without writing state after unmount', async () => {
    commit();
    await flush();
    const report = deferred<Response>();
    fetchReport.mockReturnValueOnce(report.promise);
    const pending = refresh();
    const signal = fetchReport.mock.calls[1][1].signal as AbortSignal;
    unmount();
    const writes = fixture.writes;
    report.resolve(activation('2026-10-13'));
    await pending;
    expect(signal.aborted).toBe(true);
    expect(fixture.writes).toBe(writes);
  });

  it('ignores old auth completion after a locale change and redirects only the current check', async () => {
    const oldAuth = deferred<typeof adminUser>();
    fixture.getUser.mockReturnValueOnce(oldAuth.promise).mockResolvedValueOnce({ data: { user: null } });
    commit();
    fixture.pathname = '/ar/admin';
    commit();
    await flush();
    oldAuth.resolve(adminUser);
    await flush();
    expect(fixture.router.push).toHaveBeenCalledExactlyOnceWith('/ar/admin/login');
    expect(fixture.getRole).not.toHaveBeenCalled();
    expect(fetchReport).not.toHaveBeenCalled();
  });

  it('finishes loading without exposing the console if the role check rejects', async () => {
    fixture.getRole.mockRejectedValueOnce(new Error('Synthetic role lookup failure'));
    commit();
    await flush();
    expect(text(commit())).toContain('You do not have admin access.');
    expect(fixture.readRows).not.toHaveBeenCalled();
    expect(fetchReport).not.toHaveBeenCalled();
  });
});
