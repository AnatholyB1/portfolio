import type { Metadata } from "next";
import "../../portal.css";
import "./reviewForm.css";

// Page privée côté SEO (D-15) : jamais indexée, aucun référent transmis
// (le jeton d'URL ne doit pas fuiter), pas de session requise.
export const metadata: Metadata = {
  title: "Votre avis",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
  alternates: {},
};

export default function AvisTokenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="pt-root">{children}</div>;
}
