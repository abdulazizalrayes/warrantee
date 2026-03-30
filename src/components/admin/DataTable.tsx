'use client';

// Warrantee â Reusable Admin Data Table with Pagination & Search
// Used across all admin tabs for consistent data display

import { useState, useMemo } from 'react';

interface Column<T> {
  key: string;
  label: string;
  labelAr?: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchKeys?: string[];
  pageSize?: number;
  isRtl?: boolean;
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
}

export default function DataTable<T extends Record<string, any>>({
  data,
  columns,
  searchKeys = [],
  pageSize = 15,
  isRtl = false,
  loading = false,
  emptyMessage,
  onRowClick,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Filter
  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter((row) =>
      searchKeys.some((key) => {
        const val = row[key];
        return val != null && String(val).toLowerCase().includes(q);
      })
    );
  }, [data, search, searchKeys]);

  // Sort
  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const av = a[sortKey] ?? '';
      const bv = b[sortKey] ?? '';
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  // Paginate
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paged = sorted.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  return (
    <div>
      {/* Search */}
      {searchKeys.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <input
            type="text"
            placeholder={isRtl ? 'Ø¨Ø­Ø«...' : 'Search...'}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{
              width: '100%', maxWidth: '360px', padding: '10px 14px',
              borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '14px',
              direction: isRtl ? 'rtl' : 'ltr',
            }}
          />
        </div>
      )}

      {/* Table */}
      <div style={{ overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: '12px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ background: '#F8FAFC' }}>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                  style={{
                    padding: '12px 16px',
                    textAlign: isRtl ? 'right' : 'left',
                    fontWeight: 600,
                    color: '#374151',
                    cursor: col.sortable ? 'pointer' : 'default',
                    userSelect: 'none',
                    whiteSpace: 'nowrap',
                    borderBottom: '1px solid #E2E8F0',
                    width: col.width,
                  }}
                >
                  {isRtl ? (col.labelAr || col.label) : col.label}
                  {col.sortable && sortKey === col.key && (
                    <span style={{ marginInlineStart: '4px' }}>
                      {sortDir === 'asc' ? 'â' : 'â'}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} style={{ textAlign: 'center', padding: '48px', color: '#94A3B8' }}>
                  {isRtl ? 'Ø¬Ø§Ø±Ù Ø§ÙØªØ­ÙÙÙ...' : 'Loading...'}
                </td>
              </tr>
            ) : paged.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ textAlign: 'center', padding: '48px', color: '#94A3B8' }}>
                  {emptyMessage || (isRtl ? 'ÙØ§ ØªÙØ¬Ø¯ Ø¨ÙØ§ÙØ§Øª' : 'No data')}
                </td>
              </tr>
            ) : paged.map((row, i) => (
              <tr
                key={i}
                onClick={() => onRowClick?.(row)}
                style={{
                  borderBottom: '1px solid #F1F5F9',
                  cursor: onRowClick ? 'pointer' : 'default',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => { if (onRowClick) (e.currentTarget.style.background = '#F8FAFC'); }}
                onMouseLeave={(e) => { (e.currentTarget.style.background = 'transparent'); }}
              >
                {columns.map((col) => (
                  <td key={col.key} style={{ padding: '12px 16px' }}>
                    {col.render ? col.render(row) : (row[col.key] ?? 'â')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginTop: '16px', fontSize: '14px', color: '#64748B',
        }}>
          <span>
            {isRtl
              ? `Ø¹Ø±Ø¶ ${(page - 1) * pageSize + 1}â${Math.min(page * pageSize, sorted.length)} ÙÙ ${sorted.length}`
              : `Showing ${(page - 1) * pageSize + 1}â${Math.min(page * pageSize, sorted.length)} of ${sorted.length}`}
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => setPage(1)}
              disabled={page === 1}
              style={paginationBtnStyle(page === 1)}
            >
              {isRtl ? 'Â»' : 'Â«'}
            </button>
            <button
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 1}
              style={paginationBtnStyle(page === 1)}
            >
              {isRtl ? 'âº' : 'â¹'}
            </button>
            {/* Page numbers */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
              if (pageNum > totalPages) return null;
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  style={{
                    ...paginationBtnStyle(false),
                    background: pageNum === page ? '#2563EB' : 'white',
                    color: pageNum === page ? 'white' : '#374151',
                    fontWeight: pageNum === page ? 600 : 400,
                  }}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page === totalPages}
              style={paginationBtnStyle(page === totalPages)}
            >
              {isRtl ? 'â¹' : 'âº'}
            </button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
              style={paginationBtnStyle(page === totalPages)}
            >
              {isRtl ? 'Â«' : 'Â»'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function paginationBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: '6px 10px',
    borderRadius: '6px',
    border: '1px solid #D1D5DB',
    background: 'white',
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    fontSize: '13px',
    minWidth: '32px',
  };
}

