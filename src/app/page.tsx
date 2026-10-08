import RevealsMount from '@/components/ui/RevealsMount';
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
import AvisExcerpt from '@/components/sections/AvisExcerpt';
import ContactSection from '@/components/sections/ContactSection';

// Server component: AvisExcerpt reads the published reviews on the server (no client fetch, no
// layout shift). The page is regenerated every 5 minutes.
export const revalidate = 300;

export default function Home() {
  return (
    <>
      {/* Scroll-reveal system: sweeps all [data-reveal] elements across all child sections */}
      <RevealsMount />
      <Navbar />
      <main id="main-content">
        <HeroSection />
        <Manifeste />
        <ProblemSection />
        <ServicesPreview />
        <FonctionnementSection />
        <EnjeuxSection />
        <Realisations />
        <PhoneAgent />
        <Partners />
        <AvisExcerpt />
        <ContactSection />
      </main>
      <Footer />
    </>
  );
}
