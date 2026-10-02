// E-mail admin "onboarding terminé" (D-22) : sans prix, sans pixel de suivi.
import { INVITE_FOOTNOTE_COLOR, escapeHtml } from './inviteEmail';

export function buildOnboardingCompletedEmail({
  companyName,
  projectTitle,
  adminUrl,
}: {
  companyName: string;
  projectTitle: string;
  adminUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = `Onboarding terminé : ${companyName}`;
  const company = escapeHtml(companyName);
  const title = escapeHtml(projectTitle);
  const url = escapeHtml(adminUrl);
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
                <h1 style="margin:0 0 16px;font-size:24px;font-weight:500;color:#ECEAE3;">Onboarding terminé : ${company}</h1>
                <p style="margin:0 0 16px;color:#ECEAE3;"><strong>${company}</strong> a terminé l'onboarding du projet <strong>${title}</strong>.</p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                  <tr>
                    <td bgcolor="#C4F542" style="background:#C4F542;border-radius:100px;">
                      <a href="${url}" style="display:inline-block;padding:12px 24px;color:#000000;text-decoration:none;font-family:${font};font-weight:500;">Ouvrir le projet</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0;color:${dim};font-size:14px;">Notification interne Sèvalys.</p>
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
    `Onboarding terminé : ${companyName}`,
    '',
    `${companyName} a terminé l'onboarding du projet ${projectTitle}.`,
    '',
    `Ouvrir le projet : ${adminUrl}`,
  ].join('\n');

  return { subject, html, text };
}
