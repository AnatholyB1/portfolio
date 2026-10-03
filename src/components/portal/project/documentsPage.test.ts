import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Gardes source de l'onglet Documents du portail client (DOC-03, D-15, D-17).
const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const page = read('../../../app/espace-client/documents/page.tsx');
const list = read('./DocumentsList.tsx');

describe('client portal documents tab', () => {
  it('guards with requireClient and keeps NoAccess', () => {
    expect(page).toContain('requireClient()');
    expect(page).toContain('<NoAccess');
  });

  it('stays RLS-only and free of cinema/cursor/HTML injection', () => {
    for (const src of [page, list]) {
      for (const bad of ['createSupabaseAdminClient', 'service_role', 'gsap', 'CustomCursor', 'CinemaIntro', 'dangerouslySetInnerHTML']) {
        expect(src).not.toContain(bad);
      }
    }
  });

  it('exposes no price, hash, template version or storage path', () => {
    for (const src of [page, list]) {
      expect(src).not.toMatch(/€|\beuros?\b|\bprix\b/i);
      for (const bad of ['sha256', 'templateVersion', 'storage_path']) expect(src).not.toContain(bad);
    }
  });

  it('reads through the RLS client and derives statuses', () => {
    expect(page).toContain('loadDocumentsForProjects(ctx.supabase');
    expect(page).toContain('withStatuses');
    expect(page).toContain('current="documents"');
    expect(page).toContain('documentDownloadAction');
    expect(page).toContain('PROJECT_COPY.documents.portal.emptyHeading');
  });

  it('never defaults to a signing status when the bundle fails to load (WR-05)', () => {
    expect(page).toContain('status: bundle ? d.status : null');
    expect(list).toContain('copy.statusUnavailable');
    expect(list).toContain('status: DocumentStatus | null');
  });

  it('has no embedded viewer and navigates to the signed link only on click', () => {
    for (const src of [page, list]) expect(src).not.toContain('<iframe');
    expect(list).toContain('window.location.assign');
    expect(list).not.toMatch(/href=\{[^}]*url/);
  });
});
