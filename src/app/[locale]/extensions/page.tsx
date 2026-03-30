'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Calendar, RefreshCw } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

interface ExtensionRow {
  id: string; new_end_date: string; price: number | null; currency: string;
  commission_rate: number | null; commission_amount: number | null; terms: string | null;
  is_purchased: boolean; created_at: string; warranty_id: string;
  warranties: { product_name: string; product_name_ar: string | null; reference_number: string; end_date: string } | null;
}

export default function ExtensionsPage() {
  const params = useParams();
  const locale = (params.locale as string) || 'en';
  const isRTL = locale === 'ar';
  const { user, loading: authLoading } = useAuth();
  const supabase = createSupabaseBrowserClient();
  const [extensions, setExtensions] = useState<ExtensionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'purchased' | 'available'>('all');

  useEffect(() => {
    if (authLoading || !user) return;
    const fetchExtensions = async () => {
      setLoading(true);
      const { data: userWarrantyIds } = await supabase.from('warranties').select('id').or(`created_by.eq.${user.id},recipient_user_id.eq.${user.id}`);
      if (!userWarrantyIds || userWarrantyIds.length === 0) { setExtensions([]); setLoading(false); return; }
      const ids = userWarrantyIds.map((w: { id: string }) => w.id);
      let query = supabase.from('warranty_extensions').select('id, new_end_date, price, currency, commission_rate, commission_amount, terms, is_purchased, created_at, warranty_id, warranties(product_name, product_name_ar, reference_number, end_date)').in('warranty_id', ids).order('created_at', { ascending: false });
      if (filter === 'purchased') query = query.eq('is_purchased', true);
      else if (filter === 'available') query = query.eq('is_purchased', false);
      const { data } = await query;
      if (data) setExtensions(data as unknown as ExtensionRow[]);
      setLoading(false);
    };
    fetchExtensions();
  }, [user, authLoading, filter, supabase]);

  const formatDate = (d: string) => new Date(d).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const filterTabs = [
    { key: 'all' as const, label: isRTL ? '\u0627\u0644\u0643\u0644' : 'All' },
    { key: 'available' as const, label: isRTL ? '\u0645\u062a\u0627\u062d' : 'Available' },
    { key: 'purchased' as const, label: isRTL ? '\u062a\u0645 \u0627\u0644\u0634\u0631\u0627\u0621' : 'Purchased' },
  ];

  if (loading && extensions.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#1A1A2E] border-t-transparent rounded-full animate-spin" />
          <p className="text-[15px] text-[#86868b]">{isRTL ? '\u062c\u0627\u0631\u064a \u0627\u0644\u062a\u062d\u0645\u064a\u0644...' : 'Loading extensions...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="mb-8">
        <h1 className="text-[32px] sm:text-[40px] font-semibold tracking-tight text-[#1d1d1f]">
          {isRTL ? '\u0627\u0644\u062a\u0645\u062f\u064a\u062f\u0627\u062a' : 'Extensions'}
        </h1>
        <p className="text-[15px] text-[#86868b] mt-1">
          {isRTL ? '\u062a\u0645\u062f\u064a\u062f\u0627\u062a \u0627\u0644\u0636\u0645\u0627\u0646 \u0627\u0644\u0645\u062a\u0627\u062d\u0629 \u0648\u0627\u0644\u0645\u0634\u062a\u0631\u0627\u0629' : 'Available and purchased warranty extensions'}
        </p>
      </div>

      <div className="bg-white rounded-2xl ring-1 ring-[#d2d2d7]/40 shadow-sm mb-6">
        <div className="p-4 sm:p-6 flex flex-wrap gap-2">
          {filterTabs.map((t) => (
            <button key={t.key} onClick={() => setFilter(t.key)}
              className={`px-4 py-2 rounded-full text-[13px] font-medium transition-all ${filter === t.key ? 'bg-[#1A1A2E] text-white shadow-sm' : 'bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e8e8ed]'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {extensions.length === 0 ? (
        <div className="bg-white rounded-2xl ring-1 ring-[#d2d2d7]/40 shadow-sm p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#f5f5f7] flex items-center justify-center mx-auto mb-4">
            <RefreshCw className="w-7 h-7 text-[#86868b]" />
          </div>
          <h3 className="text-[17px] font-semibold text-[#1d1d1f] mb-1">{isRTL ? '\u0644\u0627 \u062a\u0648\u062c\u062f \u062a\u0645\u062f\u064a\u062f\u0627\u062a' : 'No extensions found'}</h3>
          <p className="text-[14px] text-[#86868b]">{isRTL ? '\u064a\u0645\u0643\u0646\u0643 \u062a\u0645\u062f\u064a\u062f \u0627\u0644\u0636\u0645\u0627\u0646 \u0645\u0646 \u0635\u0641\u062d\u0629 \u0627\u0644\u062a\u0641\u0627\u0635\u064a\u0644' : 'Extend warranties from the warranty detail page'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {extensions.map((ext) => (
            <div key={ext.id} className="bg-white rounded-2xl ring-1 ring-[#d2d2d7]/40 shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    {ext.is_purchased
                      ? <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium bg-[#e8faf0] text-[#1a7d42]"><span className="w-1.5 h-1.5 rounded-full bg-[#30d158]" />{isRTL ? '\u062a\u0645 \u0627\u0644\u0634\u0631\u0627\u0621' : 'Purchased'}</span>
                      : <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium bg-[#fff8e6] text-[#a06800]"><span className="w-1.5 h-1.5 rounded-full bg-[#ff9f0a]" />{isRTL ? '\u0645\u062a\u0627\u062d' : 'Available'}</span>
                    }
                  </div>
                  {ext.warranties && (
                    <Link href={`/${locale}/warranties/${ext.warranty_id}`} className="text-[15px] font-medium text-[#1d1d1f] hover:text-[#0071e3] transition-colors">
                      {isRTL && ext.warranties.product_name_ar ? ext.warranties.product_name_ar : ext.warranties.product_name}
                    </Link>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-[13px] text-[#86868b]">
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{isRTL ? '\u062a\u0645\u062f\u064a\u062f \u062d\u062a\u0649:' : 'Extends to:'} {formatDate(ext.new_end_date)}</span>
                  </div>
                </div>
                <div className={`text-${isRTL ? 'left' : 'right'} shrink-0`}>
                  {ext.price ? <p className="text-[20px] font-semibold text-[#1d1d1f]">{ext.price.toLocaleString()} {ext.currency}</p> : <p className="text-[14px] text-[#86868b]">{isRTL ? '\u0645\u062c\u0627\u0646\u064a' : 'Free'}</p>}
                  <p className="text-[12px] text-[#86868b] mt-1">{formatDate(ext.created_at)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
