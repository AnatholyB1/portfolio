// Blocage, filtre et tri de la vue admin projets : pur. Module sûr côté client.
// `now` est toujours un paramètre. Les libellés FR vivent dans copy.ts (12-03).
import type { ProjectState } from './steps';

export const DORMANT_AFTER_DAYS = 14;

export type Blocker = 'client' | 'admin' | 'dormant';

export type AdminProjectRow = {
  projectId: string;
  clientName: string;
  title: string;
  offer: string;
  state: ProjectState;
  lastActivityAt: string;
  daysWaiting: number;
  isDormant: boolean;
  blockers: Blocker[];
};

export const SORT_KEYS = ['client', 'offre', 'etape', 'attente', 'depuis'] as const;
export type SortKey = (typeof SORT_KEYS)[number];
export const ETAPE_FILTERS = ['1', '2', '3', '4', '5', '6', 'done'] as const;
export const BLOCAGE_FILTERS = ['client', 'admin', 'dormant'] as const;

const DAY_MS = 86_400_000;

/** Dernière activité : max des dates non nulles (startedAt, faits, fichiers, liens, etc., connexion). */
export function lastActivity(input: {
  startedAt: string;
  dates: (string | null | undefined)[];
  lastSignInAt: string | null;
}): string {
  let best = input.startedAt;
  for (const d of [...input.dates, input.lastSignInAt]) {
    if (d && d > best) best = d;
  }
  return best;
}

export function daysSince(iso: string, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / DAY_MS));
}

// Écart assumé vs D-21 : « fichier demandé non fourni » n'est pas modélisé en phase 12
// (aucun objet de demande de fichier n'existe). « Attend le client » découle du côté
// qui attend à l'étape courante (RESEARCH, Open Question 3).
export function classifyProject(
  state: ProjectState,
  lastActivityAt: string,
  now: Date,
): { blockers: Blocker[]; isDormant: boolean; daysWaiting: number } {
  const daysWaiting = daysSince(state.sinceAt, now);
  if (state.done) return { blockers: [], isDormant: false, daysWaiting };
  const blockers: Blocker[] = [];
  if (state.waitingOn === 'client') blockers.push('client');
  if (state.waitingOn === 'admin') blockers.push('admin');
  const isDormant = daysSince(lastActivityAt, now) >= DORMANT_AFTER_DAYS;
  if (isDormant) blockers.push('dormant');
  return { blockers, isDormant, daysWaiting };
}

export function filterProjects(
  rows: AdminProjectRow[],
  opts: { etape?: string; blocage?: string },
): AdminProjectRow[] {
  let out = rows;
  const etape = opts.etape;
  if (etape && (ETAPE_FILTERS as readonly string[]).includes(etape)) {
    out = out.filter((r) => (etape === 'done' ? r.state.done : r.state.currentStep === Number(etape)));
  }
  const blocage = opts.blocage;
  if (blocage && (BLOCAGE_FILTERS as readonly string[]).includes(blocage)) {
    out = out.filter((r) => (r.blockers as string[]).includes(blocage));
  }
  return out;
}

function groupRank(r: AdminProjectRow): number {
  if (r.state.done) return 2;
  return r.state.waitingOn === 'admin' ? 0 : 1;
}

export function sortProjects(
  rows: AdminProjectRow[],
  key?: SortKey,
  dir: 'asc' | 'desc' = 'desc',
): AdminProjectRow[] {
  const indexed = rows.map((r, i) => ({ r, i }));
  const sign = dir === 'asc' ? 1 : -1;
  let cmp: (a: AdminProjectRow, b: AdminProjectRow) => number;
  if (!key || !(SORT_KEYS as readonly string[]).includes(key)) {
    cmp = (a, b) => groupRank(a) - groupRank(b) || b.daysWaiting - a.daysWaiting;
  } else {
    const step = (r: AdminProjectRow) => r.state.currentStep ?? 7;
    cmp = (a, b) => {
      switch (key) {
        case 'client':
          return sign * a.clientName.localeCompare(b.clientName, 'fr');
        case 'offre':
          return sign * a.offer.localeCompare(b.offer, 'fr');
        case 'etape':
          return sign * (step(a) - step(b));
        case 'attente':
          return sign * (a.daysWaiting - b.daysWaiting);
        case 'depuis':
          return sign * a.state.sinceAt.localeCompare(b.state.sinceAt);
      }
    };
  }
  return indexed.sort((x, y) => cmp(x.r, y.r) || x.i - y.i).map((x) => x.r);
}
