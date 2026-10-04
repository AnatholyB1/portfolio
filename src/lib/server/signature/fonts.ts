import 'server-only';
// Polices Manrope pour la page de certificat (embarquées via pdf-lib + fontkit).
// Décode les data URIs déjà générées pour le rendu react-pdf (phase 13).
import { MANROPE_400, MANROPE_700 } from '@/lib/documents/fontData';

let cache: { regular: Uint8Array; bold: Uint8Array } | null = null;

function decodeDataUri(uri: string): Uint8Array {
  const comma = uri.indexOf(',');
  if (comma < 0) throw new Error('data URI de police invalide');
  return new Uint8Array(Buffer.from(uri.slice(comma + 1), 'base64'));
}

export function loadCertificateFonts(): { regular: Uint8Array; bold: Uint8Array } {
  if (!cache) {
    cache = { regular: decodeDataUri(MANROPE_400), bold: decodeDataUri(MANROPE_700) };
  }
  return cache;
}
