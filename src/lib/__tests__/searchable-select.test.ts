import { describe, expect, it, vi } from 'vitest';
vi.mock('next/navigation', () => ({ usePathname: () => '/en/contact' }));
import { normalizeOptionSearch } from '../../components/SearchableSelect';
import fs from 'node:fs';
import path from 'node:path';

describe('searchable selection', () => {
  it('matches case, whitespace and Arabic diacritics', () => {
    expect(normalizeOptionSearch('  SUPPORT ')).toBe('support');
    expect(normalizeOptionSearch('ضَـمان')).toBe(normalizeOptionSearch('ضمان'));
  });

  it('keeps form selects searchable while allowing the owner-approved compact language selector', () => {
    function scan(dir: string): string[] {
      return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const file = path.join(dir, entry.name);
        if (entry.isDirectory()) return scan(file);
        if (!file.endsWith('.tsx') || file.endsWith('SearchableSelect.tsx') || file === path.join('src', 'components', 'LanguageToggle.tsx')) return [];
        return /<select\b/.test(fs.readFileSync(file, 'utf8')) ? [file] : [];
      });
    }
    expect(scan('src')).toEqual([]);
  });
});
