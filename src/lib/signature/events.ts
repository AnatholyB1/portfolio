// Module pur, sûr côté client. Liste fermée des événements de la piste d'audit (D-11).
export const SIGNATURE_EVENTS = [
  'document_opened',
  'acceptance_response',
  'acceptance_refused',
  'consent_given',
  'code_sent',
  'code_send_failed',
  'code_failed',
  'code_locked',
  'code_expired',
  'signed',
  'sealed',
  'seal_downloaded',
] as const;

export type SignatureEvent = (typeof SIGNATURE_EVENTS)[number];

export const SIGNATURE_ACTOR_KINDS = ['client', 'admin', 'system'] as const;

export type SignatureActorKind = (typeof SIGNATURE_ACTOR_KINDS)[number];

export const SIGNATURE_EVENT_LABELS: Record<SignatureEvent, string> = {
  document_opened: 'Document ouvert',
  acceptance_response: 'Réponse au critère',
  acceptance_refused: 'Recette refusée',
  consent_given: 'Consentement enregistré',
  code_sent: 'Code envoyé',
  code_send_failed: "Échec d'envoi du code",
  code_failed: 'Code incorrect',
  code_locked: "Code bloqué (trop d'essais)",
  code_expired: 'Code expiré',
  signed: 'Document signé',
  sealed: 'Document scellé',
  seal_downloaded: 'Document scellé téléchargé',
};
