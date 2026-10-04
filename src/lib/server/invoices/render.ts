// Rendu Node uniquement. Chaque rendu produit des octets différents : l'empreinte porte sur le buffer téléversé,
// jamais sur un nouveau rendu (RESEARCH Pitfall 1).
import 'server-only';
import { createHash } from 'node:crypto';
import { renderToBuffer } from '@react-pdf/renderer';
import { ledgerDocumentElement } from '@/lib/documents/registry';
import type { LedgerSnapshot } from '@/lib/documents/types';

export async function renderLedgerPdf(
  snapshot: LedgerSnapshot,
): Promise<{ buffer: Buffer; sha256: string; size: number }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- l'élément racine est un <Document> react-pdf
  const buffer = await renderToBuffer(ledgerDocumentElement(snapshot) as any);
  return {
    buffer,
    sha256: createHash('sha256').update(buffer).digest('hex'),
    size: buffer.length,
  };
}
