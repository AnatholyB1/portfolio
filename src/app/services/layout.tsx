import type { Metadata } from "next";
import { OG_IMAGE } from "@/lib/pageSeo";

export const metadata: Metadata = {
  title: "Nos 10 services · sites, marque, SEO, pub et agents IA",
  description: "10 services pour PME à Tours : sites, marque, agent vocal IA, maintenance, SEO, community management et publicité Meta et Google Ads.",
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
    "Sèvalys",
    "site vitrine tours",
    "refonte site internet tours",
    "agence branding tours",
    "création logo identité visuelle pme",
    "projet web sur mesure tours",
    "agent vocal IA tours",
    "maintenance site web tours",
    "community manager tours",
    "agence meta ads tours",
    "agence google ads tours"
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
    title: "Nos 10 services · Sèvalys",
    description: "Sites, identité, publicité et agents IA pour PME à Tours.",
    type: "website",
    locale: "fr_FR",
    siteName: "Sèvalys",
    url: "/services",
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    images: [OG_IMAGE.url],
    title: "Nos 10 services · Sèvalys",
    description: "Sites, identité, publicité et agents IA pour PME à Tours.",
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
