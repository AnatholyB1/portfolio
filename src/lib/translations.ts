export type Lang = 'fr' | 'en' | 'th';

export interface Translations {
  nav: {
    home: string;
    about: string;
    services: string;
    projects: string;
    contact: string;
  };
  hero: {
    title: string;
    subtitle: string;
    description: string;
    cta_services: string;
    cta_projects: string;
    cta_hire: string;
  };
  about: {
    title: string;
    p1_strong: string;
    p1: string;
    p2_strong: string;
    p2: string;
    p3_strong: string;
    p3: string;
    p4: string;
    p4_strong: string;
    p5_available: string;
    p5_remote: string;
    p5_based: string;
    skills_title: string;
  };
  projects: {
    title: string;
    mono_subtitle: string;
    description: string;
    // per-project
    selenium_subtitle: string;
    selenium_desc: string;
    gecko_subtitle: string;
    gecko_desc: string;
    victor_subtitle: string;
    victor_desc: string;
    ghjulianu_subtitle: string;
    ghjulianu_desc: string;
    folies_subtitle: string;
    folies_desc: string;
    // card UI
    click_to_explore: string;
    flip_back_hint: string;
    hud_flip: string;
    hud_interact: string;
    about_label: string;
    tech_label: string;
    visit: string;
    loading: string;
    preview_blocked: string;
    preview_blocked_desc: string;
    open: string;
  };
  contact: {
    title: string;
    description: string;
    email_label: string;
    location_label: string;
    location_value: string;
    name_placeholder: string;
    email_placeholder: string;
    message_placeholder: string;
    submit: string;
    submitting: string;
    success: string;
    error: string;
  };
  footer: {
    rights: string;
    built_with: string;
  };
  services: {
    hero: {
      badge: string;
      title: string;
      subtitle: string;
      description: string;
      cta_audit: string;
      cta_offers: string;
    };
    problem: {
      title: string;
      subtitle: string;
      good_news: string;
      items: { icon: string; title: string; description: string }[];
    };
    solution: {
      badge: string;
      title: string;
      p1: string;
      p2: string;
      benefits: string[];
      card1_title: string;
      card1_desc: string;
      card2_title: string;
      card2_desc: string;
      card3_title: string;
      card3_desc: string;
    };
    offers: {
      title: string;
      subtitle: string;
      from: string;
      popular: string;
      cta: string;
      items: {
        name: string;
        tagline: string;
        price: string;
        description: string;
        features: string[];
      }[];
    };
    maintenance: {
      badge: string;
      title: string;
      subtitle: string;
      recommended: string;
      per_month: string;
      annual_discount: string;
      no_commitment: string;
      scalable: string;
      currency_symbol: string;
      packs: {
        name: string;
        price: string;
        description: string;
        features: string[];
        popular?: boolean;
        priceNote?: string;
      }[];
    };
    upsell: {
      title: string;
      subtitle: string;
      options: { name: string; description: string; icon: string }[];
    };
    methodology: {
      title: string;
      subtitle: string;
      steps: { number: string; title: string; description: string }[];
    };
    reassurance: {
      title: string;
      points: { icon: string; title: string; description: string }[];
    };
    cta_final: {
      title: string;
      description: string;
      cta: string;
      email: string;
      note: string;
    };
    partners: {
      title: string;
      selenium_role: string;
      gecko_role: string;
      victor_role: string;
      ghjulianu_role: string;
      folies_role: string;
      ajmg_role: string;
    };
  };
}

