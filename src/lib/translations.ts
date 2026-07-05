export type Lang = 'fr' | 'en' | 'th';

export interface Translations {
  nav: {
    services: string;
    contact: string;
    manifeste: string;
    work: string;
  };
  services: {
    hero: {
      badge: string;
      title_l1: string;
      title_l2: string;
      title_l3_it: string;
      sub: string;
      cta_audit: string;
      cta_offers: string;
      meta: { k: string; v: string }[];
    };
    problem: {
      num: string;
      title_l1: string;
      title_l2_it: string;
      intro: string;
      items: { n: string; title: string; desc: string }[];
      good_news: string;
    };
    approach: {
      num: string;
      title_l1: string;
      title_l2_it: string;
      intro: string;
      benefits: string[];
      cards: { t: string; d: string }[];
    };
    offers: {
      num: string;
      title_l1: string;
      title_l2_it: string;
      intro: string;
      from: string;
      popular: string;
      cta: string;
      items: { name: string; tagline: string; price: string; description: string; features: string[] }[];
    };
    phone: {
      num: string;
      badge: string;
      title_l1: string;
      title_l2: string;
      title_l3_it: string;
      sub: string;
      steps: { label: string; desc: string }[];
      cta: string;
      cta_roi: string;
    };
    maintenance: {
      num: string;
      title_l1: string;
      title_l2_it: string;
      intro: string;
      recommended: string;
      per_month: string;
      currency: string;
      packs: { name: string; price: string; description: string; features: string[]; popular?: boolean; priceNote?: string }[];
      perks: string[];
    };
    upsell: {
      num: string;
      title_l1: string;
      title_l2_it: string;
      intro: string;
      options: { name: string; desc: string }[];
    };
    method: {
      num: string;
      title_l1: string;
      title_l2_it: string;
      intro: string;
      steps: { n: string; t: string; d: string }[];
    };
    reassurance: {
      num: string;
      title_l1: string;
      title_l2_it: string;
      intro: string;
      points: { t: string; d: string }[];
    };
    finalCta: {
      num: string;
      title_l1: string;
      title_l2: string;
      title_l3_it: string;
      desc: string;
      cta: string;
      email: string;
      note: string;
    };
  };
  landing: {
    hero: {
      pill: string;
      title_l1: string;
      title_l2: string;
      title_l2_it: string;
      title_l3: string;
      sub: string;
      cta_primary: string;
      cta_secondary: string;
      stat_1_n: string; stat_1_l: string; stat_1_d: string;
      stat_2_n: string; stat_2_l: string; stat_2_d: string;
      stat_3_n: string; stat_3_l: string; stat_3_d: string;
      stat_4_n: string; stat_4_l: string; stat_4_d: string;
      canvas_l: string;
      canvas_r: string;
    };
    manifeste: {
      num: string;
      title_l1: string;
      title_l2_it: string;
      intro: string;
      p1: string;
      p2: string;
      quote: string;
      p3: string;
      p4: string;
    };
    work: {
      num: string;
      title_l1: string;
      title_l2_it: string;
      intro: string;
      items: { name: string; desc: string; tags: string[]; year: string }[];
    };
    phone: {
      num: string;
      badge: string;
      title_l1: string;
      title_l2: string;
      title_l3_it: string;
      sub: string;
      features: string[];
      cta_demo: string;
      cta_more: string;
      cta_roi: string;
      flow_label: string;
      flow_rec: string;
      flow_steps: { t: string; k: string; v: string }[];
    };
    partners: {
      title: string;
      items: { name: string; role: string; color: string }[];
    };
    contact: {
      num: string;
      title_l1: string;
      title_l2_it: string;
      sub: string;
      info: { k: string; v: string }[];
      form: {
        name_l: string;
        name_p: string;
        email_l: string;
        email_p: string;
        type_l: string;
        type_o: string[];
        msg_l: string;
        msg_p: string;
        submit: string;
        submitting: string;
        success: string;
        note: string;
      };
    };
    footer: {
      built: string;
      legal: string;
      rights: string;
    };
  };
}

