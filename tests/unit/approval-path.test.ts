import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isValidElement, type ReactNode } from 'react';

type Row = Record<string, unknown>;
type Query = { table: string; filters: [string, ...unknown[]][]; single: boolean };
const fixture = vi.hoisted(() => ({
  hooks: [] as unknown[], cursor: 0,
  effects: [] as { run: () => void | (() => void); deps: unknown[] }[],
  locale: 'en', user: { id: 'synthetic-user' } as { id: string } | null,
  profile: { role: 'user' } as { role: string } | null,
  itemId: 'synthetic-warranty', memberships: [] as Row[], rows: [] as Row[],
  reads: [] as Query[], query: vi.fn(), action: vi.fn(), analytics: vi.fn(),
}));

function sameDeps(previous: unknown[], next: unknown[]) {
  return previous.length === next.length && previous.every((value, i) => Object.is(value, next[i]));
}

vi.mock('react', async (original) => ({
  ...await original<typeof import('react')>(),
  useState(initial: unknown) {
    const index = fixture.cursor++;
    const state = fixture.hooks[index] as { value: unknown; set: (value: unknown) => void } | undefined ?? {
      value: initial, set(value: unknown) { state.value = value; },
    };
    fixture.hooks[index] = state;
    return [state.value, state.set];
  },
  useRef(initial: unknown) { return fixture.hooks[fixture.cursor++] ??= { current: initial }; },
  useCallback(callback: unknown, deps: unknown[]) {
    const index = fixture.cursor++;
    const cached = fixture.hooks[index] as { callback: unknown; deps: unknown[] } | undefined;
    if (cached && sameDeps(cached.deps, deps)) return cached.callback;
    fixture.hooks[index] = { callback, deps };
    return callback;
  },
  useMemo(callback: () => unknown) { return callback(); },
  useEffect(run: () => void | (() => void), deps: unknown[]) { fixture.effects.push({ run, deps }); },
}));
vi.mock('next/navigation', () => ({
  useParams: () => ({ locale: fixture.locale, id: fixture.itemId }),
  useSearchParams: () => new URLSearchParams('view=seller'),
}));
vi.mock('next/link', () => ({ default: () => null }));
vi.mock('@/lib/auth-context', () => ({ useAuth: () => ({ user: fixture.user, profile: fixture.profile, loading: false }) }));
vi.mock('@/lib/ga4-events', () => ({ trackApprovalAction: fixture.analytics }));
vi.mock('@/components/PageViewTracker', () => ({ PageViewTracker: () => null }));
vi.mock('@/lib/supabase-browser', () => ({ createSupabaseBrowserClient: () => client }));

const client = { from(table: string) {
  const query: Query = { table, filters: [], single: false };
  fixture.reads.push(query);
  const builder = {
    select() { return builder; }, order() { return builder; }, limit() { return builder; },
    eq(...args: unknown[]) { query.filters.push(['eq', ...args]); return builder; },
    in(...args: unknown[]) { query.filters.push(['in', ...args]); return builder; },
    or(...args: unknown[]) { query.filters.push(['or', ...args]); return builder; },
    abortSignal() { return builder; },
    single() { query.single = true; return builder; },
    maybeSingle() { query.single = true; return builder; },
    then(resolve: (value: unknown) => unknown, reject: (error: unknown) => unknown) {
      return Promise.resolve(fixture.query(query)).then(resolve, reject);
    },
  };
  return builder;
} };

import Queue from '../../src/app/[locale]/approval/page';
import Detail from '../../src/app/[locale]/approval/[id]/page';

