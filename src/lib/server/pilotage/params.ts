// Module pur, sûr côté client. Paramètres d'URL du pilotage : listes blanches, repli sur les défauts (D-12).
import type { PeriodKind } from './periods';

export type Base = 'ht' | 'ttc';
export type DetailKind = 'devis' | 'signe' | 'facture' | 'paiement' | 'cout';
export type PilotageParams = {
  periode: PeriodKind;
  base: Base;
  tests: boolean;
  detail: DetailKind | null;
  projectId: string | null;
  page: number;
};

const PERIODES: Record<string, PeriodKind> = { mois: 'mois', trimestre: 'trimestre', annee: 'annee' };
const BASES: Record<string, Base> = { ht: 'ht', ttc: 'ttc' };
const DETAILS: Record<string, DetailKind> = {
  devis: 'devis',
  signe: 'signe',
  facture: 'facture',
  paiement: 'paiement',
  cout: 'cout',
};

const CLE_RE = /^projet:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;
const PAGE_RE = /^[1-9]\d{0,3}$/;

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

function pick<T>(map: Record<string, T>, v: string | undefined): T | null {
  return v !== undefined && Object.prototype.hasOwnProperty.call(map, v) ? map[v] : null;
}

export function parsePilotageParams(sp: Record<string, string | string[] | undefined>): PilotageParams {
  const page = one(sp.page);
  const cle = one(sp.cle);
  return {
    periode: pick(PERIODES, one(sp.periode)) ?? 'mois',
    base: pick(BASES, one(sp.base)) ?? 'ttc',
    tests: one(sp.tests) === '1',
    detail: pick(DETAILS, one(sp.detail)),
    projectId: (cle !== undefined && CLE_RE.exec(cle)?.[0] ? cle.slice('projet:'.length) : null),
    page: page !== undefined && PAGE_RE.test(page) ? Number(page) : 1,
  };
}

export function pilotageHref(current: PilotageParams, patch: Partial<PilotageParams>): string {
  const p = { ...current, ...patch };
  const q = [
    `periode=${encodeURIComponent(p.periode)}`,
    `base=${encodeURIComponent(p.base)}`,
    `tests=${p.tests ? '1' : '0'}`,
  ];
  if (p.detail) q.push(`detail=${encodeURIComponent(p.detail)}`);
  if (p.projectId) q.push(`cle=${encodeURIComponent(`projet:${p.projectId}`)}`);
  if (p.detail && p.page > 1) q.push(`page=${p.page}`);
  return `/admin/pilotage?${q.join('&')}${p.detail ? '#detail' : ''}`;
}
