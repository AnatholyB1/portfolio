// Variante ADMIN des textes d'étape (fiche projet côté administration).
// Les textes de `steps.ts` sont écrits à la voix du client (« Vous confirmez vos informations »)
// pour le portail et ne doivent pas changer : ici, la même information à la troisième personne.
import type { ProjectState, StepIndex } from './steps';

export const ADMIN_STEP_DESCRIPTIONS: Record<StepIndex, string> = {
  1: 'Le client confirme ses informations.',
  2: 'Sèvalys cadre le besoin ; le client signe le devis.',
  3: "Le client signe le contrat et règle l'acompte.",
  4: 'Sèvalys réalise le projet.',
  5: 'Le client vérifie le résultat et valide la recette.',
  6: 'Remise finale et règlement du solde.',
};

// Action attendue, selon qui attend (le client agit, ou Sèvalys doit d'abord émettre le document).
export const ADMIN_EXPECTED_ACTION: Record<StepIndex, { client: string; admin: string }> = {
  1: {
    client: 'Le client complète les informations société : signataire, TVA et adresse de facturation.',
    admin: 'Le client complète les informations société : signataire, TVA et adresse de facturation.',
  },
  2: {
    client: 'Le client doit signer le devis, disponible dans ses documents.',
    admin: "Émettre le devis. Le client est prévenu par e-mail dès qu'il est disponible.",
  },
  3: {
    client: "Le client doit signer le contrat, puis régler l'acompte pour lancer la production.",
    admin: "Émettre le contrat ou la facture d'acompte. Le client est prévenu par e-mail dès qu'il est disponible.",
  },
  4: {
    client: 'Réaliser le projet. Le client peut déposer les fichiers nécessaires.',
    admin: 'Réaliser le projet. Le client peut déposer les fichiers nécessaires.',
  },
  5: {
    client: 'Le client doit vérifier le résultat et confirmer que tout est conforme.',
    admin: "Émettre le procès-verbal de recette. Le client est prévenu par e-mail dès qu'il est disponible.",
  },
  6: {
    client: 'Le client doit régler le solde pour recevoir la livraison finale.',
    admin: "Émettre la facture de solde. Le client est prévenu par e-mail dès qu'elle est disponible.",
  },
};

export const ADMIN_DONE_ACTION = 'Rien, le projet est livré.';

/** État du projet réécrit à la voix de l'admin : frise et « action attendue ». Ne modifie pas l'entrée. */
export function toAdminVoice(state: ProjectState): ProjectState {
  const steps = state.steps.map((s) => ({ ...s, description: ADMIN_STEP_DESCRIPTIONS[s.index] }));
  if (state.done || state.currentStep === null || state.waitingOn === 'none') {
    return { ...state, steps, expectedAction: ADMIN_DONE_ACTION };
  }
  const copy = ADMIN_EXPECTED_ACTION[state.currentStep];
  return { ...state, steps, expectedAction: state.waitingOn === 'client' ? copy.client : copy.admin };
}
