import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const files = {
  types: read('./documents/types.ts'),
  preview: read('./documents/PreviewIssuePanel.tsx'),
  list: read('./documents/IssuedDocumentsList.tsx'),
  snapshot: read('./documents/SnapshotPanel.tsx'),
};
const tsx = [files.preview, files.list, files.snapshot];

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

  it('PDF rendering stays server-side', () => {
    for (const src of Object.values(files)) expect(src).not.toContain('@react-pdf/renderer');
  });
});
