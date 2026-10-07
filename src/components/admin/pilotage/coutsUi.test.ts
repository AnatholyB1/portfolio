import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const page = readFileSync(new URL('../../../app/admin/pilotage/couts/page.tsx', import.meta.url), 'utf8')
  .replace(/&apos;/g, "'")
  .replace(/\s+/g, ' ');

describe('/admin/pilotage/couts page guards', () => {
  it('calls requireAdmin before loadCostsRegister', () => {
    const a = page.indexOf('requireAdmin()');
    const b = page.indexOf('loadCostsRegister(');
    expect(a).toBeGreaterThan(-1);
    expect(b).toBeGreaterThan(a);
  });

  it('is dynamic with the expected title and nav', () => {
    expect(page).toContain("export const dynamic = 'force-dynamic'");
    expect(page).toContain("title: 'Coûts · Pilotage'");
    expect(page).toContain('<AdminNav current="pilotage" />');
  });

  it('carries the UI-SPEC copy', () => {
    for (const s of [
      'id="solde"',
      'Coûts et solde de départ',
      "Les saisies ne se modifient pas. Pour corriger, ajoutez une nouvelle ligne ; l'historique est conservé.",
      "Le coût par rendez-vous se saisit dans l'entonnoir.",
      'href="/admin/entonnoir"',
      'En vigueur',
      'Aucune charge récurrente. Ajoutez vos abonnements et outils pour projeter la trésorerie.',
      'Aucun coût de projet. Ajoutez la sous-traitance ou les licences payées pour un projet.',
      'Chiffres indisponibles',
    ]) {
      expect(page, s).toContain(s);
    }
  });

  it('has no service_role, cinema, cursor or raw html', () => {
    for (const banned of [
      'createSupabaseAdminClient',
      '@/lib/supabase/admin',
      'gsap',
      'CustomCursor',
      'dangerouslySetInnerHTML',
    ]) {
      expect(page).not.toContain(banned);
    }
  });

  it('handles PilotageLoadError with an error state', () => {
    expect(page).toContain('PilotageLoadError');
    expect(page).toContain('href="/admin/pilotage/couts"');
    expect(page).toContain('href="/admin/pilotage"');
  });
});

describe('cost forms are not floating dropdown panels (production defect 2026-10-07)', () => {
  it('pilotage.css neutralises the absolute positioning of pt-lead-panel on the cost forms', () => {
    const css = readFileSync(new URL('./pilotage.css', import.meta.url), 'utf8');
    const rule = css.match(/\.pt-admin \.pt-lead-panel\.pt-pilot-costs-form\s*\{([^}]*)\}/);
    expect(rule, 'override rule missing').not.toBeNull();
    expect(rule![1]).toContain('position: static');
  });
});

describe('confirmation panels stay inside the Action column (production defect 2026-10-07)', () => {
  it('pilotage.css lets forms in the Action cell wrap despite admin.css nowrap', () => {
    const css = readFileSync(new URL('./pilotage.css', import.meta.url), 'utf8');
    const rule = css.match(/\.pt-pilot-table td\[data-label="Action"\] form\s*\{([^}]*)\}/);
    expect(rule, 'wrap override missing').not.toBeNull();
    expect(rule![1]).toContain('white-space: normal');
    expect(rule![1]).toContain('max-width');
  });
});
