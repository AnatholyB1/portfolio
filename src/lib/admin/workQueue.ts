// File de travail de l'accueil admin : module pur (libellés, ordre, états), sûr côté client.

export type QueueKey =
  | 'overdueInvoices'
  | 'documentsToSign'
  | 'newLeads'
  | 'returningLeads'
  | 'suppressionAnomalies'
  | 'recentReviews';

/** `null` : la lecture de cette tuile a échoué (jamais confondu avec zéro). */
export type QueueCounts = Record<QueueKey, number | null>;

export type QueueTile = {
  key: QueueKey;
  href: string;
  count: number | null;
  label: string;
};

type Def = { href: string; one: string; many: string; unavailable: string };

// Ordre = priorité : l'argent et les signatures avant les leads, l'information en dernier.
const DEFS: Record<QueueKey, Def> = {
  overdueInvoices: {
    href: '/admin/pilotage',
    one: 'facture en retard de paiement',
    many: 'factures en retard de paiement',
    unavailable: 'Factures en retard',
  },
  documentsToSign: {
    href: '/admin/projets',
    one: 'document en attente de signature',
    many: 'documents en attente de signature',
    unavailable: 'Documents à signer',
  },
  newLeads: {
    href: '/admin/leads?statut=new',
    one: 'nouveau lead à qualifier',
    many: 'nouveaux leads à qualifier',
    unavailable: 'Nouveaux leads',
  },
  returningLeads: {
    href: '/admin/leads?retours=1',
    one: 'lead revenu à revoir',
    many: 'leads revenus à revoir',
    unavailable: 'Leads revenus',
  },
  suppressionAnomalies: {
    href: '/admin/emails',
    one: 'adresse bloquée (plainte ou rebond)',
    many: 'adresses bloquées (plainte ou rebond)',
    unavailable: 'Adresses bloquées',
  },
  recentReviews: {
    href: '/admin/avis',
    one: 'avis publié ces 7 derniers jours',
    many: 'avis publiés ces 7 derniers jours',
    unavailable: 'Nouveaux avis',
  },
};

export const QUEUE_ORDER = Object.keys(DEFS) as QueueKey[];

/**
 * Tuiles à afficher : celles qui ont du travail (> 0) et celles dont la lecture a échoué
 * (signalées « indisponible » plutôt que masquées). `empty` : rien à traiter et aucune
 * lecture en échec, donc le message « Rien à traiter » est fiable.
 */
export function buildQueueTiles(counts: QueueCounts): { tiles: QueueTile[]; empty: boolean } {
  const tiles: QueueTile[] = [];
  for (const key of QUEUE_ORDER) {
    const n = counts[key];
    const def = DEFS[key];
    if (n === null) {
      tiles.push({ key, href: def.href, count: null, label: `${def.unavailable} : lecture impossible` });
    } else if (n > 0) {
      tiles.push({ key, href: def.href, count: n, label: n === 1 ? def.one : def.many });
    }
  }
  return { tiles, empty: tiles.length === 0 };
}
