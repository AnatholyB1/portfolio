import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const page = read('../../../app/admin/projets/page.tsx');
const table = read('./ProjectsTable.tsx');
const filters = read('./ProjectFilters.tsx');
const css = read('./projects.css');

describe('admin projects UI source guards (T-12-54, T-12-55)', () => {
  it('page calls requireAdmin() before loadAdminProjects', () => {
    expect(page.indexOf('requireAdmin()')).toBeGreaterThan(-1);
    expect(page.indexOf('requireAdmin()')).toBeLessThan(page.indexOf('loadAdminProjects('));
  });

  it('page, table and filters never use service_role or banned public-shell pieces', () => {
    const files = readdirSync(new URL('./', import.meta.url)).filter(
      (f) => /\.tsx?$/.test(f) && !f.endsWith('.test.ts'),
    );
    for (const src of [...files.map((f) => read(`./${f}`)), page]) {
      for (const banned of [
        'createSupabaseAdminClient',
        '@/lib/supabase/admin',
        'gsap',
        'CustomCursor',
        'dangerouslySetInnerHTML',
      ]) {
        expect(src).not.toContain(banned);
      }
    }
  });

  it('query params are whitelisted', () => {
    for (const w of ['ETAPE_FILTERS', 'BLOCAGE_FILTERS', 'SORT_KEYS']) expect(page).toContain(w);
  });

  it('blocking labels come from PROJECT_COPY', () => {
    expect(table).toContain('PROJECT_COPY.blocage.dormant');
    expect(table).toContain('PROJECT_COPY.blocage.done');
    expect(filters).toContain('PROJECT_COPY.blocage.client');
    expect(filters).toContain('PROJECT_COPY.blocage.admin');
    expect(filters).toContain('Dormant');
  });

  it('table is sortable and labelled for mobile', () => {
    expect(table).toContain('aria-sort');
    expect((table.match(/data-label=/g) ?? []).length).toBeGreaterThanOrEqual(5);
  });

  it('no price or euro token in the surfaces', () => {
    for (const src of [page, table, filters]) {
      expect(src).not.toMatch(/€|\bEUR\b|\bprix\b/i);
    }
  });

  it('css has no 12px and no ink-faint text', () => {
    expect(css).not.toMatch(/12px/);
    expect(css).not.toMatch(/color:\s*var\(--ink-faint\)/);
  });
});
