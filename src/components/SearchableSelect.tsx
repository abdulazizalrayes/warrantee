'use client';

import { Children, isValidElement, useId, useState, type ReactNode, type SelectHTMLAttributes } from 'react';
import { usePathname } from 'next/navigation';

function optionText(node: ReactNode): string {
  return Children.toArray(node).map((child) => {
    if (typeof child === 'string' || typeof child === 'number') return String(child);
    return isValidElement<{ children?: ReactNode }>(child) ? optionText(child.props.children) : '';
  }).join(' ');
}

export function normalizeOptionSearch(text: string): string {
  return text.normalize('NFKD').replace(/\p{M}|\u0640/gu, '').toLocaleLowerCase().trim();
}

/** Keep native selection, form submission, validation and keyboard behavior. */
export function SearchableSelect({ children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  const pathname = usePathname();
  const isArabic = pathname?.split('/')[1] === 'ar';
  const [query, setQuery] = useState('');
  const uid = useId();
  const selectId = props.id || `${uid}-select`;
  const statusId = `${uid}-status`;
  const needle = normalizeOptionSearch(query);
  const current = props.value ?? props.defaultValue;
  const selected = new Set((Array.isArray(current) ? current : [current]).map(String));
  let matches = 0;

  function filterOptions(nodes: ReactNode): ReactNode {
    return Children.map(nodes, (child) => {
      if (!isValidElement<{ value?: string | number; children?: ReactNode; disabled?: boolean }>(child)) return child;
      if (child.type !== 'option') return child;
      const text = optionText(child.props.children);
      const value = String(child.props.value ?? text);
      const match = normalizeOptionSearch(text).includes(needle) || normalizeOptionSearch(value).includes(needle);
      if (match && !child.props.disabled) matches += 1;
      // Never remove the selected option: filtering must not mutate form values.
      return match || selected.has(value) ? child : null;
    });
  }

  const options = filterOptions(children);
  const searchLabel = isArabic ? 'بحث في الخيارات' : 'Search options';
  return (
    <span className="inline-flex min-w-0 max-w-full flex-col gap-1 align-middle" style={{ width: props.className?.includes('w-full') ? '100%' : undefined }}>
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') { event.preventDefault(); setQuery(''); }
          if (event.key === 'Enter' || event.key === 'ArrowDown') {
            event.preventDefault();
            document.getElementById(selectId)?.focus();
          }
        }}
        disabled={props.disabled}
        aria-label={`${searchLabel}${props['aria-label'] ? `: ${props['aria-label']}` : ''}`}
        aria-controls={selectId}
        placeholder={searchLabel}
        autoComplete="off"
        dir={isArabic ? 'rtl' : undefined}
        className="w-full min-w-0 rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 focus:outline-2 focus:outline-[#0071e3] disabled:opacity-50"
      />
      <select {...props} id={selectId} aria-describedby={[props['aria-describedby'], needle ? statusId : ''].filter(Boolean).join(' ') || undefined}>
        {options}
      </select>
      {needle && <span id={statusId} role="status" className="text-xs text-gray-600">
        {matches === 0 ? (isArabic ? 'لا توجد نتائج. الاختيار الحالي محفوظ.' : 'No matches. Current selection retained.') : (isArabic ? `${matches} نتائج` : `${matches} matches`)}
      </span>}
    </span>
  );
}
