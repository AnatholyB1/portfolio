import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const nav = read('../AdminNav.tsx');
const page = read('../../../app/admin/liens/page.tsx');

describe('admin /liens page source guards (T-19-24..26)', () => {
  it('nav has the Liens entry after Entonnoir and before Pilotage', () => {
    const entry = "{ key: 'liens', href: '/admin/liens', label: 'Liens' }";
    expect(nav).toContain(entry);
    expect(nav.indexOf("key: 'entonnoir'")).toBeLessThan(nav.indexOf(entry));
    expect(nav.indexOf(entry)).toBeLessThan(nav.indexOf("key: 'pilotage'"));
  });

  it('page checks requireAdmin and never uses service_role', () => {
    expect(page).toContain('requireAdmin()');
    expect(page.indexOf('requireAdmin()')).toBeLessThan(page.indexOf('return ('));
    expect(page).not.toContain('@/lib/supabase/admin');
    expect(page).not.toContain('createSupabaseAdminClient');
  });

  it('page carries the shell, metadata and copy', () => {
    expect(page).toContain('<AdminNav current="liens" />');
    expect(page).toContain("title: 'Liens de campagne'");
    expect(page).toContain("export const dynamic = 'force-dynamic'");
    for (const s of ['Générer un lien', 'Convention', 'docs/convention-utm.md']) expect(page).toContain(s);
  });

  it('page and components stay out of the public shell and never inject raw HTML', () => {
    const dir = new URL('./', import.meta.url);
    const files = readdirSync(dir).filter((f) => /\.tsx?$/.test(f) && !f.endsWith('.test.ts'));
    for (const f of [...files.map((x) => read(`./${x}`)), page]) {
      for (const banned of ['LanguageContext', 'gsap', 'three', 'CinemaIntro', 'CustomCursor', 'dangerouslySetInnerHTML']) {
        expect(f).not.toContain(banned);
      }
    }
  });

  it('convention doc exists', () => {
    expect(existsSync(new URL('../../../../docs/convention-utm.md', import.meta.url))).toBe(true);
  });
});