const fr: Translations = {
  nav: {
    home: 'Accueil',
    about: 'À propos',
    services: 'Services',
    projects: 'Projets',
    contact: 'Contact',
  },
  hero: {
    title: 'Développeur Full Stack & Ingénieur IA',
    subtitle:
      "Je construis des <strong>applications web scalables</strong>, des <strong>systèmes propulsés par l'IA</strong> et des <strong>APIs sur mesure</strong> qui accélèrent la croissance",
    description:
      "De l'automatisation intelligente aux plateformes prêtes pour la production — je transforme des idées complexes en solutions digitales puissantes. <span class=\"text-indigo-400\">Disponible pour des projets freelance.</span>",
    cta_services: 'Mes Services',
    cta_projects: 'Voir mes Projets',
    cta_hire: 'Me contacter',
  },
  about: {
    title: 'Pourquoi travailler avec moi',
    p1_strong: 'Je délivre des résultats.',
    p1: 'En tant que développeur full stack orienté backend, je me spécialise dans la construction de <strong class="text-indigo-400">systèmes scalables</strong> et de <strong class="text-indigo-400">solutions digitales intelligentes</strong> qui aident les entreprises à automatiser leurs processus, augmenter leur efficacité et développer leurs revenus.',
    p2_strong: 'Mon expertise :',
    p2: "Développement d'API personnalisées, architecture microservices, automatisation propulsée par l'IA et infrastructure cloud. Je transforme des besoins complexes en <strong class=\"text-cyan-400\">solutions prêtes pour la production</strong> — dans les délais et construites pour durer.",
    p3_strong: 'Au-delà du code :',
    p3: "Je crée des expériences web 3D immersives avec Three.js et WebGL, ajoutant une couche d'innovation qui différencie votre produit de la concurrence.",
    p4: 'Co-fondateur de',
    p4_strong: 'Votre projet pourrait être le prochain.',
    p5_available: '✓ Disponible pour des projets freelance',
    p5_remote: '✓ Collaboration à distance',
    p5_based: '✓ Basé à Tours, France',
    skills_title: 'Mes Compétences',
  },
  projects: {
    title: 'Projets Phares & Études de Cas',
    mono_subtitle: '// SOLUTIONS RÉELLES LIVRÉES AUX CLIENTS',
    description:
      "Des applications propulsées par l'IA aux systèmes CRM d'entreprise — découvrez comment j'ai aidé des entreprises à atteindre leurs objectifs",
    selenium_subtitle: 'Agence Digitale',
    selenium_desc: 'Agence digitale co-fondée livrant des plateformes web sur mesure, des animations 3D et des stratégies digitales orientées croissance pour les PME mondiales.',
    gecko_subtitle: 'Site Restaurant',
    gecko_desc: 'Site complet pour un restaurant avec menus, photos d\'ambiance, intégration Google Maps, informations de réservation et SEO local pour augmenter la fréquentation.',
    victor_subtitle: 'Portfolio Créatif',
    victor_desc: 'Portfolio soigné pour un professionnel créatif avec animations fluides, système de design raffiné et mise en valeur convaincante des compétences et réalisations.',
    ghjulianu_subtitle: 'Site Artiste',
    ghjulianu_desc: 'Site vitrine élégant pour l\'artiste corse Ghjulianu Codani, mettant en avant son univers musical et artistique avec un design immersif et une expérience utilisateur moderne.',
    folies_subtitle: 'Site Compagnie de Danse',
    folies_desc: 'Site complet pour la compagnie de danse Les Folies Temps Danse, présentant le répertoire, les actualités, les cours et les événements dans un design dynamique et animé.',
    click_to_explore: 'CLIQUER POUR EXPLORER →',
    flip_back_hint: '← CLIQUER POUR RETOURNER',
    hud_flip: 'CLIQUER POUR RETOURNER',
    hud_interact: 'INTERAGIR AVEC L\'APERÇU',
    about_label: '// À PROPOS',
    tech_label: '// STACK TECH',
    visit: 'VISITER',
    loading: 'CHARGEMENT…',
    preview_blocked: 'APERÇU BLOQUÉ',
    preview_blocked_desc: 'Ce site restreint l\'intégration externe.',
    open: 'Ouvrir',
  },
  contact: {
    title: 'Construisons quelque chose de grand',
    description:
      "Prêt à donner vie à votre projet ? Que vous ayez besoin d'une <strong class=\"text-white\">application web sur mesure</strong>, d'une <strong class=\"text-white\">intégration IA</strong> ou d'un <strong class=\"text-white\">système backend scalable</strong> — je suis là pour vous aider.",
    email_label: 'Email',
    location_label: 'Localisation',
    location_value: 'Tours, France',
    name_placeholder: 'Votre nom',
    email_placeholder: 'Votre email',
    message_placeholder: 'Votre message',
    submit: 'Envoyer le message',
    submitting: 'Envoi en cours...',
    success: 'Message envoyé avec succès !',
    error: "Échec de l'envoi. Veuillez réessayer.",
  },
  footer: {
    rights: 'Tous droits réservés.',
    built_with: 'Construit avec Next.js, Three.js & Tailwind CSS',
  },
  services: {
    hero: {
      badge: 'Création de sites web pour PME',
      title: "Donnez à votre entreprise l'image qu'elle mérite",
      subtitle:
        'Sites web modernes, performants et maintenus dans le temps pour les PME locales qui veulent <strong class="text-white">gagner en crédibilité</strong> et <strong class="text-emerald-400">générer plus de contacts</strong>.',
      description:
        "Une solution clé en main, sans jargon technique. Vous vous concentrez sur votre métier, nous nous occupons de votre présence digitale.",
      cta_audit: 'Demander un audit gratuit',
      cta_offers: 'Découvrir nos offres',
    },
    problem: {
      title: 'Votre entreprise mérite mieux',
      subtitle: "Chaque jour sans présence digitale efficace, c'est des opportunités qui s'évaporent",
      good_news: "La bonne nouvelle ? Ces problèmes ont une solution simple et accessible.",
      items: [
        {
          icon: '🚫',
          title: 'Pas de site internet',
          description:
            'Vos clients potentiels ne vous trouvent pas en ligne. Ils se tournent vers vos concurrents qui, eux, sont visibles.',
        },
        {
          icon: '📱',
          title: 'Site obsolète ou non adapté mobile',
          description:
            'Un site vieillissant ou difficile à lire sur smartphone renvoie une image peu professionnelle de votre entreprise.',
        },
        {
          icon: '📉',
          title: 'Zéro contact via internet',
          description:
            "Votre site existe mais ne génère aucune demande. Il ne travaille pas pour vous, il dort.",
        },
        {
          icon: '❌',
          title: 'Perte de crédibilité',
          description:
            "En 2026, une entreprise sans présence digitale moderne perd la confiance de ses prospects avant même le premier contact.",
        },
      ],
    },
    solution: {
      badge: 'Notre approche',
      title: 'Spécialiste de la présence digitale pour PME locales',
      p1: "Nous créons des sites web sur mesure qui transforment vos visiteurs en clients. Pas de solutions génériques : chaque projet est pensé pour <strong class=\"text-white\">votre activité</strong> et <strong class=\"text-white\">votre marché local</strong>.",
      p2: "Notre mission : vous offrir une <strong class=\"text-emerald-400\">vitrine digitale professionnelle</strong> qui travaille pour vous 24h/24, génère des contacts qualifiés et renforce votre crédibilité.",
      benefits: [
        'Sites modernes et professionnels',
        'Optimisés pour générer des contacts',
        'Rapides et performants',
        'Adaptés à tous les écrans',
        'Référencement local inclus',
        'Accompagnement personnalisé',
      ],
      card1_title: 'Orienté résultats',
      card1_desc: 'Chaque élément est pensé pour convertir',
      card2_title: 'Partenaire long terme',
      card2_desc: "Un accompagnement qui ne s'arrête pas à la mise en ligne",
      card3_title: 'Qualité premium',
      card3_desc: 'Technologies modernes, design soigné',
    },
    offers: {
      title: 'Nos offres',
      subtitle: 'Des solutions adaptées à chaque étape de votre croissance',
      from: 'À partir de',
      popular: 'Le plus populaire',
      cta: 'Demander un devis',
      items: [
        {
          name: 'Landing Page Professionnelle',
          tagline: "L'essentiel pour être visible",
          price: '1 200 – 1 800 €',
          description: 'Une présence en ligne claire et professionnelle pour démarrer',
          features: [
            'Design moderne et personnalisé',
            'Adapté mobile et tablette',
            'Présentation claire de vos services',
            'Formulaire de contact',
            'Intégration Google Maps',
            'SEO local de base',
            'Mise en ligne incluse',
          ],
        },
        {
          name: 'Rebranding + Site Premium',
          tagline: 'Transformez votre image',
          price: '2 500 – 4 000 €',
          description: 'Modernisez complètement votre image et renforcez votre crédibilité',
          features: [
            'Audit de votre image actuelle',
            'Modernisation de votre logo',
            'Nouvelle palette de couleurs',
            'Typographies professionnelles',
            'Mini charte graphique',
            'Nouveau site cohérent avec votre identité',
            'Formation utilisation basique',
          ],
        },
        {
          name: 'Projet Sur Mesure',
          tagline: 'Vos besoins spécifiques',
          price: 'Sur devis',
          description: "Pour les projets qui nécessitent des fonctionnalités avancées",
          features: [
            'Site multi-pages complet',
            'Boutique en ligne (e-commerce)',
            'Système de réservation',
            'Fonctionnalités spécifiques',
            'Refonte complète de site',
            'Intégrations personnalisées',
            'Accompagnement dédié',
          ],
        },
      ],
    },
    maintenance: {
      badge: "Tranquillité d'esprit digitale",
      title: 'Maintenance & Hébergement',
      subtitle: "Votre site reste performant, sécurisé et à jour. Vous n'avez rien à gérer.",
      recommended: 'Recommandé',
      per_month: '/mois',
      annual_discount: '-10% si paiement annuel',
      no_commitment: 'Sans engagement',
      scalable: 'Évolutif selon vos besoins',
      currency_symbol: '€',
      packs: [
        {
          name: 'Essentiel',
          price: '49',
          description: "L'indispensable pour un site sécurisé et fonctionnel",
          features: [
            'Hébergement haute performance',
            'Nom de domaine inclus',
            'Certificat SSL (https)',
            'Sauvegardes automatiques',
            'Monitoring 24/7',
            'Mises à jour techniques',
            'Support par email',
          ],
        },
        {
          name: 'Business',
          price: '79',
          description: 'Pour les entreprises qui évoluent',
          popular: true,
          features: [
            'Tout du pack Essentiel',
            '1h de modification par mois',
            'Optimisation des performances',
            'Rapport mensuel simplifié',
            'Temps de réponse prioritaire',
          ],
        },
        {
          name: 'Premium',
          price: '129',
          priceNote: '+',
          description: 'Tranquillité totale et croissance continue',
          features: [
            'Tout du pack Business',
            '2h de modifications par mois',
            'Sécurité renforcée',
            'Optimisation SEO continue',
            'Assistance prioritaire',
            'Conseils stratégiques mensuels',
          ],
        },
      ],
    },
    upsell: {
      title: 'Options disponibles',
      subtitle: 'Personnalisez votre projet selon vos besoins spécifiques',
      options: [
        { name: 'Création de contenu', description: 'Rédaction professionnelle de vos textes', icon: '✍️' },
        { name: 'SEO avancé', description: 'Optimisation poussée pour Google', icon: '📈' },
        { name: 'Campagnes Google Ads', description: 'Publicité ciblée pour plus de visibilité', icon: '🎯' },
        { name: 'Intégration CRM', description: 'Connectez votre site à vos outils', icon: '🔗' },
        { name: 'Blog intégré', description: 'Partagez votre expertise', icon: '📝' },
        { name: 'Site multilingue', description: 'Touchez une audience internationale', icon: '🌍' },
        { name: 'Heures supplémentaires', description: 'Modifications additionnelles à la demande', icon: '⏱️' },
        { name: 'Formation personnalisée', description: 'Apprenez à gérer votre site', icon: '🎓' },
      ],
    },
    methodology: {
      title: 'Comment ça se passe ?',
      subtitle: 'Un processus simple et transparent, de la première discussion à la mise en ligne',
      steps: [
        { number: '01', title: 'Audit gratuit', description: "Nous analysons votre situation actuelle et vos objectifs lors d'un appel de 30 minutes." },
        { number: '02', title: 'Proposition claire', description: 'Vous recevez un devis détaillé, sans surprise, avec un planning précis.' },
        { number: '03', title: 'Maquette', description: 'Nous créons une maquette visuelle de votre site pour validation avant développement.' },
        { number: '04', title: 'Développement', description: 'Nous construisons votre site avec les dernières technologies pour performance et sécurité.' },
        { number: '05', title: 'Mise en ligne', description: 'Votre site est publié et configuré sur votre nom de domaine.' },
        { number: '06', title: 'Suivi 30 jours', description: 'Nous restons disponibles pour ajustements et vous accompagnons dans la prise en main.' },
      ],
    },
    reassurance: {
      title: 'Pourquoi nous faire confiance ?',
      points: [
        { icon: '👤', title: 'Interlocuteur unique', description: 'Un seul contact du début à la fin. Pas de transfert entre services, pas de répétition de vos besoins.' },
        { icon: '🔑', title: 'Solution clé en main', description: 'Nous gérons tout : design, développement, hébergement, mise en ligne. Vous n\'avez rien à faire.' },
        { icon: '🤝', title: 'Accompagnement personnalisé', description: 'Chaque projet est unique. Nous prenons le temps de comprendre votre activité et vos objectifs.' },
        { icon: '🚀', title: 'Vision long terme', description: "Nous ne sommes pas juste un prestataire, mais un partenaire qui accompagne votre croissance digitale." },
      ],
    },
    cta_final: {
      title: 'Prêt à transformer votre présence digitale ?',
      description: "Réservez un <strong class=\"text-white\">audit gratuit de 30 minutes</strong>. Nous analyserons ensemble votre situation et définirons la meilleure stratégie pour votre entreprise.",
      cta: 'Réserver mon audit gratuit',
      email: 'Envoyer un email',
      note: 'Sans engagement • 100% gratuit • Réponse sous 24h',
    },
    partners: {
      title: 'Ils nous font confiance',
      selenium_role: 'Agence Digitale',
      gecko_role: 'Restaurant',
      victor_role: 'Portfolio Créatif',
      ghjulianu_role: 'Artiste Corse',
      folies_role: 'Troupe de Danse',
      ajmg_role: 'Service de Conseil',
    },
  },
};

