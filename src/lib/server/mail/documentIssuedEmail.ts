// E-mail "document émis" (D-04) : sans montant, sans lien signé, sans pixel de suivi.
import { INVITE_EMAIL_REPLY_TO, INVITE_FOOTNOTE_COLOR, escapeHtml } from './inviteEmail';

export function buildDocumentIssuedEmail({
  documentLabel,
  projectTitle,
  revision,
  portalUrl,
}: {
  documentLabel: string;
  projectTitle: string;
  revision: number;
  portalUrl: string;
}): { subject: string; html: string; text: string } {
  const heading = revision > 1 ? 'Nouvelle version' : 'Nouveau document';
  const subject = `${heading} : ${documentLabel} — ${projectTitle}`;
  const docLine = `${documentLabel}, version ${revision}`;
  const bodyText =
    'un nouveau document est disponible dans votre espace client : ' +
    `${docLine}. Pour le consulter, connectez-vous à votre espace.`;
  const url = escapeHtml(portalUrl);
  const font = "'Manrope', Arial, sans-serif";
  const dim = INVITE_FOOTNOTE_COLOR;

  const html = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="dark">
    <meta name="supported-color-schemes" content="dark">
    <title>${escapeHtml(subject)}</title>
  </head>
  <body bgcolor="#0A0B0C" style="margin:0;padding:0;background:#0A0B0C;color:#ECEAE3;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#0A0B0C" style="background:#0A0B0C;">
      <tr>
        <td align="center" bgcolor="#0A0B0C" style="padding:32px 16px;background:#0A0B0C;">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" bgcolor="#111213" style="max-width:480px;width:100%;background:#111213;border:1px solid #1F1F1F;border-radius:12px;">
            <tr>
              <td bgcolor="#111213" style="padding:24px;background:#111213;font-family:${font};color:#ECEAE3;font-size:16px;line-height:1.5;">
                <p style="margin:0 0 16px;font-size:20px;font-weight:500;letter-spacing:-0.02em;color:#ECEAE3;">Sèvalys</p>
                <h1 style="margin:0 0 16px;font-size:24px;font-weight:500;color:#ECEAE3;">${escapeHtml(heading)} : ${escapeHtml(projectTitle)}</h1>
                <p style="margin:0 0 16px;color:#ECEAE3;">Bonjour, ${escapeHtml(bodyText)}</p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                  <tr>
                    <td bgcolor="#C4F542" style="background:#C4F542;border-radius:100px;">
                      <a href="${url}" style="display:inline-block;padding:12px 24px;color:#000000;text-decoration:none;font-family:${font};font-weight:500;">Ouvrir mon espace client</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 16px;color:#ECEAE3;">Sèvalys</p>
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
    `${heading} : ${projectTitle}`,
    '',
    `Bonjour, ${bodyText}`,
    '',
    `Ouvrir mon espace client : ${portalUrl}`,
    '',
    'Sèvalys',
    '',
    `Une question ? Répondez à cet e-mail ou écrivez-nous à ${INVITE_EMAIL_REPLY_TO}.`,
  ].join('\n');

  return { subject, html, text };
}
