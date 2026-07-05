import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Services — Agents IA, automatisations & sites web pour PME | Sèvalys",
  description: "Sèvalys — agence IA à Tours. Agents vocaux téléphoniques 24/7, automatisations métier et sites web performants pour PME, commerces et services. Solution clé en main : design, développement, hébergement, maintenance. Devis sous 48h.",
  keywords: [
    "agent vocal IA",
    "agent téléphonique IA",
    "standard téléphonique IA",
    "automatisation IA PME",
    "optimisation business par l'IA",
    "création site web PME",
    "site internet entreprise",
    "agence web PME",
    "création site vitrine",
    "refonte site web",
    "site web professionnel",
    "SEO local",
    "maintenance site web",
    "hébergement site web",
    "présence digitale PME",
    "landing page professionnelle",
    "rebranding entreprise",
    "agence IA Tours",
    "Sèvalys"
  ],
  authors: [{ name: "Sèvalys" }],
  creator: "Sèvalys",
  publisher: "Sèvalys",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    title: "Services — Agents IA, automatisations & sites web | Sèvalys",
    description: "Agents vocaux téléphoniques 24/7, automatisations métier et sites performants pour PME locales. Solution clé en main avec maintenance incluse.",
    type: "website",
    locale: "fr_FR",
    siteName: "Sèvalys",
    url: "/services",
  },
  twitter: {
    card: "summary_large_image",
    title: "Services — Agents IA & sites web | Sèvalys",
    description: "Agents IA, automatisations et sites web pour PME : design, développement, hébergement, maintenance. Devis sous 48h.",
  },
  alternates: {
    canonical: "/services",
  },
  category: "technology",
};

export default function ServicesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
