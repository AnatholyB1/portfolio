// E-mail du code de connexion (D-10, 10-UI-SPEC S5). Fonction typée simple,
// styles en ligne, aucune image ni pixel de suivi, aucun prix.

import { buildFromHeader } from './fromHeader';

export const LOGIN_EMAIL_FROM = buildFromHeader('Sèvalys', 'connexion@sevalys.com');
export const LOGIN_EMAIL_REPLY_TO = 'contact@sevalys.com';

// Contrastes sur le fond #111213 : #9A9690 ≈ 6,4:1 (≥ 4,5:1), #ECEAE3 ≈ 14:1.
export const LOGIN_FOOTNOTE_COLOR = '#9A9690';

// Deux groupes de chiffres (moitiés du code, sans longueur codée en dur). Les deux <span>
// sont accolés sans espace dans le source : l'écart est une marge CSS, donc la copie
// reste une suite de chiffres contiguë.
function splitCode(code: string): [string, string] {
  const mid = Math.ceil(code.length / 2);
  return [code.slice(0, mid), code.slice(mid)];
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface LoginCodeEmailInput {
  code: string;
  link: string;
  expiryMinutes: number | null;
}

export function buildLoginCodeEmail({ code, link, expiryMinutes }: LoginCodeEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = 'Votre code de connexion Sèvalys';
  const expiryLine =
    expiryMinutes !== null
      ? `Ce code est valable ${expiryMinutes} minutes.`
      : "Ce code n'est valable que pour une durée limitée.";
  const securityLine = "Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.";

  const [codeA, codeB] = splitCode(code);
  const safeCodeA = escapeHtml(codeA);
  const safeCodeB = escapeHtml(codeB);
  const dim = LOGIN_FOOTNOTE_COLOR;
  const safeLink = escapeHtml(link);
  const safeExpiry = escapeHtml(expiryLine);
  const safeSecurity = escapeHtml(securityLine);

  const font = "font-family:'Manrope', Arial, sans-serif;";

  // Les chiffres du code en couleur d'accent (#C4F542) sont une exception délibérée
  // de la UI-SPEC (liste d'usage réservé de l'accent, point 4) ; le champ de saisie
  // à l'écran utilise --ink. Ne pas "corriger".
  const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${subject}</title>
</head>
<body bgcolor="#0A0B0C" style="margin:0;padding:24px 12px;background:#0A0B0C;${font}color:#ECEAE3;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#0A0B0C" style="background:#0A0B0C;">
    <tr><td align="center" bgcolor="#0A0B0C" style="background:#0A0B0C;">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" bgcolor="#111213" style="width:100%;max-width:480px;background:#111213;border-radius:8px;">
        <tr><td bgcolor="#111213" style="padding:32px 24px;background:#111213;${font}color:#ECEAE3;font-size:16px;line-height:1.5;">
          <p style="margin:0 0 24px 0;font-size:20px;font-weight:500;letter-spacing:-0.02em;color:#ECEAE3;">Sèvalys</p>
          <p style="margin:0 0 16px 0;">Voici votre code de connexion :</p>
          <div style="margin:0 0 24px 0;padding:16px 8px;background:#0A0B0C;border:1px solid #6F6B64;text-align:center;white-space:nowrap;font-family:'Courier New', Courier, monospace;font-size:28px;letter-spacing:0.18em;color:#C4F542;"><span style="display:inline-block;margin-right:0.5em;">${safeCodeA}</span><span style="display:inline-block;">${safeCodeB}</span></div>
          <p style="margin:0 0 16px 0;">${safeExpiry}</p>
          <p style="margin:0 0 16px 0;">Ou ouvrez ce lien de connexion (valable une seule fois) :<br><a href="${safeLink}" style="color:#ECEAE3;text-decoration:underline;">Ouvrir le lien de connexion</a></p>
          <p style="margin:0;font-size:14px;color:${dim};">${safeSecurity}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    'Sèvalys',
    '',
    'Voici votre code de connexion :',
    '',
    code,
    '',
    expiryLine,
    '',
    `Ou ouvrez ce lien de connexion (valable une seule fois) : ${link}`,
    '',
    securityLine,
  ].join('\n');

  return { subject, html, text };
}
