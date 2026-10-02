// Libellés FR et listes fermées de l'admin leads. Module sûr côté client.
export const STATUS_ORDER = ['new', 'qualified', 'rdv', 'quote_sent', 'signed', 'lost'] as const;
export type LeadStatus = (typeof STATUS_ORDER)[number];

export const STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'Nouveau',
  qualified: 'Qualifié',
  rdv: 'RDV',
  quote_sent: 'Devis envoyé',
  signed: 'Signé',
  lost: 'Perdu',
};

export const LOST_REASONS = [
  { code: 'hors_budget', label: 'Hors budget' },
  { code: 'concurrent', label: 'A choisi un concurrent' },
  { code: 'sans_reponse', label: 'Sans réponse' },
  { code: 'hors_cible', label: 'Hors cible' },
  { code: 'projet_abandonne', label: 'Projet abandonné' },
  { code: 'autre', label: 'Autre' },
] as const;

export const ERASE_REASONS = [
  { code: 'demande_personne', label: 'Demande de la personne' },
  { code: 'fin_conservation', label: 'Fin de durée de conservation' },
  { code: 'doublon', label: 'Doublon' },
  { code: 'autre', label: 'Autre' },
] as const;

export const EVENT_LABELS: Record<string, string> = {
  lead_created: 'Lead créé',
  contact_added: 'Contact ajouté',
  status_changed: 'Statut modifié',
  source_corrected: 'Source corrigée',
  lead_linked: 'Lead lié',
  erased: 'Données effacées',
  return_acknowledged: 'Retour vu',
};

export const CHANNEL_LABELS: Record<string, string> = {
  simulateur: 'Simulateur',
  contact: 'Formulaire de contact',
};

export const ADMIN_COPY = {
  statusError: "Le statut n'a pas pu être modifié. Réessayez dans un instant.",
  lostReasonRequired: 'Choisissez un motif de perte avant de continuer.',
  correctionReasonRequired: 'Indiquez le motif de la correction (10 caractères minimum).',
  costInvalid: 'Saisissez un montant supérieur à 0, avec 2 décimales au plus.',
  genericError: 'Une erreur est survenue. Réessayez ou consultez les journaux.',
  eraseConfirmMismatch: "L'e-mail saisi ne correspond pas à celui du lead.",
  statusSuccess: (label: string) => `Statut mis à jour : ${label}.`,
  correctionSuccess: "Source corrigée. L'ancienne valeur reste visible dans le journal.",
  eraseSuccess: 'Données personnelles effacées.',
  returnSeenSuccess: 'Retour marqué comme vu.',
  costSuccess: (source: string, campaign: string, month: string) =>
    `Coût enregistré : ${source}${campaign ? ` / ${campaign}` : ''}, ${month}.`,
};
