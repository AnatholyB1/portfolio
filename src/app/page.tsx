import type { Metadata } from 'next';
import RevealsMount from '@/components/ui/RevealsMount';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import HeroSection from '@/components/sections/HeroSection';
import Manifeste from '@/components/sections/Manifeste';
import ServicesPreview from '@/components/sections/ServicesPreview';
import Realisations from '@/components/sections/Realisations';
import FonctionnementSection from '@/components/sections/FonctionnementSection';
import ZoneSection from '@/components/sections/ZoneSection';
import WhySection from '@/components/sections/WhySection';
import AvisExcerpt from '@/components/sections/AvisExcerpt';
import FaqSection from '@/components/sections/FaqSection';
import ContactSection from '@/components/sections/ContactSection';
import { translations } from '@/lib/translations';
import { buildFaqJsonLd, buildJsonLdScript } from '@/lib/serviceJsonLd';

// Server component: AvisExcerpt reads the published reviews on the server (no client fetch, no
// layout shift). The page is regenerated every 5 minutes.
export const revalidate = 300;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://sevalys.com';

// `absolute` : sans lui, le template `%s · Sèvalys` du layout doublerait la marque.
const TITLE = 'Agence web à Tours : sites, SEO et agents IA | Sèvalys';
const DESCRIPTION =
  'Sèvalys, agence web à Tours : site internet dès 500 €, SEO dès 300 €/mois, agent vocal IA. Devis sous 48 h, sans engagement.';

// The root layout no longer sets a canonical (it was inherited by every page); the home page owns "/".
export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: 'website',
    locale: 'fr_FR',
    url: SITE_URL,
    siteName: 'Sèvalys',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Sèvalys — Agence web à Tours · Sites, SEO et IA',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/og-image.png'],
  },
};

// FAQPage : accueil uniquement, questions et réponses identiques au texte visible de FaqSection
// (la page est servie en français côté serveur).
const faqJsonLd = buildFaqJsonLd(translations.fr.landing.faq.items, `${SITE_URL}/`);

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: buildJsonLdScript(faqJsonLd) }}
      />
      {/* Scroll-reveal system: sweeps all [data-reveal] elements across all child sections */}
      <RevealsMount />
      <Navbar />
      <main id="main-content">
        <HeroSection />
        <Manifeste />
        <ServicesPreview />
        <Realisations />
        <FonctionnementSection />
        <ZoneSection />
        <WhySection />
        <AvisExcerpt />
        <FaqSection />
        <ContactSection />
      </main>
      <Footer />
    </>
  );
}
