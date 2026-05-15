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
  title: "Anatholy BRICON | Full Stack Developer & AI Engineer | Freelance Services",
  description: "Hire a Full Stack Developer & AI Engineer specializing in scalable web applications, AI automation, custom APIs, and intelligent systems. Based in Tours, France. Available for freelance projects worldwide.",
  keywords: [
    "full stack developer",
    "freelance developer",
    "AI engineer",
    "web developer France",
    "hire developer",
    "React developer",
    "Next.js expert",
    "Node.js developer",
    "AI automation specialist",
    "backend developer",
    "API development",
    "microservices architect",
    "Three.js developer",
    "WebGL specialist",
    "LLM integration",
    "custom software development",
    "Tours France developer",
    "Selenium Studio"
  ],
  authors: [{ name: "Anatholy BRICON" }],
  creator: "Anatholy BRICON",
  publisher: "Anatholy BRICON",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  openGraph: {
    title: "Anatholy BRICON | Full Stack Developer & AI Engineer for Hire",
    description: "Expert in building scalable web apps, AI-powered systems, and custom APIs. Transform your ideas into production-ready solutions.",
    type: "website",
    locale: "en_US",
    siteName: "Anatholy BRICON - Developer Portfolio",
  },
  twitter: {
    card: "summary_large_image",
    title: "Anatholy BRICON | Full Stack Developer & AI Engineer",
    description: "Hire an expert developer for web apps, AI automation, and custom software solutions.",
  },
  alternates: {
    languages: {
      'en': '/',
      'fr': '/fr',
    },
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
