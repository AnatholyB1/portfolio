export type CoreResult<T = undefined> =
  | { ok: true; message: string; data?: T }
  // `data` sur un refus : détail structuré pour les appelants qui le veulent (ex. succès partiel
  // d'une invitation) ; les wrappers web l'ignorent et ne lisent que `message`.
  | { ok: false; message: string; data?: T };