const en: Translations = {
  nav: {
    home: 'Home',
    about: 'About',
    services: 'Services',
    projects: 'Projects',
    contact: 'Contact',
  },
  hero: {
    title: 'Full Stack Developer & AI Engineer',
    subtitle:
      'I build <strong>scalable web applications</strong>, <strong>AI-powered systems</strong>, and <strong>custom APIs</strong> that drive business growth',
    description:
      'From intelligent automation to production-ready platforms — I turn complex ideas into powerful digital solutions. <span class="text-indigo-400">Available for freelance projects.</span>',
    cta_services: 'My Services',
    cta_projects: 'View My Projects',
    cta_hire: 'Hire Me',
  },
  about: {
    title: 'Why Work With Me',
    p1_strong: 'I deliver results.',
    p1: 'As a backend-oriented full stack developer, I specialize in building <strong class="text-indigo-400">scalable systems</strong> and <strong class="text-indigo-400">intelligent digital solutions</strong> that help businesses automate processes, increase efficiency, and grow revenue.',
    p2_strong: 'My expertise:',
    p2: 'Custom API development, microservices architecture, AI-powered automation, and cloud infrastructure. I transform complex requirements into <strong class="text-cyan-400">production-ready solutions</strong> — on time and built to scale.',
    p3_strong: 'Beyond code:',
    p3: 'I create immersive 3D web experiences using Three.js and WebGL, adding a layer of innovation that sets your product apart from competitors.',
    p4: 'As co-founder of',
    p4_strong: 'Your project could be next.',
    p5_available: '✓ Available for freelance projects',
    p5_remote: '✓ Remote collaboration',
    p5_based: '✓ Based in Tours, France',
    skills_title: 'My Skills',
  },
  projects: {
    title: 'Featured Projects & Case Studies',
    mono_subtitle: '// REAL SOLUTIONS DELIVERED TO CLIENTS',
    description:
      "From AI-powered applications to enterprise CRM systems — explore how I've helped businesses achieve their goals",
    selenium_subtitle: 'Digital Agency',
    selenium_desc: 'Co-founded digital agency delivering custom web platforms, 3D animations and growth-driven digital strategies for SMEs worldwide.',
    gecko_subtitle: 'Restaurant Website',
    gecko_desc: 'Full restaurant website with menu showcase, atmosphere photos, Google Maps integration, reservation info, and local SEO boosting foot traffic.',
    victor_subtitle: 'Creative Portfolio',
    victor_desc: 'Polished portfolio for a creative professional featuring fluid animations, a refined design system and compelling showcase of skills and work.',
    ghjulianu_subtitle: 'Artist Website',
    ghjulianu_desc: 'Elegant showcase website for Corsican artist Ghjulianu Codani, highlighting his musical and artistic world with an immersive design and modern user experience.',
    folies_subtitle: 'Dance Company Website',
    folies_desc: 'Full website for dance company Les Folies Temps Danse, presenting repertoire, news, classes and events in a dynamic and animated design.',
    click_to_explore: 'CLICK TO EXPLORE →',
    flip_back_hint: '← CLICK ANYWHERE TO FLIP BACK',
    hud_flip: 'CLICK CARD TO FLIP',
    hud_interact: 'INTERACT WITH PREVIEW',
    about_label: '// ABOUT',
    tech_label: '// TECH STACK',
    visit: 'VISIT',
    loading: 'LOADING…',
    preview_blocked: 'PREVIEW BLOCKED',
    preview_blocked_desc: 'This site restricts external embedding.',
    open: 'Open',
  },
  contact: {
    title: "Let's Build Something Great",
    description:
      'Ready to bring your project to life? Whether you need a <strong class="text-white">custom web application</strong>, <strong class="text-white">AI integration</strong>, or <strong class="text-white">scalable backend system</strong> — I\'m here to help.',
    email_label: 'Email',
    location_label: 'Location',
    location_value: 'Tours, France',
    name_placeholder: 'Your Name',
    email_placeholder: 'Your Email',
    message_placeholder: 'Your Message',
    submit: 'Send Message',
    submitting: 'Sending...',
    success: 'Message sent successfully!',
    error: 'Failed to send message. Please try again.',
  },
  footer: {
    rights: 'All rights reserved.',
    built_with: 'Built with Next.js, Three.js & Tailwind CSS',
  },
  services: {
    hero: {
      badge: 'Web development for SMEs',
      title: 'Give your business the image it deserves',
      subtitle:
        'Modern, high-performance websites maintained over time for local SMEs that want to <strong class="text-white">build credibility</strong> and <strong class="text-emerald-400">generate more leads</strong>.',
      description:
        'A turnkey solution, free of technical jargon. You focus on your business, we handle your digital presence.',
      cta_audit: 'Request a free audit',
      cta_offers: 'Discover our offers',
    },
    problem: {
      title: 'Your business deserves better',
      subtitle: 'Every day without an effective digital presence, opportunities slip away',
      good_news: 'The good news? These problems have a simple and accessible solution.',
      items: [
        {
          icon: '🚫',
          title: 'No website',
          description:
            'Potential customers cannot find you online. They turn to your competitors who are visible.',
        },
        {
          icon: '📱',
          title: 'Outdated or non-mobile site',
          description:
            'An aging or hard-to-read website on a smartphone projects an unprofessional image of your business.',
        },
        {
          icon: '📉',
          title: 'Zero online inquiries',
          description:
            'Your site exists but generates no requests. It is not working for you — it is just sitting there.',
        },
        {
          icon: '❌',
          title: 'Loss of credibility',
          description:
            'In 2026, a company without a modern digital presence loses the trust of prospects before the first contact.',
        },
      ],
    },
    solution: {
      badge: 'Our approach',
      title: 'Specialist in digital presence for local SMEs',
      p1: 'We create tailor-made websites that convert visitors into customers. No generic solutions: each project is designed for <strong class="text-white">your business</strong> and <strong class="text-white">your local market</strong>.',
      p2: 'Our mission: to provide you with a <strong class="text-emerald-400">professional digital showcase</strong> that works for you 24/7, generates qualified leads, and strengthens your credibility.',
      benefits: [
        'Modern and professional sites',
        'Optimised to generate leads',
        'Fast and high-performing',
        'Responsive on all screens',
        'Local SEO included',
        'Personalised support',
      ],
      card1_title: 'Results-driven',
      card1_desc: 'Every element is designed to convert',
      card2_title: 'Long-term partner',
      card2_desc: 'Support that does not stop at launch',
      card3_title: 'Premium quality',
      card3_desc: 'Modern technologies, refined design',
    },
    offers: {
      title: 'Our offers',
      subtitle: 'Solutions adapted to every stage of your growth',
      from: 'Starting from',
      popular: 'Most popular',
      cta: 'Request a quote',
      items: [
        {
          name: 'Professional Landing Page',
          tagline: 'The essentials to be visible',
          price: '$1,300 – $2,000',
          description: 'A clear and professional online presence to get started',
          features: [
            'Modern and custom design',
            'Mobile and tablet friendly',
            'Clear presentation of your services',
            'Contact form',
            'Google Maps integration',
            'Basic local SEO',
            'Deployment included',
          ],
        },
        {
          name: 'Rebranding + Premium Site',
          tagline: 'Transform your image',
          price: '$2,750 – $4,400',
          description: 'Completely modernise your image and strengthen your credibility',
          features: [
            'Audit of your current image',
            'Logo modernisation',
            'New colour palette',
            'Professional typography',
            'Mini brand guidelines',
            'New site consistent with your identity',
            'Basic usage training',
          ],
        },
        {
          name: 'Custom Project',
          tagline: 'Your specific needs',
          price: 'On request',
          description: 'For projects that require advanced features',
          features: [
            'Full multi-page site',
            'Online shop (e-commerce)',
            'Booking system',
            'Specific features',
            'Full website redesign',
            'Custom integrations',
            'Dedicated support',
          ],
        },
      ],
    },
    maintenance: {
      badge: 'Digital peace of mind',
      title: 'Maintenance & Hosting',
      subtitle: 'Your site stays fast, secure, and up to date. You have nothing to manage.',
      recommended: 'Recommended',
      per_month: '/month',
      annual_discount: '-10% for annual payment',
      no_commitment: 'No commitment',
      scalable: 'Adaptable to your needs',
      currency_symbol: '$',
      packs: [
        {
          name: 'Essential',
          price: '55',
          description: 'The essentials for a secure and functional site',
          features: [
            'High-performance hosting',
            'Domain name included',
            'SSL certificate (https)',
            'Automatic backups',
            '24/7 monitoring',
            'Technical updates',
            'Email support',
          ],
        },
        {
          name: 'Business',
          price: '87',
          description: 'For businesses on the move',
          popular: true,
          features: [
            'Everything in Essential',
            '1h of changes per month',
            'Performance optimisation',
            'Monthly simplified report',
            'Priority response time',
          ],
        },
        {
          name: 'Premium',
          price: '140',
          priceNote: '+',
          description: 'Total peace of mind and continuous growth',
          features: [
            'Everything in Business',
            '2h of changes per month',
            'Enhanced security',
            'Ongoing SEO optimisation',
            'Priority support',
            'Monthly strategic advice',
          ],
        },
      ],
    },
    upsell: {
      title: 'Available options',
      subtitle: 'Customise your project to your specific needs',
      options: [
        { name: 'Content creation', description: 'Professional copywriting', icon: '✍️' },
        { name: 'Advanced SEO', description: 'In-depth optimisation for Google', icon: '📈' },
        { name: 'Google Ads campaigns', description: 'Targeted ads for more visibility', icon: '🎯' },
        { name: 'CRM integration', description: 'Connect your site to your tools', icon: '🔗' },
        { name: 'Integrated blog', description: 'Share your expertise', icon: '📝' },
        { name: 'Multilingual site', description: 'Reach an international audience', icon: '🌍' },
        { name: 'Extra hours', description: 'Additional on-demand changes', icon: '⏱️' },
        { name: 'Personalised training', description: 'Learn to manage your site', icon: '🎓' },
      ],
    },
    methodology: {
      title: 'How does it work?',
      subtitle: 'A simple and transparent process, from the first discussion to launch',
      steps: [
        { number: '01', title: 'Free audit', description: 'We analyse your current situation and goals in a 30-minute call.' },
        { number: '02', title: 'Clear proposal', description: 'You receive a detailed, no-surprise quote with a precise timeline.' },
        { number: '03', title: 'Mockup', description: 'We create a visual mockup of your site for approval before development.' },
        { number: '04', title: 'Development', description: 'We build your site using the latest technologies for performance and security.' },
        { number: '05', title: 'Launch', description: 'Your site is published and configured on your domain name.' },
        { number: '06', title: '30-day follow-up', description: 'We remain available for adjustments and guide you through onboarding.' },
      ],
    },
    reassurance: {
      title: 'Why trust us?',
      points: [
        { icon: '👤', title: 'Single point of contact', description: 'One contact from start to finish. No handoffs, no repeating yourself.' },
        { icon: '🔑', title: 'Turnkey solution', description: 'We handle everything: design, development, hosting, launch. Nothing for you to manage.' },
        { icon: '🤝', title: 'Personalised support', description: 'Every project is unique. We take the time to understand your business and goals.' },
        { icon: '🚀', title: 'Long-term vision', description: "We are not just a vendor — we are a partner accompanying your digital growth." },
      ],
    },
    cta_final: {
      title: 'Ready to transform your digital presence?',
      description: 'Book a <strong class="text-white">free 30-minute audit</strong>. We will analyse your situation together and define the best strategy for your business.',
      cta: 'Book my free audit',
      email: 'Send an email',
      note: 'No commitment • 100% free • Reply within 24h',
    },
    partners: {
      title: 'They trust us',
      selenium_role: 'Digital Agency',
      gecko_role: 'Restaurant',
      victor_role: 'Creative Portfolio',
      ghjulianu_role: 'Corsican Artist',
      folies_role: 'Dance Company',
      ajmg_role: 'Consulting Service',
    },
  },
};

