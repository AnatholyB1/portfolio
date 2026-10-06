// Gabarit commun des e-mails Sèvalys (paiement, relances, marketing).
// Toute valeur interpolée passe par escapeHtml, sauf `footer.html` qui est du HTML déjà
// construit et échappé par l'appelant.
import 'server-only';
import { INVITE_EMAIL_REPLY_TO, INVITE_FOOTNOTE_COLOR, escapeHtml } from './inviteEmail';

export type BuiltBody = { subject: string; html: string; text: string };

export function emailLayout(opts: {
  subject: string;
  heading: string;
  paragraphs: string[];
  extraAfterButton?: string;
  button?: string;
  url?: string;
  footer?: { html: string; text: string };
}): BuiltBody {
  const font = "'Manrope', Arial, sans-serif";
  const dim = INVITE_FOOTNOTE_COLOR;
  const hasButton = opts.button !== undefined && opts.url !== undefined;
  const paras = opts.paragraphs
    .map((p) => `<p style="margin:0 0 16px;color:#ECEAE3;">${escapeHtml(p)}</p>`)
    .join('\n                ');
  const buttonHtml = hasButton
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                  <tr>
                    <td bgcolor="#C4F542" style="background:#C4F542;border-radius:100px;">
                      <a href="${escapeHtml(opts.url as string)}" style="display:inline-block;padding:12px 24px;color:#000000;text-decoration:none;font-family:${font};font-weight:500;">${escapeHtml(opts.button as string)}</a>
                    </td>
                  </tr>
                </table>
                `
    : '';
  const after = opts.extraAfterButton
    ? `<p style="margin:0 0 16px;color:#ECEAE3;">${escapeHtml(opts.extraAfterButton)}</p>`
    : '';
  const footerHtml = opts.footer
    ? `
                <p style="margin:16px 0 0;color:${dim};font-size:13px;">${opts.footer.html}</p>`
    : '';

  const html = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="dark">
    <meta name="supported-color-schemes" content="dark">
    <title>${escapeHtml(opts.subject)}</title>
  </head>
  <body bgcolor="#0A0B0C" style="margin:0;padding:0;background:#0A0B0C;color:#ECEAE3;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#0A0B0C" style="background:#0A0B0C;">
      <tr>
        <td align="center" bgcolor="#0A0B0C" style="padding:32px 16px;background:#0A0B0C;">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" bgcolor="#111213" style="max-width:480px;width:100%;background:#111213;border:1px solid #1F1F1F;border-radius:12px;">
            <tr>
              <td bgcolor="#111213" style="padding:24px;background:#111213;font-family:${font};color:#ECEAE3;font-size:16px;line-height:1.5;">
                <p style="margin:0 0 16px;font-size:20px;font-weight:500;letter-spacing:-0.02em;color:#ECEAE3;">Sèvalys</p>
                <h1 style="margin:0 0 16px;font-size:24px;font-weight:500;color:#ECEAE3;">${escapeHtml(opts.heading)}</h1>
                ${paras}
                ${buttonHtml}${after}
                <p style="margin:0 0 16px;color:#ECEAE3;">— Sèvalys</p>
                <p style="margin:0;color:${dim};font-size:14px;">Une question ? Répondez à cet e-mail ou écrivez-nous à ${INVITE_EMAIL_REPLY_TO}.</p>${footerHtml}
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
    opts.heading,
    '',
    ...opts.paragraphs.flatMap((p) => [p, '']),
    ...(hasButton ? [`${opts.button} : ${opts.url}`, ''] : []),
    ...(opts.extraAfterButton ? [opts.extraAfterButton, ''] : []),
    '— Sèvalys',
    '',
    `Une question ? Répondez à cet e-mail ou écrivez-nous à ${INVITE_EMAIL_REPLY_TO}.`,
    ...(opts.footer ? ['', opts.footer.text] : []),
  ].join('\n');

  return { subject: opts.subject, html, text };
}