type Kind = 'queue' | 'detail';
type Props = { children?: ReactNode; actions?: ReactNode; onClick?: () => Promise<void> | void; onChange?: (event: unknown) => void; disabled?: boolean; role?: string };
let mounted: { deps: unknown[]; cleanup: void | (() => void) }[] = [];
function render(kind: Kind) {
  fixture.cursor = 0;
  fixture.effects = [];
  const wrapper = (kind === 'queue' ? Queue : Detail)();
  const inner = wrapper.props.children;
  const view = inner.type();
  fixture.effects.forEach(({ run, deps }, i) => {
    if (mounted[i] && sameDeps(mounted[i].deps, deps)) return;
    mounted[i]?.cleanup?.();
    mounted[i] = { deps, cleanup: run() };
  });
  return view;
}
function elements(node: ReactNode): { type: unknown; props: Props }[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!isValidElement<Props>(node)) return [];
  return [node, ...elements(node.props.children), ...elements(node.props.actions)];
}
function text(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(text).join('');
  return isValidElement<Props>(node) ? text(node.props.children) : '';
}
function buttons(view: ReactNode, label: string) {
  return elements(view).filter(element => element.type === 'button' && text(element.props.children) === label);
}
function button(view: ReactNode, label: string) {
  const matches = buttons(view, label);
  expect(matches, label).toHaveLength(1);
  return matches[0].props;
}
const flush = () => new Promise<void>(resolve => setImmediate(resolve));
async function load(kind: Kind) { render(kind); await flush(); return render(kind); }
function unmount() { mounted.forEach(effect => effect.cleanup?.()); mounted = []; }
function row(extra: Row = {}): Row {
  return { id: 'synthetic-warranty', reference_number: 'SYNTHETIC-001', product_name: 'Synthetic warranty',
    status: 'pending_approval', issuer_company_id: 'company-a', created_by: 'teammate', issuer_user_id: 'teammate',
    created_at: '2026-11-26T00:00:00Z', ...extra };
}
function member(role = 'approver', extra: Row = {}): Row {
  return { id: 'synthetic-membership', user_id: 'synthetic-user', company_id: 'company-a', role, is_active: true, ...extra };
}

beforeEach(() => {
  Object.assign(fixture, { hooks: [], cursor: 0, effects: [], locale: 'en',
    user: { id: 'synthetic-user' }, profile: { role: 'user' }, itemId: 'synthetic-warranty',
    memberships: [member()], rows: [row()], reads: [] });
  mounted = [];
  fixture.analytics.mockReset();
  fixture.action.mockReset().mockResolvedValue(new Response('{}', { status: 200 }));
  vi.stubGlobal('fetch', fixture.action);
  fixture.query.mockReset().mockImplementation((query: Query) => {
    let rows = query.table === 'company_members' ? fixture.memberships : query.table === 'warranties' ? fixture.rows : [];
    rows = rows.filter(row => query.filters.every(([op, field, value]) => op === 'eq' ? row[String(field)] === value
      : op === 'in' ? (value as unknown[]).includes(row[String(field)]) : true));
    return { data: query.single ? rows[0] || null : rows, error: null };
  });
});
afterEach(() => { unmount(); vi.unstubAllGlobals(); });

