import type { Metadata } from "next";
import { Space_Grotesk, Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/context/LanguageContext";
import ClientProviders from "@/components/ui/ClientProviders";
import ConsentDialog from "@/components/consent/ConsentDialog";
import PostHogProvider from "@/components/analytics/PostHogProvider";
import Script from "next/script";
import { buildServiceCatalogJsonLd } from "@/lib/serviceSchema";
import { buildJsonLdScript } from "@/lib/serviceJsonLd";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-spacegrotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sevalys.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Sèvalys — Agence digitale à Tours · Sites, lead magnets, outils sur mesure & IA",
    template: "%s · Sèvalys",
  },
  description:
    "Sèvalys, agence digitale complète à Tours. Sites et lead magnets qui convertissent, outils de gestion sur mesure, intégrations IA (agents vocaux, automatisations), branding et publicité. Devis sous 48h.",
  keywords: [
    "Sèvalys",
    "Sevalys",
    "agence digitale",
    "agence IA",
    "lead magnet",
    "outils de gestion sur mesure",
    "agence agent IA",
    "agent vocal IA",
    "agent téléphonique IA",
    "standard téléphonique IA",
    "répondeur IA pour entreprise",
    "automatisation IA PME",
    "optimisation business par l'IA",
    "agence intelligence artificielle Tours",
    "création site web Tours",
    "agence digitale Tours",
    "phone agent VAPI",
  ],
  authors: [{ name: "Sèvalys", url: SITE_URL }],
  creator: "Sèvalys",
  publisher: "Sèvalys",
  applicationName: "Sèvalys",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    title: "Sèvalys — Agence digitale · Sites, lead magnets, outils sur mesure & IA",
    description:
      "Sites et lead magnets qui convertissent, outils de gestion sur mesure, agents vocaux et automatisations IA. Basé à Tours, France.",
    type: "website",
    locale: "fr_FR",
    url: SITE_URL,
    siteName: "Sèvalys",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Sèvalys — Agence digitale · Sites, outils sur mesure & IA",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sèvalys — Agence digitale · Sites, outils sur mesure & IA",
    description:
      "Sites et lead magnets qui convertissent, outils sur mesure, agents vocaux et automatisations IA.",
    images: ["/og-image.png"],
  },
  category: "technology",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const org = {
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: "Sèvalys",
    alternateName: "Sevalys",
    url: SITE_URL,
    logo: `${SITE_URL}/icon-512.png`,
    image: `${SITE_URL}/og-image.png`,
    description:
      "Sèvalys est une agence digitale complète basée à Tours : sites web et lead magnets, outils de gestion sur mesure, intégrations d'intelligence artificielle (agents vocaux, automatisations), branding et publicité.",
    slogan: "Optimisation business par l'IA.",
    email: "contact@sevalys.com",
    telephone: "+33 6 07 18 41 33",
    knowsAbout: [
      "Agent vocal IA",
      "Standard téléphonique automatisé",
      "Automatisation des processus métier",
      "Intelligence artificielle appliquée",
      "Création de sites web",
      "Lead magnets",
      "Outils de gestion sur mesure",
      "Optimisation business par l'IA",
    ],
    sameAs: ["https://www.instagram.com/sevalys.ai"],
    address: {
      "@type": "PostalAddress",
      addressLocality: "Tours",
      addressRegion: "Indre-et-Loire",
      addressCountry: "FR",
    },
  };

  const professionalService = {
    "@type": "ProfessionalService",
    "@id": `${SITE_URL}/#service`,
    name: "Sèvalys",
    parentOrganization: { "@id": `${SITE_URL}/#organization` },
    description:
      "Agence digitale à Tours — sites et lead magnets, outils de gestion sur mesure, intégrations IA (agents vocaux, automatisations), branding et publicité pour PME, commerces, restaurants et services.",
    url: SITE_URL,
    logo: `${SITE_URL}/icon-192.png`,
    image: `${SITE_URL}/og-image.png`,
    telephone: "+33 6 07 18 41 33",
    email: "contact@sevalys.com",
    serviceType: [
      "Création de site web",
      "Lead magnet",
      "Outils de gestion sur mesure",
      "Agent vocal IA téléphonique",
      "Automatisation métier",
      "Branding",
      "Community management",
      "Publicité Meta Ads et Google Ads",
    ],
    address: {
      "@type": "PostalAddress",
      addressLocality: "Tours",
      addressRegion: "Indre-et-Loire",
      addressCountry: "FR",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 47.3941,
      longitude: 0.6848,
    },
    areaServed: {
      "@type": "GeoCircle",
      geoMidpoint: {
        "@type": "GeoCoordinates",
        latitude: 47.3941,
        longitude: 0.6848,
      },
      geoRadius: "50000",
    },
    openingHours: "Mo-Fr 09:00-18:00",
    hasOfferCatalog: buildServiceCatalogJsonLd(SITE_URL),
  };

  const website = {
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: "Sèvalys",
    inLanguage: ["fr-FR", "en", "th"],
    publisher: { "@id": `${SITE_URL}/#organization` },
  };

  const faq = {
    "@type": "FAQPage",
    "@id": `${SITE_URL}/#faq`,
    mainEntity: [
      {
        "@type": "Question",
        name: "Qu'est-ce que Sèvalys ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Sèvalys est une agence IA basée à Tours (France). Elle conçoit des agents vocaux téléphoniques qui répondent aux clients 24/7, des automatisations métier et des sites web. Son positionnement : l'optimisation business par l'intelligence artificielle.",
        },
      },
      {
        "@type": "Question",
        name: "Qu'est-ce qu'un agent vocal IA téléphonique Sèvalys ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "C'est un standard téléphonique automatisé par IA : il décroche, comprend la demande en français naturel, prend une commande ou un rendez-vous, met à jour votre CRM et vous notifie — sans appel manqué, jour et nuit.",
        },
      },
      {
        "@type": "Question",
        name: "Où se trouve Sèvalys et qui accompagne-t-elle ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Sèvalys est basée à Tours en Indre-et-Loire et intervient à distance partout en France, pour les PME, commerces, restaurants, écoles et services locaux. Devis sous 48h, sans engagement.",
        },
      },
    ],
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [org, professionalService, website, faq],
  };

  return (
    <html lang="fr" className={`scroll-smooth ${spaceGrotesk.variable} ${manrope.variable} ${jetbrainsMono.variable}`}>
      <head>
        <Script
          id="json-ld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: buildJsonLdScript(jsonLd) }}
          strategy="beforeInteractive"
        />
      </head>
      <body>
        <PostHogProvider>
          <LanguageProvider>
            {children}
            <ConsentDialog />
          </LanguageProvider>
        </PostHogProvider>
        <ClientProviders />
      </body>
    </html>
  );
}
