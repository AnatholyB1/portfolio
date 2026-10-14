// Filtre d'URL inconnu (?statut=xxx) : la liste est affichée sans filtre, et on le dit au lieu de l'ignorer
// en silence. Module pur, sûr côté client.

const MAX_SHOWN = 40;

/** Valeur brute d'un paramètre, raccourcie et débarrassée des espaces superflus pour l'affichage. */
export function shownParam(raw: string): string {
  const v = raw.trim().replace(/\s+/g, ' ');
  return v.length > MAX_SHOWN ? `${v.slice(0, MAX_SHOWN)}…` : v;
}

/**
 * Message à afficher quand un paramètre de filtre est présent mais refusé.
 * Retourne null quand le paramètre est absent, vide, ou accepté.
 */
export function ignoredFilterNotice(
  label: string,
  raw: string | undefined,
  allowed: readonly string[],
): string | null {
  if (raw === undefined || raw.trim() === '') return null;
  if (allowed.includes(raw)) return null;
  return `Le filtre « ${label} : ${shownParam(raw)} » n'existe pas. La liste est affichée sans ce filtre.`;
}
