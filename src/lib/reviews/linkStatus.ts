// Type partagé (client + serveur) du statut d'un lien d'avis. Aucun import serveur.
export type ReviewLinkStatus =
  | { kind: 'none' }
  | { kind: 'active'; expiresAt: string }
  | { kind: 'used'; usedAt: string }
  | { kind: 'expired'; expiresAt: string }
  | { kind: 'invalidated'; invalidatedAt: string };
