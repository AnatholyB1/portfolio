import AdminLoadingShell from '@/components/admin/AdminLoadingShell';

// Squelette fidele a la page (titre, filtres, tableau) : pas de saut de mise en page a l'arrivee du contenu.
export default function Loading() {
  return <AdminLoadingShell current="pilotage" variant="list" />;
}