const fr: Translations = {
  nav: {
    services: 'Services',
    contact: 'Contact',
    manifeste: 'Manifeste',
    work: 'Réalisations',
  },
  services: {
    hero: {
      badge: "OFFRES & TARIFS — 2026",
      title_l1: "Sites,",
      title_l2: "outils,",
      title_l3_it: "agents.",
      sub: "Des solutions clés en main pour les commerces, restaurants et services qui veulent gagner en crédibilité, libérer du temps et capter plus de clients.",
      cta_audit: "Réserver un audit gratuit",
      cta_offers: "Voir les offres",
      meta: [
        { k: "Délai moyen", v: "3 à 6 semaines" },
        { k: "Engagement", v: "Aucun" },
        { k: "Devis", v: "Sous 48h" },
      ],
    },
    problem: {
      num: "01 / 09",
      title_l1: "Ce que ça vous",
      title_l2_it: "coûte.",
      intro: "Chaque jour sans présence digitale efficace, ce sont des appels manqués, des clients qui choisissent vos concurrents et de la crédibilité qui s'évapore.",
      items: [
        { n: "A", title: "Pas de site, pas de visibilité", desc: "Vos clients potentiels ne vous trouvent pas en ligne. Ils se tournent vers vos concurrents qui, eux, sont visibles." },
        { n: "B", title: "Site obsolète ou non mobile", desc: "Un site vieillissant ou difficile à lire sur smartphone renvoie une image peu professionnelle de votre entreprise." },
        { n: "C", title: "Zéro contact via internet", desc: "Votre site existe mais ne génère aucune demande. Il ne travaille pas pour vous, il dort." },
        { n: "D", title: "Perte de crédibilité", desc: "En 2026, une entreprise sans présence digitale moderne perd la confiance de ses prospects avant le premier contact." },
      ],
      good_news: "La bonne nouvelle : ces problèmes ont une solution simple et accessible.",
    },
    approach: {
      num: "02 / 09",
      title_l1: "Notre",
      title_l2_it: "approche.",
      intro: "On crée des sites sur mesure qui transforment vos visiteurs en clients. Pas de générique : chaque projet est pensé pour votre activité et votre marché local.",
      benefits: [
        "Sites modernes et professionnels",
        "Optimisés pour générer des contacts",
        "Rapides et performants",
        "Adaptés à tous les écrans",
        "Référencement local inclus",
        "Accompagnement personnalisé",
      ],
      cards: [
        { t: "Orienté résultats", d: "Chaque élément est pensé pour convertir." },
        { t: "Partenaire long terme", d: "Un accompagnement qui ne s'arrête pas à la mise en ligne." },
        { t: "Qualité premium", d: "Technologies modernes, design soigné." },
      ],
    },
    offers: {
      num: "03 / 09",
      title_l1: "Nos",
      title_l2_it: "offres.",
      intro: "Quatre formules adaptées à chaque étape de votre croissance. Le prix est public, le devis arrive sous 48h.",
      from: "À partir de",
      popular: "Le plus demandé",
      cta: "Demander un devis",
      items: [
        { name: "Landing Page", tagline: "L'essentiel pour être visible", price: "1 200 – 1 800 €", description: "Une présence en ligne claire et professionnelle pour démarrer.", features: ["Design moderne et personnalisé", "Adapté mobile et tablette", "Présentation claire de vos services", "Formulaire de contact", "Intégration Google Maps", "SEO local de base", "Mise en ligne incluse"] },
        { name: "Rebranding + Site Premium", tagline: "Transformez votre image", price: "2 500 – 4 000 €", description: "Modernisez complètement votre image et renforcez votre crédibilité.", features: ["Audit de votre image actuelle", "Modernisation du logo", "Nouvelle palette de couleurs", "Typographies professionnelles", "Mini charte graphique", "Nouveau site cohérent", "Formation utilisation"] },
        { name: "Projet Sur Mesure", tagline: "Vos besoins spécifiques", price: "Sur devis", description: "Pour les projets qui nécessitent des fonctionnalités avancées.", features: ["Site multi-pages complet", "Boutique en ligne", "Système de réservation", "Fonctionnalités spécifiques", "Refonte complète", "Intégrations personnalisées", "Accompagnement dédié"] },
        { name: "Agent Vocal IA", tagline: "Votre téléphone, automatisé", price: "À partir de 990 €", description: "Un agent téléphonique intelligent qui répond, qualifie et enregistre — 24h/24.", features: ["Setup VAPI + numéro Twilio", "Voix ElevenLabs ultra-naturelle", "Connexion CRM via MCP", "1 scénario métier sur mesure", "1 mois de support inclus"] },
      ],
    },
    phone: {
      num: "04 / 09",
      badge: "PHONE AGENT — COMMENT ÇA MARCHE",
      title_l1: "Vos clients",
      title_l2: "appellent,",
      title_l3_it: "on répond.",
      sub: "Une solution clé en main connectée à vos outils en quelques heures. Vous gardez la main, l'agent fait le reste.",
      steps: [
        { label: "Le client appelle", desc: "Un numéro Twilio dédié à votre business." },
        { label: "L'IA comprend", desc: "Claude Sonnet analyse la demande en français naturel." },
        { label: "Le CRM est mis à jour", desc: "Via le protocole MCP, la commande ou le RDV s'enregistre." },
        { label: "Vous êtes notifié", desc: "Votre dashboard se met à jour en temps réel." },
      ],
      cta: "Tester la démo live",
      cta_roi: "Calculer le ROI",
    },
    maintenance: {
      num: "05 / 09",
      title_l1: "Maintenance",
      title_l2_it: "& hébergement.",
      intro: "Votre site reste performant, sécurisé et à jour. Vous n'avez rien à gérer. Trois formules, sans engagement.",
      recommended: "Recommandé",
      per_month: "/mois",
      currency: "€",
      packs: [
        { name: "Essentiel", price: "49", description: "L'indispensable pour un site sécurisé et fonctionnel.", features: ["Hébergement haute performance", "Nom de domaine inclus", "Certificat SSL (https)", "Sauvegardes automatiques", "Monitoring 24/7", "Mises à jour techniques", "Support par email"] },
        { name: "Business", price: "79", popular: true, description: "Pour les entreprises qui évoluent.", features: ["Tout du pack Essentiel", "1h de modification par mois", "Optimisation des performances", "Rapport mensuel simplifié", "Temps de réponse prioritaire"] },
        { name: "Premium", price: "129", priceNote: "+", description: "Tranquillité totale et croissance continue.", features: ["Tout du pack Business", "2h de modifications par mois", "Sécurité renforcée", "Optimisation SEO continue", "Assistance prioritaire", "Conseils stratégiques mensuels"] },
      ],
      perks: ["−10% si paiement annuel", "Sans engagement", "Évolutif selon vos besoins"],
    },
    upsell: {
      num: "06 / 09",
      title_l1: "Options",
      title_l2_it: "complémentaires.",
      intro: "Personnalisez votre projet selon vos besoins spécifiques.",
      options: [
        { name: "Création de contenu", desc: "Rédaction professionnelle de vos textes" },
        { name: "SEO avancé", desc: "Optimisation poussée pour Google" },
        { name: "Campagnes Google Ads", desc: "Publicité ciblée pour plus de visibilité" },
        { name: "Intégration CRM", desc: "Connectez votre site à vos outils" },
        { name: "Blog intégré", desc: "Partagez votre expertise" },
        { name: "Site multilingue", desc: "Touchez une audience internationale" },
        { name: "Heures supplémentaires", desc: "Modifications additionnelles à la demande" },
        { name: "Formation personnalisée", desc: "Apprenez à gérer votre site" },
      ],
    },
    method: {
      num: "07 / 09",
      title_l1: "Comment",
      title_l2_it: "ça se passe.",
      intro: "Un processus simple et transparent, de la première discussion à la mise en ligne. Six étapes, pas une de plus.",
      steps: [
        { n: "01", t: "Audit gratuit", d: "On analyse votre situation actuelle et vos objectifs lors d'un appel de 30 minutes." },
        { n: "02", t: "Proposition claire", d: "Vous recevez un devis détaillé, sans surprise, avec un planning précis." },
        { n: "03", t: "Maquette", d: "On crée une maquette visuelle pour validation avant développement." },
        { n: "04", t: "Développement", d: "On construit votre site avec les dernières technologies pour performance et sécurité." },
        { n: "05", t: "Mise en ligne", d: "Votre site est publié et configuré sur votre nom de domaine." },
        { n: "06", t: "Suivi 30 jours", d: "On reste disponibles pour ajustements et on vous accompagne dans la prise en main." },
      ],
    },
    reassurance: {
      num: "08 / 09",
      title_l1: "Pourquoi nous faire",
      title_l2_it: "confiance.",
      intro: "Quatre raisons concrètes qui changent vraiment la relation.",
      points: [
        { t: "Interlocuteur unique", d: "Un seul contact du début à la fin. Pas de transfert entre services, pas de répétition de vos besoins." },
        { t: "Solution clé en main", d: "On gère tout : design, développement, hébergement, mise en ligne. Vous n'avez rien à faire." },
        { t: "Accompagnement personnalisé", d: "Chaque projet est unique. On prend le temps de comprendre votre activité et vos objectifs." },
        { t: "Vision long terme", d: "On n'est pas juste un prestataire, mais un partenaire qui accompagne votre croissance digitale." },
      ],
    },
    finalCta: {
      num: "09 / 09",
      title_l1: "Prêt à",
      title_l2: "transformer",
      title_l3_it: "votre présence ?",
      desc: "Réservez un audit gratuit de 30 minutes. On analysera ensemble votre situation et on définira la meilleure stratégie pour votre entreprise.",
      cta: "Réserver mon audit gratuit",
      email: "Envoyer un email",
      note: "Sans engagement · 100% gratuit · Réponse sous 24h",
    },
  },
  landing: {
    hero: {
      pill: 'AGENCE · TOURS, FR · DISPONIBLE EN MAI 2026',
      title_l1: 'Des outils',
      title_l2: 'qui ',
      title_l2_it: 'travaillent',
      title_l3: 'pour vos clients.',
      sub: "On conçoit des sites, des outils de gestion et des agents IA pour les commerces, restaurants et services. Pas du sur-mesure inutile : ce qui vous fait gagner du temps, des appels et des ventes.",
      cta_primary: 'Voir nos offres',
      cta_secondary: 'Discutons de votre projet',
      stat_1_n: '06', stat_1_l: 'Partenaires actifs', stat_1_d: 'Restaurants, écoles, indépendants',
      stat_2_n: '24h', stat_2_l: 'Première réponse', stat_2_d: 'Audit téléphonique offert',
      stat_3_n: '100%', stat_3_l: 'Code possédé', stat_3_d: 'Vous gardez tout, dès le jour 1',
      stat_4_n: '1.5x', stat_4_l: 'Ratio appels traités', stat_4_d: 'Avec un phone agent en place',
      canvas_l: 'MODEL · BA-01 · ATELIER',
      canvas_r: 'ROTATION · 0.4 RPM',
    },
    manifeste: {
      num: '01 / 05',
      title_l1: 'Sites, outils,',
      title_l2_it: 'agents.',
      intro: "Trois choses qu'on fait — pour une seule chose qu'on vise.",
      p1: "Vous êtes patron de pizzeria, gérante de salon, dirigeant d'école de danse. Vous voulez un outil qui marche, pas un projet tech.",
      p2: "On vient avec une seule promesse : on construit ce que vos clients vont vraiment utiliser. Le reste, on l'enlève.",
      quote: "« Un site beau, c'est bien. Un site qui rapporte, c'est mieux. »",
      p3: "Aujourd'hui, on construit surtout des agents IA — phone agents qui répondent à vos clients, assistants qui prennent les commandes, automatisations qui font le boulot pendant que vous vivez.",
      p4: "Demain, on construira ce dont vous aurez besoin. Le métier reste le même : faire des outils utiles.",
    },
    work: {
      num: '02 / 05',
      title_l1: 'Quelques',
      title_l2_it: 'réalisations.',
      intro: 'Six partenaires, six métiers différents, une même méthode : on règle un vrai problème métier.',
      items: [
        { name: 'Feuillette', desc: 'Phone agent pour boulangerie — prise de commande automatique, intégration CRM, suivi temps réel.', tags: ['IA', 'VOIX', 'CRM'], year: '2025' },
        { name: 'Gecko Cabane', desc: 'Site vitrine + réservation pour restaurant. Charte sur-mesure, hébergement managé.', tags: ['SITE', 'RESA'], year: '2024' },
        { name: 'Les Folies Temps Danse', desc: "Plateforme inscription école de danse — outils de gestion intégrés.", tags: ['WEB', 'GESTION'], year: '2024' },
        { name: 'Ghjulianu Codani', desc: 'Portfolio professionnel — design éditorial, intégration soignée.', tags: ['SITE', 'EDITORIAL'], year: '2025' },
      ],
    },
    phone: {
      num: '03 / 05',
      badge: 'LIVE · PHONE AGENT',
      title_l1: 'Vos clients',
      title_l2: 'appellent,',
      title_l3_it: 'on répond.',
      sub: "Un agent vocal IA, branché à votre CRM ou votre cahier de commandes. Il répond, comprend, confirme — pendant que vous travaillez.",
      features: [
        'Réponse instantanée 24/7, même quand vous êtes en service',
        'Prise de commande complète avec confirmation SMS',
        'Branché à votre outil (CRM, agenda, gestion stocks)',
        'Voix française naturelle, ton choisi par vous',
      ],
      cta_demo: 'Écouter une démo',
      cta_more: 'Comment ça marche',
      cta_roi: 'Calculer le ROI',
      flow_label: 'FLUX TEMPS RÉEL',
      flow_rec: 'REC · 02:14',
      flow_steps: [
        { t: '02:14', k: 'Appel reçu', v: '+33 6 12 — Mme Dubois' },
        { t: '02:14', k: 'VAPI ↔ Claude', v: 'Comprend la commande' },
        { t: '02:15', k: 'MCP → CRM', v: "Crée l'ordre #2418" },
        { t: '02:15', k: 'Confirmation', v: 'SMS envoyé · ✓' },
      ],
    },
    partners: {
      title: 'ILS NOUS FONT CONFIANCE — DEPUIS 2023',
      items: [
        { name: 'Selenium Studio', role: 'STUDIO ASSOCIÉ', color: '#C4F542' },
        { name: 'Gecko Cabane', role: 'RESTAURANT', color: '#E07856' },
        { name: 'Victor Verissimo', role: 'ARTIST PORTFOLIO', color: '#9A9690' },
        { name: 'Ghjulianu Codani', role: 'PROFESSIONAL', color: '#C4F542' },
        { name: 'Les Folies Temps Danse', role: 'ÉCOLE DE DANSE', color: '#E07856' },
        { name: 'AJMG·EXP', role: 'EXPERTISE', color: '#9A9690' },
      ],
    },
    contact: {
      num: '05 / 05',
      title_l1: 'Un projet ?',
      title_l2_it: 'Parlons-en.',
      sub: "On répond sous 24h ouvrées. Premier appel offert, sans engagement, pour comprendre où vous en êtes et ce qui aurait du sens.",
      info: [
        { k: 'Email', v: 'contact@sevalys.com' },
        { k: 'Téléphone', v: '+33 (0)6 07 18 41 33' },
        { k: 'Adresse', v: 'Tours, France · à distance partout' },
        { k: 'Disponibilité', v: 'Nouveaux projets dès juin 2026' },
      ],
      form: {
        name_l: 'Vous êtes',
        name_p: 'Prénom + Nom',
        email_l: 'Email',
        email_p: 'vous@société.fr',
        type_l: 'Type de projet',
        type_o: ['Site vitrine', 'Outil de gestion', 'Agent IA / Phone agent', 'Refonte / migration', 'Autre — à discuter'],
        msg_l: 'Le projet en 2-3 lignes',
        msg_p: 'Décrivez ce qui vous bloque ou ce que vous voulez construire…',
        submit: 'Envoyer',
        submitting: 'Envoi…',
        success: 'Reçu — réponse sous 24h.',
        note: "On ne stocke rien d'autre que ce mail.",
      },
    },
    footer: {
      built: 'Conçu et codé à Tours.',
      legal: 'Mentions légales',
      rights: 'Tous droits réservés.',
    },
  },
};

