import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Garde source de la page /espace-client (D-10, D-12, D-22).
const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const page = read('../../../app/espace-client/page.tsx');
const parts = ['./ClientNav.tsx', './WhoWaits.tsx', './PortalLinks.tsx', './ProjectSelector.tsx'].map(read);

describe('client portal page', () => {
  it('guards with requireClient and keeps NoAccess', () => {
    expect(page).toContain('requireClient()');
    expect(page).toContain('<NoAccess');
  });

  it('stays RLS-only and free of cinema/cursor/HTML injection', () => {
    for (const bad of ['createSupabaseAdminClient', 'service_role', 'gsap', 'CustomCursor', 'CinemaIntro', 'dangerouslySetInnerHTML']) {
      expect(page).not.toContain(bad);
    }
  });

  it('renders sections in the required order', () => {
    const order = ['<WhoWaits', '<Timeline', '<OnboardingCard', '<FilesPanel', '<PortalLinks', '<ConsentCard', '<Interlocutor />\n        </div>'];
    const idx = order.map((s) => page.indexOf(s));
    idx.forEach((i) => expect(i).toBeGreaterThan(-1));
    expect([...idx].sort((a, b) => a - b)).toEqual(idx);
  });

  it('wires the client timeline variant and file actions', () => {
    expect(page).toContain('variant="client"');
    expect(page).toContain('viewer="client"');
    for (const a of ['requestUploadAction', 'confirmUploadAction', 'downloadAction']) expect(page).toContain(a);
  });

  it('has the empty state and drops the placeholder', () => {
    expect(page).toContain('PROJECT_COPY.portal.emptyHeading');
    const copy = read('../../../lib/projects/copy.ts');
    expect(copy).toContain("Votre projet n'est pas encore ouvert");
    expect(page).not.toContain('en préparation');
  });

  it('exposes no price token', () => {
    for (const src of [page, ...parts]) expect(src).not.toMatch(/€|\beuros?\b|\bprix\b/i);
  });

  it('links are https-only, new tab, noopener', () => {
    const links = read('./PortalLinks.tsx');
    expect(links).toContain("'https:'");
    expect(links).toContain('rel="noopener noreferrer"');
    expect(links).toContain('target="_blank"');
  });

  it('selector hides under two projects; who-waits links to onboarding', () => {
    expect(read('./ProjectSelector.tsx')).toContain('length < 2');
    expect(read('./WhoWaits.tsx')).toContain('href="#onboarding"');
  });

  it('nav marks Projet current and disables the rest', () => {
    const nav = read('./ClientNav.tsx');
    expect(nav).toContain('aria-current="page"');
    expect(nav).toContain('Documents (bientôt)');
    expect(nav).toContain('Paiements (bientôt)');
  });
});
