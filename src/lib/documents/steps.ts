// Module pur, sûr côté client. Règles D-05 (garde par étape) et D-14 (statut dérivé des faits).
import { deriveProjectState, effectiveFacts, type Fact, type FactType, type StepIndex } from '@/lib/projects/steps';
import { DOC_TYPES, type DocType } from './types';

export const DOC_STEP_GUARD: Record<DocType, StepIndex> = {
  quote: 2,
  spec: 2,
  contract: 3,
  acceptance: 5,
  invoice: 6,
};

export const DOC_PREREQUISITE: Partial<Record<DocType, 'quote' | 'spec'>> = {
  contract: 'quote',
  acceptance: 'spec',
  invoice: 'quote',
};

export const SIGNING_FACT: Partial<Record<DocType, FactType>> = {
  quote: 'quote_accepted',
  contract: 'contract_signed',
  acceptance: 'acceptance_signed',
};

export type ChainDoc = {
  id: string;
  docType: DocType;
  revision: number;
  replacesDocumentId: string | null;
  issuedAt: string;
};

/** Tête de chaîne par type : document que aucun autre ne remplace. */
export function chainHeads(docs: ChainDoc[]): Map<DocType, ChainDoc> {
  const replaced = new Set<string>();
  for (const d of docs) if (d.replacesDocumentId !== null) replaced.add(d.replacesDocumentId);
  const heads = new Map<DocType, ChainDoc>();
  for (const d of docs) {
    if (replaced.has(d.id)) continue;
    const current = heads.get(d.docType);
    if (!current || d.revision > current.revision) heads.set(d.docType, d);
  }
  return heads;
}

/** id du document remplacé -> document remplaçant. */
export function replacedByMap(docs: ChainDoc[]): Map<string, ChainDoc> {
  const map = new Map<string, ChainDoc>();
  for (const d of docs) if (d.replacesDocumentId !== null) map.set(d.replacesDocumentId, d);
  return map;
}

export function expectedDocTypes(currentStep: StepIndex | null): DocType[] {
  if (currentStep === null) return [];
  return DOC_TYPES.filter((t) => DOC_STEP_GUARD[t] === currentStep);
}

export type IssueCheckCode = 'wrong_step' | 'missing_quote' | 'missing_spec' | 'signed_no_replace' | 'preview_only';
export type IssueCheck =
  | { ok: true; replaces: ChainDoc | null; revision: number }
  | { ok: false; code: IssueCheckCode };

type CheckArgs = { docType: DocType; facts: Fact[]; startedAt: string; docs: ChainDoc[] };

function check({ docType, facts, startedAt, docs }: CheckArgs): IssueCheck {
  const currentStep = deriveProjectState(facts, startedAt).currentStep;
  if (currentStep !== DOC_STEP_GUARD[docType]) return { ok: false, code: 'wrong_step' };

  const heads = chainHeads(docs);
  const prereq = DOC_PREREQUISITE[docType];
  if (prereq && !heads.has(prereq)) {
    return { ok: false, code: prereq === 'quote' ? 'missing_quote' : 'missing_spec' };
  }

  const head = heads.get(docType) ?? null;
  const signing = SIGNING_FACT[docType];
  if (head && signing && effectiveFacts(facts).some((x) => x.type === signing)) {
    return { ok: false, code: 'signed_no_replace' };
  }
  return { ok: true, replaces: head, revision: (head?.revision ?? 0) + 1 };
}

export function checkIssuable(a: CheckArgs): IssueCheck {
  if (a.docType === 'invoice') return { ok: false, code: 'preview_only' };
  return check(a);
}

export function checkPreviewable(a: CheckArgs): IssueCheck {
  return check(a);
}
