import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const files = {
  types: read('./documents/types.ts'),
  preview: read('./documents/PreviewIssuePanel.tsx'),
  list: read('./documents/IssuedDocumentsList.tsx'),
  snapshot: read('./documents/SnapshotPanel.tsx'),
  quote: read('./documents/QuoteForm.tsx'),
  spec: read('./documents/SpecForm.tsx'),
  invoice: read('./documents/InvoicePreviewForm.tsx'),
  contract: read('./documents/ContractForm.tsx'),
  acceptance: read('./documents/AcceptanceForm.tsx'),
  panel: read('./documents/DocumentsPanel.tsx'),
};
const tsx = Object.values(files).filter((src) => src !== files.types);

describe('admin document components source guards (T-13-39, T-13-40, T-13-41)', () => {
  it('has no service client, GSAP, cursor or HTML injection', () => {
    for (const src of Object.values(files)) {
      expect(src).not.toContain('createSupabaseAdminClient');
      expect(src).not.toContain('@/lib/supabase/admin');
      expect(src).not.toContain('gsap');
      expect(src).not.toContain('CustomCursor');
      expect(src).not.toContain('dangerouslySetInnerHTML');
    }
  });

  it('components are client components', () => {
    for (const src of tsx) expect(src.startsWith("'use client'")).toBe(true);
  });

  it('PreviewIssuePanel revokes blob URLs, titles the iframe and announces results', () => {
    expect(files.preview).toContain('URL.revokeObjectURL');
    expect(files.preview).toContain('title="Aperçu du document"');
    expect(files.preview).toContain('aria-live="polite"');
    expect(files.preview).toContain('previewKey === dirtyKey');
    expect(files.preview).toContain('crypto.randomUUID()');
  });

  it('IssuedDocumentsList is an accessible table with replaced rows', () => {
    expect(files.list).toContain('caption');
    expect(files.list).toContain('scope="col"');
    expect(files.list).toContain('pt-doc-replaced');
    expect(files.list).toContain('STATUS_LABELS');
  });

  it('SnapshotPanel is read-only', () => {
    expect(files.snapshot).toContain('JSON.stringify');
    expect(files.snapshot).not.toContain('<input');
    expect(files.snapshot).not.toContain('<textarea');
  });

  it('SnapshotPanel never shows the tamper verdict on a transport failure (WR-07)', () => {
    const catchBlock = files.snapshot.slice(files.snapshot.indexOf('} catch {', files.snapshot.indexOf('verify(doc.id)')));
    expect(catchBlock.slice(0, 300)).toContain('COPY.verifyFailed');
    expect(catchBlock.slice(0, 300)).not.toContain('COPY.verifyKo');
  });

  it('PDF rendering stays server-side', () => {
    for (const src of Object.values(files)) {
      expect(src).not.toContain('@react-pdf/renderer');
      expect(src).not.toContain('@/lib/server');
    }
  });

  it('forms plug into PreviewIssuePanel with a dirtyKey', () => {
    for (const src of [files.quote, files.spec, files.invoice, files.contract, files.acceptance]) {
      expect(src).toContain('<PreviewIssuePanel');
      expect(src).toContain('dirtyKey');
    }
  });

  it('InvoicePreviewForm is preview-only (D-10, T-13-54)', () => {
    expect(files.invoice).toContain('canIssue={false}');
    expect(files.invoice).not.toContain('Émettre');
  });

  it('SpecForm prefills from the project goal and caps at 4000', () => {
    expect(files.spec).toContain('projectGoal');
    expect(files.spec).toContain('4000');
  });

  it('QuoteForm guards 30 lines and sends cents only (T-13-53)', () => {
    expect(files.quote).toContain('MAX_LINES = 30');
    expect(files.quote).toContain('toCents(');
    expect(files.quote).not.toContain('Intl.NumberFormat');
  });

  it('ContractForm has no editable clause (D-07)', () => {
    expect(files.contract).not.toContain('<textarea');
    expect(files.contract).toContain("docType: 'contract'");
  });

  it('AcceptanceForm requires a delivery date and caps reservations at 2000 (D-09)', () => {
    expect(files.acceptance).toContain('maxLength={2000}');
    expect(files.acceptance).toContain('deliveryDate');
    expect(files.acceptance).toContain("docType: 'acceptance'");
  });

  it('DocumentsPanel only opens forms on click and never generates by itself (D-01, T-13-66)', () => {
    expect(files.panel).toContain('COPY.generate');
    expect(files.panel).toContain('noExpected');
    expect(files.panel).not.toContain('actions.preview(');
    expect(files.panel).not.toContain('actions.issue(');
    expect(files.panel).not.toContain('useEffect');
  });

  it('has no transverse documents page (D-16)', () => {
    expect(existsSync(new URL('../../../app/admin/documents', import.meta.url))).toBe(false);
  });
});
