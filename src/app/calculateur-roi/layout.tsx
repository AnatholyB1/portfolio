import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Calculateur de ROI · Agent IA téléphonique",
  description:
    "Estimez en direct ce qu'un agent IA téléphonique récupère pour votre boutique : temps d'équipe libéré du téléphone et CA récupéré sur les appels manqués.",
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
