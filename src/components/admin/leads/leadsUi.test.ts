import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const page = read('../../../app/admin/leads/page.tsx');
const table = read('./LeadsTable.tsx');

describe('admin leads UI source guards (T-11-57..60)', () => {
  it('page checks requireAdmin before reading the view', () => {
    expect(page.indexOf('requireAdmin()')).toBeGreaterThan(-1);
    expect(page.indexOf('requireAdmin()')).toBeLessThan(page.indexOf("'sv_leads_admin_v'"));
  });

  it('page never uses service_role', () => {
    expect(page).not.toContain('@/lib/supabase/admin');
    expect(page).not.toContain('createSupabaseAdminClient');
  });

  it('components stay out of the public shell and never inject raw HTML', () => {
    const files = readdirSync(new URL('./', import.meta.url)).filter((f) => /\.tsx?$/.test(f) && !f.endsWith('.test.ts'));
    for (const f of [...files.map((x) => read(`./${x}`)), page]) {
      for (const banned of ['LanguageContext', 'gsap', 'three', 'CinemaIntro', 'CustomCursor', 'dangerouslySetInnerHTML']) {
        expect(f).not.toContain(banned);
      }
    }
  });

  it('table keeps the Statut data-label and the page carries the empty-state copy', () => {
    expect(table).toContain('data-label="Statut"');
    expect(page).toContain('Aucun lead pour le moment');
    expect(page).toContain('Aucun lead ne correspond');
    expect(page).toContain('à revoir');
  });
});
