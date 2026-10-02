import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const page = read('../../../app/admin/leads/[id]/page.tsx');
const journal = read('./LeadJournal.tsx');
const erase = read('./EraseLeadForm.tsx');
const correct = read('./CorrectSourceForm.tsx');

describe('admin lead detail source guards (T-11-64..67)', () => {
  it('page checks requireAdmin before reading and never mutates events', () => {
    expect(page.indexOf('requireAdmin()')).toBeGreaterThan(-1);
    expect(page.indexOf('requireAdmin()')).toBeLessThan(page.indexOf("'sv_lead_events'"));
    expect(page).toContain("'sv_lead_events'");
    expect(page).not.toMatch(/\.(update|delete|insert|upsert)\(/);
    expect(page).toContain('notFound()');
  });

  it('journal is read-only', () => {
    expect(journal).toContain('Le journal est en lecture seule.');
    expect(journal).not.toMatch(/<button|<form/);
  });

  it('erase form keeps the destructive safeguards', () => {
    expect(erase).toContain('Effacer définitivement');
    expect(erase).toContain('toLowerCase');
    expect(erase).toContain('eraseLeadAction');
  });

  it('correction form enforces the reason length', () => {
    expect(correct).toContain('minLength={10}');
    expect(correct).toContain('Enregistrer la correction');
    expect(correct).toContain('correctSourceAction');
  });

  it('no file uses service_role or raw HTML', () => {
    const files = readdirSync(new URL('./', import.meta.url))
      .filter((f) => /\.tsx?$/.test(f) && !f.endsWith('.test.ts'))
      .map((f) => read(`./${f}`));
    for (const src of [...files, page]) {
      expect(src).not.toContain('@/lib/supabase/admin');
      expect(src).not.toContain('dangerouslySetInnerHTML');
    }
  });
});
