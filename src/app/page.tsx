'use client';
// page.tsx must be 'use client' because useReveals() calls IntersectionObserver (browser API)

import { useReveals } from '@/hooks/useReveals';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import HeroSection from '@/components/sections/HeroSection';
import Manifeste from '@/components/sections/Manifeste';
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
        <Realisations />
        <PhoneAgent />
        <Partners />
        <ContactSection />
      </main>
      <Footer />
    </>
  );
}
