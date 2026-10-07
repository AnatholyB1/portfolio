// Module pur. Devis actif = tête de chaîne (chainHeads). Signé à date (D-02) : base = tête des devis émis au plus tard à la signature, puis deltas datés des révisions ultérieures.
import { chainHeads, type ChainDoc } from '@/lib/documents/steps';
import { parisDateOf } from '@/lib/documents/dates';

export type QuoteDocRow = { id: string; projectId: string; revision: number; reference: string; replacesDocumentId: string | null; issuedAt: string };
export type SnapshotRow = { documentId: string; data: unknown };
export type FactRow = { id: number; projectId: string; type: string; targetFactId: number | null; occurredAt: string };
export type QuoteAnomaly = { kind: 'contract_without_quote' | 'quote_invalid_amount'; ref: string };
export type ActiveQuote = { documentId: string; reference: string; issuedOn: string; totalCents: number };
export type QuoteAmendment = { documentId: string; reference: string; date: string; deltaCents: number };
export type ProjectQuoteState = {
  projectId: string;
  activeQuote: ActiveQuote | null;
  signedOn: string | null;
  baseSignedCents: number;
  baseQuote: ActiveQuote | null;
  amendments: QuoteAmendment[];
  anomalies: QuoteAnomaly[];
};
export type QuoteItem = { projectId: string; documentId: string; reference: string; date: string; kind: 'devis' | 'signature' | 'avenant'; amountCents: number };

/** Total d'un snapshot de devis, ou null si la donnée n'est pas un entier sûr non négatif. */
export function quoteTotalCents(data: unknown): number | null {
  if (typeof data !== 'object' || data === null) return null;
  const d = data as Record<string, unknown>;
  if (d.docType !== 'quote') return null;
  const t = d.totalCents;
  if (typeof t !== 'number' || !Number.isSafeInteger(t) || t < 0) return null;
  return t;
}

/** occurredAt du dernier contract_signed effectif (non révoqué). */
export function effectiveSignedAt(facts: FactRow[]): string | null {
  const revoked = new Set<number>();
  for (const f of facts) if (f.type === 'fact_revoked' && f.targetFactId !== null) revoked.add(f.targetFactId);
  let best: FactRow | null = null;
  for (const f of facts) {
    if (f.type !== 'contract_signed' || revoked.has(f.id)) continue;
    if (!best) best = f;
    else {
      const a = Date.parse(f.occurredAt);
      const b = Date.parse(best.occurredAt);
      if (a > b || (a === b && f.id > best.id)) best = f;
    }
  }
  return best ? best.occurredAt : null;
}

const toChain = (d: QuoteDocRow): ChainDoc => ({
  id: d.id,
  docType: 'quote',
  revision: d.revision,
  replacesDocumentId: d.replacesDocumentId,
  issuedAt: d.issuedAt,
});

function buildOne(projectId: string, docs: QuoteDocRow[], totals: Map<string, number | null>, facts: FactRow[]): ProjectQuoteState {
  const anomalies: QuoteAnomaly[] = [];
  const noted = new Set<string>();
  const note = (kind: QuoteAnomaly['kind'], ref: string) => {
    const k = `${kind}|${ref}`;
    if (noted.has(k)) return;
    noted.add(k);
    anomalies.push({ kind, ref });
  };
  const byId = new Map(docs.map((d) => [d.id, d]));
  const asActive = (d: QuoteDocRow | undefined): ActiveQuote | null => {
    if (!d) return null;
    const total = totals.get(d.id) ?? null;
    if (total === null) {
      note('quote_invalid_amount', d.reference);
      return null;
    }
    return { documentId: d.id, reference: d.reference, issuedOn: parisDateOf(new Date(d.issuedAt)), totalCents: total };
  };
  const headOf = (list: QuoteDocRow[]): QuoteDocRow | undefined => {
    const h = chainHeads(list.map(toChain)).get('quote');
    return h ? byId.get(h.id) : undefined;
  };

  const activeQuote = asActive(headOf(docs));
  const t0 = effectiveSignedAt(facts);
  let signedOn: string | null = null;
  let baseQuote: ActiveQuote | null = null;
  let baseSignedCents = 0;
  const amendments: QuoteAmendment[] = [];

  if (t0 !== null) {
    const t0ms = Date.parse(t0);
    signedOn = parisDateOf(new Date(t0));
    const before = docs.filter((d) => Date.parse(d.issuedAt) <= t0ms);
    const baseDoc = headOf(before);
    if (!baseDoc) {
      note('contract_without_quote', projectId);
    } else {
      baseQuote = asActive(baseDoc);
      baseSignedCents = baseQuote ? baseQuote.totalCents : 0;
      const later = docs
        .filter((d) => Date.parse(d.issuedAt) > t0ms)
        .sort((a, b) => Date.parse(a.issuedAt) - Date.parse(b.issuedAt) || a.revision - b.revision);
      const laterIds = new Set(later.map((d) => d.id));
      for (const d of later) {
        const own = totals.get(d.id) ?? null;
        const prevId = d.replacesDocumentId !== null && laterIds.has(d.replacesDocumentId) ? d.replacesDocumentId : baseDoc.id;
        const prev = totals.get(prevId) ?? null;
        if (own === null) {
          note('quote_invalid_amount', d.reference);
          continue;
        }
        if (prev === null) {
          note('quote_invalid_amount', byId.get(prevId)?.reference ?? prevId);
          continue;
        }
        amendments.push({ documentId: d.id, reference: d.reference, date: parisDateOf(new Date(d.issuedAt)), deltaCents: own - prev });
      }
    }
  }
  return { projectId, activeQuote, signedOn, baseSignedCents, baseQuote, amendments, anomalies };
}

