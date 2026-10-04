// Test permanent de compatibilité pdf-lib x sortie @react-pdf (RESEARCH A5, Pitfall 9).
import { describe, expect, it, vi } from 'vitest';
import { PDFDocument, PDFRawStream, PDFArray, PDFRef, decodePDFRawStream } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

vi.mock('server-only', () => ({}));

import { renderDocument } from '@/lib/server/documents/render';
import {
  sampleQuoteSnapshot,
  sampleContractSnapshot,
  sampleAcceptanceSnapshot,
} from '@/lib/documents/fixtures';
import { loadCertificateFonts } from './fonts';

const TEXT = 'Procès-verbal « Recette » · Signé — 12 octobre 2026 à 14:05';

function pageContentBytes(pdf: PDFDocument, i: number): Uint8Array[] {
  const page = pdf.getPage(i);
  const contents = page.node.Contents();
  const out: Uint8Array[] = [];
  const streams =
    contents instanceof PDFArray
      ? contents.asArray().map((r) => (r instanceof PDFRef ? pdf.context.lookup(r) : r))
      : [contents];
  for (const s of streams) {
    if (s instanceof PDFRawStream) out.push(decodePDFRawStream(s).decode());
    else if (s && 'getContents' in s) out.push((s as { getContents(): Uint8Array }).getContents());
  }
  return out;
}

const cases = [
  ['quote', () => sampleQuoteSnapshot()],
  ['contract', () => sampleContractSnapshot()],
  ['acceptance', () => sampleAcceptanceSnapshot()],
] as const;

describe('pdf-lib x @react-pdf', () => {
  it('loadCertificateFonts retourne deux polices non vides', () => {
    const f = loadCertificateFonts();
    expect(f.regular.length).toBeGreaterThan(0);
    expect(f.bold.length).toBeGreaterThan(0);
  });

  for (const [name, make] of cases) {
    it(`${name} : ajout d'une page, pages d'origine intactes`, async () => {
      const { buffer } = await renderDocument(make());
      const original = await PDFDocument.load(buffer, { updateMetadata: false });
      const n = original.getPageCount();
      const before = Array.from({ length: n }, (_, i) => pageContentBytes(original, i));

      const pdf = await PDFDocument.load(buffer, { updateMetadata: false });
      pdf.registerFontkit(fontkit);
      const fonts = loadCertificateFonts();
      const regular = await pdf.embedFont(fonts.regular, { subset: true });
      const bold = await pdf.embedFont(fonts.bold, { subset: true });
      const page = pdf.addPage([595.28, 841.89]);
      page.drawText(TEXT, { x: 50, y: 780, size: 11, font: regular });
      page.drawText(TEXT, { x: 50, y: 760, size: 11, font: bold });
      const saved = await pdf.save({ useObjectStreams: false });

      const reloaded = await PDFDocument.load(saved, { updateMetadata: false });
      expect(reloaded.getPageCount()).toBe(n + 1);
      for (let i = 0; i < n; i++) {
        const after = pageContentBytes(reloaded, i);
        expect(after.length).toBe(before[i].length);
        after.forEach((b, k) => expect(Buffer.from(b).equals(Buffer.from(before[i][k]))).toBe(true));
      }
    });
  }

  it('déterminisme de deux sauvegardes (informatif)', async () => {
    const { buffer } = await renderDocument(sampleQuoteSnapshot());
    const save = async () => {
      const pdf = await PDFDocument.load(buffer, { updateMetadata: false });
      pdf.addPage([595.28, 841.89]);
      return Buffer.from(await pdf.save({ useObjectStreams: false }));
    };
    const [a, b] = [await save(), await save()];
    console.log('DETERMINISM identical=', a.equals(b));
    expect(a.length).toBeGreaterThan(0);
  });
});
