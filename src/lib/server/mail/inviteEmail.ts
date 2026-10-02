// E-mail d'invitation client (D-01). HTML typé simple, styles en ligne,
// sans image ni pixel de suivi, sans mention de prix.

export const INVITE_EMAIL_FROM = 'Sevalys <connexion@sevalys.com>';
export const INVITE_EMAIL_REPLY_TO = 'contact@sevalys.com';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildInviteEmail({
  clientName,
  loginUrl,
}: {
  clientName: string;
  loginUrl: string;
}): { subject: 'Votre espace client Sèvalys est prêt'; html: string; text: string } {
  const subject = 'Votre espace client Sèvalys est prêt' as const;
  const name = escapeHtml(clientName);
  const url = escapeHtml(loginUrl);
  const font = "'Manrope', Arial, sans-serif";

  const html = `<!doctype html>
<html lang="fr">
  <body style="margin:0;padding:0;background:#0A0B0C;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0A0B0C;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#111213;border:1px solid #1F1F1F;border-radius:12px;">
            <tr>
              <td style="padding:24px;font-family:${font};color:#ECEAE3;font-size:16px;line-height:1.5;">
                <h1 style="margin:0 0 16px;font-size:24px;font-weight:500;color:#ECEAE3;">Votre espace client Sèvalys est prêt</h1>
                <p style="margin:0 0 16px;">Bonjour, l'espace de <strong>${name}</strong> a été créé.</p>
                <p style="margin:0 0 24px;color:#9A9690;">Connectez-vous avec cette adresse e-mail : vous recevrez un code de connexion, sans mot de passe à retenir.</p>
                <p style="margin:0 0 24px;">
                  <a href="${url}" style="display:inline-block;padding:12px 24px;background:#C4F542;color:#000000;text-decoration:none;border-radius:100px;font-weight:500;">Accéder à mon espace</a>
                </p>
                <p style="margin:0;color:#5A5751;font-size:14px;">Une question ? Écrivez-nous à ${INVITE_EMAIL_REPLY_TO}.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    'Votre espace client Sèvalys est prêt',
    '',
    `L'espace de ${clientName} a été créé.`,
    'Connectez-vous avec cette adresse e-mail : vous recevrez un code de connexion, sans mot de passe.',
    '',
    `Accéder à mon espace : ${loginUrl}`,
    '',
    `Une question ? Écrivez-nous à ${INVITE_EMAIL_REPLY_TO}.`,
  ].join('\n');

  return { subject, html, text };
}
