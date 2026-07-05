import type { Metadata } from "next";
import { Space_Grotesk, Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/context/LanguageContext";
import ClientProviders from "@/components/ui/ClientProviders";
import PostHogProvider from "@/components/analytics/PostHogProvider";
import Script from "next/script";

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
    default: "Sèvalys — Agence IA · Agent vocal téléphonique, automatisations & sites | Tours",
    template: "%s · Sèvalys",
  },
  description:
    "Sèvalys, agence IA à Tours. On déploie des agents vocaux téléphoniques qui répondent à vos clients 24/7, des automatisations métier et des sites qui convertissent. Optimisation business par l'IA. Devis sous 48h.",
  keywords: [
    "Sèvalys",
    "Sevalys",
    "agence IA",
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
    title: "Sèvalys — Agence IA · Agents vocaux, automatisations & sites",
    description:
      "Agents vocaux téléphoniques 24/7, automatisations métier et sites qui convertissent. Optimisation business par l'IA. Basé à Tours, France.",
    type: "website",
    locale: "fr_FR",
    url: SITE_URL,
    siteName: "Sèvalys",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Sèvalys — Agence IA · Agent vocal téléphonique & automatisations",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sèvalys — Agence IA · Agents vocaux & automatisations",
    description:
      "Agents vocaux téléphoniques 24/7, automatisations et sites qui convertissent. Optimisation business par l'IA.",
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
      "Sèvalys est une agence IA basée à Tours : agents vocaux téléphoniques, automatisations métier et sites web. Positionnement : optimisation business par l'intelligence artificielle.",
    slogan: "Optimisation business par l'IA.",
    email: "contact@sevalys.com",
    telephone: "+33 6 07 18 41 33",
    knowsAbout: [
      "Agent vocal IA",
      "Standard téléphonique automatisé",
      "Automatisation des processus métier",
      "Intelligence artificielle appliquée",
      "Création de sites web",
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
      "Agence IA à Tours — agents vocaux téléphoniques 24/7, automatisations métier et sites web pour PME, commerces, restaurants et services.",
    url: SITE_URL,
    logo: `${SITE_URL}/icon-192.png`,
    image: `${SITE_URL}/og-image.png`,
    telephone: "+33 6 07 18 41 33",
    email: "contact@sevalys.com",
    serviceType: [
      "Agent vocal IA téléphonique",
      "Automatisation métier",
      "Création de site web",
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
    priceRange: "€€",
    openingHours: "Mo-Fr 09:00-18:00",
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
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          strategy="beforeInteractive"
        />
      </head>
      <body>
        <PostHogProvider>
          <LanguageProvider>
            {children}
          </LanguageProvider>
        </PostHogProvider>
        <ClientProviders />
      </body>
    </html>
  );
}