const th: Translations = {
  nav: {
    home: 'หน้าหลัก',
    about: 'เกี่ยวกับ',
    services: 'บริการ',
    projects: 'โปรเจกต์',
    contact: 'ติดต่อ',
  },
  hero: {
    title: 'นักพัฒนา Full Stack & วิศวกร AI',
    subtitle:
      'ฉันสร้าง <strong>เว็บแอปพลิเคชันที่ขยายได้</strong>, <strong>ระบบขับเคลื่อนด้วย AI</strong> และ <strong>API ที่ปรับแต่งได้</strong> ที่ขับเคลื่อนการเติบโตของธุรกิจ',
    description:
      'จากระบบอัตโนมัติอัจฉริยะสู่แพลตฟอร์มพร้อมใช้งาน — ฉันเปลี่ยนแนวคิดซับซ้อนให้กลายเป็นโซลูชันดิจิทัลที่ทรงพลัง <span class="text-indigo-400">พร้อมรับงานฟรีแลนซ์</span>',
    cta_services: 'บริการของฉัน',
    cta_projects: 'ดูโปรเจกต์',
    cta_hire: 'ว่าจ้างฉัน',
  },
  about: {
    title: 'ทำไมต้องทำงานกับฉัน',
    p1_strong: 'ฉันส่งมอบผลลัพธ์ที่แท้จริง',
    p1: 'ในฐานะนักพัฒนา full stack ที่เชี่ยวชาญด้าน backend ฉันเชี่ยวชาญในการสร้าง <strong class="text-indigo-400">ระบบที่ขยายได้</strong> และ <strong class="text-indigo-400">โซลูชันดิจิทัลอัจฉริยะ</strong> ที่ช่วยให้ธุรกิจทำงานอัตโนมัติ เพิ่มประสิทธิภาพ และสร้างรายได้',
    p2_strong: 'ความเชี่ยวชาญของฉัน:',
    p2: 'การพัฒนา API แบบกำหนดเอง, สถาปัตยกรรม microservices, ระบบอัตโนมัติด้วย AI และโครงสร้างพื้นฐานคลาวด์ ฉันเปลี่ยนความต้องการซับซ้อนให้เป็น <strong class="text-cyan-400">โซลูชันพร้อมใช้งานจริง</strong> — ตรงเวลาและสร้างมาเพื่อความยั่งยืน',
    p3_strong: 'นอกเหนือจากโค้ด:',
    p3: 'ฉันสร้างประสบการณ์เว็บ 3D ที่ดื่มด่ำโดยใช้ Three.js และ WebGL เพิ่มนวัตกรรมที่ทำให้ผลิตภัณฑ์ของคุณโดดเด่นกว่าคู่แข่ง',
    p4: 'ในฐานะผู้ร่วมก่อตั้ง',
    p4_strong: 'โปรเจกต์ของคุณอาจเป็นลำดับถัดไป',
    p5_available: '✓ พร้อมรับงานฟรีแลนซ์',
    p5_remote: '✓ ทำงานทางไกลได้',
    p5_based: '✓ ตั้งอยู่ที่ Tours, ฝรั่งเศส',
    skills_title: 'ทักษะของฉัน',
  },
  projects: {
    title: 'โปรเจกต์เด่น & กรณีศึกษา',
    mono_subtitle: '// โซลูชันจริงที่ส่งมอบแก่ลูกค้า',
    description:
      'จากแอปพลิเคชันขับเคลื่อนด้วย AI ไปจนถึงระบบ CRM ระดับองค์กร — สำรวจว่าฉันช่วยให้ธุรกิจบรรลุเป้าหมายได้อย่างไร',
    selenium_subtitle: 'เอเจนซี่ดิจิทัล',
    selenium_desc: 'เอเจนซี่ดิจิทัลร่วมก่อตั้ง นำส่งแพลตฟอร์มเว็บที่กำหนดเอง แอนิเมชัน 3D และกลยุทธ์ดิจิทัลที่ขับเคลื่อนด้วยการเติบโตสำหรับ SME ทั่วโลก',
    gecko_subtitle: 'เว็บไซต์ร้านอาหาร',
    gecko_desc: 'เว็บไซต์ร้านอาหารครบครัน พร้อมเมนู ภาพบรรยากาศ การรวม Google Maps ข้อมูลการจอง และ SEO ท้องถิ่นเพื่อเพิ่มลูกค้า',
    victor_subtitle: 'พอร์ตโฟลิโอสร้างสรรค์',
    victor_desc: 'พอร์ตโฟลิโอสำหรับนักสร้างสรรค์มืออาชีพ พร้อมแอนิเมชันลื่นไหล ระบบดีไซน์ที่ประณีต และการนำเสนอทักษะและผลงานที่น่าสนใจ',
    ghjulianu_subtitle: 'เว็บไซต์ศิลปิน',
    ghjulianu_desc: 'เว็บไซต์โชว์เคสสำหรับศิลปิน Ghjulianu Codani แสดงถึงโลกดนตรีและศิลปะของเขาด้วยดีไซน์ที่น่าประทับใจและประสบการณ์ผู้ใช้ที่ทันสมัย',
    folies_subtitle: 'เว็บไซต์คณะนาฏศิลป์',
    folies_desc: 'เว็บไซต์ครบครันสำหรับคณะนาฏศิลป์ Les Folies Temps Danse นำเสนอผลงาน ข่าวสาร ชั้นเรียน และกิจกรรมในดีไซน์ที่ dynamic และมีชีวิตชีวา',
    click_to_explore: 'คลิกเพื่อสำรวจ →',
    flip_back_hint: '← คลิกเพื่อกลับ',
    hud_flip: 'คลิกการ์ดเพื่อพลิก',
    hud_interact: 'โต้ตอบกับพรีวิว',
    about_label: '// เกี่ยวกับ',
    tech_label: '// เทคโนโลยี',
    visit: 'เยี่ยมชม',
    loading: 'กำลังโหลด…',
    preview_blocked: 'ไม่สามารถแสดงพรีวิว',
    preview_blocked_desc: 'เว็บไซต์นี้จำกัดการฝังจากภายนอก',
    open: 'เปิด',
  },
  contact: {
    title: 'มาสร้างสิ่งที่ยิ่งใหญ่ด้วยกัน',
    description:
      'พร้อมที่จะทำให้โปรเจกต์ของคุณเป็นจริงหรือยัง? ไม่ว่าคุณจะต้องการ <strong class="text-white">เว็บแอปพลิเคชันแบบกำหนดเอง</strong>, <strong class="text-white">การผสาน AI</strong> หรือ <strong class="text-white">ระบบ backend ที่ขยายได้</strong> — ฉันพร้อมช่วยเหลือ',
    email_label: 'อีเมล',
    location_label: 'ที่ตั้ง',
    location_value: 'Tours, ฝรั่งเศส',
    name_placeholder: 'ชื่อของคุณ',
    email_placeholder: 'อีเมลของคุณ',
    message_placeholder: 'ข้อความของคุณ',
    submit: 'ส่งข้อความ',
    submitting: 'กำลังส่ง...',
    success: 'ส่งข้อความสำเร็จ!',
    error: 'ส่งข้อความไม่สำเร็จ กรุณาลองใหม่',
  },
  footer: {
    rights: 'สงวนลิขสิทธิ์ทั้งหมด',
    built_with: 'สร้างด้วย Next.js, Three.js & Tailwind CSS',
  },
  services: {
    hero: {
      badge: 'สร้างเว็บไซต์สำหรับ SME',
      title: 'มอบภาพลักษณ์ที่ธุรกิจของคุณสมควรได้รับ',
      subtitle:
        'เว็บไซต์ทันสมัย มีประสิทธิภาพสูง สำหรับ SME ที่ต้องการ <strong class="text-white">สร้างความน่าเชื่อถือ</strong> และ <strong class="text-emerald-400">สร้างลูกค้าเพิ่มขึ้น</strong>',
      description:
        'โซลูชันครบวงจร ไม่มีศัพท์เทคนิคซับซ้อน คุณโฟกัสที่ธุรกิจ เราดูแลการปรากฏตัวดิจิทัลของคุณ',
      cta_audit: 'ขอรับการตรวจสอบฟรี',
      cta_offers: 'ดูแพ็กเกจของเรา',
    },
    problem: {
      title: 'ธุรกิจของคุณสมควรได้รับสิ่งที่ดีกว่านี้',
      subtitle: 'ทุกวันที่ขาดการปรากฏตัวดิจิทัลที่มีประสิทธิภาพ คือโอกาสที่สูญเสียไป',
      good_news: 'ข่าวดีคือ? ปัญหาเหล่านี้มีทางแก้ไขที่ง่ายและเข้าถึงได้',
      items: [
        {
          icon: '🚫',
          title: 'ไม่มีเว็บไซต์',
          description: 'ลูกค้าที่มีศักยภาพไม่สามารถค้นหาคุณทางออนไลน์ได้ พวกเขาหันไปหาคู่แข่งที่มีตัวตนบนโลกออนไลน์',
        },
        {
          icon: '📱',
          title: 'เว็บไซต์ล้าสมัยหรือไม่รองรับมือถือ',
          description: 'เว็บไซต์ที่ล้าสมัยหรืออ่านยากบนสมาร์ทโฟน สร้างภาพลักษณ์ที่ไม่เป็นมืออาชีพ',
        },
        {
          icon: '📉',
          title: 'ไม่มีการติดต่อผ่านอินเทอร์เน็ต',
          description: 'เว็บไซต์ของคุณมีอยู่แต่ไม่สร้างคำขอใดๆ มันไม่ได้ทำงานให้คุณ',
        },
        {
          icon: '❌',
          title: 'สูญเสียความน่าเชื่อถือ',
          description: 'ในปี 2026 บริษัทที่ไม่มีการปรากฏตัวดิจิทัลสมัยใหม่ สูญเสียความเชื่อมั่นของผู้มีโอกาสเป็นลูกค้าก่อนการติดต่อครั้งแรก',
        },
      ],
    },
    solution: {
      badge: 'แนวทางของเรา',
      title: 'ผู้เชี่ยวชาญด้านการปรากฏตัวดิจิทัลสำหรับ SME ในท้องถิ่น',
      p1: 'เราสร้างเว็บไซต์ที่ปรับแต่งตามความต้องการซึ่งเปลี่ยนผู้เยี่ยมชมให้กลายเป็นลูกค้า ไม่มีโซลูชันทั่วไป: แต่ละโปรเจกต์ถูกออกแบบสำหรับ <strong class="text-white">ธุรกิจของคุณ</strong> และ <strong class="text-white">ตลาดท้องถิ่นของคุณ</strong>',
      p2: 'ภารกิจของเรา: มอบ <strong class="text-emerald-400">หน้าต่างดิจิทัลระดับมืออาชีพ</strong> ที่ทำงานให้คุณ 24 ชั่วโมง สร้างลูกค้าที่มีคุณภาพ และเสริมความน่าเชื่อถือของคุณ',
      benefits: [
        'เว็บไซต์ทันสมัยและเป็นมืออาชีพ',
        'เพิ่มประสิทธิภาพในการสร้างลูกค้า',
        'รวดเร็วและมีประสิทธิภาพสูง',
        'รองรับทุกขนาดหน้าจอ',
        'รวม SEO ท้องถิ่น',
        'การสนับสนุนส่วนตัว',
      ],
      card1_title: 'มุ่งเน้นผลลัพธ์',
      card1_desc: 'ทุกองค์ประกอบออกแบบมาเพื่อการแปลง',
      card2_title: 'พันธมิตรระยะยาว',
      card2_desc: 'การสนับสนุนที่ไม่หยุดแค่การเปิดตัว',
      card3_title: 'คุณภาพระดับพรีเมียม',
      card3_desc: 'เทคโนโลยีทันสมัย ดีไซน์ที่ประณีต',
    },
    offers: {
      title: 'แพ็กเกจของเรา',
      subtitle: 'โซลูชันที่เหมาะกับทุกขั้นตอนการเติบโตของคุณ',
      from: 'เริ่มต้นที่',
      popular: 'ได้รับความนิยมมากที่สุด',
      cta: 'ขอใบเสนอราคา',
      items: [
        {
          name: 'Landing Page มืออาชีพ',
          tagline: 'สิ่งจำเป็นสำหรับการมองเห็น',
          price: '45,000 – 70,000 ฿',
          description: 'การปรากฏตัวออนไลน์ที่ชัดเจนและเป็นมืออาชีพสำหรับการเริ่มต้น',
          features: [
            'ดีไซน์ทันสมัยและกำหนดเอง',
            'รองรับมือถือและแท็บเล็ต',
            'นำเสนอบริการของคุณอย่างชัดเจน',
            'แบบฟอร์มติดต่อ',
            'การผสาน Google Maps',
            'SEO ท้องถิ่นพื้นฐาน',
            'รวมการเปิดตัว',
          ],
        },
        {
          name: 'Rebranding + เว็บไซต์พรีเมียม',
          tagline: 'เปลี่ยนภาพลักษณ์ของคุณ',
          price: '100,000 – 155,000 ฿',
          description: 'ปรับปรุงภาพลักษณ์ทั้งหมดและเสริมความน่าเชื่อถือ',
          features: [
            'ตรวจสอบภาพลักษณ์ปัจจุบัน',
            'ปรับปรุงโลโก้',
            'ชุดสีใหม่',
            'ฟอนต์มืออาชีพ',
            'แนวทางแบรนด์ขนาดเล็ก',
            'เว็บไซต์ใหม่สอดคล้องกับอัตลักษณ์ของคุณ',
            'การฝึกอบรมการใช้งานขั้นพื้นฐาน',
          ],
        },
        {
          name: 'โปรเจกต์กำหนดเอง',
          tagline: 'ความต้องการเฉพาะของคุณ',
          price: 'ตามการประเมิน',
          description: 'สำหรับโปรเจกต์ที่ต้องการฟีเจอร์ขั้นสูง',
          features: [
            'เว็บไซต์หลายหน้าครบครัน',
            'ร้านค้าออนไลน์ (e-commerce)',
            'ระบบการจอง',
            'ฟีเจอร์เฉพาะ',
            'ออกแบบเว็บไซต์ใหม่ทั้งหมด',
            'การผสานแบบกำหนดเอง',
            'การสนับสนุนเฉพาะบุคคล',
          ],
        },
      ],
    },
    maintenance: {
      badge: 'ความสงบใจด้านดิจิทัล',
      title: 'การบำรุงรักษา & โฮสติ้ง',
      subtitle: 'เว็บไซต์ของคุณทำงานได้อย่างมีประสิทธิภาพ ปลอดภัย และทันสมัย คุณไม่ต้องจัดการอะไรเลย',
      recommended: 'แนะนำ',
      per_month: '/เดือน',
      annual_discount: '-10% สำหรับการชำระรายปี',
      no_commitment: 'ไม่มีสัญญาผูกมัด',
      scalable: 'ปรับได้ตามความต้องการ',
      currency_symbol: '฿',
      packs: [
        {
          name: 'Essential',
          price: '1,900',
          description: 'สิ่งจำเป็นสำหรับเว็บไซต์ที่ปลอดภัยและใช้งานได้',
          features: [
            'โฮสติ้งประสิทธิภาพสูง',
            'รวมชื่อโดเมน',
            'ใบรับรอง SSL (https)',
            'การสำรองข้อมูลอัตโนมัติ',
            'การตรวจสอบ 24/7',
            'การอัปเดตทางเทคนิค',
            'สนับสนุนทางอีเมล',
          ],
        },
        {
          name: 'Business',
          price: '3,100',
          description: 'สำหรับธุรกิจที่กำลังเติบโต',
          popular: true,
          features: [
            'ทุกอย่างใน Essential',
            '1 ชั่วโมงการแก้ไขต่อเดือน',
            'การเพิ่มประสิทธิภาพ',
            'รายงานรายเดือนแบบย่อ',
            'เวลาตอบสนองที่รวดเร็ว',
          ],
        },
        {
          name: 'Premium',
          price: '4,990',
          priceNote: '+',
          description: 'ความสงบใจทั้งหมดและการเติบโตต่อเนื่อง',
          features: [
            'ทุกอย่างใน Business',
            '2 ชั่วโมงการแก้ไขต่อเดือน',
            'ความปลอดภัยที่เพิ่มขึ้น',
            'การเพิ่มประสิทธิภาพ SEO ต่อเนื่อง',
            'การสนับสนุนด่วน',
            'คำแนะนำเชิงกลยุทธ์รายเดือน',
          ],
        },
      ],
    },
    upsell: {
      title: 'ตัวเลือกเพิ่มเติม',
      subtitle: 'ปรับแต่งโปรเจกต์ของคุณตามความต้องการเฉพาะ',
      options: [
        { name: 'สร้างเนื้อหา', description: 'เขียนข้อความระดับมืออาชีพ', icon: '✍️' },
        { name: 'SEO ขั้นสูง', description: 'การเพิ่มประสิทธิภาพเชิงลึกสำหรับ Google', icon: '📈' },
        { name: 'Google Ads', description: 'โฆษณาแบบกำหนดเป้าหมายสำหรับการมองเห็นมากขึ้น', icon: '🎯' },
        { name: 'การผสาน CRM', description: 'เชื่อมต่อเว็บไซต์กับเครื่องมือของคุณ', icon: '🔗' },
        { name: 'บล็อกในตัว', description: 'แบ่งปันความเชี่ยวชาญของคุณ', icon: '📝' },
        { name: 'เว็บไซต์หลายภาษา', description: 'เข้าถึงกลุ่มเป้าหมายระดับนานาชาติ', icon: '🌍' },
        { name: 'ชั่วโมงพิเศษ', description: 'การแก้ไขเพิ่มเติมตามต้องการ', icon: '⏱️' },
        { name: 'การฝึกอบรมส่วนตัว', description: 'เรียนรู้วิธีจัดการเว็บไซต์ของคุณ', icon: '🎓' },
      ],
    },
    methodology: {
      title: 'กระบวนการทำงานเป็นอย่างไร?',
      subtitle: 'กระบวนการที่เรียบง่ายและโปร่งใส ตั้งแต่การสนทนาครั้งแรกจนถึงการเปิดตัว',
      steps: [
        { number: '01', title: 'ตรวจสอบฟรี', description: 'เราวิเคราะห์สถานการณ์และเป้าหมายปัจจุบันของคุณในการโทร 30 นาที' },
        { number: '02', title: 'ข้อเสนอที่ชัดเจน', description: 'คุณได้รับใบเสนอราคาโดยละเอียด ไม่มีค่าใช้จ่ายแอบแฝง พร้อมกำหนดเวลาที่แน่นอน' },
        { number: '03', title: 'ต้นแบบ', description: 'เราสร้างต้นแบบภาพของเว็บไซต์ของคุณเพื่อการอนุมัติก่อนการพัฒนา' },
        { number: '04', title: 'การพัฒนา', description: 'เราสร้างเว็บไซต์ของคุณด้วยเทคโนโลยีล่าสุดเพื่อประสิทธิภาพและความปลอดภัย' },
        { number: '05', title: 'การเปิดตัว', description: 'เว็บไซต์ของคุณถูกเผยแพร่และกำหนดค่าบนชื่อโดเมนของคุณ' },
        { number: '06', title: 'ติดตาม 30 วัน', description: 'เราพร้อมสำหรับการปรับเปลี่ยนและแนะนำคุณในการเริ่มต้นใช้งาน' },
      ],
    },
    reassurance: {
      title: 'ทำไมต้องไว้วางใจเรา?',
      points: [
        { icon: '👤', title: 'ผู้ติดต่อเดียว', description: 'ผู้ติดต่อเพียงคนเดียวตั้งแต่ต้นจนจบ ไม่มีการโอนย้าย ไม่ต้องอธิบายซ้ำ' },
        { icon: '🔑', title: 'โซลูชันครบวงจร', description: 'เราจัดการทุกอย่าง: ดีไซน์ การพัฒนา โฮสติ้ง การเปิดตัว คุณไม่ต้องทำอะไร' },
        { icon: '🤝', title: 'การสนับสนุนส่วนตัว', description: 'แต่ละโปรเจกต์มีความเฉพาะตัว เราใช้เวลาทำความเข้าใจธุรกิจและเป้าหมายของคุณ' },
        { icon: '🚀', title: 'วิสัยทัศน์ระยะยาว', description: 'เราไม่ใช่แค่ผู้ให้บริการ แต่เป็นพันธมิตรที่ร่วมเดินทางในการเติบโตดิจิทัลของคุณ' },
      ],
    },
    cta_final: {
      title: 'พร้อมที่จะเปลี่ยนแปลงการปรากฏตัวดิจิทัลของคุณหรือยัง?',
      description: 'จองการ <strong class="text-white">ตรวจสอบฟรี 30 นาที</strong> เราจะวิเคราะห์สถานการณ์ของคุณร่วมกันและกำหนดกลยุทธ์ที่ดีที่สุดสำหรับธุรกิจของคุณ',
      cta: 'จองการตรวจสอบฟรีของฉัน',
      email: 'ส่งอีเมล',
      note: 'ไม่มีสัญญาผูกมัด • ฟรี 100% • ตอบกลับภายใน 24 ชั่วโมง',
    },
    partners: {
      title: 'พวกเขาไว้วางใจเรา',
      selenium_role: 'เอเจนซี่ดิจิทัล',
      gecko_role: 'ร้านอาหาร',
      victor_role: 'พอร์ตโฟลิโอสร้างสรรค์',
      folies_role: 'คณะนาฏศิลป์',
      ghjulianu_role: 'ศิลปินคอร์ซิกา',
      ajmg_role: 'บริการที่ปรึกษา',
    },
  },
};

export const translations: Record<Lang, Translations> = { fr, en, th };
