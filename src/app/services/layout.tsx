import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Création de Sites Web pour PME | Services Web Professionnels | Selenium Studio",
  description: "Agence de création de sites web pour PME locales. Sites modernes, performants et optimisés pour générer des contacts. Solution clé en main : design, développement, hébergement et maintenance. Devis gratuit.",
  keywords: [
    "création site web PME",
    "site internet entreprise",
    "agence web PME",
    "création site vitrine",
    "refonte site web",
    "site web professionnel",
    "développeur web freelance",
    "site responsive mobile",
    "SEO local",
    "maintenance site web",
    "hébergement site web",
    "site web moderne",
    "présence digitale PME",
    "site web pas cher",
    "création site sur mesure",
    "landing page professionnelle",
    "rebranding entreprise",
    "identité visuelle PME",
    "Selenium Studio"
  ],
  authors: [{ name: "Selenium Studio" }],
  creator: "Selenium Studio",
  publisher: "Selenium Studio",
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
    title: "Création de Sites Web pour PME | Selenium Studio",
    description: "Sites web modernes et performants pour PME locales. Gagnez en crédibilité et générez plus de contacts. Solution clé en main avec maintenance incluse.",
    type: "website",
    locale: "fr_FR",
    siteName: "Selenium Studio - Agence Web",
    url: "/services",
  },
  twitter: {
    card: "summary_large_image",
    title: "Création de Sites Web pour PME | Selenium Studio",
    description: "Sites web modernes pour PME : design, développement, hébergement et maintenance. Demandez votre audit gratuit.",
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
