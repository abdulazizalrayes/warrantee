// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-client';

type CoverageType = 'duration' | 'mileage' | 'usage_hours' | 'event_count' | 'custom';

interface CoverageItem {
  id: string;
  warranty_id: string;
  component_name: string;
  component_name_ar: string | null;
  coverage_type: CoverageType;
  start_date: string | null;
  end_date: string | null;
  start_value: number | null;
  end_value: number | null;
  unit: string | null;
  exclusions: string | null;
  exclusions_ar: string | null;
  is_active: boolean;
  sort_order: number;
}

const TYPE_ICONS: Record<CoverageType, string> = {
  duration: '🕐',
  mileage: '🚗',
  usage_hours: '⚡',
  event_count: '🔄',
  custom: '📋',
};

const TYPE_LABELS: Record<CoverageType, string> = {
  duration: 'Duration',
  mileage: 'Mileage',
  usage_hours: 'Operating Hours',
  event_count: 'Event Count',
  custom: 'Custom',
};

function calculateProgress(item: CoverageItem): { percent: number; label: string; isExpired: boolean } {
  if (item.coverage_type === 'duration' && item.start_date && item.end_date) {
    const start = new Date(item.start_date).getTime();
    const end = new Date(item.end_date).getTime();
    const now = Date.now();
    const total = end - start;
    const elapsed = now - start;
    const percent = Math.min(100, Math.max(0, (elapsed / total) * 100));
    const daysLeft = Math.max(0, Math.ceil((end - now) / 86400000));
    const isExpired = now > end;
    return {
      percent,
      label: isExpired ? `Expired ${Math.abs(daysLeft)} days ago` : `${daysLeft} days remaining`,
      isExpired,
    };
  }

  if (['mileage', 'usage_hours', 'event_count'].includes(item.coverage_type) && item.start_value != null && item.end_value != null) {
    // For non-duration types, we show the range. Current value would need to be tracked separately.
    // For now, show the coverage range.
    const unit = item.unit || '';
    return {
      percent: 0,
      label: `${item.start_value.toLocaleString()} – ${item.end_value.toLocaleString()} ${unit}`,
      isExpired: false,
    };
  }

  return { percent: 0, label: 'Coverage details unavailable', isExpired: false };
}

function getProgressColor(percent: number, isExpired: boolean): string {
  if (isExpired) return 'bg-gray-300';
  if (percent >= 90) return 'bg-red-500';
  if (percent >= 75) return 'bg-amber-500';
  return 'bg-green-500';
}

