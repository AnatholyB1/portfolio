import { notFound } from 'next/navigation';

// Toute route inconnue sous /espace-client déclenche la 404 du portail (espace-client/not-found.tsx,
// avec en-tête, déconnexion et liens de retour) au lieu de la 404 publique du site.
export default function EspaceClientUnknownRoute() {
  notFound();
}
