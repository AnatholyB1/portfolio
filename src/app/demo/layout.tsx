import type { Metadata } from "next";
import { buildPageSeo } from "@/lib/pageSeo";

// /demo is a showcase for a fictional client (duplicate-like content, no search value):
// keep it reachable but out of the index, and out of the sitemap.
export const metadata: Metadata = {
  ...buildPageSeo({
    title: "Démo : gestion de commandes et stock",
    description:
      "Démonstration d'un outil de gestion sur mesure (commandes, stock, retrait) pour un commerce fictif. Exemple de réalisation Sèvalys.",
    path: "/demo",
  }),
  robots: { index: false, follow: true },
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
