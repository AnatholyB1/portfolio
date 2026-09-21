'use client';
// page.tsx must be 'use client' because useReveals() calls IntersectionObserver (browser API)

import { useReveals } from '@/hooks/useReveals';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import HeroSection from '@/components/sections/HeroSection';
import Manifeste from '@/components/sections/Manifeste';
import ProblemSection from '@/components/sections/ProblemSection';
import ServicesPreview from '@/components/sections/ServicesPreview';
import FonctionnementSection from '@/components/sections/FonctionnementSection';
import EnjeuxSection from '@/components/sections/EnjeuxSection';
import Realisations from '@/components/sections/Realisations';
import PhoneAgent from '@/components/sections/PhoneAgent';
import Partners from '@/components/sections/Partners';
import ContactSection from '@/components/sections/ContactSection';

export default function Home() {
  // Mount scroll-reveal system — sweeps all [data-reveal] elements across all child sections
  useReveals();

  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <Manifeste />
        <ProblemSection />
        <ServicesPreview />
        <FonctionnementSection />
        <EnjeuxSection />
        <Realisations />
        <PhoneAgent />
        <Partners />
        <ContactSection />
      </main>
      <Footer />
    </>
  );
}
