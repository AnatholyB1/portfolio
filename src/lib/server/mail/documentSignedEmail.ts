// E-mails post-signature (D-18, D-15) : sans montant, sans pièce jointe, sans lien signé.
import { INVITE_EMAIL_REPLY_TO, INVITE_FOOTNOTE_COLOR, escapeHtml } from './inviteEmail';

type Mail = { subject: string; html: string; text: string };

// "le devis" -> "du devis" ; libellé inconnu : "de " + libellé.
function ofLabel(label: string): string {
  const l = label.trim();
  if (l.startsWith('le ')) return `du ${l.slice(3)}`;
  if (l.startsWith('la ')) return `de la ${l.slice(3)}`;
  if (l.startsWith("l'")) return `de l'${l.slice(2)}`;
  return `de ${l}`;
}

function layout({
  subject,
  heading,
  paragraphs,
  extraLines,
  buttonLabel,
  url,
}: {
  subject: string;
  heading: string;
  paragraphs: string[];
  extraLines?: string[];
  buttonLabel: string;
  url: string;
}): Mail {
  const font = "'Manrope', Arial, sans-serif";
  const dim = INVITE_FOOTNOTE_COLOR;
  const extras = extraLines ?? [];
  const paras = paragraphs
    .map((p) => `<p style="margin:0 0 16px;color:#ECEAE3;">${escapeHtml(p)}</p>`)
    .join('\n                ');
  const extra = extras
    .map((p) => `<p style="margin:0 0 8px;color:#ECEAE3;">${escapeHtml(p)}</p>`)
    .join('\n                ');
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
                <h1 style="margin:0 0 16px;font-size:24px;font-weight:500;color:#ECEAE3;">${escapeHtml(heading)}</h1>
                ${paras}
                ${extra}
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0 24px;">
                  <tr>
                    <td bgcolor="#C4F542" style="background:#C4F542;border-radius:100px;">
                      <a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 24px;color:#000000;text-decoration:none;font-family:${font};font-weight:500;">${escapeHtml(buttonLabel)}</a>
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
    heading,
    '',
    ...paragraphs.flatMap((p) => [p, '']),
    ...extras,
    ...(extras.length ? [''] : []),
    `${buttonLabel} : ${url}`,
    '',
    'Sèvalys',
    '',
    `Une question ? Répondez à cet e-mail ou écrivez-nous à ${INVITE_EMAIL_REPLY_TO}.`,
  ].join('\n');
  return { subject, html, text };
}

export function buildDocumentSignedEmail({
  documentLabel,
  projectTitle,
  signedDate,
  signedTime,
  portalUrl,
}: {
  documentLabel: string;
  projectTitle: string;
  signedDate: string;
  signedTime: string;
  portalUrl: string;
}): Mail {
  const subject = `Document signé : ${documentLabel} — ${projectTitle}`;
  return layout({
    subject,
    heading: `Document signé : ${projectTitle}`,
    paragraphs: [
      `Bonjour, nous confirmons la signature ${ofLabel(documentLabel)} le ${signedDate} à ${signedTime}. ` +
        'Le document signé est disponible dans votre espace client.',
    ],
    buttonLabel: 'Ouvrir mon espace client',
    url: portalUrl,
  });
}

export function buildDocumentSignedAdminEmail({
  documentLabel,
  projectTitle,
  clientName,
  reference,
  signedDate,
  signedTime,
  reservedCount,
  adminUrl,
}: {
  documentLabel: string;
  projectTitle: string;
  clientName: string;
  reference: string;
  signedDate: string;
  signedTime: string;
  reservedCount: number;
  adminUrl: string;
}): Mail {
  const subject = `Signature reçue : ${documentLabel} — ${projectTitle}`;
  const paragraphs = [
    `${clientName} a signé ${documentLabel} (référence ${reference}) le ${signedDate} à ${signedTime}.`,
  ];
  if (reservedCount > 0) {
    paragraphs.push(`Réserves : ${reservedCount} réserve(s) inscrite(s) au PV.`);
  }
  return layout({
    subject,
    heading: `Signature reçue : ${projectTitle}`,
    paragraphs,
    buttonLabel: 'Ouvrir la fiche projet',
    url: adminUrl,
  });
}

export type RefusedCriterion = { index?: number; criterion: string; note: string };

export function buildAcceptanceRefusedAdminEmail({
  projectTitle,
  clientName,
  refused,
  refusedCount,
  adminUrl,
}: {
  projectTitle: string;
  clientName: string;
  refused: RefusedCriterion[];
  refusedCount?: number;
  adminUrl: string;
}): Mail {
  const n = refusedCount ?? refused.length;
  const subject = `Recette refusée : ${n} critère(s) — ${projectTitle}`;
  return layout({
    subject,
    heading: `Recette refusée : ${projectTitle}`,
    paragraphs: [
      `${clientName} a refusé ${n} critère(s) du procès-verbal de recette. Émettez un procès-verbal corrigé.`,
    ],
    extraLines: refused.map((r) => `- ${r.criterion} : ${r.note}`),
    buttonLabel: 'Ouvrir la fiche projet',
    url: adminUrl,
  });
}
