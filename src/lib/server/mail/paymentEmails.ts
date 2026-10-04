// E-mails de paiement (D-07, D-16, D-17, D-04) : aucun fichier joint, aucun lien signé,
// uniquement des liens fixes vers le portail ou la fiche projet admin.
import 'server-only';
import { formatEuros } from '@/lib/documents/money';
import { formatDateFr } from '@/lib/admin/format';
import { INVITE_EMAIL_REPLY_TO, INVITE_FOOTNOTE_COLOR, escapeHtml } from './inviteEmail';
import { buildAdminProjectUrl, buildPortalPaymentsUrl } from './urls';

export type BuiltBody = { subject: string; html: string; text: string };
export type InvoiceKind = 'deposit' | 'period' | 'final';
export type ReminderStage = 'd3' | 'd7';

function layout(opts: {
  subject: string;
  heading: string;
  paragraphs: string[];
  extraAfterButton?: string;
  button: string;
  url: string;
}): BuiltBody {
  const font = "'Manrope', Arial, sans-serif";
  const dim = INVITE_FOOTNOTE_COLOR;
  const url = escapeHtml(opts.url);
  const paras = opts.paragraphs
    .map((p) => `<p style="margin:0 0 16px;color:#ECEAE3;">${escapeHtml(p)}</p>`)
    .join('\n                ');
  const after = opts.extraAfterButton
    ? `<p style="margin:0 0 16px;color:#ECEAE3;">${escapeHtml(opts.extraAfterButton)}</p>`
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
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                  <tr>
                    <td bgcolor="#C4F542" style="background:#C4F542;border-radius:100px;">
                      <a href="${url}" style="display:inline-block;padding:12px 24px;color:#000000;text-decoration:none;font-family:${font};font-weight:500;">${escapeHtml(opts.button)}</a>
                    </td>
                  </tr>
                </table>
                ${after}
                <p style="margin:0 0 16px;color:#ECEAE3;">— Sèvalys</p>
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
    opts.heading,
    '',
    ...opts.paragraphs.flatMap((p) => [p, '']),
    `${opts.button} : ${opts.url}`,
    '',
    ...(opts.extraAfterButton ? [opts.extraAfterButton, ''] : []),
    '— Sèvalys',
    '',
    `Une question ? Répondez à cet e-mail ou écrivez-nous à ${INVITE_EMAIL_REPLY_TO}.`,
  ].join('\n');

  return { subject: opts.subject, html, text };
}

export function paymentRequestEmail(p: {
  invoiceNumber: string;
  kind: InvoiceKind;
  amountCents: number;
  projectTitle: string;
  periodStart?: string | null;
  periodEnd?: string | null;
}): BuiltBody {
  const amount = formatEuros(p.amountCents);
  const url = buildPortalPaymentsUrl();
  if (p.kind === 'deposit') {
    const subject = `Facture d'acompte ${p.invoiceNumber} — ${p.projectTitle}`;
    return layout({
      subject,
      heading: subject,
      paragraphs: [
        `Bonjour, votre contrat est signé. Voici votre facture d'acompte de ${amount}. Son règlement lance la production de votre projet.`,
      ],
      button: "Payer l'acompte",
      url,
    });
  }
  if (p.kind === 'final') {
    const subject = `Facture finale ${p.invoiceNumber} — ${p.projectTitle}`;
    return layout({
      subject,
      heading: subject,
      paragraphs: [
        `Bonjour, votre procès-verbal de recette est signé. Voici la facture finale de ${amount}, l'acompte déjà versé étant déduit.`,
      ],
      button: 'Payer le solde',
      url,
    });
  }
  const subject = `Nouvelle facture ${p.invoiceNumber} — ${p.projectTitle}`;
  const period =
    p.periodStart && p.periodEnd
      ? ` pour la période du ${formatDateFr(p.periodStart)} au ${formatDateFr(p.periodEnd)}`
      : '';
  return layout({
    subject,
    heading: subject,
    paragraphs: [`Bonjour, une facture est disponible${period} : ${amount}.`],
    button: 'Voir mes factures',
    url,
  });
}

