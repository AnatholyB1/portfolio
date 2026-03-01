import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
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
        className={`${inter.variable} font-sans antialiased bg-linear-to-br from-gray-900 via-black to-gray-900 text-white min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
