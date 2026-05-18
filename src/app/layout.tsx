import type { Metadata } from "next";
import { Bricolage_Grotesque, Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/context/LanguageContext";
import ClientProviders from "@/components/ui/ClientProviders";
import Script from "next/script";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  axes: ["opsz"],
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

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://anatholy-bricon.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "BRICON ANATHOLY | Agence digitale · Sites, outils & agents IA · Tours",
    template: "%s | BRICON ANATHOLY",
  },
  description:
    "Agence digitale à Tours — nous concevons des sites web, des outils de gestion et des agents IA pour commerces, restaurants et services locaux. Devis sous 48h.",
  keywords: [
    "agence digitale Tours",
    "création site web Tours",
    "site web PME Indre-et-Loire",
    "agent IA téléphonique",
    "agent vocal IA",
    "phone agent VAPI",
    "outil de gestion PME",
    "automatisation TPE",
    "Selenium Studio",
    "BRICON ANATHOLY",
  ],
  authors: [{ name: "BRICON ANATHOLY", url: SITE_URL }],
  creator: "BRICON ANATHOLY",
  publisher: "BRICON ANATHOLY",
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
    },
  },
  openGraph: {
    title: "BRICON ANATHOLY | Agence digitale · Sites, outils & agents IA",
    description:
      "Sites web, outils de gestion et agents IA pour PME locales. Basé à Tours, France.",
    type: "website",
    locale: "fr_FR",
    url: SITE_URL,
    siteName: "BRICON ANATHOLY — Agence digitale",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "BRICON ANATHOLY — Agence digitale Tours",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "BRICON ANATHOLY | Agence digitale Tours",
    description:
      "Sites web, outils de gestion et agents IA pour commerces et services locaux.",
    images: ["/og-image.png"],
  },
  category: "technology",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: "BRICON ANATHOLY",
    description:
      "Agence digitale à Tours — sites web, outils de gestion et agents IA pour PME locales.",
    url: SITE_URL,
    logo: `${SITE_URL}/icon-192.png`,
    image: `${SITE_URL}/og-image.png`,
    telephone: "+33 6 07 18 41 33",
    email: "buisness@contact-selenium-studio.com",
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
    sameAs: [],
  };

  return (
    <html lang="fr" className={`scroll-smooth ${bricolage.variable} ${manrope.variable} ${jetbrainsMono.variable}`}>
      <head>
        <Script
          id="json-ld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          strategy="beforeInteractive"
        />
      </head>
      <body>
        <LanguageProvider>
          {children}
        </LanguageProvider>
        <ClientProviders />
      </body>
    </html>
  );
}
