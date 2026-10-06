import type { Metadata } from "next";
import "../portal.css";

// Page publique mais privée côté SEO (D-15) : jamais indexée, aucun référent
// transmis (le jeton d'URL ne doit pas fuiter), pas de session requise.
export const metadata: Metadata = {
  title: "Désinscription",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
  alternates: {},
};

export default function DesinscriptionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="pt-root">{children}</div>;
}
