import type { Metadata } from "next";

// CR-01 (06-REVIEW.md): this static metadata is intentionally French-only.
// Unlike /services/[slug] (see that route's layout.tsx), `translations.ts`
// does not carry per-locale metaTitle/metaDescription/keywords copy for the
// /services index page, so there is no content to resolve a per-request
// locale against yet. The visible page content still switches to the
// visitor's detected/stored language client-side post-hydration (via
// LanguageContext), so en/th visitors (and Googlebot's default en-US
// render) will see this French title/description alongside localized page
// content until index-page metadata copy is authored for en/th.
export const metadata: Metadata = {
  title: "Nos 9 services — sites, identité, publicité et agents IA | Sèvalys",
  description: "Sèvalys propose 9 services pour PME à Tours : sites, identité de marque, agent vocal IA, maintenance, community management et publicité Meta & Google Ads.",
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
    title: "Nos 9 services | Sèvalys",
    description: "Sites, identité, publicité et agents IA pour PME à Tours.",
    type: "website",
    locale: "fr_FR",
    siteName: "Sèvalys",
    url: "/services",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nos 9 services | Sèvalys",
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
