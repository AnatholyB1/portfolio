'use client';

import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import PartnersBanner from '@/components/sections/PartnersBanner';
import { useLanguage } from '@/context/LanguageContext';

// Icons components
const CheckIcon = () => (
  <svg className="w-5 h-5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const ArrowIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
  </svg>
);

// ============================================
// SECTION 1: HERO
// ============================================
function ServicesHero() {
  const { t } = useLanguage();
  const ts = t.services.hero;

  return (
    <section className="relative min-h-[80vh] flex items-center justify-center pt-24 pb-16 px-4 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-linear-to-br from-indigo-900/20 via-transparent to-emerald-900/20" />
      
      <div className="relative z-10 text-center max-w-4xl mx-auto">
        <span className="inline-block px-4 py-2 bg-indigo-500/20 border border-indigo-500/30 rounded-full text-indigo-400 text-sm font-medium mb-6">
          {ts.badge}
        </span>
        
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 bg-linear-to-r from-white via-indigo-200 to-emerald-200 bg-clip-text text-transparent leading-tight">
          {ts.title}
        </h1>
        
        <p
          className="text-xl md:text-2xl text-gray-300 mb-4 max-w-3xl mx-auto leading-relaxed"
          dangerouslySetInnerHTML={{ __html: ts.subtitle }}
        />
        
        <p className="text-lg text-gray-400 mb-10 max-w-2xl mx-auto">
          {ts.description}
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="/#contact"
            className="px-8 py-4 bg-linear-to-r from-emerald-600 to-indigo-600 rounded-full text-white font-semibold text-lg hover:from-emerald-700 hover:to-indigo-700 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-emerald-500/25"
          >
            {ts.cta_audit}
          </a>
          <a
            href="#offres"
            className="px-8 py-4 border border-gray-600 rounded-full text-white font-medium hover:bg-white/10 transition-all duration-300 flex items-center justify-center gap-2"
          >
            {ts.cta_offers}
            <ArrowIcon />
          </a>
        </div>
      </div>
    </section>
  );
}