/* ─── Display Component ─── */
export function CoverageItemsDisplay({ warrantyId }: { warrantyId: string }) {
  const [items, setItems] = useState<CoverageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('warranty_coverage_items')
        .select('*')
        .eq('warranty_id', warrantyId)
        .order('sort_order', { ascending: true });
      if (data) setItems(data as CoverageItem[]);
      setLoading(false);
    }
    load();
  }, [warrantyId]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-28 bg-gray-100 animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-gray-500 italic py-4">
        No coverage items defined. This warranty uses the standard start/end date coverage.
      </p>
    );
  }

  const active = items.filter((i) => i.is_active);
  const expired = items.filter((i) => !i.is_active);

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">
        Coverage Items ({items.length})
      </p>

      {active.map((item) => {
        const { percent, label, isExpired } = calculateProgress(item);
        return (
          <div key={item.id} className="p-4 bg-white border border-gray-200 rounded-xl">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">{TYPE_ICONS[item.coverage_type]}</span>
                <div>
                  <p className="font-semibold text-gray-900">{item.component_name}</p>
                  {item.component_name_ar && (
                    <p className="text-sm text-gray-500" dir="rtl">{item.component_name_ar}</p>
                  )}
                </div>
              </div>
              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                {TYPE_LABELS[item.coverage_type]}
              </span>
            </div>

            {item.coverage_type === 'duration' && (
              <div className="mt-3">
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${getProgressColor(percent, isExpired)}`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">{label}</p>
              </div>
            )}

            {['mileage', 'usage_hours', 'event_count'].includes(item.coverage_type) && (
              <p className="text-sm text-gray-600 mt-2">{label}</p>
            )}

            {item.exclusions && (
              <p className="text-xs text-gray-400 mt-2">
                Exclusions: {item.exclusions}
              </p>
            )}
          </div>
        );
      })}

      {expired.length > 0 && (
        <>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mt-4">
            Expired Coverage
          </p>
          {expired.map((item) => (
            <div key={item.id} className="p-4 bg-gray-50 border border-gray-200 rounded-xl opacity-60">
              <div className="flex items-center gap-2">
                <span className="text-lg">{TYPE_ICONS[item.coverage_type]}</span>
                <p className="font-medium text-gray-600">{item.component_name}</p>
                <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full ml-auto">Expired</span>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

/* ─── Editor Component (for warranty creation/edit form) ─── */
interface CoverageItemDraft {
  id?: string;
  component_name: string;
  component_name_ar: string;
  coverage_type: CoverageType;
  start_date: string;
  end_date: string;
  start_value: string;
  end_value: string;
  unit: string;
  exclusions: string;
  exclusions_ar: string;
}

const EMPTY_ITEM: CoverageItemDraft = {
  component_name: '',
  component_name_ar: '',
  coverage_type: 'duration',
  start_date: '',
  end_date: '',
  start_value: '',
  end_value: '',
  unit: '',
  exclusions: '',
  exclusions_ar: '',
};

export function CoverageItemsEditor({
  warrantyId,
  defaultStartDate,
  defaultEndDate,
}: {
  warrantyId?: string;
  defaultStartDate?: string;
  defaultEndDate?: string;
}) {
  const [items, setItems] = useState<CoverageItemDraft[]>([]);
  const supabase = createClient();

  useEffect(() => {
    if (warrantyId) {
      supabase
        .from('warranty_coverage_items')
        .select('*')
        .eq('warranty_id', warrantyId)
        .order('sort_order')
        .then(({ data }) => {
          if (data && data.length > 0) {
            setItems(
              data.map((d: any) => ({
                id: d.id,
                component_name: d.component_name || '',
                component_name_ar: d.component_name_ar || '',
                coverage_type: d.coverage_type,
                start_date: d.start_date || '',
                end_date: d.end_date || '',
                start_value: d.start_value?.toString() || '',
                end_value: d.end_value?.toString() || '',
                unit: d.unit || '',
                exclusions: d.exclusions || '',
                exclusions_ar: d.exclusions_ar || '',
              }))
            );
          }
        });
    }
  }, [warrantyId]);

  function addItem() {
    setItems([...items, { ...EMPTY_ITEM, start_date: defaultStartDate || '', end_date: defaultEndDate || '' }]);
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  function updateItem(index: number, field: keyof CoverageItemDraft, value: string) {
    setItems(items.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  }

  async function saveItems(targetWarrantyId: string) {
    // Delete existing items for this warranty
    await supabase.from('warranty_coverage_items').delete().eq('warranty_id', targetWarrantyId);

    if (items.length === 0) return;

    const rows = items.map((item, idx) => ({
      warranty_id: targetWarrantyId,
      component_name: item.component_name,
      component_name_ar: item.component_name_ar || null,
      coverage_type: item.coverage_type,
      start_date: item.coverage_type === 'duration' ? item.start_date || null : null,
      end_date: item.coverage_type === 'duration' ? item.end_date || null : null,
      start_value: ['mileage', 'usage_hours', 'event_count'].includes(item.coverage_type) ? parseFloat(item.start_value) || null : null,
      end_value: ['mileage', 'usage_hours', 'event_count'].includes(item.coverage_type) ? parseFloat(item.end_value) || null : null,
      unit: item.unit || null,
      exclusions: item.exclusions || null,
      exclusions_ar: item.exclusions_ar || null,
      sort_order: idx,
    }));

    await supabase.from('warranty_coverage_items').insert(rows);
  }

  // Expose saveItems via a data attribute so parent forms can call it
  useEffect(() => {
    (window as any).__coverageItemsSave = saveItems;
    return () => { delete (window as any).__coverageItemsSave; };
  }, [items]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">Coverage Items (Optional)</label>
        <button type="button" onClick={addItem} className="text-sm text-blue-600 hover:underline">
          + Add Coverage Item
        </button>
      </div>

      {items.length === 0 && (
        <p className="text-sm text-gray-400 italic">
          No coverage items. The warranty will use standard start/end date coverage.
        </p>
      )}

      {items.map((item, idx) => (
        <div key={idx} className="p-4 border border-gray-200 rounded-xl space-y-3 bg-gray-50">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">Item {idx + 1}</span>
            <button type="button" onClick={() => removeItem(idx)} className="text-xs text-red-500 hover:underline">Remove</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">Component Name (EN)</label>
              <input type="text" value={item.component_name} onChange={(e) => updateItem(idx, 'component_name', e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="e.g., Compressor" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Component Name (AR)</label>
              <input type="text" value={item.component_name_ar} onChange={(e) => updateItem(idx, 'component_name_ar', e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" dir="rtl" placeholder="مثال: الضاغط" />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500">Coverage Type</label>
            <select value={item.coverage_type} onChange={(e) => updateItem(idx, 'coverage_type', e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
              <option value="duration">Duration (Calendar Time)</option>
              <option value="mileage">Mileage (km/miles)</option>
              <option value="usage_hours">Operating Hours</option>
              <option value="event_count">Event Count (Cycles)</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          {item.coverage_type === 'duration' ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500">Start Date</label>
                <input type="date" value={item.start_date} onChange={(e) => updateItem(idx, 'start_date', e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500">End Date</label>
                <input type="date" value={item.end_date} onChange={(e) => updateItem(idx, 'end_date', e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-gray-500">Start Value</label>
                <input type="number" value={item.start_value} onChange={(e) => updateItem(idx, 'start_value', e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="0" />
              </div>
              <div>
                <label className="text-xs text-gray-500">End Value</label>
                <input type="number" value={item.end_value} onChange={(e) => updateItem(idx, 'end_value', e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="100000" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Unit</label>
                <input type="text" value={item.unit} onChange={(e) => updateItem(idx, 'unit', e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="km, hours, cycles" />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs text-gray-500">Exclusions (EN)</label>
            <input type="text" value={item.exclusions} onChange={(e) => updateItem(idx, 'exclusions', e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="e.g., Voltage damage, cosmetic wear" />
          </div>
        </div>
      ))}
    </div>
  );
}
