'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Calendar, RefreshCw } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { PageViewTracker } from '@/components/PageViewTracker';
import { ProtectedRouteNotice } from '@/components/dashboard/ProtectedRouteNotice';

interface ExtensionRow {
  id: string;
  new_end_date: string;
  price: number | null;
  currency: string;
  commission_rate: number | null;
  commission_amount: number | null;
  terms: string | null;
  is_purchased: boolean;
  created_at: string;
  warranty_id: string;
  warranties: {
    product_name: string;
    product_name_ar: string | null;
    reference_number: string;
    end_date: string;
  } | null;
}

export default function ExtensionsPage() {
  const params = useParams() ?? {};
  const locale = (params.locale as string) || 'en';
  const isRTL = locale === 'ar';
  const { user, loading: authLoading } = useAuth();
  const [extensions, setExtensions] = useState<ExtensionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'purchased' | 'available'>('all');
  const [fetchError, setFetchError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setExtensions([]);
      setFetchError('');
      setLoading(false);
      return;
    }

    const fetchExtensions = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/extensions?filter=${filter}`, { cache: 'no-store' });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload?.error || 'Failed to load extensions');
        }

        setExtensions((payload?.data || []) as ExtensionRow[]);
        setFetchError('');
      } catch (error) {
        setExtensions([]);
        setFetchError(error instanceof Error ? error.message : 'Failed to load extensions');
      } finally {
        setLoading(false);
      }
    };

    fetchExtensions();
  }, [user, authLoading, filter]);

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  const filterTabs = [
    { key: 'all' as const, label: isRTL ? 'الكل' : 'All' },
    { key: 'available' as const, label: isRTL ? 'متاح' : 'Available' },
    { key: 'purchased' as const, label: isRTL ? 'تم الشراء' : 'Purchased' },
  ];

  if (loading && extensions.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#1A1A2E] border-t-transparent rounded-full animate-spin" />
          <p className="text-[15px] text-[#86868b]">{isRTL ? 'جاري تحميل التمديدات...' : 'Loading extensions...'}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <ProtectedRouteNotice
        locale={locale}
        isRTL={isRTL}
        eyebrow={isRTL ? 'إدارة التمديدات' : 'Extension management'}
        title={isRTL ? 'التمديدات' : 'Extensions'}
        subtitle={isRTL ? 'عرض التمديدات المتاحة والمشتراة يحتاج إلى جلسة نشطة.' : 'Viewing available and purchased extensions requires an active session.'}
        message={isRTL ? 'سجل الدخول لمراجعة عروض التمديد والأسعار وحالات الشراء الخاصة بضماناتك.' : 'Sign in to review extension offers, pricing, and purchase states across your warranties.'}
        crumbs={[
          { label: 'Dashboard', href: `/${locale}/dashboard` },
          { label: isRTL ? 'التمديدات' : 'Extensions' },
        ]}
      />
    );
  }

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
      <PageViewTracker
        pageName="extensions"
        pageType="operations"
        locale={locale}
        extra={{ extension_count: extensions.length, filter }}
      />
      <DashboardPageShell
        eyebrow={isRTL ? 'إدارة التمديدات' : 'Extension management'}
        title={isRTL ? 'التمديدات' : 'Extensions'}
        subtitle={isRTL ? 'راجع عروض تمديد الضمان المتاحة والمشتراة من واجهة تشغيل واحدة.' : 'Review available and purchased warranty extensions from one operating surface.'}
        crumbs={[
          { label: 'Dashboard', href: `/${locale}/dashboard` },
          { label: isRTL ? 'التمديدات' : 'Extensions' },
        ]}
        stats={[
          { label: isRTL ? 'الإجمالي' : 'Total', value: extensions.length },
          { label: isRTL ? 'الحالة' : 'Filter', value: filterTabs.find((tab) => tab.key === filter)?.label || filter },
        ]}
        auditNote={isRTL ? 'يجب أن يظهر كل عرض تمديد ضمن نفس تجربة لوحة التحكم وضمن صلاحيات المستخدم الصحيحة.' : 'Every extension offer should appear inside the same dashboard experience and the correct user access scope.'}
      >
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 sm:py-12">
          {fetchError ? (
            <div className="mb-6 rounded-2xl border border-[#ffd7d3] bg-[#fff5f4] px-5 py-4 text-[#7a271a] shadow-sm">
              <p className="text-[15px] font-semibold">{isRTL ? 'تعذر تحميل التمديدات الآن' : 'Extensions could not load right now'}</p>
              <p className="mt-1 text-[13px] text-[#8a3b2f]">
                {isRTL ? 'تحقق من صلاحيات العرض أو حاول إعادة تحميل البيانات.' : 'Check access rules or retry loading the data.'}
              </p>
            </div>
          ) : null}

          <div className="bg-white rounded-2xl ring-1 ring-[#d2d2d7]/40 shadow-sm mb-6">
            <div className="p-4 sm:p-6 flex flex-wrap gap-2">
              {filterTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className={`px-4 py-2 rounded-full text-[13px] font-medium transition-all ${filter === tab.key ? 'bg-[#1A1A2E] text-white shadow-sm' : 'bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e8e8ed]'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {extensions.length === 0 ? (
            <div className="bg-white rounded-2xl ring-1 ring-[#d2d2d7]/40 shadow-sm p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#f5f5f7] flex items-center justify-center mx-auto mb-4">
                <RefreshCw className="w-7 h-7 text-[#86868b]" />
              </div>
              <h3 className="text-[17px] font-semibold text-[#1d1d1f] mb-1">{isRTL ? 'لا توجد تمديدات' : 'No extensions found'}</h3>
              <p className="text-[14px] text-[#86868b]">{isRTL ? 'يمكنك تمديد الضمان من صفحة تفاصيل الضمان.' : 'Extend warranties from the warranty detail page.'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {extensions.map((extension) => (
                <div key={extension.id} className="bg-white rounded-2xl ring-1 ring-[#d2d2d7]/40 shadow-sm p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        {extension.is_purchased ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium bg-[#e8faf0] text-[#1a7d42]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#30d158]" />
                            {isRTL ? 'تم الشراء' : 'Purchased'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium bg-[#fff8e6] text-[#a06800]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#ff9f0a]" />
                            {isRTL ? 'متاح' : 'Available'}
                          </span>
                        )}
                      </div>
                      {extension.warranties ? (
                        <Link href={`/${locale}/warranties/${extension.warranty_id}`} className="text-[15px] font-medium text-[#1d1d1f] hover:text-[#0071e3] transition-colors">
                          {isRTL && extension.warranties.product_name_ar ? extension.warranties.product_name_ar : extension.warranties.product_name}
                        </Link>
                      ) : null}
                      <div className="flex items-center gap-3 mt-2 text-[13px] text-[#86868b]">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {isRTL ? 'يمتد حتى:' : 'Extends to:'} {formatDate(extension.new_end_date)}
                        </span>
                      </div>
                    </div>
                    <div className={`${isRTL ? 'text-left' : 'text-right'} shrink-0`}>
                      {typeof extension.price === 'number' ? (
                        <p className="text-[20px] font-semibold text-[#1d1d1f]">{extension.price.toLocaleString()} {extension.currency}</p>
                      ) : (
                        <p className="text-[14px] text-[#86868b]">{isRTL ? 'بانتظار تسعير البائع' : 'Awaiting seller pricing'}</p>
                      )}
                      <p className="text-[12px] text-[#86868b] mt-1">{formatDate(extension.created_at)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DashboardPageShell>
    </div>
  );
}
