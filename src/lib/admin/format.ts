// Mise en forme d'affichage pour l'administration (module sûr côté client).

/** Valeur vide affichée en toutes lettres (jamais un tiret cadratin, illisible pour un lecteur d'écran). */
export const NOT_SET = 'Non renseigné';

/** « 12345678900012 » devient « 123 456 789 00012 ». Valeur vide : « Non renseigné ». */
export function formatSiret(raw: string | null | undefined): string {
  const digits = String(raw ?? '').replace(/[\s.]/g, '');
  if (!digits) return NOT_SET;
  if (!/^\d{14}$/.test(digits)) return digits;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`;
}

/** Date JJ/MM/AAAA (fuseau Paris) ou « Non renseigné » si invalide. */
export function formatDateFr(iso: string | null | undefined): string {
  if (!iso) return NOT_SET;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return NOT_SET;
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Europe/Paris',
  });
}

/** Retire espaces et points d'un SIRET collé (« 123 456 789.00012 »). */
export function normalizeSiretInput(value: string): string {
  return value.replace(/[\s.]/g, '');
}
