import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import LeadFilters from './leads/LeadFilters';
import ProjectFilters from './projects/ProjectFilters';

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');

describe('N5 unknown status filter', () => {
  const base = { retours: false, sources: [] as string[] };
  it('says so instead of ignoring ?statut=xxx silently', () => {
    const html = renderToStaticMarkup(
      createElement(LeadFilters, { ...base, notice: "Le filtre « Statut : xxx » n'existe pas." }),
    );
    expect(html).toContain('role="status"');
    expect(html).toContain('Statut : xxx');
  });

  it('shows nothing when the filter is fine', () => {
    const html = renderToStaticMarkup(createElement(LeadFilters, { ...base, statut: 'new', notice: null }));
    expect(html).not.toContain('role="status"');
  });

  it('is wired on the leads page', () => {
    const page = read('../../app/admin/leads/page.tsx');
    expect(page).toContain("ignoredFilterNotice('Statut', rawStatut, STATUS_ORDER)");
    expect(page).toContain('notice={statutNotice}');
  });
});

describe('F-D9 project sort without column headers', () => {
  it('offers a sort field and an order field in the filters', () => {
    const html = renderToStaticMarkup(createElement(ProjectFilters, { tri: 'etape', ordre: 'asc' }));
    expect(html).toContain('name="tri"');
    expect(html).toContain('name="ordre"');
    expect(html).toContain('Trier par');
    expect(html).toContain('Qui attend');
    expect(html).toMatch(/<option value="etape" selected/);
    expect(html).toMatch(/<option value="asc" selected/);
  });

  it('is wired on the projects page', () => {
    expect(read('../../app/admin/projets/page.tsx')).toContain('tri={tri} ordre={ordre}');
  });
});
