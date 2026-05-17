'use client';
// page.tsx must be 'use client' because useReveals() calls IntersectionObserver (browser API)
// Metadata lives in src/app/services/layout.tsx — do NOT add it here

import { useReveals } from '@/hooks/useReveals';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import PartnersBanner from '@/components/sections/PartnersBanner';
import ServicesHeroSection from '@/components/sections/ServicesHeroSection';
import ProblemSection from '@/components/sections/ProblemSection';
import ApproachSection from '@/components/sections/ApproachSection';
import OffersSection from '@/components/sections/OffersSection';
import PhoneAgentExplainer from '@/components/sections/PhoneAgentExplainer';
import MaintenanceSection from '@/components/sections/MaintenanceSection';
import OptionsSection from '@/components/sections/OptionsSection';
import { MethodologySectionLazy } from '@/components/ui/ClientProviders';
import ReassuranceSection from '@/components/sections/ReassuranceSection';
import FinalCtaSection from '@/components/sections/FinalCtaSection';

export default function ServicesPage() {
  // Mount scroll-reveal system — sweeps all [data-reveal] elements across all child sections
  useReveals();

  return (
    <>
      <Navbar />
      <main>
        <ServicesHeroSection />
        <ProblemSection />
        <ApproachSection />
        <OffersSection />
        <PhoneAgentExplainer />
        <MaintenanceSection />
        <OptionsSection />
        <MethodologySectionLazy />
        <ReassuranceSection />
        <PartnersBanner />
        <FinalCtaSection />
      </main>
      <Footer />
    </>
  );
}
