// Module pur : compose les règles de pilotage en un modèle de vue unique. Aucune IO, horloge injectée.
// Chaque ligne du détail est un item du calcul de la tuile correspondante (D-04, D-12) : somme des lignes = tuile.
import { signedBySource, type SourceRow } from './attribution';
import {
  billingAnomalies,
  collected,
  filterInvoices,
  invoiced,
  sumByProject,
  unpaidInvoices,
  type Anomaly,
  type CollectedItem,
  type InvoicedItem,
  type InvoiceRow,
} from './billing';
import {
  currentBalance,
  effectiveProjectCosts,
  projectCostsInRange,
  recurringInRange,
  type CostItem,
} from './costs';
import { COST_CATEGORY_LABELS } from './costSchemas';
import { cashProjection, globalMargin, projectMargin, realizedMargin, remainingToInvoice, type CashProjection } from './forecast';
import type { PilotageRows } from './load';
import type { DetailKind, PilotageParams } from './params';
import { ALL_TIME, monthKey, parisToday, periodLabel, periodRange, type DateRange } from './periods';
import { buildQuoteStates, pipeline, signedInRange, signedNow, type QuoteItem } from './quotes';

export type TileKey = 'pipeline' | 'signe' | 'facture' | 'encaisse' | 'marge_projetee' | 'marge_realisee' | 'a_facturer';
export type Tile = {
  key: TileKey;
  label: string;
  rule: string;
  cents: number;
  linkText: string;
  detail: DetailKind | null;
  anchor: string | null;
};
export type ProjectLine = {
  projectId: string;
  title: string;
  clientName: string;
  signedCents: number;
  invoicedCents: number;
  collectedCents: number;
  costsCents: number;
  marginCents: number;
  remainingCents: number;
};
export type DetailRow =
  | { type: 'facture'; id: string; number: string; date: string; clientName: string; kindLabel: string; amountCents: number }
  | { type: 'paiement'; id: string; date: string; number: string; methodLabel: string; amountCents: number }
  | { type: 'devis'; id: string; reference: string; projectId: string; projectTitle: string; date: string; kindLabel: string; amountCents: number }
  | { type: 'cout'; id: string; date: string; projectTitle: string | null; label: string; categoryLabel: string; amountCents: number };
export type DetailView = {
  kind: DetailKind;
  title: string;
  projectTitle: string | null;
  totalCents: number;
  totalRows: number;
  rows: DetailRow[];
  page: number;
  pageCount: number;
};
export type PilotageView = {
  today: string;
  periodLabel: string;
  range: DateRange;
  params: PilotageParams;
  allFranchise: boolean;
  isEmpty: boolean;
  tiles: Tile[];
  sources: { rows: SourceRow[]; totalCents: number };
  projects: ProjectLine[];
  globalMarginCents: number;
  recurringPeriodCents: number;
  cash: CashProjection;
  anomalies: Anomaly[];
  detail: DetailView | null;
};

export const DETAIL_PAGE_SIZE = 50;

const INVOICE_KIND_LABELS: Record<InvoiceRow['kind'], string> = {
  deposit: 'Acompte',
  period: 'Facture',
  final: 'Facture finale',
  credit_note: 'Avoir',
};
const METHOD_LABELS: Record<string, string> = { card: 'Carte bancaire', bank_transfer: 'Virement' };
const QUOTE_KIND_LABELS: Record<QuoteItem['kind'], string> = { devis: 'Devis', signature: 'Signature', avenant: 'Avenant' };
const DETAIL_TITLES: Record<DetailKind, string> = {
  devis: 'Détail : Pipeline',
  signe: 'Détail : CA signé',
  facture: 'Détail : CA facturé',
  paiement: 'Détail : CA encaissé',
  cout: 'Marge réalisée',
};

type Entry = { projectId: string | null; row: DetailRow };

const byDateDesc = (a: Entry, b: Entry) => b.row.date.localeCompare(a.row.date) || a.row.id.localeCompare(b.row.id);
const sumCents = (xs: { amountCents: number }[]) => xs.reduce((s, x) => s + x.amountCents, 0);