const en: Translations = {
  nav: {
    services: 'Services',
    contact: 'Contact',
    manifeste: 'Manifesto',
    work: 'Work',
  },
  services: {
    hero: {
      badge: "OFFERS & PRICES — 2026",
      title_l1: "Sites,",
      title_l2: "tools,",
      title_l3_it: "agents.",
      sub: "Turnkey solutions for shops, restaurants and services that want to build credibility, free up time and capture more customers.",
      cta_audit: "Book a free audit",
      cta_offers: "See offers",
      meta: [
        { k: "Average timeline", v: "3 to 6 weeks" },
        { k: "Commitment", v: "None" },
        { k: "Quote", v: "Within 48h" },
      ],
    },
    problem: {
      num: "01 / 09",
      title_l1: "What it",
      title_l2_it: "costs you.",
      intro: "Every day without an effective digital presence means missed calls, customers choosing your competitors, and credibility slipping away.",
      items: [
        { n: "A", title: "No site, no visibility", desc: "Potential customers cannot find you online. They turn to your competitors who are visible." },
        { n: "B", title: "Outdated or non-mobile site", desc: "An aging or hard-to-read site on a smartphone projects an unprofessional image." },
        { n: "C", title: "Zero online enquiries", desc: "Your site exists but generates no requests. It is not working for you — it is just sitting there." },
        { n: "D", title: "Loss of credibility", desc: "In 2026, a business without a modern digital presence loses prospect trust before the first contact." },
      ],
      good_news: "The good news: these problems have a simple and accessible solution.",
    },
    approach: {
      num: "02 / 09",
      title_l1: "Our",
      title_l2_it: "approach.",
      intro: "We craft tailor-made sites that turn visitors into customers. No generics: every project is designed for your business and your local market.",
      benefits: ["Modern, professional sites", "Tuned to generate leads", "Fast and high-performing", "Responsive on all screens", "Local SEO included", "Personalised support"],
      cards: [
        { t: "Results-driven", d: "Every element is built to convert." },
        { t: "Long-term partner", d: "Support that does not stop at launch." },
        { t: "Premium quality", d: "Modern technologies, refined design." },
      ],
    },
    offers: {
      num: "03 / 09",
      title_l1: "Our",
      title_l2_it: "offers.",
      intro: "Four formulas for each stage of your growth. The price is public, the quote lands within 48h.",
      from: "Starting from",
      popular: "Most requested",
      cta: "Request a quote",
      items: [
        { name: "Landing Page", tagline: "The essentials to be visible", price: "$1,300 – $2,000", description: "A clear, professional online presence to get started.", features: ["Modern and custom design", "Mobile and tablet friendly", "Clear presentation of services", "Contact form", "Google Maps integration", "Basic local SEO", "Deployment included"] },
        { name: "Rebranding + Premium Site", tagline: "Transform your image", price: "$2,750 – $4,400", description: "Completely modernise your image and strengthen your credibility.", features: ["Image audit", "Logo modernisation", "New colour palette", "Professional typography", "Mini brand guidelines", "New consistent site", "Basic usage training"] },
        { name: "Custom Project", tagline: "Your specific needs", price: "On request", description: "For projects that require advanced features.", features: ["Full multi-page site", "Online shop (e-commerce)", "Booking system", "Specific features", "Full website redesign", "Custom integrations", "Dedicated support"] },
        { name: "AI Voice Agent", tagline: "Your phone, automated", price: "From €990", description: "An intelligent phone agent that answers, qualifies and records — 24/7.", features: ["VAPI + Twilio setup", "Ultra-natural ElevenLabs voice", "CRM connection via MCP", "1 custom scenario", "1 month of support"] },
      ],
    },
    phone: {
      num: "04 / 09",
      badge: "PHONE AGENT — HOW IT WORKS",
      title_l1: "Your customers",
      title_l2: "call,",
      title_l3_it: "we answer.",
      sub: "A turnkey solution connected to your tools in a few hours. You stay in control, the agent does the rest.",
      steps: [
        { label: "Customer calls", desc: "A dedicated Twilio number for your business." },
        { label: "AI understands", desc: "Claude Sonnet handles the request in natural language." },
        { label: "CRM is updated", desc: "Via MCP protocol, the order or appointment is logged." },
        { label: "You are notified", desc: "Your dashboard updates in real time." },
      ],
      cta: "Try the live demo",
      cta_roi: "Calculate the ROI",
    },
    maintenance: {
      num: "05 / 09",
      title_l1: "Maintenance",
      title_l2_it: "& hosting.",
      intro: "Your site stays fast, secure, up to date. You manage nothing. Three plans, no commitment.",
      recommended: "Recommended",
      per_month: "/month",
      currency: "$",
      packs: [
        { name: "Essential", price: "55", description: "The essentials for a secure, functional site.", features: ["High-performance hosting", "Domain name included", "SSL certificate (https)", "Automatic backups", "24/7 monitoring", "Technical updates", "Email support"] },
        { name: "Business", price: "87", popular: true, description: "For businesses on the move.", features: ["Everything in Essential", "1h of changes per month", "Performance tuning", "Monthly summary report", "Priority response time"] },
        { name: "Premium", price: "140", priceNote: "+", description: "Total peace of mind and continuous growth.", features: ["Everything in Business", "2h of changes per month", "Enhanced security", "Ongoing SEO optimisation", "Priority support", "Monthly strategic advice"] },
      ],
      perks: ["−10% for annual payment", "No commitment", "Adaptable to your needs"],
    },
    upsell: {
      num: "06 / 09",
      title_l1: "Available",
      title_l2_it: "options.",
      intro: "Customise your project to your specific needs.",
      options: [
        { name: "Content creation", desc: "Professional copywriting" },
        { name: "Advanced SEO", desc: "In-depth optimisation for Google" },
        { name: "Google Ads campaigns", desc: "Targeted ads for more visibility" },
        { name: "CRM integration", desc: "Connect your site to your tools" },
        { name: "Integrated blog", desc: "Share your expertise" },
        { name: "Multilingual site", desc: "Reach an international audience" },
        { name: "Extra hours", desc: "On-demand additional changes" },
        { name: "Personalised training", desc: "Learn to run your site" },
      ],
    },
    method: {
      num: "07 / 09",
      title_l1: "How it",
      title_l2_it: "happens.",
      intro: "A simple, transparent process from first chat to launch. Six steps, not one more.",
      steps: [
        { n: "01", t: "Free audit", d: "We analyse your current situation and goals in a 30-minute call." },
        { n: "02", t: "Clear proposal", d: "You receive a detailed, no-surprise quote with a precise timeline." },
        { n: "03", t: "Mockup", d: "We create a visual mockup for approval before development." },
        { n: "04", t: "Build", d: "We build your site using the latest technologies for performance and security." },
        { n: "05", t: "Launch", d: "Your site is published and configured on your domain." },
        { n: "06", t: "30-day follow-up", d: "We stay available for adjustments and guide you through onboarding." },
      ],
    },
    reassurance: {
      num: "08 / 09",
      title_l1: "Why",
      title_l2_it: "trust us.",
      intro: "Four concrete reasons that really change the relationship.",
      points: [
        { t: "Single point of contact", d: "One contact from start to finish. No handoffs, no repeating yourself." },
        { t: "Turnkey solution", d: "We handle everything: design, build, hosting, launch. Nothing for you to manage." },
        { t: "Personalised support", d: "Each project is unique. We take time to understand your business and goals." },
        { t: "Long-term vision", d: "We are not just a vendor — we are a partner accompanying your digital growth." },
      ],
    },
    finalCta: {
      num: "09 / 09",
      title_l1: "Ready to",
      title_l2: "transform",
      title_l3_it: "your presence?",
      desc: "Book a free 30-minute audit. We will analyse your situation together and define the best strategy for your business.",
      cta: "Book my free audit",
      email: "Send an email",
      note: "No commitment · 100% free · Reply within 24h",
    },
  },
  landing: {
    hero: {
      pill: 'AGENCY · TOURS, FR · AVAILABLE FROM MAY 2026',
      title_l1: 'Tools',
      title_l2: 'that ',
      title_l2_it: 'work',
      title_l3: 'for your customers.',
      sub: 'We design websites, internal tools and AI agents for restaurants, shops and local services. No useless custom work — just what saves you time, calls and sales.',
      cta_primary: 'See our offers',
      cta_secondary: "Let's discuss your project",
      stat_1_n: '06', stat_1_l: 'Active partners', stat_1_d: 'Restaurants, schools, makers',
      stat_2_n: '24h', stat_2_l: 'First reply', stat_2_d: 'Free phone audit',
      stat_3_n: '100%', stat_3_l: 'You own the code', stat_3_d: 'From day one',
      stat_4_n: '1.5x', stat_4_l: 'Calls handled ratio', stat_4_d: 'With a phone agent live',
      canvas_l: 'MODEL · BA-01 · STUDIO',
      canvas_r: 'ROTATION · 0.4 RPM',
    },
    manifeste: {
      num: '01 / 05',
      title_l1: 'Sites, tools,',
      title_l2_it: 'agents.',
      intro: 'Three things we make — for a single thing we aim at.',
      p1: 'You run a pizzeria, a salon, a dance school. You want a tool that works, not a tech project.',
      p2: 'One promise: we build what your customers will actually use. The rest is removed.',
      quote: '\u201cA beautiful site is fine. A site that earns is better.\u201d',
      p3: "Today, we mostly build AI agents — phone agents that answer your customers, assistants that take orders, automations that work while you live.",
      p4: "Tomorrow, we'll build what you'll need. The craft stays the same: useful tools.",
    },
    work: {
      num: '02 / 05',
      title_l1: 'Selected',
      title_l2_it: 'work.',
      intro: 'Six partners, six trades, one method: solve a real business problem.',
      items: [
        { name: 'Feuillette', desc: 'Phone agent for a bakery — automatic order taking, CRM integration, real-time tracking.', tags: ['AI', 'VOICE', 'CRM'], year: '2025' },
        { name: 'Gecko Cabane', desc: 'Restaurant site + booking. Custom design, managed hosting.', tags: ['SITE', 'BOOKING'], year: '2024' },
        { name: 'Les Folies Temps Danse', desc: 'Dance school enrolment platform — integrated management tools.', tags: ['WEB', 'TOOLS'], year: '2024' },
        { name: 'Ghjulianu Codani', desc: 'Professional portfolio — editorial design, careful build.', tags: ['SITE', 'EDITORIAL'], year: '2025' },
      ],
    },
    phone: {
      num: '03 / 05',
      badge: 'LIVE · PHONE AGENT',
      title_l1: 'Your customers',
      title_l2: 'call,',
      title_l3_it: 'we answer.',
      sub: 'An AI voice agent, wired into your CRM or order book. It answers, understands, confirms — while you work.',
      features: [
        'Instant 24/7 reply, even mid-service',
        'Full order capture with SMS confirmation',
        'Wired into your tool (CRM, calendar, stock)',
        'Natural French voice, tone of your choice',
      ],
      cta_demo: 'Hear a demo',
      cta_more: 'How it works',
      cta_roi: 'Calculate the ROI',
      flow_label: 'REAL-TIME FLOW',
      flow_rec: 'REC · 02:14',
      flow_steps: [
        { t: '02:14', k: 'Call received', v: '+33 6 12 — Mrs Dubois' },
        { t: '02:14', k: 'VAPI ↔ Claude', v: 'Understands the order' },
        { t: '02:15', k: 'MCP → CRM', v: 'Creates order #2418' },
        { t: '02:15', k: 'Confirmation', v: 'SMS sent · \u2713' },
      ],
    },
    partners: {
      title: 'TRUSTED BY — SINCE 2023',
      items: [
        { name: 'Selenium Studio', role: 'PARTNER STUDIO', color: '#C4F542' },
        { name: 'Gecko Cabane', role: 'RESTAURANT', color: '#E07856' },
        { name: 'Victor Verissimo', role: 'ARTIST PORTFOLIO', color: '#9A9690' },
        { name: 'Ghjulianu Codani', role: 'PROFESSIONAL', color: '#C4F542' },
        { name: 'Les Folies Temps Danse', role: 'DANCE SCHOOL', color: '#E07856' },
        { name: 'AJMG·EXP', role: 'EXPERTISE', color: '#9A9690' },
      ],
    },
    contact: {
      num: '05 / 05',
      title_l1: 'Got a project?',
      title_l2_it: "Let's talk.",
      sub: 'Reply within 24 business hours. First call free, no strings, to understand where you stand and what would make sense.',
      info: [
        { k: 'Email', v: 'contact@sevalys.com' },
        { k: 'Phone', v: '+33 (0)6 07 18 41 33' },
        { k: 'Address', v: 'Tours, France · remote everywhere' },
        { k: 'Availability', v: 'New projects from June 2026' },
      ],
      form: {
        name_l: 'You are',
        name_p: 'First + last name',
        email_l: 'Email',
        email_p: 'you@company.com',
        type_l: 'Project type',
        type_o: ['Marketing site', 'Internal tool', 'AI / Phone agent', 'Rebuild / migration', 'Other — let\'s talk'],
        msg_l: 'Project in 2-3 lines',
        msg_p: "Describe what's blocking you or what you want to build\u2026",
        submit: 'Send',
        submitting: 'Sending\u2026',
        success: 'Received — reply within 24h.',
        note: 'We store nothing but this email.',
      },
    },
    footer: {
      built: 'Designed and coded in Tours.',
      legal: 'Legal notice',
      rights: 'All rights reserved.',
    },
  },
};

