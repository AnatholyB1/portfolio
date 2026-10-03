import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const dialog = read('./ConvertDialog.tsx');
const page = read('../../../app/admin/leads/[id]/page.tsx');
const actions = read('../../../app/admin/leads/actions.ts');

describe('conversion UI guards (D-01, D-04, D-22)', () => {
  it('ConvertDialog binds convertLeadAction with useActionState and disables on pending', () => {
    expect(dialog).toContain('convertLeadAction');
    expect(dialog).toContain('useActionState');
    expect(dialog).toContain('showModal');
    expect(dialog).toMatch(/disabled=\{pending \|\| busy\}/);
    expect(dialog).toContain('companySource');
  });

  it('ConvertDialog carries the UI-SPEC strings', () => {
    for (const s of [
      'Convertir en client',
      "Cela crée le client, son premier projet et envoie l&apos;invitation à son espace.",
      "Convertir et envoyer l'invitation",
      'Conversion en cours…',
      'Ce SIRET correspond à un client existant. Il sera réutilisé et un nouveau projet y sera ajouté.',
    ]) {
      expect(dialog).toContain(s);
    }
  });

  it('lead page shows converted state and both disabled helpers', () => {
    expect(page).toContain('conversion.converted');
    expect(page).toContain('conversion.viewProject');
    expect(page).toContain('conversion.notYetConvertible');
    expect(page).toContain('conversion.reopenFirst');
    expect(page).toContain("['qualified', 'rdv', 'quote_sent', 'signed']");
    expect(page).toContain('aria-disabled="true"');
  });

  it('neither file uses service_role, animation libs, custom cursor or raw HTML', () => {
    for (const src of [dialog, page]) {
      for (const banned of ['createSupabaseAdminClient', 'gsap', 'CustomCursor', 'dangerouslySetInnerHTML']) {
        expect(src).not.toContain(banned);
      }
    }
  });

  it('ConvertDialog has no price token', () => {
    expect(dialog).not.toMatch(/€|\beuros?\b|\bprix\b/i);
  });

  it('siretExistsAction calls requireAdmin() before any read', () => {
    const start = actions.indexOf('export async function siretExistsAction');
    expect(start).toBeGreaterThan(-1);
    const body = actions.slice(start, actions.indexOf('export type ConvertState'));
    expect(body.indexOf('requireAdmin()')).toBeGreaterThan(-1);
    expect(body.indexOf('requireAdmin()')).toBeLessThan(body.indexOf('.from('));
  });
});
