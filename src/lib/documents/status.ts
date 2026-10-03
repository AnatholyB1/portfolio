// Module pur, sûr côté client. Règles D-05 (garde par étape) et D-14 (statut dérivé des faits).
import { effectiveFacts, type Fact } from '@/lib/projects/steps';
import { SIGNING_FACT, replacedByMap, type ChainDoc } from './steps';
import { DOC_TYPES, type DocumentStatus } from './types';

export function documentStatus(
  doc: ChainDoc,
  docs: ChainDoc[],
  facts: Fact[],
  invoiceKind: 'deposit' | 'balance' = 'balance',
): DocumentStatus {
  if (replacedByMap(docs).has(doc.id)) return 'replaced';
  const eff = effectiveFacts(facts);
  const has = (t: Fact['type']) => eff.some((x) => x.type === t);

  if (doc.docType === 'spec') return 'issued';
  if (doc.docType === 'invoice') {
    return has(invoiceKind === 'deposit' ? 'deposit_received' : 'balance_received') ? 'paid' : 'to_pay';
  }
  const signing = SIGNING_FACT[doc.docType];
  return signing && has(signing) ? 'signed' : 'to_sign';
}

export type DocWithStatus<T extends ChainDoc> = T & { status: DocumentStatus; replacedBy: ChainDoc | null };

export function withStatuses<T extends ChainDoc>(docs: T[], facts: Fact[]): DocWithStatus<T>[] {
  const replacedBy = replacedByMap(docs);
  return docs.map((d) => ({
    ...d,
    status: documentStatus(d, docs, facts),
    replacedBy: replacedBy.get(d.id) ?? null,
  }));
}

/** Ordre du flux (devis, cahier des charges, contrat, PV, facture), puis révision décroissante. */
export function sortForDisplay<T extends ChainDoc>(docs: T[]): T[] {
  return [...docs].sort(
    (a, b) => DOC_TYPES.indexOf(a.docType) - DOC_TYPES.indexOf(b.docType) || b.revision - a.revision,
  );
}
