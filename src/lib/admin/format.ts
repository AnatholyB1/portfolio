// Mise en forme d'affichage pour l'administration (module sûr côté client).

export const EM_DASH = '—';

/** « 12345678900012 » devient « 123 456 789 00012 ». Valeur vide : tiret cadratin. */
export function formatSiret(raw: string | null | undefined): string {
  const digits = String(raw ?? '').replace(/[\s.]/g, '');
  if (!digits) return EM_DASH;
  if (!/^\d{14}$/.test(digits)) return digits;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`;
}

/** Date JJ/MM/AAAA (fuseau Paris) ou tiret cadratin si invalide. */
export function formatDateFr(iso: string | null | undefined): string {
  if (!iso) return EM_DASH;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return EM_DASH;
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
