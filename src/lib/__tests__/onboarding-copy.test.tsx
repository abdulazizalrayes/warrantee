import { expect, test, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactNode } from 'react';

const fixture = vi.hoisted(() => ({ locale: 'en', account: 'consumer' }));
vi.mock('next/navigation', () => ({ useParams: () => ({ locale: fixture.locale }), useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }) }));
vi.mock('next/link', () => ({ default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a> }));
vi.mock('@/lib/auth-context', () => ({ useAuth: () => ({ user: { id: 'synthetic-user', user_metadata: {} },
  profile: { id: 'synthetic-user', account_type: fixture.account }, loading: false, profileLoading: false, profileError: null }) }));
vi.mock('@/lib/supabase-browser', () => ({ createSupabaseBrowserClient: () => ({}) }));
vi.mock('@/lib/ga4-events', () => ({ trackActivationStarted: vi.fn(), trackOnboardingCompleted: vi.fn(), trackOnboardingJourney: vi.fn(), trackOnboardingTemplateSelected: vi.fn() }));
import OnboardingPage from '@/app/[locale]/onboarding/page';

for (const locale of ['en', 'ar']) for (const account of ['consumer', 'business']) {
  test(`correct skip-setup wording in ${locale} ${account}`, () => {
    fixture.locale = locale; fixture.account = account;
    const html = renderToStaticMarkup(<OnboardingPage />);
    expect(html).toContain(locale === 'ar' ? '\u062a\u062e\u0637\u064a \u0627\u0644\u0625\u0639\u062f\u0627\u062f' : 'Skip for now');
    expect(html).not.toContain('\u0627\u0644\u0625\u0639\u062f\u0627\u062d');
  });
}
