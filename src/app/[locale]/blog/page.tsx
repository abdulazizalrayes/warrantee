import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { DIRECTION, getContentLocale, getDictionary, normalizeLocale } from '@/lib/i18n';
import {
  COMPARISON_PAGES,
  RESOURCE_PAGES,
  buildSeoPagePath,
} from '@/lib/seo-content';

interface BlogPageProps {
  params: Promise<{ locale: string }>;
}

const posts = {
  en: [
    {
      title: 'How to manage warranties without spreadsheets',
      eyebrow: 'Warranty operations',
      description:
        'A practical operating model for moving warranty records, receipts, claims, and expiry reminders out of inboxes and into a single auditable system.',
      href: '/guide',
    },
    {
      title: 'What to look for in warranty management software',
      eyebrow: 'Buyer guide',
      description:
        'The core capabilities sellers and buyers need: OCR capture, approval workflows, claim tracking, bilingual certificates, reminders, and API / CLI / MCP-ready integrations.',
      href: '/features',
    },
    {
      title: 'Warranty claims management: from proof to resolution',
      eyebrow: 'Claims workflow',
      description:
        'How clean evidence, document provenance, seller status, and approval history reduce disputes and make warranty decisions easier to trust.',
      href: '/faq',
    },
  ],
  ar: [
    {
      title: 'كيف تدير الضمانات بدون جداول مشتتة',
      eyebrow: 'تشغيل الضمانات',
      description:
        'نموذج عملي لنقل سجلات الضمان والفواتير والمطالبات وتذكيرات الانتهاء من البريد والجداول إلى نظام واحد قابل للتدقيق.',
      href: '/guide',
    },
    {
      title: 'ما الذي يجب البحث عنه في برنامج إدارة الضمانات',
      eyebrow: 'دليل الشراء',
      description:
        'القدرات الأساسية للبائعين والمشترين: قراءة المستندات، سير الموافقات، تتبع المطالبات، شهادات ثنائية اللغة، تذكيرات، وتكاملات جاهزة عبر API / CLI / MCP.',
      href: '/features',
    },
    {
      title: 'إدارة مطالبات الضمان: من الإثبات إلى القرار',
      eyebrow: 'سير المطالبات',
      description:
        'كيف تساعد الأدلة الواضحة ومصدر المستند وحالة البائع وسجل الموافقات في تقليل النزاعات وجعل قرارات الضمان أكثر موثوقية.',
      href: '/faq',
    },
  ],
};

export default async function BlogPage({ params }: BlogPageProps) {
  const { locale: localeParam } = await params;
  const locale = normalizeLocale(localeParam);
  const contentLocale = getContentLocale(locale);
  const dictionary = getDictionary(locale);
  const isRTL = DIRECTION[locale] === 'rtl';
  const items = posts[contentLocale];
  const resourcePages = RESOURCE_PAGES.map((page) => ({
    title: page.title[contentLocale],
    description: page.description[contentLocale],
    href: buildSeoPagePath(page.kind, page.slug),
  }));
  const comparisonPages = COMPARISON_PAGES.map((page) => ({
    title: page.title[contentLocale],
    description: page.description[contentLocale],
    href: buildSeoPagePath(page.kind, page.slug),
  }));

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="min-h-screen bg-warm-white text-navy">
      <Navbar locale={locale} dictionary={dictionary} />
      <main>
        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.24em] text-[#0071e3]">
              {isRTL ? 'موارد وارنتي' : 'Warrantee resources'}
            </p>
            <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-navy md:text-6xl">
              {isRTL
                ? 'أدلة إدارة الضمانات للفرق التي تحتاج إلى إثبات وسرعة وثقة.'
                : 'Warranty management guides for teams that need proof, speed, and trust.'}
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-navy/60">
              {isRTL
                ? 'استخدم هذا المركز لفهم تتبع الضمانات وسير المطالبات وأدلة المستندات وانضمام البائعين وتشغيل الضمانات عبر API / CLI / MCP.'
                : 'Use this hub to understand warranty tracking, claim workflows, document evidence, seller onboarding, and API / CLI / MCP-ready warranty operations.'}
            </p>
          </div>
        </section>

        <section className="px-4 pb-24 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
            {items.map((post) => (
              <article key={post.title} className="rounded-3xl border border-navy/10 bg-white p-7 shadow-sm">
                <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-[#0071e3]">{post.eyebrow}</p>
                <h2 className="text-xl font-bold text-navy">{post.title}</h2>
                <p className="mt-4 text-sm leading-7 text-navy/60">{post.description}</p>
                <Link
                  href={`/${locale}${post.href}`}
                  className="mt-6 inline-flex text-sm font-semibold text-[#0071e3] hover:text-[#0077ED]"
                >
                  {isRTL ? 'اقرأ الدليل المرتبط' : 'Read related guide'}
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="px-4 pb-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#0071e3]">
                {isRTL ? 'أدلة متخصصة' : 'Authority guides'}
              </p>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-navy md:text-4xl">
                {isRTL ? 'مواضيع يبحث عنها المشترون والفرق قبل اختيار منصة ضمان.' : 'Topics buyers and teams search before choosing a warranty platform.'}
              </h2>
            </div>
            <div className="mt-8 grid gap-5 md:grid-cols-2">
              {resourcePages.map((page) => (
                <article key={page.href} className="rounded-3xl border border-navy/10 bg-white p-7 shadow-sm">
                  <h3 className="text-xl font-bold text-navy">{page.title}</h3>
                  <p className="mt-4 text-sm leading-7 text-navy/60">{page.description}</p>
                  <Link
                    href={`/${locale}${page.href}`}
                    className="mt-6 inline-flex text-sm font-semibold text-[#0071e3] hover:text-[#0077ED]"
                  >
                    {isRTL ? 'اقرأ الدليل' : 'Read guide'}
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 pb-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl rounded-3xl bg-[#f5f5f7] p-6 sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#0071e3]">
              {isRTL ? 'مقارنات القرار' : 'Decision comparisons'}
            </p>
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              {comparisonPages.map((page) => (
                <article key={page.href} className="rounded-3xl bg-white p-7 shadow-sm">
                  <h3 className="text-xl font-bold text-navy">{page.title}</h3>
                  <p className="mt-4 text-sm leading-7 text-navy/60">{page.description}</p>
                  <Link
                    href={`/${locale}${page.href}`}
                    className="mt-6 inline-flex text-sm font-semibold text-[#0071e3] hover:text-[#0077ED]"
                  >
                    {isRTL ? 'قارن الخيارات' : 'Compare options'}
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer locale={locale} dictionary={dictionary} />
    </div>
  );
}
