import { notFound } from 'next/navigation';

// Toute route inconnue sous /admin déclenche la 404 de l'administration (admin/not-found.tsx, avec la
// navigation admin) au lieu de la 404 publique du site. L'accès admin est vérifié par le layout.
export default function AdminUnknownRoute() {
  notFound();
}
