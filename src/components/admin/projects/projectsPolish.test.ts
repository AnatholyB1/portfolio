import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const invoiceList = read('./billing/InvoiceList.tsx');
const signature = read('./documents/SignaturePanel.tsx');
const snapshot = read('./documents/SnapshotPanel.tsx');
const documents = read('./documents/DocumentsPanel.tsx');
const listPage = read('../../../app/admin/projets/page.tsx');
const table = read('./ProjectsTable.tsx');

describe('number and copy formatting (audit v2.0)', () => {
  it('InvoiceList prints quantities with the shared fr-FR helper, not a raw division', () => {
    expect(invoiceList).toContain('formatQuantityMilli(Number(l.quantity_milli))');
    expect(invoiceList).not.toContain('/ 1000');
    expect(invoiceList).toContain('formatSignedEuros');
    expect(invoiceList).not.toMatch(/\bformatEuros\b/);
  });

  it('SignaturePanel shows human actor labels instead of the raw actor kind', () => {
    expect(signature).toContain('actorKindLabel(e.actorKind)');
    expect(signature).not.toContain('{e.actorKind}');
  });

  it('loading placeholders carry a label, not a bare ellipsis', () => {
    for (const src of [invoiceList, snapshot]) {
      expect(src).not.toContain('>…<');
      expect(src).toContain('Chargement du détail…');
    }
  });
});

describe('heading levels and inline styles', () => {
  it('sub-section headings carry pt-heading', () => {
    expect(invoiceList).not.toMatch(/<h[34]>/);
    expect(snapshot).not.toMatch(/<h[34]>/);
    expect(documents).not.toMatch(/<h[34]>/);
    expect(signature).toContain('<h4 className="pt-heading">');
  });

  it.each([
    ['projets list page', listPage],
    ['DocumentsPanel', documents],
    ['InvoiceList', invoiceList],
    ['SnapshotPanel', snapshot],
  ])('%s has no inline style layout', (_n, src) => {
    expect(src).not.toMatch(/style=\{\{/);
  });
});

describe('projets list', () => {
  it('caps the rows per page and paginates with the shared pager', () => {
    expect(listPage).toContain('PAGE_SIZE = 25');
    expect(listPage).toContain('.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)');
    expect(listPage).toContain('<Pager');
    expect(listPage).toContain("countFr(n, 'projet')");
  });

  it('the client link in the table is a 44px target', () => {
    expect(table).toContain('pt-link-target');
  });
});