export function buildPilotageView(rows: PilotageRows, params: PilotageParams, now: Date): PilotageView {
  const today = parisToday(now);
  const range = periodRange(params.periode, today);
  const base = params.base;

  // (1) Périmètre : les projets de clients de test sont exclus par défaut (D-03, Pitfall 4).
  const clientById = new Map(rows.clients.map((c) => [c.id, c]));
  const projects = rows.projects.filter((p) => params.tests || clientById.get(p.clientId)?.isTest !== true);
  const projectIds = new Set(projects.map((p) => p.id));
  const titleOf = new Map(projects.map((p) => [p.id, p.title]));
  const clientNameOf = (projectId: string) => clientById.get(projects.find((p) => p.id === projectId)?.clientId ?? '')?.name ?? '';
  const invs = filterInvoices(rows.invoices, params.tests).filter((i) => projectIds.has(i.projectId));
  const invIds = new Set(invs.map((i) => i.id));
  const events = rows.paymentEvents.filter((e) => invIds.has(e.invoiceId));
  const docs = rows.quoteDocs.filter((d) => projectIds.has(d.projectId));
  const facts = rows.facts.filter((f) => projectIds.has(f.projectId));
  const costRows = rows.projectCosts.filter((c) => projectIds.has(c.projectId));

  // (2) États de devis.
  const states = buildQuoteStates([...projectIds], docs, rows.snapshots, facts);
  const stateList = [...states.values()];

  // Agrégats de la période. Les devis portent un seul total (franchise de TVA) : HT = TTC pour pipeline et signé.
  const pipe = pipeline(stateList);
  const signed = signedInRange(stateList, range);
  const inv = invoiced(invs, range, base, true);
  const col = collected(invs, events, range, base, true);

  // (4) Chiffres par projet.
  const signedBy = sumByProject(signed.items);
  const invoicedBy = sumByProject(inv.items);
  const collectedBy = sumByProject(col.items);
  const periodCosts = projectCostsInRange(costRows, range);
  const costsBy = sumByProject(periodCosts.items.map((c) => ({ projectId: c.projectId as string, amountCents: c.amountCents })));
  const invoicedLifetime = sumByProject(invoiced(invs, ALL_TIME, base, true).items);

  const lines: ProjectLine[] = [];
  for (const p of projects) {
    const signedCents = signedBy.get(p.id) ?? 0;
    const invoicedCents = invoicedBy.get(p.id) ?? 0;
    const collectedCents = collectedBy.get(p.id) ?? 0;
    const costsCents = costsBy.get(p.id) ?? 0;
    const state = states.get(p.id);
    const remainingCents = remainingToInvoice({
      signedCents: state ? signedNow(state) : 0,
      invoicedCents: invoicedLifetime.get(p.id) ?? 0,
    });
    if ([signedCents, invoicedCents, collectedCents, costsCents, remainingCents].every((n) => n === 0)) continue;
    lines.push({
      projectId: p.id,
      title: p.title,
      clientName: clientNameOf(p.id),
      signedCents,
      invoicedCents,
      collectedCents,
      costsCents,
      marginCents: projectMargin({ signedCents, invoicedCents, costsCents }),
      remainingCents,
    });
  }
  lines.sort((a, b) => a.title.localeCompare(b.title, 'fr'));

  // (5) Marge globale.
  const recurringPeriod = recurringInRange(rows.recurringCosts, range);
  const recurringPeriodCents = recurringPeriod.totalCents;
  const globalMarginCents = globalMargin(lines.map((l) => l.marginCents), recurringPeriodCents);

  // (6) Coûts payés : coûts projet jusqu'à aujourd'hui et mois récurrents jusqu'au mois courant.
  const paidRange: DateRange = { from: range.from, to: range.to < today ? range.to : today };
  const paidProjectCosts: CostItem[] = paidRange.from <= paidRange.to ? projectCostsInRange(costRows, paidRange).items : [];
  const paidRecurring = recurringInRange(rows.recurringCosts, range, monthKey(today)).items;
  const paidCosts = [...paidProjectCosts, ...paidRecurring];
  const realizedCents = realizedMargin(col.totalCents, sumCents(paidCosts));

  // (7) Trésorerie.
  const cash = cashProjection({
    today,
    balance: currentBalance(rows.cashBalances),
    unpaid: unpaidInvoices(invs, events, today, base, true),
    recurring: rows.recurringCosts,
    projectCosts: effectiveProjectCosts(costRows),
    collectedItems: collected(invs, events, ALL_TIME, base, true).items,
  });

  // (8) Sources.
  const sources = signedBySource(
    signed.items,
    projects.map((p) => ({ projectId: p.id, leadId: p.leadId })),
    rows.leads,
  );

  const remainingTotal = lines.reduce((s, l) => s + l.remainingCents, 0);
  const tiles: Tile[] = [
    { key: 'pipeline', label: 'Pipeline', rule: 'Devis émis non signés, à ce jour. La période ne le filtre pas.', cents: pipe.totalCents, linkText: 'Voir les devis', detail: 'devis', anchor: null },
    { key: 'signe', label: 'CA signé', rule: 'Devis actif à la date de signature, avenants inclus.', cents: signed.totalCents, linkText: 'Voir les devis signés', detail: 'signe', anchor: null },
    { key: 'facture', label: 'CA facturé', rule: 'Factures émises moins avoirs, sur la période.', cents: inv.totalCents, linkText: 'Voir les factures', detail: 'facture', anchor: null },
    { key: 'encaisse', label: 'CA encaissé', rule: 'Paiements reçus moins remboursements confirmés, sur la période.', cents: col.totalCents, linkText: 'Voir les paiements', detail: 'paiement', anchor: null },
    { key: 'marge_projetee', label: 'Marge projetée', rule: 'Signé (ou facturé net si supérieur) moins coûts du projet, moins coûts récurrents de la période.', cents: globalMarginCents, linkText: 'Voir par projet', detail: null, anchor: '#marge-projets' },
    { key: 'marge_realisee', label: 'Marge réalisée', rule: 'Encaissé moins coûts payés.', cents: realizedCents, linkText: 'Voir le calcul', detail: 'cout', anchor: null },
    { key: 'a_facturer', label: 'Reste à facturer', rule: 'Signé moins facturé, sans date, hors courbe.', cents: remainingTotal, linkText: 'Voir par projet', detail: null, anchor: '#marge-projets' },
  ];

  // (9) Détail : mêmes items que les tuiles, jamais un second calcul.
  const detail = params.detail
    ? buildDetail(params.detail, params, {
        pipe: pipe.items,
        signed: signed.items,
        inv: inv.items,
        col: col.items,
        paidCosts,
        titleOf,
        clientNameOf,
        projectTitle: params.projectId ? (titleOf.get(params.projectId) ?? null) : null,
      })
    : null;

  const anomalies: Anomaly[] = [
    ...stateList.flatMap((s) => s.anomalies.map((a) => ({ kind: a.kind, ref: a.ref }))),
    ...billingAnomalies(invs),
  ];

  return {
    today,
    periodLabel: periodLabel(params.periode, today),
    range,
    params,
    allFranchise: invs.every((i) => i.vatRegime === 'franchise'),
    isEmpty: docs.length === 0 && invs.length === 0,
    tiles,
    sources,
    projects: lines,
    globalMarginCents,
    recurringPeriodCents,
    cash,
    anomalies,
    detail,
  };
}

