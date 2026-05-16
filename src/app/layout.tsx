import type { Metadata } from "next";
import { Bricolage_Grotesque, Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/context/LanguageContext";
import ClientProviders from "@/components/ui/ClientProviders";

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

export const metadata: Metadata = {
  title: "BRICON ANATHOLY | Agence digitale · Sites, outils & agents IA · Tours",
  description: "Agence digitale à Tours — nous concevons des sites web, des outils de gestion et des agents IA pour commerces, restaurants et services locaux. Devis sous 48h.",
  keywords: [
    "agence digitale Tours",
    "site web PME",
    "agent IA téléphonique",
    "phone agent",
    "VAPI",
    "création site web Tours",
    "outil de gestion PME",
    "agent vocal IA",
    "Selenium Studio",
    "BRICON ANATHOLY",
  ],
  authors: [{ name: "BRICON ANATHOLY" }],
  creator: "BRICON ANATHOLY",
  publisher: "BRICON ANATHOLY",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  openGraph: {
    title: "BRICON ANATHOLY | Agence digitale · Sites, outils & agents IA",
    description: "Sites web, outils de gestion et agents IA pour PME locales. Basé à Tours, France.",
    type: "website",
    locale: "fr_FR",
    siteName: "BRICON ANATHOLY — Agence digitale",
  },
  twitter: {
    card: "summary_large_image",
    title: "BRICON ANATHOLY | Agence digitale Tours",
    description: "Sites web, outils de gestion et agents IA pour commerces et services locaux.",
  },
  category: "technology",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body
        className={`${bricolage.variable} ${manrope.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <LanguageProvider>
          {children}
        </LanguageProvider>
        <ClientProviders />
      </body>
    </html>
  );
}
