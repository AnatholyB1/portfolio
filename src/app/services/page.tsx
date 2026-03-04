'use client';

import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

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
  return (
    <section className="relative min-h-[80vh] flex items-center justify-center pt-24 pb-16 px-4 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-linear-to-br from-indigo-900/20 via-transparent to-emerald-900/20" />
      
      <div className="relative z-10 text-center max-w-4xl mx-auto">
        <span className="inline-block px-4 py-2 bg-indigo-500/20 border border-indigo-500/30 rounded-full text-indigo-400 text-sm font-medium mb-6">
          Création de sites web pour PME
        </span>
        
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 bg-linear-to-r from-white via-indigo-200 to-emerald-200 bg-clip-text text-transparent leading-tight">
          Donnez à votre entreprise l&apos;image qu&apos;elle mérite
        </h1>
        
        <p className="text-xl md:text-2xl text-gray-300 mb-4 max-w-3xl mx-auto leading-relaxed">
          Sites web modernes, performants et maintenus dans le temps pour les PME locales qui veulent 
          <strong className="text-white"> gagner en crédibilité</strong> et 
          <strong className="text-emerald-400"> générer plus de contacts</strong>.
        </p>
        
        <p className="text-lg text-gray-400 mb-10 max-w-2xl mx-auto">
          Une solution clé en main, sans jargon technique. Vous vous concentrez sur votre métier, 
          nous nous occupons de votre présence digitale.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="/#contact"
            className="px-8 py-4 bg-linear-to-r from-emerald-600 to-indigo-600 rounded-full text-white font-semibold text-lg hover:from-emerald-700 hover:to-indigo-700 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-emerald-500/25"
          >
            Demander un audit gratuit
          </a>
          <a
            href="#offres"
            className="px-8 py-4 border border-gray-600 rounded-full text-white font-medium hover:bg-white/10 transition-all duration-300 flex items-center justify-center gap-2"
          >
            Découvrir nos offres
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
  const problems = [
    {
      icon: "🚫",
      title: "Pas de site internet",
      description: "Vos clients potentiels ne vous trouvent pas en ligne. Ils se tournent vers vos concurrents qui, eux, sont visibles."
    },
    {
      icon: "📱",
      title: "Site obsolète ou non adapté mobile",
      description: "Un site vieillissant ou difficile à lire sur smartphone renvoie une image peu professionnelle de votre entreprise."
    },
    {
      icon: "📉",
      title: "Zéro contact via internet",
      description: "Votre site existe mais ne génère aucune demande. Il ne travaille pas pour vous, il dort."
    },
    {
      icon: "❌",
      title: "Perte de crédibilité",
      description: "En 2026, une entreprise sans présence digitale moderne perd la confiance de ses prospects avant même le premier contact."
    }
  ];

  return (
    <section className="py-20 px-4 bg-black/40">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
            Votre entreprise mérite mieux
          </h2>
          <div className="w-20 h-1 bg-linear-to-r from-red-500 to-orange-500 mx-auto mb-6 rounded-full" />
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Chaque jour sans présence digitale efficace, c&apos;est des opportunités qui s&apos;évaporent
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          {problems.map((problem, index) => (
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
            <strong className="text-emerald-400">La bonne nouvelle ?</strong> Ces problèmes ont une solution simple et accessible.
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
  const benefits = [
    "Sites modernes et professionnels",
    "Optimisés pour générer des contacts",
    "Rapides et performants",
    "Adaptés à tous les écrans",
    "Référencement local inclus",
    "Accompagnement personnalisé"
  ];

  return (
    <section className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-block px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full text-emerald-400 text-sm font-medium mb-4">
              Notre approche
            </span>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 bg-linear-to-r from-emerald-400 to-indigo-400 bg-clip-text text-transparent">
              Spécialiste de la présence digitale pour PME locales
            </h2>
            <p className="text-lg text-gray-300 mb-6 leading-relaxed">
              Nous créons des sites web sur mesure qui transforment vos visiteurs en clients. 
              Pas de solutions génériques : chaque projet est pensé pour 
              <strong className="text-white"> votre activité</strong> et 
              <strong className="text-white"> votre marché local</strong>.
            </p>
            <p className="text-lg text-gray-300 mb-8 leading-relaxed">
              Notre mission : vous offrir une <strong className="text-emerald-400">vitrine digitale professionnelle</strong> qui 
              travaille pour vous 24h/24, génère des contacts qualifiés et renforce votre crédibilité.
            </p>
            
            <div className="grid sm:grid-cols-2 gap-3">
              {benefits.map((benefit, index) => (
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
                    <h3 className="text-white font-semibold">Orienté résultats</h3>
                    <p className="text-gray-400 text-sm">Chaque élément est pensé pour convertir</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-indigo-500/20 rounded-2xl flex items-center justify-center">
                    <span className="text-2xl">🤝</span>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">Partenaire long terme</h3>
                    <p className="text-gray-400 text-sm">Un accompagnement qui ne s&apos;arrête pas à la mise en ligne</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-purple-500/20 rounded-2xl flex items-center justify-center">
                    <span className="text-2xl">💎</span>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">Qualité premium</h3>
                    <p className="text-gray-400 text-sm">Technologies modernes, design soigné</p>
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
  const offers = [
    {
      name: "Landing Page Professionnelle",
      tagline: "L'essentiel pour être visible",
      price: "1 200 – 1 800 €",
      description: "Une présence en ligne claire et professionnelle pour démarrer",
      features: [
        "Design moderne et personnalisé",
        "Adapté mobile et tablette",
        "Présentation claire de vos services",
        "Formulaire de contact",
        "Intégration Google Maps",
        "SEO local de base",
        "Mise en ligne incluse"
      ],
      popular: false,
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      name: "Rebranding + Site Premium",
      tagline: "Transformez votre image",
      price: "2 500 – 4 000 €",
      description: "Modernisez complètement votre image et renforcez votre crédibilité",
      features: [
        "Audit de votre image actuelle",
        "Modernisation de votre logo",
        "Nouvelle palette de couleurs",
        "Typographies professionnelles",
        "Mini charte graphique",
        "Nouveau site cohérent avec votre identité",
        "Formation utilisation basique"
      ],
      popular: true,
      gradient: "from-emerald-500 to-indigo-500"
    },
    {
      name: "Projet Sur Mesure",
      tagline: "Vos besoins spécifiques",
      price: "Sur devis",
      description: "Pour les projets qui nécessitent des fonctionnalités avancées",
      features: [
        "Site multi-pages complet",
        "Boutique en ligne (e-commerce)",
        "Système de réservation",
        "Fonctionnalités spécifiques",
        "Refonte complète de site",
        "Intégrations personnalisées",
        "Accompagnement dédié"
      ],
      popular: false,
      gradient: "from-purple-500 to-pink-500"
    }
  ];

  return (
    <section id="offres" className="py-20 px-4 bg-black/40">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-linear-to-r from-emerald-400 to-indigo-400 bg-clip-text text-transparent">
            Nos offres
          </h2>
          <div className="w-20 h-1 bg-linear-to-r from-emerald-500 to-indigo-500 mx-auto mb-6 rounded-full" />
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Des solutions adaptées à chaque étape de votre croissance
          </p>
        </div>
        
        <div className="grid lg:grid-cols-3 gap-8">
          {offers.map((offer, index) => (
            <div 
              key={index}
              className={`relative bg-gray-900/50 border rounded-3xl p-8 transition-all duration-300 hover:transform hover:scale-[1.02] ${
                offer.popular 
                  ? 'border-emerald-500/50 shadow-lg shadow-emerald-500/10' 
                  : 'border-gray-800 hover:border-gray-700'
              }`}
            >
              {offer.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1 bg-emerald-500 text-white text-sm font-medium rounded-full">
                    Le plus populaire
                  </span>
                </div>
              )}
              
              <div className="mb-6">
                <h3 className={`text-2xl font-bold mb-2 bg-linear-to-r ${offer.gradient} bg-clip-text text-transparent`}>
                  {offer.name}
                </h3>
                <p className="text-gray-400 text-sm mb-4">{offer.tagline}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-sm text-gray-500">À partir de</span>
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
                  offer.popular
                    ? 'bg-linear-to-r from-emerald-600 to-indigo-600 text-white hover:from-emerald-700 hover:to-indigo-700'
                    : 'bg-gray-800 text-white hover:bg-gray-700'
                }`}
              >
                Demander un devis
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================
// SECTION 5: MAINTENANCE & HÉBERGEMENT
// ============================================
function MaintenanceSection() {
  const packs = [
    {
      name: "Essentiel",
      price: "49",
      description: "L'indispensable pour un site sécurisé et fonctionnel",
      features: [
        "Hébergement haute performance",
        "Nom de domaine inclus",
        "Certificat SSL (https)",
        "Sauvegardes automatiques",
        "Monitoring 24/7",
        "Mises à jour techniques",
        "Support par email"
      ],
      gradient: "from-gray-400 to-gray-600"
    },
    {
      name: "Business",
      price: "79",
      description: "Pour les entreprises qui évoluent",
      features: [
        "Tout du pack Essentiel",
        "1h de modification par mois",
        "Optimisation des performances",
        "Rapport mensuel simplifié",
        "Temps de réponse prioritaire"
      ],
      popular: true,
      gradient: "from-emerald-400 to-cyan-400"
    },
    {
      name: "Premium",
      price: "129",
      priceNote: "+",
      description: "Tranquillité totale et croissance continue",
      features: [
        "Tout du pack Business",
        "2h de modifications par mois",
        "Sécurité renforcée",
        "Optimisation SEO continue",
        "Assistance prioritaire",
        "Conseils stratégiques mensuels"
      ],
      gradient: "from-purple-400 to-pink-400"
    }
  ];

  return (
    <section className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-2 bg-indigo-500/20 border border-indigo-500/30 rounded-full text-indigo-400 text-sm font-medium mb-4">
            Tranquillité d&apos;esprit digitale
          </span>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
            Maintenance & Hébergement
          </h2>
          <div className="w-20 h-1 bg-linear-to-r from-indigo-500 to-purple-500 mx-auto mb-6 rounded-full" />
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Votre site reste performant, sécurisé et à jour. Vous n&apos;avez rien à gérer.
          </p>
        </div>
        
        <div className="grid lg:grid-cols-3 gap-8 mb-12">
          {packs.map((pack, index) => (
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
                    Recommandé
                  </span>
                </div>
              )}
              
              <div className="mb-6">
                <h3 className={`text-xl font-bold mb-2 bg-linear-to-r ${pack.gradient} bg-clip-text text-transparent`}>
                  Pack {pack.name}
                </h3>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-4xl font-bold text-white">{pack.price}€</span>
                  <span className="text-gray-400">/mois</span>
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
        
        {/* Avantages supplémentaires */}
        <div className="bg-linear-to-r from-emerald-500/10 to-indigo-500/10 border border-gray-800 rounded-2xl p-6">
          <div className="flex flex-wrap justify-center gap-6 text-center">
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 font-semibold">-10%</span>
              <span className="text-gray-300">si paiement annuel</span>
            </div>
            <div className="w-px h-6 bg-gray-700 hidden sm:block" />
            <div className="flex items-center gap-2">
              <CheckIcon />
              <span className="text-gray-300">Sans engagement</span>
            </div>
            <div className="w-px h-6 bg-gray-700 hidden sm:block" />
            <div className="flex items-center gap-2">
              <CheckIcon />
              <span className="text-gray-300">Évolutif selon vos besoins</span>
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
  const options = [
    { name: "Création de contenu", description: "Rédaction professionnelle de vos textes", icon: "✍️" },
    { name: "SEO avancé", description: "Optimisation poussée pour Google", icon: "📈" },
    { name: "Campagnes Google Ads", description: "Publicité ciblée pour plus de visibilité", icon: "🎯" },
    { name: "Intégration CRM", description: "Connectez votre site à vos outils", icon: "🔗" },
    { name: "Blog intégré", description: "Partagez votre expertise", icon: "📝" },
    { name: "Site multilingue", description: "Touchez une audience internationale", icon: "🌍" },
    { name: "Heures supplémentaires", description: "Modifications additionnelles à la demande", icon: "⏱️" },
    { name: "Formation personnalisée", description: "Apprenez à gérer votre site", icon: "🎓" }
  ];

  return (
    <section className="py-20 px-4 bg-black/40">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
            Options disponibles
          </h2>
          <div className="w-20 h-1 bg-linear-to-r from-purple-500 to-pink-500 mx-auto mb-6 rounded-full" />
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Personnalisez votre projet selon vos besoins spécifiques
          </p>
        </div>
        
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {options.map((option, index) => (
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
  const steps = [
    {
      number: "01",
      title: "Audit gratuit",
      description: "Nous analysons votre situation actuelle et vos objectifs lors d'un appel de 30 minutes."
    },
    {
      number: "02",
      title: "Proposition claire",
      description: "Vous recevez un devis détaillé, sans surprise, avec un planning précis."
    },
    {
      number: "03",
      title: "Maquette",
      description: "Nous créons une maquette visuelle de votre site pour validation avant développement."
    },
    {
      number: "04",
      title: "Développement",
      description: "Nous construisons votre site avec les dernières technologies pour performance et sécurité."
    },
    {
      number: "05",
      title: "Mise en ligne",
      description: "Votre site est publié et configuré sur votre nom de domaine."
    },
    {
      number: "06",
      title: "Suivi 30 jours",
      description: "Nous restons disponibles pour ajustements et vous accompagnons dans la prise en main."
    }
  ];

  return (
    <section className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-linear-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
            Comment ça se passe ?
          </h2>
          <div className="w-20 h-1 bg-linear-to-r from-cyan-500 to-emerald-500 mx-auto mb-6 rounded-full" />
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Un processus simple et transparent, de la première discussion à la mise en ligne
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {steps.map((step, index) => (
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
  const points = [
    {
      icon: "👤",
      title: "Interlocuteur unique",
      description: "Un seul contact du début à la fin. Pas de transfert entre services, pas de répétition de vos besoins."
    },
    {
      icon: "🔑",
      title: "Solution clé en main",
      description: "Nous gérons tout : design, développement, hébergement, mise en ligne. Vous n'avez rien à faire."
    },
    {
      icon: "🤝",
      title: "Accompagnement personnalisé",
      description: "Chaque projet est unique. Nous prenons le temps de comprendre votre activité et vos objectifs."
    },
    {
      icon: "🚀",
      title: "Vision long terme",
      description: "Nous ne sommes pas juste un prestataire, mais un partenaire qui accompagne votre croissance digitale."
    }
  ];

  return (
    <section className="py-20 px-4 bg-black/40">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
            Pourquoi nous faire confiance ?
          </h2>
          <div className="w-20 h-1 bg-linear-to-r from-emerald-500 to-cyan-500 mx-auto mb-6 rounded-full" />
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          {points.map((point, index) => (
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
  return (
    <section id="contact-audit" className="py-24 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="relative bg-linear-to-br from-emerald-500/10 via-indigo-500/10 to-purple-500/10 border border-gray-800 rounded-3xl p-8 md:p-12 text-center overflow-hidden">
          {/* Background decorations */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />
          
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 bg-linear-to-r from-emerald-400 via-cyan-400 to-indigo-400 bg-clip-text text-transparent">
              Prêt à transformer votre présence digitale ?
            </h2>
            
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed">
              Réservez un <strong className="text-white">audit gratuit de 30 minutes</strong>. 
              Nous analyserons ensemble votre situation et définirons la meilleure stratégie pour votre entreprise.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <a
                href="/#contact"
                className="px-8 py-4 bg-linear-to-r from-emerald-600 to-indigo-600 rounded-full text-white font-semibold text-lg hover:from-emerald-700 hover:to-indigo-700 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-emerald-500/25"
              >
                Réserver mon audit gratuit
              </a>
              <a
                href="mailto:business@contact-selenium-studio.com"
                className="px-8 py-4 border border-gray-600 rounded-full text-white font-medium hover:bg-white/10 transition-all duration-300"
              >
                Envoyer un email
              </a>
            </div>
            
            <p className="text-gray-500 text-sm">
              Sans engagement • 100% gratuit • Réponse sous 24h
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
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
