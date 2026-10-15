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
      'Aucun CA signé sur cette période',
      'Changez de période ou consultez le pipeline.',
    ]) {
      expect(src).toContain(s);
    }
    expect(src).not.toMatch(/premier contact|first_touch/i);
  });
});

describe('money columns and tables (audit v2.0)', () => {
  const css = read('./pilotage.css');
  it('pilotage.css defines the global right-aligned mono tabular numerals class under .pt-admin', () => {
    expect(css).toMatch(/\.pt-admin \.pt-num,\s*\.pt-admin \.pt-pilot-num\s*\{[^}]*tabular-nums/);
    expect(css).toMatch(/th\.pt-num[\s\S]*text-align:\s*right/);
  });
  it.each(['SourceTable.tsx', 'ProjectMarginTable.tsx', 'DetailPanel.tsx'])(
    '%s uses pt-num and pt-pilot-table, never the funnel-scoped class',
    (f) => {
      const src = read(`./${f}`);
      expect(src).toContain('pt-num');
      expect(src).toContain('pt-pilot-table');
      expect(src).not.toContain('pt-funnel-num');
    },
  );
  it('ProjectMarginTable has an empty state and 44px link targets', () => {
    const src = read('./ProjectMarginTable.tsx');
    expect(src).toContain('projects.length === 0');
    expect(src).toContain('pt-link-target');
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
      '<Pager',
      'Pagination du détail',
      'Aucun élément ne compose ce chiffre pour cette période.',
      'Encaissement',
      'Coût',
      'Nature',
    ]) {
      expect(src).toContain(s);
    }
  });
  it('paginates with the shared pager, no undefined pt-pilot-pager class', () => {
    expect(src).not.toContain('pt-pilot-pager');
    const pager = read('../shared/Pager.tsx');
    for (const s of ['Précédent', 'Suivant', 'Page ', ' sur ', 'pt-btn-ghost']) expect(pager).toContain(s);
  });
  it('uses the view model total without summing rows', () => {
    expect(src).toContain('detail.totalCents');
    expect(src).not.toContain('reduce(');
  });
});