// ============================================
// SECTION 2: LE PROBLEME
// ============================================
function ProblemSection() {
  const { t } = useLanguage();
  const ts = t.services.problem;

  return (
    <section className="py-20 px-4 bg-black/40">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
            {ts.title}
          </h2>
          <div className="w-20 h-1 bg-linear-to-r from-red-500 to-orange-500 mx-auto mb-6 rounded-full" />
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            {ts.subtitle}
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          {ts.items.map((problem, index) => (
            <div 
              key={index}
              className="p-6 bg-gray-900/50 border border-gray-800 rounded-2xl hover:border-red-500/30 transition-all duration-300"
            >
              <div className="flex items-start gap-4">
                <span className="text-3xl">{problem.icon}</span>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">{problem.title}</h3>
                  <p className="text-gray-400 leading-relaxed">{problem.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-12 text-center">
          <p className="text-lg text-gray-300">
            <strong className="text-emerald-400">{ts.good_news}</strong>
          </p>
        </div>
      </div>
    </section>
  );
}

// ============================================
// SECTION 3: NOTRE SOLUTION
// ============================================
function SolutionSection() {
  const { t } = useLanguage();
  const ts = t.services.solution;

  return (
    <section className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-block px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full text-emerald-400 text-sm font-medium mb-4">
              {ts.badge}
            </span>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 bg-linear-to-r from-emerald-400 to-indigo-400 bg-clip-text text-transparent">
              {ts.title}
            </h2>
            <p
              className="text-lg text-gray-300 mb-6 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: ts.p1 }}
            />
            <p
              className="text-lg text-gray-300 mb-8 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: ts.p2 }}
            />
            
            <div className="grid sm:grid-cols-2 gap-3">
              {ts.benefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-2">
                  <CheckIcon />
                  <span className="text-gray-300">{benefit}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="relative">
            <div className="bg-linear-to-br from-emerald-500/10 to-indigo-500/10 border border-gray-800 rounded-3xl p-8">
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-emerald-500/20 rounded-2xl flex items-center justify-center">
                    <span className="text-2xl">🎯</span>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">{ts.card1_title}</h3>
                    <p className="text-gray-400 text-sm">{ts.card1_desc}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-indigo-500/20 rounded-2xl flex items-center justify-center">
                    <span className="text-2xl">🤝</span>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">{ts.card2_title}</h3>
                    <p className="text-gray-400 text-sm">{ts.card2_desc}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-purple-500/20 rounded-2xl flex items-center justify-center">
                    <span className="text-2xl">💎</span>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">{ts.card3_title}</h3>
                    <p className="text-gray-400 text-sm">{ts.card3_desc}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================
// SECTION 4: NOS OFFRES
// ============================================
function OffersSection() {
  const { t } = useLanguage();
  const ts = t.services.offers;

  const gradients = [
    'from-blue-500 to-cyan-500',
    'from-emerald-500 to-indigo-500',
    'from-purple-500 to-pink-500',
  ];

  return (
    <section id="offres" className="py-20 px-4 bg-black/40">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-linear-to-r from-emerald-400 to-indigo-400 bg-clip-text text-transparent">
            {ts.title}
          </h2>
          <div className="w-20 h-1 bg-linear-to-r from-emerald-500 to-indigo-500 mx-auto mb-6 rounded-full" />
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            {ts.subtitle}
          </p>
        </div>
        
        <div className="grid lg:grid-cols-3 gap-8">
          {ts.items.map((offer, index) => {
            const popular = index === 1;
            return (
              <div 
                key={index}
                className={`relative bg-gray-900/50 border rounded-3xl p-8 transition-all duration-300 hover:transform hover:scale-[1.02] ${
                  popular 
                    ? 'border-emerald-500/50 shadow-lg shadow-emerald-500/10' 
                    : 'border-gray-800 hover:border-gray-700'
                }`}
              >
                {popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1 bg-emerald-500 text-white text-sm font-medium rounded-full">
                      {ts.popular}
                    </span>
                  </div>
                )}
                
                <div className="mb-6">
                  <h3 className={`text-2xl font-bold mb-2 bg-linear-to-r ${gradients[index]} bg-clip-text text-transparent`}>
                    {offer.name}
                  </h3>
                  <p className="text-gray-400 text-sm mb-4">{offer.tagline}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm text-gray-500">{ts.from}</span>
                  </div>
                  <div className="text-3xl font-bold text-white">
                    {offer.price}
                  </div>
                </div>
                
                <p className="text-gray-400 mb-6">{offer.description}</p>
                
                <ul className="space-y-3 mb-8">
                  {offer.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckIcon />
                      <span className="text-gray-300 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <a
                  href="/#contact"
                  className={`block w-full py-3 text-center font-medium rounded-xl transition-all duration-300 ${
                    popular
                      ? 'bg-linear-to-r from-emerald-600 to-indigo-600 text-white hover:from-emerald-700 hover:to-indigo-700'
                      : 'bg-gray-800 text-white hover:bg-gray-700'
                  }`}
                >
                  {ts.cta}
                </a>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ============================================
// SECTION 5: MAINTENANCE & HÉBERGEMENT
// ============================================
function MaintenanceSection() {
  const { t } = useLanguage();
  const ts = t.services.maintenance;

  return (
    <section className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-2 bg-indigo-500/20 border border-indigo-500/30 rounded-full text-indigo-400 text-sm font-medium mb-4">
            {ts.badge}
          </span>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
            {ts.title}
          </h2>
          <div className="w-20 h-1 bg-linear-to-r from-indigo-500 to-purple-500 mx-auto mb-6 rounded-full" />
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            {ts.subtitle}
          </p>
        </div>
        
        <div className="grid lg:grid-cols-3 gap-8 mb-12">
          {ts.packs.map((pack, index) => (
            <div 
              key={index}
              className={`relative bg-gray-900/50 border rounded-3xl p-8 transition-all duration-300 hover:transform hover:scale-[1.02] ${
                pack.popular 
                  ? 'border-emerald-500/50 shadow-lg shadow-emerald-500/10' 
                  : 'border-gray-800 hover:border-gray-700'
              }`}
            >
              {pack.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1 bg-emerald-500 text-white text-sm font-medium rounded-full">
                    {ts.recommended}
                  </span>
                </div>
              )}
              
              <div className="mb-6">
                <h3 className="text-xl font-bold mb-2 text-white">
                  Pack {pack.name}
                </h3>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-4xl font-bold text-white">{ts.currency_symbol}{pack.price}</span>
                  <span className="text-gray-400">{ts.per_month}</span>
                  {pack.priceNote && <span className="text-gray-400">{pack.priceNote}</span>}
                </div>
                <p className="text-gray-400 text-sm">{pack.description}</p>
              </div>
              
              <ul className="space-y-3">
                {pack.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckIcon />
                    <span className="text-gray-300 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        
        {/* Additional benefits */}
        <div className="bg-linear-to-r from-emerald-500/10 to-indigo-500/10 border border-gray-800 rounded-2xl p-6">
          <div className="flex flex-wrap justify-center gap-6 text-center">
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 font-semibold">{ts.annual_discount}</span>
            </div>
            <div className="w-px h-6 bg-gray-700 hidden sm:block" />
            <div className="flex items-center gap-2">
              <CheckIcon />
              <span className="text-gray-300">{ts.no_commitment}</span>
            </div>
            <div className="w-px h-6 bg-gray-700 hidden sm:block" />
            <div className="flex items-center gap-2">
              <CheckIcon />
              <span className="text-gray-300">{ts.scalable}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================
// SECTION 6: OPTIONS COMPLÉMENTAIRES
// ============================================
function UpsellSection() {
  const { t } = useLanguage();
  const ts = t.services.upsell;

  return (
    <section className="py-20 px-4 bg-black/40">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
            {ts.title}
          </h2>
          <div className="w-20 h-1 bg-linear-to-r from-purple-500 to-pink-500 mx-auto mb-6 rounded-full" />
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            {ts.subtitle}
          </p>
        </div>
        
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {ts.options.map((option, index) => (
            <div 
              key={index}
              className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 hover:border-purple-500/30 transition-all duration-300 group"
            >
              <span className="text-2xl mb-3 block">{option.icon}</span>
              <h3 className="text-white font-semibold mb-1 group-hover:text-purple-400 transition-colors">
                {option.name}
              </h3>
              <p className="text-gray-500 text-sm">{option.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================
// SECTION 7: MÉTHODOLOGIE
// ============================================
function MethodologySection() {
  const { t } = useLanguage();
  const ts = t.services.methodology;

  return (
    <section className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-linear-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
            {ts.title}
          </h2>
          <div className="w-20 h-1 bg-linear-to-r from-cyan-500 to-emerald-500 mx-auto mb-6 rounded-full" />
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            {ts.subtitle}
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ts.steps.map((step, index) => (
            <div 
              key={index}
              className="relative bg-gray-900/30 border border-gray-800 rounded-2xl p-6 hover:border-cyan-500/30 transition-all duration-300"
            >
              <span className="text-5xl font-bold text-cyan-500/20 absolute top-4 right-4">
                {step.number}
              </span>
              <div className="relative z-10">
                <h3 className="text-xl font-semibold text-white mb-3">{step.title}</h3>
                <p className="text-gray-400 leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================
// SECTION 8: RASSURANCE
// ============================================
function ReassuranceSection() {
  const { t } = useLanguage();
  const ts = t.services.reassurance;

  return (
    <section className="py-20 px-4 bg-black/40">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
            {ts.title}
          </h2>
          <div className="w-20 h-1 bg-linear-to-r from-emerald-500 to-cyan-500 mx-auto mb-6 rounded-full" />
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          {ts.points.map((point, index) => (
            <div 
              key={index}
              className="flex gap-5 p-6 bg-gray-900/30 border border-gray-800 rounded-2xl hover:border-emerald-500/30 transition-all duration-300"
            >
              <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center shrink-0">
                <span className="text-2xl">{point.icon}</span>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">{point.title}</h3>
                <p className="text-gray-400 leading-relaxed">{point.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================
// SECTION 9: CTA FINAL
// ============================================
function FinalCTA() {
  const { t } = useLanguage();
  const ts = t.services.cta_final;

  return (
    <section id="contact-audit" className="py-24 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="relative bg-linear-to-br from-emerald-500/10 via-indigo-500/10 to-purple-500/10 border border-gray-800 rounded-3xl p-8 md:p-12 text-center overflow-hidden">
          {/* Background decorations */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />
          
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 bg-linear-to-r from-emerald-400 via-cyan-400 to-indigo-400 bg-clip-text text-transparent">
              {ts.title}
            </h2>
            
            <p
              className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed"
              dangerouslySetInnerHTML={{ __html: ts.description }}
            />
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <a
                href="/#contact"
                className="px-8 py-4 bg-linear-to-r from-emerald-600 to-indigo-600 rounded-full text-white font-semibold text-lg hover:from-emerald-700 hover:to-indigo-700 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-emerald-500/25"
              >
                {ts.cta}
              </a>
              <a
                href="mailto:business@contact-selenium-studio.com"
                className="px-8 py-4 border border-gray-600 rounded-full text-white font-medium hover:bg-white/10 transition-all duration-300"
              >
                {ts.email}
              </a>
            </div>
            
            <p className="text-gray-500 text-sm">
              {ts.note}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================
// PAGE PRINCIPALE
// ============================================
export default function ServicesPage() {
  return (
    <>
      <Navbar />
      <main>
        <ServicesHero />
        <ProblemSection />
        <SolutionSection />
        <OffersSection />
        <MaintenanceSection />
        <UpsellSection />
        <MethodologySection />
        <ReassuranceSection />
        <PartnersBanner />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
