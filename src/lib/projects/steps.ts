// Moteur d'étapes projet : pur, dérivé des faits. Module sûr côté client.
// Aucune étape n'est stockée ni avancée à la main (D-06, D-07, D-08, D-09, D-12).
export const FACT_TYPES = [
  'onboarding_completed',
  'quote_accepted',
  'contract_signed',
  'deposit_received',
  'production_completed',
  'acceptance_signed',
  'balance_received',
  'fact_revoked',
] as const;
export type FactType = (typeof FACT_TYPES)[number];

export type ActorKind = 'system' | 'admin' | 'client';

export type Fact = {
  id: number;
  type: FactType;
  targetFactId: number | null;
  actorKind: ActorKind;
  createdAt: string;
};

export const FACT_LABELS: Record<FactType, string> = {
  onboarding_completed: 'Onboarding terminé (système)',
  quote_accepted: 'Devis accepté',
  contract_signed: 'Contrat signé',
  deposit_received: 'Acompte reçu',
  production_completed: 'Production terminée',
  acceptance_signed: 'Recette signée',
  balance_received: 'Solde reçu',
  fact_revoked: 'Fait annulé (correction)',
};

export const ADMIN_POSTABLE_FACTS: readonly FactType[] = [
  'quote_accepted',
  'contract_signed',
  'deposit_received',
  'production_completed',
  'acceptance_signed',
  'balance_received',
];

export type StepIndex = 1 | 2 | 3 | 4 | 5 | 6;
export type WaitingOn = 'client' | 'admin' | 'none';

export const STEPS: readonly {
  index: StepIndex;
  name: string;
  description: string;
  waitingOn: 'client' | 'admin';
  expectedAction: string;
  gate: readonly FactType[];
}[] = [
  {
    index: 1,
    name: 'Onboarding',
    description: 'Vous confirmez vos informations.',
    waitingOn: 'client',
    expectedAction: 'Complétez vos informations société : signataire, TVA et adresse de facturation.',
    gate: ['onboarding_completed'],
  },
  {
    index: 2,
    name: 'Cadrage et devis',
    description: 'Nous cadrons votre besoin et préparons le devis.',
    waitingOn: 'admin',
    expectedAction: "Nous préparons votre devis. Vous serez prévenu dès qu'il est disponible.",
    gate: ['quote_accepted'],
  },
  {
    index: 3,
    name: 'Contrat et acompte',
    description: "Signature du contrat et règlement de l'acompte.",
    waitingOn: 'admin',
    expectedAction: "Nous préparons votre contrat et la demande d'acompte.",
    gate: ['contract_signed', 'deposit_received'],
  },
  {
    index: 4,
    name: 'Production',
    description: 'Nous réalisons votre projet.',
    waitingOn: 'admin',
    expectedAction: 'Nous réalisons votre projet. Déposez ici les fichiers dont nous avons besoin.',
    gate: ['production_completed'],
  },
  {
    index: 5,
    name: 'Recette',
    description: 'Vous vérifiez le résultat et validez la recette.',
    waitingOn: 'client',
    expectedAction: 'Vérifiez le résultat et dites-nous si tout est conforme.',
    gate: ['acceptance_signed'],
  },
  {
    index: 6,
    name: 'Livraison et solde',
    description: 'Remise finale et règlement du solde.',
    waitingOn: 'client',
    expectedAction: 'Réglez le solde pour recevoir la livraison finale.',
    gate: ['balance_received'],
  },
];

export const DONE_COPY = { name: 'Terminé', waitingLine: 'Rien, votre projet est livré' } as const;

export type StepState = {
  index: StepIndex;
  name: string;
  description: string;
  state: 'done' | 'current' | 'upcoming';
  completedAt: string | null;
  completedBy: ActorKind | null;
};

export type ProjectState = {
  currentStep: StepIndex | null;
  done: boolean;
  steps: StepState[];
  waitingOn: WaitingOn;
  expectedAction: string;
  sinceAt: string;
};

/** Faits non annulés, hors lignes fact_revoked. */
export function effectiveFacts(facts: Fact[]): Fact[] {
  const revoked = new Set<number>();
  for (const x of facts) {
    if (x.type === 'fact_revoked' && x.targetFactId !== null) revoked.add(x.targetFactId);
  }
  return facts.filter((x) => x.type !== 'fact_revoked' && !revoked.has(x.id));
}

function latest(list: Fact[]): Fact | null {
  let best: Fact | null = null;
  for (const x of list) if (!best || x.createdAt > best.createdAt) best = x;
  return best;
}

function maxIso(values: string[]): string | null {
  let best: string | null = null;
  for (const v of values) if (best === null || v > best) best = v;
  return best;
}

function gateClosed(eff: Fact[], gate: readonly FactType[]): boolean {
  return gate.every((t) => eff.some((x) => x.type === t));
}

function currentStepOf(eff: Fact[]): StepIndex | null {
  for (const s of STEPS) if (!gateClosed(eff, s.gate)) return s.index;
  return null;
}

export function deriveProjectState(facts: Fact[], startedAt: string): ProjectState {
  const eff = effectiveFacts(facts);
  const currentStep = currentStepOf(eff);
  const done = currentStep === null;

  const steps: StepState[] = STEPS.map((s) => {
    const closed = currentStep === null || s.index < currentStep;
    let completedAt: string | null = null;
    let completedBy: ActorKind | null = null;
    if (closed) {
      const gateFacts = s.gate.map((t) => latest(eff.filter((x) => x.type === t))).filter((x): x is Fact => x !== null);
      const last = latest(gateFacts);
      completedAt = last?.createdAt ?? null;
      completedBy = last?.actorKind ?? null;
    }
    return {
      index: s.index,
      name: s.name,
      description: s.description,
      state: closed ? 'done' : s.index === currentStep ? 'current' : 'upcoming',
      completedAt,
      completedBy,
    };
  });

  const closedTypes = new Set<FactType>();
  for (const s of STEPS) {
    if (currentStep === null || s.index < currentStep) for (const t of s.gate) closedTypes.add(t);
  }
  const dates = [
    ...eff.filter((x) => closedTypes.has(x.type)).map((x) => x.createdAt),
    ...facts.filter((x) => x.type === 'fact_revoked').map((x) => x.createdAt),
  ];
  const since = maxIso(dates);
  const sinceAt = since !== null && since > startedAt ? since : startedAt;

  if (currentStep === null) {
    return { currentStep, done, steps, waitingOn: 'none', expectedAction: DONE_COPY.waitingLine, sinceAt };
  }
  const def = STEPS[currentStep - 1];
  return { currentStep, done, steps, waitingOn: def.waitingOn, expectedAction: def.expectedAction, sinceAt };
}

/** true si poster `type` ne fermerait pas la porte courante et n'en ferait pas partie. */
export function isFactAhead(facts: Fact[], type: FactType): boolean {
  const cur = currentStepOf(effectiveFacts(facts));
  if (cur === null) return true;
  return !STEPS[cur - 1].gate.includes(type);
}
