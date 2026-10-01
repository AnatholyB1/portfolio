import type { Metadata } from "next";
import "../portal.css";

// Espace privé (D-15) : jamais indexé, titre propre (le gabarit racine ajoute
// « · Sèvalys »). `alternates: {}` supprime la canonique "/" héritée du layout racine.
// Aucune vérification d'accès ici : un layout n'est pas rejoué à chaque navigation,
// l'autorisation vit dans les pages et actions via la DAL.
export const metadata: Metadata = {
  title: "Connexion",
  robots: { index: false, follow: false, nocache: true },
  alternates: {},
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="pt-root">{children}</div>;
}
