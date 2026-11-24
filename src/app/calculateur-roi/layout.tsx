import type { Metadata } from "next";
import { buildPageSeo } from "@/lib/pageSeo";

export const metadata: Metadata = {
  ...buildPageSeo({
    title: "Calculateur de ROI · Agent IA téléphonique",
    description:
      "Estimez ce qu'un agent IA téléphonique récupère pour votre boutique : temps libéré du téléphone et CA récupéré sur les appels manqués.",
    path: "/calculateur-roi",
  }),
  // Outil terrain interne utilisé en RDV — pas destiné au référencement public.
  robots: { index: false, follow: false },
};

export default function CalculateurRoiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
