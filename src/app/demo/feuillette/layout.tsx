import type { Metadata } from "next";
import { buildPageSeo } from "@/lib/pageSeo";

// Demo storefront for a fictional client: noindex,follow, not listed in the sitemap.
export const metadata: Metadata = {
  ...buildPageSeo({
    title: "Démo Feuillette : boutique et commandes",
    description:
      "Démonstration d'un outil de commande et de stock pour une boulangerie fictive. Exemple de réalisation Sèvalys.",
    path: "/demo/feuillette",
  }),
  robots: { index: false, follow: true },
};

export default function DemoFeuilletteLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
