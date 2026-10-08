import type { Metadata } from "next";
import "../portal.css";
import "@/components/admin/admin.css";

// Espace privé (D-15) : jamais indexé, titre propre (le gabarit racine ajoute
// « · Sèvalys »). `alternates: {}` supprime la canonique "/" héritée du layout racine.
// Aucune vérification d'accès ici : un layout n'est pas rejoué à chaque navigation,
// l'autorisation vit dans les pages et actions via la DAL.
export const metadata: Metadata = {
  title: "Administration",
  robots: { index: false, follow: false, nocache: true },
  alternates: {},
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Lien d'évitement : la cible `#admin-contenu` est posée par AdminNav (présent sur
  // chaque page), le <main> vient de ShellMain.
  return (
    <div className="pt-root">
      <a href="#admin-contenu" className="pt-skip-link">
        Aller au contenu
      </a>
      {children}
    </div>
  );
}