for (const kind of ['queue', 'detail'] as const) {
  const approve = kind === 'queue' ? 'Approve' : 'Approve warranty';
  describe(`${kind}: company-scoped approval permission`, () => {
    it.each(['approver', 'company_admin', 'platform_admin'])('ordinary user with active %s membership can approve', async role => {
      fixture.memberships = [member(role)];
      const view = await load(kind);
      expect(button(view, approve).disabled).toBe(false);
      const membership = fixture.reads.find(query => query.table === 'company_members')!;
      expect(membership.filters).toContainEqual(['eq', 'user_id', 'synthetic-user']);
      expect(membership.filters).toContainEqual(['eq', 'is_active', true]);
      expect(membership.filters).toContainEqual(['in', 'role', ['approver', 'company_admin', 'platform_admin']]);
      if (kind === 'detail') expect(membership.filters).toContainEqual(['eq', 'company_id', 'company-a']);
      else expect(fixture.reads.find(query => query.table === 'warranties')?.filters).toContainEqual([
        'or', 'issuer_user_id.eq.synthetic-user,created_by.eq.synthetic-user,issuer_company_id.in.(company-a)',
      ]);
    });
    it.each([
      ['viewer', [member('viewer')]], ['creator', [member('creator')]],
      ['revoked', [member('approver', { is_active: false })]],
      ['unrelated company', [member('approver', { company_id: 'company-b' })]],
      ['other user', [member('approver', { user_id: 'someone-else' })]], ['none', []],
    ] as [string, Row[]][])('denies %s even when an otherwise readable pending row is returned', async (_name, memberships) => {
      fixture.memberships = memberships;
      const view = await load(kind);
      expect(buttons(view, approve)).toHaveLength(0);
      expect(buttons(view, 'Reject with reason')).toHaveLength(0);
      expect(fixture.action).not.toHaveBeenCalled();
      if (kind === 'queue') {
        const scope = fixture.reads.find(query => query.table === 'warranties')!.filters.find(([op]) => op === 'or')![1];
        expect(scope).not.toContain('issuer_company_id.in.(company-a)');
      }
    });
    it.each(['approver', 'company_admin'])('does not treat profile-only %s as global authority', async role => {
      fixture.profile = { role }; fixture.memberships = [];
      expect(buttons(await load(kind), approve)).toHaveLength(0);
    });
    it.each(['admin', 'super_admin', 'platform_admin'])('preserves API global %s authority without membership', async role => {
      fixture.profile = { role }; fixture.memberships = [];
      expect(button(await load(kind), approve).disabled).toBe(false);
      expect(fixture.reads.some(query => query.table === 'company_members')).toBe(false);
    });
    it('fails closed on rejected membership lookup and restores loading', async () => {
      const read = fixture.query.getMockImplementation()!;
      fixture.query.mockImplementation(query => query.table === 'company_members'
        ? Promise.reject(new Error('Synthetic private failure')) : read(query));
      const view = await load(kind);
      expect(buttons(view, approve)).toHaveLength(0);
      expect(elements(view).some(element => element.props.role === 'alert')).toBe(true);
      expect(text(view)).not.toContain('Synthetic private failure');
    });
    it('does not carry prior-user approval access into a replacement session', async () => {
      expect(button(await load(kind), approve).disabled).toBe(false);
      fixture.user = { id: 'replacement-user' };
      const pending = render(kind);
      expect(buttons(pending, approve)).toHaveLength(0);
      await flush();
      expect(buttons(render(kind), approve)).toHaveLength(0);
    });
  });

  for (const action of kind === 'queue' ? ['approve', 'submit'] as const : ['approve', 'reject', 'submit'] as const) {
    describe(`${kind}: ${action} response recovery`, () => {
      async function prepare() {
        if (action === 'submit') {
          fixture.memberships = [];
          fixture.rows = [row({ status: 'draft', created_by: 'synthetic-user' })];
        }
        let view = await load(kind);
        if (kind === 'queue' && action === 'submit') {
          button(view, 'Draft').onClick!();
          view = render(kind);
        }
        if (action === 'reject') {
          elements(view).find(element => element.type === 'textarea')!.props.onChange!({ target: { value: 'Synthetic rejection reason' } });
          view = render(kind);
        }
        return button(view, action === 'approve' ? approve : action === 'reject' ? 'Reject with reason' : 'Submit for approval');
      }
      it.each([403, 409, 422, 500, 'network'] as const)('handles %s without success analytics and allows retry', async status => {
        const control = await prepare();
        let release!: () => void;
        fixture.action.mockImplementationOnce(() => new Promise<Response>((resolve, reject) => {
          release = () => status === 'network' ? reject(new TypeError('Synthetic private network failure'))
            : resolve(Response.json({ error: 'Synthetic private backend failure' }, { status }));
        }));
        const attempt = control.onClick!();
        expect(elements(render(kind)).filter(element => element.type === 'button' && element.props.disabled === true).length).toBeGreaterThan(0);
        release(); await attempt;
        const failed = render(kind);
        expect(fixture.analytics).not.toHaveBeenCalled();
        expect(elements(failed).filter(element => element.props.role === 'alert')).toHaveLength(1);
        expect(text(failed)).toContain('Could not complete the action. Please retry.');
        expect(text(failed)).not.toContain('Synthetic private');
        const retry = button(failed, action === 'approve' ? approve : action === 'reject' ? 'Reject with reason' : 'Submit for approval');
        expect(retry.disabled).toBe(false);
        await retry.onClick!();
        expect(fixture.analytics).toHaveBeenCalledExactlyOnceWith(action, expect.objectContaining({ warranty_id: 'synthetic-warranty', view_mode: 'seller' }));
        expect(fixture.action).toHaveBeenLastCalledWith(`/api/warranties/synthetic-warranty/${action}`, action === 'reject'
          ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"reason":"Synthetic rejection reason"}' }
          : { method: 'POST' });
        expect(elements(render(kind)).some(element => element.props.role === 'alert')).toBe(false);
      });
    });
  }

  it(`${kind}: company approver can submit their own draft`, async () => {
    fixture.rows = [row({ status: 'draft', created_by: 'synthetic-user' })];
    let view = await load(kind);
    if (kind === 'queue') { button(view, 'Draft').onClick!(); view = render(kind); }
    await button(view, 'Submit for approval').onClick!();
    expect(fixture.action).toHaveBeenCalledWith('/api/warranties/synthetic-warranty/submit', { method: 'POST' });
    expect(fixture.analytics).toHaveBeenCalledExactlyOnceWith('submit', expect.objectContaining({ warranty_id: 'synthetic-warranty' }));
  });

  it.each([409, 422, 'network'] as const)(`${kind}: refreshes stale status after %s and retains safe error`, async outcome => {
    const view = await load(kind);
    fixture.action.mockImplementationOnce(() => {
      fixture.rows = [row({ status: 'active' })];
      return outcome === 'network' ? Promise.reject(new TypeError('Synthetic network failure'))
        : Promise.resolve(Response.json({ error: 'Synthetic stale response' }, { status: outcome }));
    });
    await button(view, approve).onClick!();
    const refreshed = render(kind);
    expect(buttons(refreshed, approve)).toHaveLength(0);
    expect(elements(refreshed).some(element => element.props.role === 'alert')).toBe(true);
    expect(text(refreshed)).toContain('Could not complete the action. Please retry.');
    expect(fixture.analytics).not.toHaveBeenCalled();
  });

  it.each(['removed', 'revoked'])(`${kind}: refreshes removed records or revoked permission (%s) after conflict`, async change => {
    const view = await load(kind);
    fixture.action.mockImplementationOnce(() => {
      if (change === 'removed') fixture.rows = [];
      else fixture.memberships = [];
      return Promise.resolve(Response.json({}, { status: 409 }));
    });
    await button(view, approve).onClick!();
    const refreshed = render(kind);
    expect(buttons(refreshed, approve)).toHaveLength(0);
    expect(elements(refreshed).some(element => element.props.role === 'alert')).toBe(true);
    expect(fixture.analytics).not.toHaveBeenCalled();
  });
}

