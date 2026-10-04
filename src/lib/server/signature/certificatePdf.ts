import 'server-only';
// Page(s) de certificat ajoutée(s) après les pages d'origine, jamais avant (D-07). UI-SPEC Surface E.
// Aucune date calculée ici : tout vient de CertificateData (lignes de la piste d'audit).
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { pdfSafe, type CertificateData } from '@/lib/signature/certificate';
import { loadCertificateFonts } from './fonts';

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const M_TOP = 48;
const M_RIGHT = 48;
const M_BOTTOM = 64;
const M_LEFT = 48;
const CONTENT_W = PAGE_W - M_LEFT - M_RIGHT;

const hex = (h: string) => {
  const n = parseInt(h.slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};
const INK = hex('#111111');
const MUTED = hex('#5A5A5A');
const RULE = hex('#D4D4D4');
const BAND = hex('#F4F4F2');

const S_SMALL = 8;
const S_BODY = 10;
const S_HEAD = 12;
const S_TITLE = 24;
const LH_BODY = S_BODY * 1.5;
const LH_SMALL = S_SMALL * 1.5;

const TITLE = 'Certificat de signature électronique';
const SUBTITLE = 'Signature électronique simple par code à usage unique';

/** Coupe un texte en lignes qui tiennent dans maxWidth ; un mot trop long est coupé au caractère. */
export function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const out: string[] = [];
  const paragraphs = text.split('\n');
  for (const para of paragraphs) {
    const words = para.split(/ +/).filter((w) => w.length > 0);
    let line = '';
    const push = () => {
      out.push(line);
      line = '';
    };
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) push();
      let rest = word;
      while (font.widthOfTextAtSize(rest, size) > maxWidth) {
        let cut = rest.length - 1;
        while (cut > 1 && font.widthOfTextAtSize(rest.slice(0, cut), size) > maxWidth) cut--;
        out.push(rest.slice(0, cut));
        rest = rest.slice(cut);
      }
      line = rest;
    }
    if (line || words.length === 0) push();
  }
  return out;
}