const th: Translations = {
  nav: {
    services: 'บริการ',
    contact: 'ติดต่อ',
    manifeste: 'แถลงการณ์',
    work: 'ผลงาน',
  },
  services: {
    hero: {
      badge: "บริการ & ราคา — 2026",
      title_l1: "เว็บไซต์",
      title_l2: "เครื่องมือ",
      title_l3_it: "AI agents.",
      sub: "โซลูชันครบวงจรสำหรับร้านค้า ร้านอาหาร และบริการที่ต้องการสร้างความน่าเชื่อถือ ประหยัดเวลา และเพิ่มลูกค้า",
      cta_audit: "ขอตรวจสอบฟรี",
      cta_offers: "ดูบริการ",
      meta: [
        { k: "ระยะเวลาเฉลี่ย", v: "3 ถึง 6 สัปดาห์" },
        { k: "พันธะ", v: "ไม่มี" },
        { k: "ใบเสนอราคา", v: "ภายใน 48ชม" },
      ],
    },
    problem: {
      num: "01 / 09",
      title_l1: "สิ่งที่",
      title_l2_it: "คุณเสียไป",
      intro: "ทุกวันที่ขาดการปรากฏตัวดิจิทัล คือสายที่พลาด ลูกค้าที่เลือกคู่แข่ง และความน่าเชื่อถือที่หายไป",
      items: [
        { n: "A", title: "ไม่มีเว็บไซต์ ไม่มีตัวตน", desc: "ลูกค้าที่มีศักยภาพหาคุณไม่เจอออนไลน์ พวกเขาหันไปหาคู่แข่งที่มีตัวตน" },
        { n: "B", title: "เว็บล้าสมัยหรือไม่รองรับมือถือ", desc: "เว็บเก่าหรืออ่านยากบนมือถือทำลายภาพลักษณ์มืออาชีพ" },
        { n: "C", title: "ไม่มีการติดต่อผ่านอินเทอร์เน็ต", desc: "เว็บคุณมีอยู่แต่ไม่สร้างคำขอ มันไม่ได้ทำงานเพื่อคุณ" },
        { n: "D", title: "สูญเสียความน่าเชื่อถือ", desc: "ในปี 2026 บริษัทที่ไม่มีตัวตนดิจิทัลทันสมัย สูญเสียความเชื่อมั่นก่อนการติดต่อแรก" },
      ],
      good_news: "ข่าวดี: ปัญหาเหล่านี้มีทางแก้ที่ง่ายและเข้าถึงได้",
    },
    approach: {
      num: "02 / 09",
      title_l1: "วิธีของ",
      title_l2_it: "เรา",
      intro: "เราสร้างเว็บที่ปรับแต่งตามความต้องการเพื่อเปลี่ยนผู้เข้าชมเป็นลูกค้า ไม่มีของทั่วไป",
      benefits: ["เว็บไซต์ทันสมัย เป็นมืออาชีพ", "เพิ่มประสิทธิภาพในการสร้างลูกค้า", "รวดเร็วและมีประสิทธิภาพ", "รองรับทุกหน้าจอ", "รวม SEO ท้องถิ่น", "การสนับสนุนส่วนตัว"],
      cards: [
        { t: "มุ่งเน้นผลลัพธ์", d: "ทุกองค์ประกอบออกแบบเพื่อการแปลง" },
        { t: "พันธมิตรระยะยาว", d: "การสนับสนุนที่ไม่หยุดแค่การเปิดตัว" },
        { t: "คุณภาพระดับพรีเมียม", d: "เทคโนโลยีทันสมัย ดีไซน์ประณีต" },
      ],
    },
    offers: {
      num: "03 / 09",
      title_l1: "บริการ",
      title_l2_it: "ของเรา",
      intro: "สี่แพ็กเกจสำหรับทุกขั้นของการเติบโต ราคาเปิดเผย ใบเสนอราคาส่งภายใน 48ชม",
      from: "เริ่มต้นที่",
      popular: "ได้รับความนิยม",
      cta: "ขอใบเสนอราคา",
      items: [
        { name: "Landing Page", tagline: "สิ่งจำเป็นเพื่อการมองเห็น", price: "45,000 – 70,000 ฿", description: "การปรากฏตัวออนไลน์ที่ชัดเจนและเป็นมืออาชีพสำหรับการเริ่มต้น", features: ["ดีไซน์ทันสมัยและกำหนดเอง", "รองรับมือถือและแท็บเล็ต", "นำเสนอบริการของคุณอย่างชัดเจน", "แบบฟอร์มติดต่อ", "ผสาน Google Maps", "SEO ท้องถิ่น", "รวมการเปิดตัว"] },
        { name: "Rebranding + เว็บพรีเมียม", tagline: "เปลี่ยนภาพลักษณ์", price: "100,000 – 155,000 ฿", description: "ปรับปรุงภาพลักษณ์ทั้งหมดและเสริมความน่าเชื่อถือ", features: ["ตรวจสอบภาพลักษณ์", "ปรับปรุงโลโก้", "ชุดสีใหม่", "ฟอนต์มืออาชีพ", "แนวทางแบรนด์", "เว็บไซต์ใหม่", "การฝึกอบรม"] },
        { name: "โปรเจกต์กำหนดเอง", tagline: "ความต้องการเฉพาะ", price: "ตามการประเมิน", description: "สำหรับโปรเจกต์ที่ต้องการฟีเจอร์ขั้นสูง", features: ["เว็บหลายหน้า", "ร้านค้าออนไลน์", "ระบบการจอง", "ฟีเจอร์เฉพาะ", "ออกแบบใหม่ทั้งหมด", "การผสานกำหนดเอง", "การสนับสนุนเฉพาะ"] },
        { name: "AI Voice Agent", tagline: "โทรศัพท์ของคุณ อัตโนมัติ", price: "เริ่มต้นที่ 990 €", description: "ตัวแทนโทรศัพท์อัจฉริยะ ตอบ คัดกรอง บันทึก 24ชม", features: ["ตั้งค่า VAPI + Twilio", "เสียง ElevenLabs ธรรมชาติ", "เชื่อม CRM ผ่าน MCP", "1 สถานการณ์กำหนดเอง", "รองรับ 1 เดือน"] },
      ],
    },
    phone: {
      num: "04 / 09",
      badge: "PHONE AGENT — ทำงานอย่างไร",
      title_l1: "ลูกค้าโทรมา",
      title_l2: "",
      title_l3_it: "เรารับสาย",
      sub: "โซลูชันครบวงจรเชื่อมกับเครื่องมือคุณในไม่กี่ชั่วโมง คุณคุมทุกอย่าง agent ทำที่เหลือ",
      steps: [
        { label: "ลูกค้าโทร", desc: "หมายเลข Twilio สำหรับธุรกิจคุณ" },
        { label: "AI เข้าใจ", desc: "Claude Sonnet วิเคราะห์คำขอภาษาธรรมชาติ" },
        { label: "CRM อัพเดท", desc: "ผ่าน MCP คำสั่งซื้อหรือนัดถูกบันทึก" },
        { label: "คุณได้รับแจ้ง", desc: "Dashboard อัพเดทแบบเรียลไทม์" },
      ],
      cta: "ลองเดโม",
      cta_roi: "คำนวณ ROI",
    },
    maintenance: {
      num: "05 / 09",
      title_l1: "บำรุงรักษา",
      title_l2_it: "& โฮสติ้ง",
      intro: "เว็บไซต์คุณทำงานเร็ว ปลอดภัย ทันสมัย คุณไม่ต้องจัดการอะไร สามแพ็กเกจ ไม่มีพันธะ",
      recommended: "แนะนำ",
      per_month: "/เดือน",
      currency: "฿",
      packs: [
        { name: "Essential", price: "1,900", description: "สิ่งจำเป็นเพื่อเว็บที่ปลอดภัยและใช้งานได้", features: ["โฮสติ้งประสิทธิภาพสูง", "รวมโดเมน", "SSL (https)", "สำรองข้อมูลอัตโนมัติ", "ตรวจสอบ 24/7", "อัพเดตเทคนิค", "สนับสนุนทางอีเมล"] },
        { name: "Business", price: "3,100", popular: true, description: "สำหรับธุรกิจที่เติบโต", features: ["ทุกอย่างใน Essential", "1ชม แก้ไข/เดือน", "เพิ่มประสิทธิภาพ", "รายงานรายเดือน", "ตอบสนองด่วน"] },
        { name: "Premium", price: "4,990", priceNote: "+", description: "ความสงบและการเติบโตต่อเนื่อง", features: ["ทุกอย่างใน Business", "2ชม แก้ไข/เดือน", "ความปลอดภัยเพิ่ม", "SEO ต่อเนื่อง", "สนับสนุนด่วน", "คำแนะนำเชิงกลยุทธ์รายเดือน"] },
      ],
      perks: ["−10% หากชำระรายปี", "ไม่มีพันธะ", "ปรับได้ตามความต้องการ"],
    },
    upsell: {
      num: "06 / 09",
      title_l1: "ตัวเลือก",
      title_l2_it: "เพิ่มเติม",
      intro: "ปรับแต่งโปรเจกต์ตามความต้องการเฉพาะ",
      options: [
        { name: "สร้างเนื้อหา", desc: "เขียนข้อความระดับมืออาชีพ" },
        { name: "SEO ขั้นสูง", desc: "ปรับแต่งเชิงลึกสำหรับ Google" },
        { name: "Google Ads", desc: "โฆษณากำหนดเป้าหมาย" },
        { name: "การผสาน CRM", desc: "เชื่อมเว็บกับเครื่องมือ" },
        { name: "บล็อกในตัว", desc: "แบ่งปันความเชี่ยวชาญ" },
        { name: "เว็บหลายภาษา", desc: "เข้าถึงระดับนานาชาติ" },
        { name: "ชั่วโมงพิเศษ", desc: "แก้ไขเพิ่มเติมตามต้องการ" },
        { name: "ฝึกอบรมส่วนตัว", desc: "เรียนรู้การจัดการเว็บ" },
      ],
    },
    method: {
      num: "07 / 09",
      title_l1: "กระบวนการ",
      title_l2_it: "ทำงาน",
      intro: "กระบวนการเรียบง่ายและโปร่งใส จากการสนทนาแรกถึงการเปิดตัว หกขั้นตอน ไม่มากกว่านี้",
      steps: [
        { n: "01", t: "ตรวจสอบฟรี", d: "เราวิเคราะห์สถานการณ์และเป้าหมายในการโทร 30 นาที" },
        { n: "02", t: "ข้อเสนอชัดเจน", d: "รับใบเสนอราคาละเอียด ไม่มีค่าใช้จ่ายแอบแฝง" },
        { n: "03", t: "ต้นแบบ", d: "เราสร้างต้นแบบภาพเพื่อการอนุมัติ" },
        { n: "04", t: "พัฒนา", d: "เราสร้างเว็บด้วยเทคโนโลยีล่าสุด" },
        { n: "05", t: "เปิดตัว", d: "เว็บคุณเผยแพร่บนโดเมนของคุณ" },
        { n: "06", t: "ติดตาม 30 วัน", d: "เราพร้อมปรับเปลี่ยนและแนะนำการใช้งาน" },
      ],
    },
    reassurance: {
      num: "08 / 09",
      title_l1: "ทำไมต้อง",
      title_l2_it: "ไว้ใจเรา",
      intro: "สี่เหตุผลที่เปลี่ยนความสัมพันธ์ได้จริง",
      points: [
        { t: "ผู้ติดต่อเดียว", d: "ผู้ติดต่อเพียงคนเดียวตั้งแต่ต้นจนจบ" },
        { t: "โซลูชันครบวงจร", d: "เราจัดการทุกอย่าง คุณไม่ต้องทำอะไร" },
        { t: "การสนับสนุนส่วนตัว", d: "แต่ละโปรเจกต์ไม่เหมือนกัน เราใช้เวลาเข้าใจ" },
        { t: "วิสัยทัศน์ระยะยาว", d: "เราไม่ใช่แค่ผู้ให้บริการ แต่เป็นพันธมิตร" },
      ],
    },
    finalCta: {
      num: "09 / 09",
      title_l1: "พร้อม",
      title_l2: "เปลี่ยน",
      title_l3_it: "ตัวตนคุณ?",
      desc: "จองตรวจสอบฟรี 30 นาที เราจะวิเคราะห์สถานการณ์ร่วมกันและกำหนดกลยุทธ์ที่ดีที่สุด",
      cta: "จองตรวจสอบฟรี",
      email: "ส่งอีเมล",
      note: "ไม่มีพันธะ · ฟรี 100% · ตอบใน 24ชม",
    },
  },
  landing: {
    hero: {
      pill: 'เอเจนซี่ · ตูร์ ฝรั่งเศส · พร้อมตั้งแต่พ.ค. 2026',
      title_l1: 'เครื่องมือ',
      title_l2: 'ที่ ',
      title_l2_it: 'ทำงาน',
      title_l3: 'เพื่อลูกค้าของคุณ',
      sub: 'เราออกแบบเว็บไซต์ เครื่องมือจัดการ และ AI agents สำหรับร้านอาหาร ร้านค้า และบริการท้องถิ่น ไม่มีของฟุ่มเฟือย — มีแต่สิ่งที่ช่วยประหยัดเวลา รับสายและเพิ่มยอดขาย',
      cta_primary: 'ดูบริการ',
      cta_secondary: 'คุยเรื่องโปรเจกต์',
      stat_1_n: '06', stat_1_l: 'พาร์ทเนอร์ปัจจุบัน', stat_1_d: 'ร้านอาหาร โรงเรียน อิสระ',
      stat_2_n: '24ชม', stat_2_l: 'ตอบกลับแรก', stat_2_d: 'ปรึกษาฟรี',
      stat_3_n: '100%', stat_3_l: 'เป็นเจ้าของโค้ด', stat_3_d: 'ตั้งแต่วันแรก',
      stat_4_n: '1.5x', stat_4_l: 'อัตรารับสาย', stat_4_d: 'เมื่อมี phone agent',
      canvas_l: 'โมเดล · BA-01',
      canvas_r: 'หมุน · 0.4 RPM',
    },
    manifeste: {
      num: '01 / 05',
      title_l1: 'เว็บไซต์ เครื่องมือ',
      title_l2_it: 'AI agents',
      intro: 'สามอย่างที่เราทำ — เพื่อเป้าหมายเดียว',
      p1: 'คุณเป็นเจ้าของพิซเซเรีย ผู้จัดการร้านเสริมสวย ผู้บริหารโรงเรียนสอนเต้น คุณต้องการเครื่องมือที่ใช้ได้จริง',
      p2: 'เราสัญญาแค่อย่างเดียว: สร้างสิ่งที่ลูกค้าของคุณจะใช้จริง ส่วนอื่นๆเราตัดทิ้ง',
      quote: '« เว็บสวยก็ดี เว็บที่สร้างรายได้ดีกว่า »',
      p3: 'ตอนนี้เราสร้าง AI agents เป็นหลัก — phone agents ที่รับสายลูกค้า ผู้ช่วยรับออเดอร์ ระบบอัตโนมัติที่ทำงานแทนคุณ',
      p4: 'พรุ่งนี้เราจะสร้างสิ่งที่คุณต้องการ ฝีมือยังเหมือนเดิม: เครื่องมือที่มีประโยชน์',
    },
    work: {
      num: '02 / 05',
      title_l1: 'ผลงาน',
      title_l2_it: 'ที่คัดสรร',
      intro: 'พาร์ทเนอร์ 6 ราย 6 อาชีพ วิธีเดียวกัน: แก้ปัญหาทางธุรกิจจริง',
      items: [
        { name: 'Feuillette', desc: 'Phone agent สำหรับร้านเบเกอรี่ — รับออเดอร์อัตโนมัติ', tags: ['AI', 'เสียง', 'CRM'], year: '2025' },
        { name: 'Gecko Cabane', desc: 'เว็บร้านอาหาร + จองโต๊ะ ดีไซน์เฉพาะ โฮสติ้งดูแลให้', tags: ['เว็บ', 'จอง'], year: '2024' },
        { name: 'Les Folies Temps Danse', desc: 'แพลตฟอร์มลงทะเบียนโรงเรียนสอนเต้น', tags: ['เว็บ', 'จัดการ'], year: '2024' },
        { name: 'Ghjulianu Codani', desc: 'Portfolio ระดับมืออาชีพ', tags: ['เว็บ', 'บรรณาธิการ'], year: '2025' },
      ],
    },
    phone: {
      num: '03 / 05',
      badge: 'LIVE · PHONE AGENT',
      title_l1: 'ลูกค้าโทรมา',
      title_l2: '',
      title_l3_it: 'เรารับสาย',
      sub: 'AI voice agent ที่เชื่อมกับ CRM หรือสมุดออเดอร์ของคุณ มันรับสาย เข้าใจ ยืนยัน — ขณะที่คุณทำงาน',
      features: [
        'ตอบทันที 24/7 แม้ระหว่างให้บริการ',
        'รับออเดอร์ครบพร้อมยืนยันทาง SMS',
        'เชื่อมกับเครื่องมือคุณ (CRM ปฏิทิน สต็อก)',
        'เสียงฝรั่งเศสธรรมชาติ โทนตามที่คุณเลือก',
      ],
      cta_demo: 'ฟังเดโม',
      cta_more: 'ทำงานอย่างไร',
      cta_roi: 'คำนวณ ROI',
      flow_label: 'FLUX แบบเรียลไทม์',
      flow_rec: 'REC · 02:14',
      flow_steps: [
        { t: '02:14', k: 'รับสาย', v: '+33 6 12 — คุณดูบัวส์' },
        { t: '02:14', k: 'VAPI ↔ Claude', v: 'เข้าใจออเดอร์' },
        { t: '02:15', k: 'MCP → CRM', v: 'สร้างออเดอร์ #2418' },
        { t: '02:15', k: 'ยืนยัน', v: 'ส่ง SMS · ✓' },
      ],
    },
    partners: {
      title: 'ลูกค้าที่ไว้วางใจ — ตั้งแต่ 2023',
      items: [
        { name: 'Selenium Studio', role: 'STUDIO หุ้นส่วน', color: '#C4F542' },
        { name: 'Gecko Cabane', role: 'ร้านอาหาร', color: '#E07856' },
        { name: 'Victor Verissimo', role: 'ARTIST PORTFOLIO', color: '#9A9690' },
        { name: 'Ghjulianu Codani', role: 'PROFESSIONAL', color: '#C4F542' },
        { name: 'Les Folies Temps Danse', role: 'โรงเรียนสอนเต้น', color: '#E07856' },
        { name: 'AJMG·EXP', role: 'EXPERTISE', color: '#9A9690' },
      ],
    },
    contact: {
      num: '05 / 05',
      title_l1: 'มีโปรเจกต์?',
      title_l2_it: 'คุยกัน',
      sub: 'ตอบใน 24 ชม ทำการ ปรึกษาครั้งแรกฟรี ไม่มีพันธะ เพื่อเข้าใจว่าคุณอยู่ตรงไหนและอะไรเหมาะกับคุณ',
      info: [
        { k: 'อีเมล', v: 'contact@sevalys.com' },
        { k: 'โทรศัพท์', v: '+33 (0)6 07 18 41 33' },
        { k: 'ที่อยู่', v: 'ตูร์ ฝรั่งเศส · รีโมททุกที่' },
        { k: 'ความพร้อม', v: 'โปรเจกต์ใหม่ตั้งแต่ มิ.ย. 2026' },
      ],
      form: {
        name_l: 'คุณคือ',
        name_p: 'ชื่อ + นามสกุล',
        email_l: 'อีเมล',
        email_p: 'you@company.com',
        type_l: 'ประเภทโปรเจกต์',
        type_o: ['เว็บไซต์การตลาด', 'เครื่องมือภายใน', 'AI / Phone agent', 'สร้างใหม่ / ย้ายระบบ', 'อื่นๆ — มาคุยกัน'],
        msg_l: 'โปรเจกต์ใน 2-3 บรรทัด',
        msg_p: 'อธิบายสิ่งที่ติดขัด หรือสิ่งที่อยากสร้าง…',
        submit: 'ส่ง',
        submitting: 'กำลังส่ง…',
        success: 'รับเรียบร้อย — ตอบใน 24ชม',
        note: 'เราไม่เก็บอะไรนอกจากอีเมลนี้',
      },
    },
    footer: {
      built: 'ออกแบบและเขียนโค้ดที่ตูร์',
      legal: 'ข้อกำหนดทางกฎหมาย',
      rights: 'สงวนลิขสิทธิ์',
    },
  },
};

export const translations: Record<Lang, Translations> = { fr, en, th };
