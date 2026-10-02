// E-mail d'invitation client (D-01). HTML typé simple, styles en ligne,
// sans image ni pixel de suivi, sans mention de prix.
import { buildFromHeader } from './fromHeader';

export const INVITE_EMAIL_FROM = buildFromHeader('Sèvalys', 'connexion@sevalys.com');
export const INVITE_EMAIL_REPLY_TO = 'contact@sevalys.com';

// Contrastes sur la carte #111213 : #9A9690 ≈ 6,4:1, #ECEAE3 ≈ 14:1 (≥ 4,5:1).
export const INVITE_FOOTNOTE_COLOR = '#9A9690';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const INVITE_SUBJECT = 'Votre espace client Sèvalys est ouvert' as const;

export function buildInviteEmail({
  clientName,
  loginUrl,
}: {
  clientName: string;
  loginUrl: string;
}): { subject: typeof INVITE_SUBJECT; html: string; text: string } {
  const subject = INVITE_SUBJECT;
  const name = escapeHtml(clientName);
  const url = escapeHtml(loginUrl);
  const font = "'Manrope', Arial, sans-serif";
  const dim = INVITE_FOOTNOTE_COLOR;

  const html = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="dark">
    <meta name="supported-color-schemes" content="dark">
    <title>${subject}</title>
  </head>
  <body bgcolor="#0A0B0C" style="margin:0;padding:0;background:#0A0B0C;color:#ECEAE3;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#0A0B0C" style="background:#0A0B0C;">
      <tr>
        <td align="center" bgcolor="#0A0B0C" style="padding:32px 16px;background:#0A0B0C;">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" bgcolor="#111213" style="max-width:480px;width:100%;background:#111213;border:1px solid #1F1F1F;border-radius:12px;">
            <tr>
              <td bgcolor="#111213" style="padding:24px;background:#111213;font-family:${font};color:#ECEAE3;font-size:16px;line-height:1.5;">
                <p style="margin:0 0 16px;font-size:20px;font-weight:500;letter-spacing:-0.02em;color:#ECEAE3;">Sèvalys</p>
                <h1 style="margin:0 0 16px;font-size:24px;font-weight:500;color:#ECEAE3;">Votre espace client Sèvalys est ouvert</h1>
                <p style="margin:0 0 16px;color:#ECEAE3;">Bonjour, l'espace de <strong>${name}</strong> est prêt. Pour y entrer :</p>
                <ol style="margin:0 0 24px;padding-left:20px;color:#ECEAE3;">
                  <li style="margin:0 0 4px;">Cliquez sur le bouton ci-dessous.</li>
                  <li style="margin:0 0 4px;">Votre adresse e-mail est déjà remplie.</li>
                  <li style="margin:0;">Saisissez le code à usage unique reçu par e-mail.</li>
                </ol>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                  <tr>
                    <td bgcolor="#C4F542" style="background:#C4F542;border-radius:100px;">
                      <a href="${url}" style="display:inline-block;padding:12px 24px;color:#000000;text-decoration:none;font-family:${font};font-weight:500;">Accéder à mon espace</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 16px;color:#ECEAE3;">Anatholy Bricon<br>Sèvalys · Tours</p>
                <p style="margin:0;color:${dim};font-size:14px;">Une question ? Répondez à cet e-mail ou écrivez-nous à ${INVITE_EMAIL_REPLY_TO}.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    'Sèvalys',
    '',
    'Votre espace client Sèvalys est ouvert',
    '',
    `Bonjour, l'espace de ${clientName} est prêt. Pour y entrer :`,
    '',
    '1. Cliquez sur le lien ci-dessous.',
    '2. Votre adresse e-mail est déjà remplie.',
    '3. Saisissez le code à usage unique reçu par e-mail.',
    '',
    `Accéder à mon espace : ${loginUrl}`,
    '',
    'Anatholy Bricon',
    'Sèvalys · Tours',
    '',
    `Une question ? Répondez à cet e-mail ou écrivez-nous à ${INVITE_EMAIL_REPLY_TO}.`,
  ].join('\n');

  return { subject, html, text };
}
