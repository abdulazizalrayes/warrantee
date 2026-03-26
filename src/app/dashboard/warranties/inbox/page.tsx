// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-client';
import Link from 'next/link';

type IngestionStatus = 'received' | 'processing' | 'extracted' | 'confirmed' | 'failed';

interface IngestionRecord {
  id: string;
  from_email: string;
  subject: string | null;
  extracted_data: Record<string, unknown> | null;
  confidence_score: number | null;
  warranty_id: string | null;
  status: IngestionStatus;
  buyer_email: string | null;
  is_seller_forwarded: boolean;
  created_at: string;
}

function getConfidenceColor(score: number | null): string {
  if (!score) return 'bg-red-100 text-red-700';
  if (score >= 85) return 'bg-green-100 text-green-700';
  if (score >= 40) return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-700';
}

function getConfidenceLabel(score: number | null): string {
  if (!score) return 'Manual Entry Required';
  if (score >= 85) return 'Ready to Confirm';
  if (score >= 40) return 'Needs Review';
  return 'Manual Entry Required';
}

function getConfidenceDot(fieldValue: unknown): string {
  return fieldValue ? '🟢' : '🔴';
}

export default function InboxPage() {
  const [records, setRecords] = useState<IngestionRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    loadRecords();
  }, []);

  async function loadRecords() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('email_ingestion')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['received', 'processing', 'extracted'])
      .order('created_at', { ascending: false });

    if (data) setRecords(data as IngestionRecord[]);
    setLoading(false);
  }

  async function confirmRecord(record: IngestionRecord) {
    setActionLoading(true);
    const extracted = (record.extracted_data || {}) as Record<string, unknown>;

    if (record.warranty_id) {
      await supabase.from('warranties').update({ status: 'active' }).eq('id', record.warranty_id);
      await supabase.from('email_ingestion').update({ status: 'confirmed' }).eq('id', record.id);
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: warranty } = await supabase
        .from('warranties')
        .insert({
          product_name: (extracted.product_name as string) || 'Unnamed Product',
          product_name_ar: (extracted.product_name_ar as string) || null,
          start_date: (extracted.start_date as string) || new Date().toISOString().split('T')[0],
          end_date: (extracted.end_date as string) || new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
          serial_number: (extracted.serial_number as string) || null,
          seller_name: (extracted.seller_name as string) || null,
          seller_email: record.from_email,
          status: 'active',
          is_self_registered: true,
          language: (extracted.language as string) || 'en',
          created_by: user?.id,
          recipient_user_id: user?.id,
        })
        .select('id')
        .single();

      if (warranty) {
        await supabase.from('email_ingestion').update({ status: 'confirmed', warranty_id: warranty.id }).eq('id', record.id);
      }
    }

    setRecords((prev) => prev.filter((r) => r.id !== record.id));
    setSelectedId(null);
    setActionLoading(false);
  }

  async function discardRecord(recordId: string) {
    setActionLoading(true);
    await supabase.from('email_ingestion').update({ status: 'failed', error_message: 'Discarded by user' }).eq('id', recordId);
    setRecords((prev) => prev.filter((r) => r.id !== recordId));
    setSelectedId(null);
    setActionLoading(false);
  }

  const selected = records.find((r) => r.id === selectedId);

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Provisional Inbox</h1>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-100 animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Provisional Inbox</h1>
        <div className="text-center py-16">
          <div className="text-6xl mb-4">📬</div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Your inbox is clear!</h2>
          <p className="text-gray-500 max-w-md mx-auto">
            Forward warranty documents or invoices to{' '}
            <span className="font-mono text-blue-600">hello@warrantee.io</span>{' '}
            and they will appear here for review.
          </p>
          <Link href="/dashboard/warranties" className="inline-block mt-6 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
            Back to Warranties
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Provisional Inbox</h1>
          <p className="text-gray-500 text-sm mt-1">{records.length} item{records.length !== 1 ? 's' : ''} awaiting review</p>
        </div>
        <Link href="/dashboard/warranties" className="text-sm text-blue-600 hover:underline">Back to Warranties</Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Record List */}
        <div className="space-y-3">
          {records.map((record) => {
            const extracted = (record.extracted_data || {}) as Record<string, unknown>;
            return (
              <button
                key={record.id}
                onClick={() => setSelectedId(record.id)}
                className={`w-full text-left p-4 rounded-xl border-2 transition ${selectedId === record.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 truncate">
                      {(extracted.product_name as string) || record.subject || 'Unknown Document'}
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5 truncate">From: {record.from_email}</p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(record.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="ml-3 flex flex-col items-end gap-1.5">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${getConfidenceColor(record.confidence_score)}`}>
                      {record.confidence_score != null ? record.confidence_score + '%' : '—'}
                    </span>
                    <span className="text-xs text-gray-500">{getConfidenceLabel(record.confidence_score)}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right: Detail Panel */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          {selected ? (
            <>
              <h2 className="text-lg font-bold mb-4">Extracted Data</h2>
              <div className="space-y-3">
                {[
                  { label: 'Product Name', key: 'product_name' },
                  { label: 'Serial Number', key: 'serial_number' },
                  { label: 'Seller', key: 'seller_name' },
                  { label: 'Start Date', key: 'start_date' },
                  { label: 'End Date', key: 'end_date' },
                  { label: 'Amount', key: 'amount' },
                  { label: 'Category', key: 'category' },
                ].map(({ label, key }) => {
                  const value = (selected.extracted_data as Record<string, unknown>)?.[key];
                  return (
                    <div key={key} className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">{label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">
                          {(value as string) || <span className="text-gray-400 italic">Not detected</span>}
                        </span>
                        <span className="text-xs">{getConfidenceDot(value)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  <strong>Overall Confidence:</strong>{' '}
                  <span className={`font-semibold ${(selected.confidence_score || 0) >= 85 ? 'text-green-600' : (selected.confidence_score || 0) >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                    {selected.confidence_score ?? 0}%
                  </span>
                </p>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => confirmRecord(selected)} disabled={actionLoading} className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 font-medium">
                  Confirm
                </button>
                <Link href={`/dashboard/warranties/new?from_ingestion=${selected.id}`} className="flex-1 px-4 py-2.5 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition text-center font-medium">
                  Edit &amp; Confirm
                </Link>
                <button onClick={() => discardRecord(selected.id)} disabled={actionLoading} className="px-4 py-2.5 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50 font-medium">
                  Discard
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-3">👆</div>
              <p>Select an item from the list to review</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
