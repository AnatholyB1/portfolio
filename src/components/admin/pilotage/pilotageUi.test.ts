import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const files = readdirSync(new URL('./', import.meta.url)).filter((f) => /\.tsx?$/.test(f) && !f.endsWith('.test.ts'));

describe('pilotage components source guards (T-17-52, T-17-54)', () => {
  it('no component uses service_role or banned public-shell pieces', () => {
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) {
      const src = read(`./${f}`);
      for (const banned of [
        'createSupabaseAdminClient',
        '@/lib/supabase/admin',
        'gsap',
        'CustomCursor',
        'CinemaIntro',
        'dangerouslySetInnerHTML',
      ]) {
        expect(src, `${f} contains ${banned}`).not.toContain(banned);
      }
    }
  });

  it('no component has a literal href starting with ?', () => {
    for (const f of files) {
      expect(read(`./${f}`), f).not.toMatch(/href=["']\?/);
    }
  });
});

describe('SourceTable', () => {
  const src = read('./SourceTable.tsx');
  it('renders the amended D-11 copy', () => {
    for (const s of [
      'Source figée du lead',
      'Campagne',
      'Projets',
      'CA signé',
      'Part',
      'DIRECT_NO_LEAD',
      'Total',
      'Aucun CA signé sur cette période. Changez de période ou consultez le pipeline.',
    ]) {
      expect(src).toContain(s);
    }
    expect(src).not.toMatch(/premier contact|first_touch/i);
  });
});

describe('ProjectMarginTable', () => {
  const src = read('./ProjectMarginTable.tsx');
  it('renders headers, links and footer', () => {
    expect(src).toContain('id="marge-projets"');
    for (const h of ['Projet', 'Client', 'Signé', 'Facturé', 'Encaissé', 'Coûts', 'Marge', 'Reste à facturer']) {
      expect(src).toContain(h);
    }
    expect(src).toContain('`/admin/projets/${r.projectId}`');
    expect(src).toContain('pilotageHref(');
    expect(src).toContain('Marge globale (coûts récurrents de la période déduits)');
  });
});

describe('DetailPanel', () => {
  const src = read('./DetailPanel.tsx');
  it('renders the drill-down copy', () => {
    expect(src).toContain('id="detail"');
    expect(src).toContain('tabIndex={-1}');
    for (const s of [
      'Détail : ',
      'Total des lignes = ',
      'Fermer le détail',
      'Page ',
      ' sur ',
      'Précédente',
      'Suivante',
      'Aucun élément ne compose ce chiffre pour cette période.',
      'Encaissement',
      'Coût',
      'Nature',
    ]) {
      expect(src).toContain(s);
    }
  });
  it('uses the view model total without summing rows', () => {
    expect(src).toContain('detail.totalCents');
    expect(src).not.toContain('reduce(');
  });
});