export function buildQuoteStates(projectIds: string[], docs: QuoteDocRow[], snaps: SnapshotRow[], facts: FactRow[]): Map<string, ProjectQuoteState> {
  const totals = new Map<string, number | null>();
  for (const s of snaps) totals.set(s.documentId, quoteTotalCents(s.data));
  const docsBy = new Map<string, QuoteDocRow[]>();
  for (const d of docs) docsBy.set(d.projectId, [...(docsBy.get(d.projectId) ?? []), d]);
  const factsBy = new Map<string, FactRow[]>();
  for (const f of facts) factsBy.set(f.projectId, [...(factsBy.get(f.projectId) ?? []), f]);
  const out = new Map<string, ProjectQuoteState>();
  for (const id of projectIds) out.set(id, buildOne(id, docsBy.get(id) ?? [], totals, factsBy.get(id) ?? []));
  return out;
}

export function pipeline(states: Iterable<ProjectQuoteState>): { totalCents: number; items: QuoteItem[] } {
  const items: QuoteItem[] = [];
  for (const s of states) {
    if (!s.activeQuote || s.signedOn !== null) continue;
    items.push({
      projectId: s.projectId,
      documentId: s.activeQuote.documentId,
      reference: s.activeQuote.reference,
      date: s.activeQuote.issuedOn,
      kind: 'devis',
      amountCents: s.activeQuote.totalCents,
    });
  }
  return { totalCents: items.reduce((a, i) => a + i.amountCents, 0), items };
}

export function signedInRange(states: Iterable<ProjectQuoteState>, range: { from: string; to: string }): { totalCents: number; items: QuoteItem[] } {
  const inRange = (d: string) => range.from <= d && d <= range.to;
  const items: QuoteItem[] = [];
  for (const s of states) {
    if (s.signedOn !== null && inRange(s.signedOn) && (s.baseSignedCents > 0 || s.baseQuote)) {
      items.push({
        projectId: s.projectId,
        documentId: s.baseQuote?.documentId ?? '',
        reference: s.baseQuote?.reference ?? '',
        date: s.signedOn,
        kind: 'signature',
        amountCents: s.baseSignedCents,
      });
    }
    for (const a of s.amendments) {
      if (!inRange(a.date)) continue;
      items.push({ projectId: s.projectId, documentId: a.documentId, reference: a.reference, date: a.date, kind: 'avenant', amountCents: a.deltaCents });
    }
  }
  return { totalCents: items.reduce((a, i) => a + i.amountCents, 0), items };
}

export function signedAsOf(state: ProjectQuoteState, date: string): number {
  if (state.signedOn === null || date < state.signedOn) return 0;
  return state.baseSignedCents + state.amendments.filter((a) => a.date <= date).reduce((n, a) => n + a.deltaCents, 0);
}

export function signedNow(state: ProjectQuoteState): number {
  if (state.signedOn === null) return 0;
  return state.baseSignedCents + state.amendments.reduce((n, a) => n + a.deltaCents, 0);
}
