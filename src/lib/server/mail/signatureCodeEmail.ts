// E-mail du code de signature (14-UI-SPEC Surface F). Aucun lien, aucun bouton, aucun prix.
// Envoyé directement via Resend (jamais via l'outbox, qui stocke le payload en clair).

import { buildFromHeader } from './fromHeader';
import { escapeHtml, LOGIN_FOOTNOTE_COLOR } from './loginCodeEmail';

export const SIGNATURE_EMAIL_FROM = buildFromHeader('Sèvalys', 'connexion@sevalys.com');
export const SIGNATURE_EMAIL_REPLY_TO = 'contact@sevalys.com';

export interface SignatureCodeEmailInput {
  code: string;
  documentLabel: string;
  expiryMinutes: number;
}

export function buildSignatureCodeEmail({ code, documentLabel, expiryMinutes }: SignatureCodeEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = 'Votre code de signature Sèvalys';
  const intro = `Bonjour, voici votre code pour signer ${documentLabel} :`;
  const expiryLine = `Il est valable ${expiryMinutes} minutes.`;
  const warning =
    "Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail ; aucune signature ne sera enregistrée.";
  const font = "font-family:'Manrope', Arial, sans-serif;";

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
          <p style="margin:0 0 16px 0;">${escapeHtml(intro)}</p>
          <div style="margin:0 0 24px 0;padding:16px 8px;background:#0A0B0C;border:1px solid #6F6B64;text-align:center;white-space:nowrap;font-family:'Courier New', Courier, monospace;font-size:28px;letter-spacing:0.18em;color:#C4F542;">${escapeHtml(code)}</div>
          <p style="margin:0 0 16px 0;">${escapeHtml(expiryLine)}</p>
          <p style="margin:0;font-size:14px;color:${LOGIN_FOOTNOTE_COLOR};">${escapeHtml(warning)}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = ['Sèvalys', '', intro, '', code, '', expiryLine, '', warning].join('\n');
  return { subject, html, text };
}
