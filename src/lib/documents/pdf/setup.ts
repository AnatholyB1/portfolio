// Enregistrement unique de la police Manrope (data URIs, aucun accès fs) et
// désactivation de la césure (les mots français ne sont jamais coupés).
import { Font } from "@react-pdf/renderer";
import { MANROPE_400, MANROPE_700 } from "../fontData";

export const PDF_FONT_FAMILY = "Manrope";
export const BULLET_GLYPH: string = "•";

let done = false;

export function setupPdf(): void {
  if (done) return;
  Font.register({
    family: PDF_FONT_FAMILY,
    fonts: [
      { src: MANROPE_400, fontWeight: 400 },
      { src: MANROPE_700, fontWeight: 700 },
    ],
  });
  Font.registerHyphenationCallback((word) => [word]);
  done = true;
}
