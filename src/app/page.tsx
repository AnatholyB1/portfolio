import Hero from '@/components/sections/Hero';
import About from '@/components/sections/About';
import Projects from '@/components/sections/Projects';
import PhoneAgentPromo from '@/components/sections/PhoneAgentPromo';
import Contact from '@/components/sections/Contact';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <About />
        <Projects />
        <PhoneAgentPromo />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
