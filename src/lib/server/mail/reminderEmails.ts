// Relances document non signé, demande d'avis et alerte de suppression (phase 16).
// Aucun prix. reviewRequestContent ne produit que le contenu : l'envoi passe obligatoirement
// par buildMarketingEmail (D-06, D-12).
import 'server-only';
import { formatDateFr } from '@/lib/admin/format';
import { emailLayout, type BuiltBody } from './layout';
import type { MarketingContent } from './marketingEmail';
import {
  buildAdminMailUrl,
  buildAdminProjectUrl,
  buildAdminReviewsUrl,
  buildPortalDocumentsUrl,
} from './urls';

export function documentReminderEmail(p: {
  documentLabel: string;
  projectTitle: string;
  revision: number;
  stage: 'd3' | 'd7';
}): BuiltBody {
  const subject =
    p.stage === 'd7'
      ? `Dernier rappel : ${p.documentLabel} à signer`
      : `Rappel : ${p.documentLabel} à signer`;
  const version = p.revision > 1 ? ` (version ${p.revision})` : '';
  const paragraphs = [
    `Bonjour, votre document « ${p.documentLabel} »${version} pour le projet ${p.projectTitle} est en attente de signature.`,
  ];
  if (p.stage === 'd7') {
    paragraphs.push('Sans votre signature, la suite de votre projet ne peut pas avancer.');
  }
  return emailLayout({
    subject,
    heading: subject,
    paragraphs,
    button: 'Consulter et signer',
    url: buildPortalDocumentsUrl(),
    extraAfterButton: 'Si vous avez déjà signé, ignorez ce message.',
  });
}

export function documentReminderAdminEmail(p: {
  documentLabel: string;
  projectTitle: string;
  clientName: string;
  issuedOn: string;
  projectId: string;
}): BuiltBody {
  const subject = `Document non signé depuis 14 jours — ${p.projectTitle}`;
  return emailLayout({
    subject,
    heading: subject,
    paragraphs: [
      `${p.clientName} n'a pas signé « ${p.documentLabel} » émis le ${formatDateFr(p.issuedOn)} : document non signé depuis 14 jours.`,
    ],
    button: 'Ouvrir la fiche projet',
    url: buildAdminProjectUrl(p.projectId),
  });
}

export function reviewRequestContent(p: {
  projectTitle: string;
  reviewUrl: string;
  stage: 'd7' | 'd21';
}): MarketingContent {
  let ok = false;
  try {
    ok = typeof p.reviewUrl === 'string' && new URL(p.reviewUrl).protocol === 'https:';
  } catch {
    ok = false;
  }
  if (!ok) throw new Error('invalid_review_url');
  const subject =
    p.stage === 'd21'
      ? `Votre avis sur ${p.projectTitle} nous aiderait`
      : `Comment s'est passé votre projet ${p.projectTitle} ?`;
  const paragraphs = [
    `Bonjour, votre projet ${p.projectTitle} est livré. Pourriez-vous nous dire en quelques mots comment s'est passée notre collaboration ?`,
  ];
  if (p.stage === 'd21') {
    paragraphs.push('Votre retour nous aide à nous améliorer et prend moins de deux minutes.');
  }
  return {
    subject,
    heading: subject,
    paragraphs,
    button: 'Donner mon avis',
    url: p.reviewUrl,
  };
}

const CAUSE_LABEL = {
  complaint: 'plainte pour spam',
  bounce_permanent: 'rebond définitif',
  unsubscribe: 'désinscription',
} as const;

export function mailSuppressionAdminEmail(p: {
  cause: 'complaint' | 'bounce_permanent' | 'unsubscribe';
  maskedEmail: string;
  clientName: string | null;
  isLead: boolean;
}): BuiltBody {
  const label = CAUSE_LABEL[p.cause];
  const subject = `Adresse suspendue : ${label}`;
  const match = p.clientName ? `client ${p.clientName}` : p.isLead ? 'lead' : 'aucun client ni lead';
  return emailLayout({
    subject,
    heading: subject,
    paragraphs: [
      `Cause : ${label}. Adresse : ${p.maskedEmail}. Correspondance : ${match}.`,
      "Les envois vers cette adresse sont bloqués tant que la suppression n'est pas levée.",
    ],
    button: 'Ouvrir les e-mails',
    url: buildAdminMailUrl(),
  });
}

export function reviewPublishedAdminEmail(p: { projectTitle: string; rating: number }): BuiltBody {
  if (typeof p.projectTitle !== 'string' || p.projectTitle.trim() === '') throw new Error('invalid_payload');
  if (!Number.isInteger(p.rating) || p.rating < 1 || p.rating > 5) throw new Error('invalid_payload');
  const subject = `Nouvel avis publié : ${p.rating} sur 5`;
  return emailLayout({
    subject,
    heading: subject,
    paragraphs: [`Un nouvel avis a été publié pour le projet ${p.projectTitle}.`],
    button: 'Voir les avis',
    url: buildAdminReviewsUrl(),
  });
}

export function reviewHiddenEmail(p: { projectTitle: string }): BuiltBody {
  if (typeof p.projectTitle !== 'string' || p.projectTitle.trim() === '') throw new Error('invalid_payload');
  const subject = 'Votre avis a été masqué';
  return emailLayout({
    subject,
    heading: subject,
    paragraphs: [
      `Votre avis sur le projet « ${p.projectTitle} » a été masqué car il ne respecte pas la loi (motif général : contenu illégal). Il n'est pas supprimé. Si vous contestez cette décision, répondez simplement à cet e-mail.`,
    ],
  });
}