type DetailInput = {
  pipe: QuoteItem[];
  signed: QuoteItem[];
  inv: InvoicedItem[];
  col: CollectedItem[];
  paidCosts: CostItem[];
  titleOf: Map<string, string>;
  clientNameOf: (projectId: string) => string;
  projectTitle: string | null;
};

function buildDetail(kind: DetailKind, params: PilotageParams, d: DetailInput): DetailView {
  const quoteEntries = (items: QuoteItem[]): Entry[] =>
    items.map((i) => ({
      projectId: i.projectId,
      row: {
        type: 'devis',
        id: `${i.projectId}:${i.kind}:${i.documentId}`,
        reference: i.reference,
        projectId: i.projectId,
        projectTitle: d.titleOf.get(i.projectId) ?? '',
        date: i.date,
        kindLabel: QUOTE_KIND_LABELS[i.kind],
        amountCents: i.amountCents,
      },
    }));
  const paymentEntries = (): Entry[] =>
    d.col.map((c) => ({
      projectId: c.projectId,
      row: {
        type: 'paiement',
        id: String(c.eventId),
        date: c.date,
        number: c.number,
        methodLabel: c.kind === 'refunded' ? 'Remboursement' : ((c.method && METHOD_LABELS[c.method]) || '—'),
        amountCents: c.amountCents,
      },
    }));

  let entries: Entry[];
  switch (kind) {
    case 'devis':
      entries = quoteEntries(d.pipe).sort(byDateDesc);
      break;
    case 'signe':
      entries = quoteEntries(d.signed).sort(byDateDesc);
      break;
    case 'facture':
      entries = d.inv
        .map<Entry>((i) => ({
          projectId: i.projectId,
          row: {
            type: 'facture',
            id: i.invoiceId,
            number: i.number,
            date: i.date,
            clientName: d.clientNameOf(i.projectId),
            kindLabel: INVOICE_KIND_LABELS[i.kind],
            amountCents: i.amountCents,
          },
        }))
        .sort(byDateDesc);
      break;
    case 'paiement':
      entries = paymentEntries().sort(byDateDesc);
      break;
    case 'cout': {
      // Détail composé de la marge réalisée : encaissé en positif, coûts payés en négatif.
      const costs = d.paidCosts.map<Entry>((c) => ({
        projectId: c.projectId,
        row: {
          type: 'cout',
          id: `${c.source}:${c.refId}:${c.date}`,
          date: c.date,
          projectTitle: c.projectId ? (d.titleOf.get(c.projectId) ?? null) : null,
          label: c.label,
          categoryLabel: COST_CATEGORY_LABELS[c.category],
          amountCents: -c.amountCents,
        },
      }));
      entries = [...paymentEntries().sort(byDateDesc), ...costs.sort(byDateDesc)];
      break;
    }
  }

  if (params.projectId) entries = entries.filter((e) => e.projectId === params.projectId);
  const all = entries.map((e) => e.row);
  const totalRows = all.length;
  const pageCount = Math.max(1, Math.ceil(totalRows / DETAIL_PAGE_SIZE));
  const page = Math.min(Math.max(1, params.page), pageCount);
  const start = (page - 1) * DETAIL_PAGE_SIZE;
  return {
    kind,
    title: d.projectTitle ? `${DETAIL_TITLES[kind]} · ${d.projectTitle}` : DETAIL_TITLES[kind],
    projectTitle: d.projectTitle,
    totalCents: sumCents(all),
    totalRows,
    rows: all.slice(start, start + DETAIL_PAGE_SIZE),
    page,
    pageCount,
  };
}
