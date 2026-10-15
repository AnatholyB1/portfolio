import type { Metadata } from "next";
import "../portal.css";
import "@/components/admin/admin.css";
import { ToastProvider } from "@/components/ui/Toast";

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
    <div className="pt-root" data-own-skip-link="">
      <a href="#admin-contenu" className="pt-skip-link">
        Aller au contenu
      </a>
      {/* Retours d'action (succès) : régions live montées une fois, avant l'arrivée du texte. */}
      <ToastProvider>{children}</ToastProvider>
    </div>
  );
}
