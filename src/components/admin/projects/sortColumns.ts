import type { SortKey } from '@/lib/projects/blocking';

// Colonnes triables de la liste des projets : source unique pour les en-têtes de colonne (>= 768 px)
// et pour le sélecteur « Trier par » des filtres (les en-têtes sont masqués en dessous).
export const SORT_COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'client', label: 'Client' },
  { key: 'offre', label: 'Offre' },
  { key: 'etape', label: 'Étape' },
  { key: 'attente', label: 'Qui attend' },
  { key: 'depuis', label: 'Depuis' },
];