it('queue gates each row separately when a member can approve only one issuer company', async () => {
  fixture.rows = [row(), row({ id: 'unrelated-warranty', issuer_company_id: 'company-b' })];
  expect(buttons(await load('queue'), 'Approve')).toHaveLength(1);
});

it('detail never submits an unrelated author draft through its author controls', async () => {
  fixture.memberships = [];
  fixture.rows = [row({ status: 'draft' })];
  expect(buttons(await load('detail'), 'Submit for approval')).toHaveLength(0);
});

it.each(['queue', 'detail'] as const)('%s renders localized Arabic failure copy', async kind => {
  fixture.locale = 'ar';
  const view = await load(kind);
  fixture.action.mockRejectedValueOnce(new TypeError('Synthetic network failure'));
  await button(view, kind === 'queue' ? '\u0645\u0648\u0627\u0641\u0642\u0629' : '\u0645\u0648\u0627\u0641\u0642\u0629 \u0639\u0644\u0649 \u0627\u0644\u0636\u0645\u0627\u0646').onClick!();
  expect(text(render(kind))).toContain('\u062a\u0639\u0630\u0631 \u0625\u0643\u0645\u0627\u0644 \u0627\u0644\u0625\u062c\u0631\u0627\u0621.');
  expect(fixture.analytics).not.toHaveBeenCalled();
});