/** Ajoute la ou les pages de certificat ; retourne le nombre de pages ajoutées. */
export async function appendCertificatePages(
  pdf: PDFDocument,
  data: CertificateData,
  fonts: { regular: Uint8Array; bold: Uint8Array } = loadCertificateFonts(),
): Promise<number> {
  pdf.registerFontkit(fontkit);
  const regular = await pdf.embedFont(fonts.regular, { subset: true });
  const bold = await pdf.embedFont(fonts.bold, { subset: true });

  const pages: PDFPage[] = [];
  let page!: PDFPage;
  let y = 0;

  const newPage = () => {
    page = pdf.addPage([PAGE_W, PAGE_H]);
    pages.push(page);
    y = PAGE_H - M_TOP;
  };
  const ensure = (h: number) => {
    if (y - h < M_BOTTOM) newPage();
  };
  const text = (
    s: string,
    x: number,
    size: number,
    font: PDFFont,
    color = INK,
  ) => {
    page.drawText(pdfSafe(s), { x, y: y - size, size, font, color });
  };
  const paragraph = (s: string, size: number, font: PDFFont, color = INK, lh = size * 1.5, x = M_LEFT, w = CONTENT_W) => {
    for (const l of wrapText(pdfSafe(s), font, size, w)) {
      ensure(lh);
      text(l, x, size, font, color);
      y -= lh;
    }
  };
  const gap = (h: number) => {
    y -= h;
  };
  const heading = (s: string) => {
    ensure(S_HEAD * 1.2 + 8 + LH_BODY);
    gap(10);
    text(s, M_LEFT, S_HEAD, bold);
    y -= S_HEAD * 1.2;
    page.drawLine({
      start: { x: M_LEFT, y: y - 2 },
      end: { x: M_LEFT + CONTENT_W, y: y - 2 },
      thickness: 0.5,
      color: RULE,
    });
    gap(8);
  };
  const LABEL_W = 170;
  const row = (label: string, value: string, x0 = M_LEFT, w = CONTENT_W) => {
    const lines = wrapText(pdfSafe(value), regular, S_BODY, w - LABEL_W);
    ensure(LH_BODY * Math.max(1, lines.length));
    text(label, x0, S_BODY, regular, MUTED);
    for (const l of lines) {
      text(l, x0 + LABEL_W, S_BODY, regular);
      y -= LH_BODY;
    }
    if (lines.length === 0) y -= LH_BODY;
  };
  const hashBlock = (label: string, lines: [string, string]) => {
    ensure(LH_SMALL + LH_BODY * 2);
    text(label, M_LEFT, S_SMALL, regular, MUTED);
    y -= LH_SMALL;
    for (const l of lines) {
      text(l, M_LEFT, S_BODY, regular);
      y -= LH_BODY;
    }
  };

  newPage();

  // 1. Titre
  for (const l of wrapText(pdfSafe(TITLE), bold, S_TITLE, CONTENT_W)) {
    text(l, M_LEFT, S_TITLE, bold);
    y -= S_TITLE * 1.2;
  }
  text(SUBTITLE, M_LEFT, S_SMALL, regular, MUTED);
  y -= LH_SMALL;
  gap(6);

  // 2. Bloc Document (fond Band, marge intérieure 16)
  {
    const pad = 16;
    const items: [string, string][] = [
      ['Type', data.docTypeLabel],
      ['Référence', data.reference],
      ['Version du document', String(data.revision)],
      ['Version du modèle', data.templateVersion],
      ['Émis le', data.issuedAtParis],
    ];
    const boxH = pad * 2 + items.length * LH_BODY;
    ensure(boxH);
    page.drawRectangle({ x: M_LEFT, y: y - boxH, width: CONTENT_W, height: boxH, color: BAND });
    const top = y;
    y -= pad;
    for (const [k, v] of items) row(k, v, M_LEFT + pad, CONTENT_W - pad * 2);
    y = top - boxH;
  }
  gap(10);

  // 3. Empreinte de l'original
  hashBlock("Empreinte de l'original (SHA-256)", data.originalSha256Lines);

  // 4. Signataire
  heading('Signataire');
  row('Nom', data.signerName);
  row('Fonction', data.signerRole);
  row('Adresse e-mail', data.signerEmail);

  // 5. Signature
  heading('Signature');
  row('Date et heure (Europe/Paris)', data.signedAtParis);
  row('Date et heure (UTC)', data.signedAtUtc);
  row('Adresse IP', data.ip);
  row('Méthode', data.method);

  // 6. Piste d'audit
  heading("Piste d'audit");
  row('Nombre de maillons', String(data.chainLength));
  hashBlock('Empreinte du dernier maillon (SHA-256)', data.lastLinkHashLines);

  // 7. Critères (PV)
  if (data.acceptance) {
    heading("Critères d'acceptation validés");
    if (data.acceptance.reserved.length === 0) {
      paragraph('Tous les critères ont été validés sans réserve.', S_BODY, regular);
    } else {
      const C1 = 40;
      const C2 = 120;
      const C3 = CONTENT_W - C1 - C2;
      const header = () => {
        ensure(LH_BODY + 4);
        text('N°', M_LEFT, S_SMALL, bold, MUTED);
        text('Statut', M_LEFT + C1, S_SMALL, bold, MUTED);
        text('Réserve', M_LEFT + C1 + C2, S_SMALL, bold, MUTED);
        y -= LH_SMALL;
      };
      header();
      for (const r of data.acceptance.reserved) {
        const lines = wrapText(pdfSafe(r.note), regular, S_BODY, C3);
        const h = LH_BODY * Math.max(1, lines.length);
        if (y - h < M_BOTTOM) {
          newPage();
          header();
        }
        text(String(r.index), M_LEFT, S_BODY, regular);
        text('Livré avec réserve', M_LEFT + C1, S_BODY, regular);
        for (const l of lines) {
          text(l, M_LEFT + C1 + C2, S_BODY, regular);
          y -= LH_BODY;
        }
        if (lines.length === 0) y -= LH_BODY;
        page.drawLine({
          start: { x: M_LEFT, y: y + 2 },
          end: { x: M_LEFT + CONTENT_W, y: y + 2 },
          thickness: 0.25,
          color: RULE,
        });
      }
    }
  }

  // 8. Mentions
  gap(12);
  paragraph(data.mentions.join(' '), S_SMALL, regular, MUTED, LH_SMALL);

  // 9. Pied de page sur chaque page de certificat
  const total = pages.length;
  pages.forEach((p, i) => {
    const yy = M_BOTTOM / 2 - S_SMALL / 2;
    p.drawText(pdfSafe(data.footerLeft), { x: M_LEFT, y: yy, size: S_SMALL, font: regular, color: MUTED });
    const right = pdfSafe(`Certificat · page ${i + 1} / ${total}`);
    const w = regular.widthOfTextAtSize(right, S_SMALL);
    p.drawText(right, { x: PAGE_W - M_RIGHT - w, y: yy, size: S_SMALL, font: regular, color: MUTED });
  });

  return total;
}
