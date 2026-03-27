'use client';

// Warrantee — Supabase Realtime Subscription Hook
// Provides live updates for admin portal tables

import { useEffect, useRef, useCallback } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type PostgresEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

interface UseRealtimeOptions<T extends Record<string, unknown>> {
  table: string;
  schema?: string;
  event?: PostgresEvent;
  filter?: string;
  onInsert?: (payload: T) => void;
  onUpdate?: (payload: { old: T; new: T }) => void;
  onDelete?: (payload: T) => void;
  onChange?: (payload: RealtimePostgresChangesPayload<T>) => void;
  enabled?: boolean;
}

/**
 * Subscribe to Supabase Realtime changes on a table.
 *
 * Usage:
 * ```tsx
 * useRealtimeSubscription({
 *   table: 'ingestion_jobs',
 *   event: '*',
 *   onInsert: (newJob) => setJobs(prev => [newJob, ...prev]),
 *   onUpdate: ({ new: updated }) => setJobs(prev =>
 *     prev.map(j => j.id === updated.id ? updated : j)
 *   ),
 * });
 * ```
 */
export function useRealtimeSubscription<T extends Record<string, unknown>>({
  table,
  schema = 'public',
  event = '*',
  filter,
  onInsert,
  onUpdate,
  onDelete,
  onChange,
  enabled = true,
}: UseRealtimeOptions<T>) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabase = createSupabaseBrowserClient();

  // Store latest callbacks in refs to avoid re-subscribing
  const onInsertRef = useRef(onInsert);
  const onUpdateRef = useRef(onUpdate);
  const onDeleteRef = useRef(onDelete);
  const onChangeRef = useRef(onChange);

  useEffect(() => { onInsertRef.current = onInsert; }, [onInsert]);
  useEffect(() => { onUpdateRef.current = onUpdate; }, [onUpdate]);
  useEffect(() => { onDeleteRef.current = onDelete; }, [onDelete]);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  useEffect(() => {
    if (!enabled) return;

    const channelName = `realtime-${schema}-${table}-${event}-${filter || 'all'}`;

    const channelConfig: any = {
      event,
      schema,
      table,
    };
    if (filter) {
      channelConfig.filter = filter;
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes' as any,
        channelConfig,
        (payload: RealtimePostgresChangesPayload<T>) => {
          onChangeRef.current?.(payload);

          if (payload.eventType === 'INSERT' && onInsertRef.current) {
            onInsertRef.current(payload.new as T);
          }
          if (payload.eventType === 'UPDATE' && onUpdateRef.current) {
            onUpdateRef.current({
              old: payload.old as T,
              new: payload.new as T,
            });
          }
          if (payload.eventType === 'DELETE' && onDeleteRef.current) {
            onDeleteRef.current(payload.old as T);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [table, schema, event, filter, enabled, supabase]);

  const unsubscribe = useCallback(() => {
    channelRef.current?.unsubscribe();
    channelRef.current = null;
  }, []);

  return { unsubscribe };
}

/**
 * Subscribe to multiple tables at once.
 * Useful for admin dashboard that monitors several tables.
 */
export function useMultiTableRealtime(
  subscriptions: Array<UseRealtimeOptions<any>>,
  enabled: boolean = true
) {
  const supabase = createSupabaseBrowserClient();
  const channelsRef = useRef<RealtimeChannel[]>([]);

  useEffect(() => {
    if (!enabled) return;

    const channels: RealtimeChannel[] = [];

    for (const sub of subscriptions) {
      const channelName = `multi-${sub.table}-${sub.event || '*'}`;
      const channelConfig: any = {
        event: sub.event || '*',
        schema: sub.schema || 'public',
        table: sub.table,
      };
      if (sub.filter) channelConfig.filter = sub.filter;

      const channel = supabase
        .channel(channelName)
        .on('postgres_changes' as any, channelConfig, (payload: any) => {
          sub.onChange?.(payload);
          if (payload.eventType === 'INSERT') sub.onInsert?.(payload.new);
          if (payload.eventType === 'UPDATE') sub.onUpdate?.({ old: payload.old, new: payload.new });
          if (payload.eventType === 'DELETE') sub.onDelete?.(payload.old);
        })
        .subscribe();

      channels.push(channel);
    }

    channelsRef.current = channels;

    return () => {
      channels.forEach((ch) => ch.unsubscribe());
      channelsRef.current = [];
    };
  }, [enabled, supabase]); // Note: subscriptions array should be stable (useMemo)
}
