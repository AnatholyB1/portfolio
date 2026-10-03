import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const page = read('../../../app/admin/projets/[id]/page.tsx');
const journal = read('./FactJournal.tsx');
const side = read('./ProjectSideCards.tsx');

describe('admin project sheet source guards (T-12-60, T-12-61, T-12-62)', () => {
  it('requireAdmin() then UUID check precede loadProjectBundle; notFound on null', () => {
    const a = page.indexOf('requireAdmin()');
    const u = page.indexOf('UUID_RE.test(id)');
    const l = page.indexOf('loadProjectBundle(');
    expect(a).toBeGreaterThan(-1);
    expect(a).toBeLessThan(u);
    expect(u).toBeLessThan(l);
    expect(page).toContain('if (!bundle) notFound()');
  });

  it('has no service_role client or banned public-shell pieces', () => {
    for (const src of [page, journal, side]) {
      for (const banned of ['createSupabaseAdminClient', '@/lib/supabase/admin', 'gsap', 'CustomCursor', 'dangerouslySetInnerHTML']) {
        expect(src).not.toContain(banned);
      }
    }
  });

  it('wires timeline, files actions, fact form and journal', () => {
    expect(page).toContain('variant="admin"');
    for (const a of ['adminRequestUploadAction', 'adminConfirmUploadAction', 'adminDownloadAction']) {
      expect(page).toContain(a);
    }
    expect(page).toContain('<PostFactForm');
    expect(page).toContain('<FactJournal');
    expect(page).toContain('viewer="admin"');
    expect(page).toContain('<DocumentsPanel');
    expect(page).toContain('loadAdminDocumentsView(supabase');
    for (const a of [
      'previewDocumentAction',
      'issueDocumentAction',
      'adminDocumentDownloadAction',
      'verifyDocumentHashAction',
      'loadSnapshotAction',
    ]) {
      expect(page).toContain(a);
    }
  });

  it('shows the status block strings', () => {
    for (const s of ['Étape en cours', 'En attente de', 'whoWaits.label', 'Depuis']) {
      if (s === 'En attente de') expect(page + read('../../../lib/projects/copy.ts')).toContain(s);
      else expect(page).toContain(s);
    }
  });

  it('journal exposes revoke entry point and the Annulé badge', () => {
    expect(journal).toContain('RevokePanel');
    expect(journal).toContain('Annuler ce fait');
    expect(journal).toContain('PROJECT_COPY.facts.revoked');
  });

  it('links are https-only with noopener noreferrer', () => {
    expect(side).toContain("u.protocol === 'https:'");
    expect(side).toContain('rel="noopener noreferrer"');
  });

  it('contains no price or euro token', () => {
    for (const src of [page, journal, side]) {
      expect(src).not.toMatch(/€|\beuros?\b|\bprix\b/i);
    }
  });
});
