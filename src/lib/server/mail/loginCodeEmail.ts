// E-mail du code de connexion (D-10, 10-UI-SPEC S5). Fonction typée simple,
// styles en ligne, aucune image ni pixel de suivi, aucun prix.

export const LOGIN_EMAIL_FROM = 'Sevalys <connexion@sevalys.com>';
export const LOGIN_EMAIL_REPLY_TO = 'contact@sevalys.com';

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

  const safeCode = escapeHtml(code);
  const safeLink = escapeHtml(link);
  const safeExpiry = escapeHtml(expiryLine);
  const safeSecurity = escapeHtml(securityLine);

  const font = "font-family:'Manrope', Arial, sans-serif;";

  // Les chiffres du code en couleur d'accent (#C4F542) sont une exception délibérée
  // de la UI-SPEC (liste d'usage réservé de l'accent, point 4) ; le champ de saisie
  // à l'écran utilise --ink. Ne pas "corriger".
  const html = `<!doctype html>
<html lang="fr">
<body style="margin:0;padding:24px 12px;background:#0A0B0C;${font}color:#ECEAE3;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0A0B0C;">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="width:100%;max-width:480px;background:#111213;border-radius:8px;">
        <tr><td style="padding:32px 24px;${font}color:#ECEAE3;font-size:16px;line-height:1.5;">
          <p style="margin:0 0 16px 0;">Voici votre code de connexion :</p>
          <div style="margin:0 0 24px 0;padding:16px;background:#0A0B0C;border:1px solid #2a2a2a;text-align:center;font-family:'Courier New', Courier, monospace;font-size:32px;letter-spacing:0.3em;color:#C4F542;">${safeCode}</div>
          <p style="margin:0 0 16px 0;">${safeExpiry}</p>
          <p style="margin:0 0 16px 0;"><a href="${safeLink}" style="color:#ECEAE3;text-decoration:underline;">Ou ouvrez ce lien de connexion</a></p>
          <p style="margin:0;font-size:13px;color:#9a9a94;">${safeSecurity}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    'Voici votre code de connexion :',
    '',
    code,
    '',
    expiryLine,
    '',
    `Ou ouvrez ce lien de connexion : ${link}`,
    '',
    securityLine,
  ].join('\n');

  return { subject, html, text };
}