export function paymentReceivedEmail(p: {
  invoiceNumber: string;
  amountCents: number;
  projectTitle: string;
  kind?: string;
}): BuiltBody {
  const subject = `Paiement reçu : facture ${p.invoiceNumber}`;
  return layout({
    subject,
    heading: subject,
    paragraphs: [
      `Bonjour, nous confirmons la réception de votre paiement de ${formatEuros(p.amountCents)} pour la facture ${p.invoiceNumber}. Elle est consultable en « Payée » dans votre espace client.`,
    ],
    button: 'Ouvrir mon espace client',
    url: buildPortalPaymentsUrl(),
  });
}

export function paymentReminderEmail(p: {
  invoiceNumber: string;
  amountCents: number;
  projectTitle: string;
  stage: ReminderStage;
}): BuiltBody {
  const subject =
    p.stage === 'd7'
      ? `Dernier rappel : facture d'acompte ${p.invoiceNumber}`
      : `Rappel : facture d'acompte ${p.invoiceNumber}`;
  const paragraphs = [
    `Bonjour, votre facture d'acompte de ${formatEuros(p.amountCents)} est en attente de règlement.`,
  ];
  if (p.stage === 'd7') {
    paragraphs.push('Sans règlement, le démarrage de votre projet ne peut pas avoir lieu.');
  }
  return layout({
    subject,
    heading: subject,
    paragraphs,
    button: "Payer l'acompte",
    url: buildPortalPaymentsUrl(),
    extraAfterButton: 'Si vous avez déjà payé, ignorez ce message.',
  });
}

export function paymentReminderAdminEmail(p: {
  invoiceNumber: string;
  amountCents: number;
  projectTitle: string;
  clientName: string;
  issuedOn: string;
  projectId: string;
}): BuiltBody {
  const subject = `Acompte impayé depuis 14 jours — ${p.projectTitle}`;
  return layout({
    subject,
    heading: subject,
    paragraphs: [
      `${p.clientName} n'a pas réglé la facture ${p.invoiceNumber} (${formatEuros(p.amountCents)}) émise le ${formatDateFr(p.issuedOn)}.`,
    ],
    button: 'Ouvrir la fiche projet',
    url: buildAdminProjectUrl(p.projectId),
  });
}

export function paymentAnomalyAdminEmail(p: {
  invoiceNumber: string | null;
  amountCents: number;
  expectedCents: number;
  projectTitle: string;
  projectId: string;
  detail?: string;
}): BuiltBody {
  const subject = `Paiement à rapprocher — ${p.projectTitle}`;
  const gap = formatEuros(Math.abs(p.amountCents - p.expectedCents));
  const body = p.invoiceNumber
    ? `Un paiement de ${formatEuros(p.amountCents)} ne correspond pas à la facture ${p.invoiceNumber} (écart : ${gap}).`
    : `Un paiement de ${formatEuros(p.amountCents)} ne correspond à aucune facture (écart : ${gap}).`;
  const paragraphs = [body];
  if (p.detail) paragraphs.push(`Détail : ${p.detail}`);
  return layout({
    subject,
    heading: subject,
    paragraphs,
    button: 'Ouvrir la fiche projet',
    url: buildAdminProjectUrl(p.projectId),
  });
}

export function creditNoteIssuedEmail(p: {
  creditNoteNumber: string;
  invoiceNumber: string;
  amountCents: number;
  projectTitle: string;
  refundRequested: boolean;
}): BuiltBody {
  const subject = `Avoir ${p.creditNoteNumber} — ${p.projectTitle}`;
  let body = `Bonjour, un avoir de ${formatEuros(p.amountCents)} a été émis sur la facture ${p.invoiceNumber}.`;
  if (p.refundRequested) body += ' Remboursement : il sera crédité sous 1 à 3 jours.';
  return layout({
    subject,
    heading: subject,
    paragraphs: [body],
    button: 'Voir mes factures',
    url: buildPortalPaymentsUrl(),
  });
}
