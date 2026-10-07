import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const src = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

describe('pilotage dashboard page source guards (T-17-39..42)', () => {
  it('calls requireAdmin() before any read', () => {
    const a = src.indexOf('requireAdmin()');
    const b = src.indexOf('loadPilotageRows(');
    expect(a).toBeGreaterThan(-1);
    expect(b).toBeGreaterThan(a);
    expect(src).toContain('loadPilotageRows(supabase)');
  });

  it('whitelists params, is dynamic, titled and uses the admin nav', () => {
    expect(src).toContain('parsePilotageParams(');
    expect(src).toContain("export const dynamic = 'force-dynamic'");
    expect(src).toContain("title: 'Pilotage'");
    expect(src).toContain('<AdminNav current="pilotage" />');
    expect(src).toContain('buildPilotageView(');
  });

  it('has no service_role or public-shell pieces', () => {
    for (const banned of [
      'createSupabaseAdminClient',
      '@/lib/supabase/admin',
      'gsap',
      'CustomCursor',
      'CinemaIntro',
      'dangerouslySetInnerHTML',
    ]) {
      expect(src, banned).not.toContain(banned);
    }
  });

  it('contains the contract copy and links', () => {
    for (const s of [
      'Période',
      'Mois',
      'Trimestre',
      'Année',
      'Montants',
      'HT',
      'TTC',
      'Inclure les données de test (séries TFA et TAV)',
      'Les données de test sont incluses dans tous les chiffres.',
      'Sans TVA (art. 293 B du CGI), HT et TTC sont identiques tant que le régime reste en franchise.',
      'Appliquer',
      'Gérer les coûts',
      'Chiffres indisponibles',
      'anomalie(s) de réconciliation',
      'href="/admin/pilotage/couts"',
      'href="/admin/pilotage/couts#solde"',
      'name="tests"',
    ]) {
      expect(src, s).toContain(s);
    }
    expect(src).toMatch(/Rien à piloter pour l(&apos;|')instant/);
  });

  it('renders the error branch without tiles', () => {
    expect(src).toContain('PilotageLoadError');
    expect(src).toMatch(/view === null/);
  });
});
