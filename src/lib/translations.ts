export type Lang = 'fr' | 'en' | 'th';

// Content shape for a single /services/[slug] page (Phase 6). Joined via
// Service.index in src/data/services.ts -> t.services.pages.items[index].
interface ServicePageContentBase {
  name: string;
  tagline: string;
  h1Lead: string;
  h1Benefit: string;
  sub: string;
  metaTitle: string;
  metaDescription: string;
  directAnswer: string;
  problems: { n: string; title: string; desc: string }[];
  features: string[];
  enjeux: string[];
  faq: { q: string; a: string }[];
  crossLink: { label: string; slug: string } | null;
}

/**
 * WR-01 (06-REVIEW.md): a service page shows either a single case-study
 * quote (and no trust signals) or trust signals (and no quote) — never
 * both, never neither. Modeled as a discriminated union on `caseQuote` so
 * a violation (e.g. a future edit leaving `caseQuote` null while also
 * leaving `signals` empty) is a compile error instead of a silently empty
 * "Preuve sociale" section at runtime. This is enforced purely by the
 * type — no data literals needed to change, since every existing entry
 * already conforms to one of the two shapes below.
 */
export type SocialProof =
  | { caseQuote: string; signals: [] }
  | { caseQuote: null; signals: { t: string; d: string }[] };

export type ServicePageContent = ServicePageContentBase & SocialProof;

/**
 * Content shape for the /simulateur diagnostic wizard (Phase 7). The
 * `questions` record's outer keys are the question ids from
 * `src/lib/simulateur/questions.ts` and the inner `options` keys are that
 * question's option `value` strings; `translations.test.ts` enforces the
 * join, so renaming an id there without renaming it here is a test failure
 * rather than a silently missing label. `faq` intentionally reuses the
 * `{ q, a }` shape so `buildFaqJsonLd` (src/lib/serviceJsonLd.ts) consumes
 * it unchanged.
 */
export interface SimulateurContent {
  metaTitle: string;
  metaDescription: string;
  badge: string;
  h1Lead: string;
  h1Benefit: string;
  sub: string;
  directAnswer: string;
  intro: { heading: string; paragraphs: string[] };
  start: string;
  progressLabel: string;
  next: string;
  nextFinal: string;
  back: string;
  questions: Record<string, { text: string; hint: string; options: Record<string, string> }>;
  contact: {
    heading: string;
    sub: string;
    nomLabel: string;
    nomPlaceholder: string;
    emailLabel: string;
    emailPlaceholder: string;
    telephoneLabel: string;
    telephonePlaceholder: string;
    consentLabel: string;
    rgpdHeading: string;
    rgpdMentions: { k: string; v: string }[];
    submit: string;
    submitting: string;
    errorHeading: string;
    errorBody: string;
  };
  result: {
    heading: string;
    gaugeCaption: string;
    framing: { low: string; mid: string; high: string };
    servicesHeading: string;
    ctaHeading: string;
    ctaSub: string;
    callLabel: string;
    writeLabel: string;
  };
  faq: { q: string; a: string }[];
}

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
    pages: {
      index: { badge: string; title_l1: string; title_l2_it: string; sub: string; num: string; intro: string; cardCta: string };
      back: string;
      answerLabel: string;
      caseLabel: string;
      headings: { probleme: string; fonctionnement: string; enjeux: string; preuve: string; faq: string };
      ctaHeading_l1: string;
      ctaHeading_l2_it: string;
      ctaSub: string;
      ctaPrimary: string;
      ctaSecondary: string;
      items: ServicePageContent[];
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
  simulateur: SimulateurContent;
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
    problems: {
      num: string;
      title_l1: string;
      title_l2_it: string;
      intro: string;
      items: { n: string; title: string; desc: string }[];
      good_news: string;
      cta: string;
    };
    servicesPreview: {
      num: string;
      title_l1: string;
      title_l2_it: string;
      intro: string;
    };
    work: {
      num: string;
      title_l1: string;
      title_l2_it: string;
      intro: string;
      items: { name: string; desc: string; tags: string[]; year: string }[];
      bridge_title_l1: string;
      bridge_title_it: string;
      bridge_body: string;
    };
    method: {
      num: string;
      title_l1: string;
      title_l2_it: string;
      intro: string;
      steps: { n: string; t: string; d: string }[];
    };
    enjeux: {
      num: string;
      title_l1: string;
      title_l2_it: string;
      intro: string;
      points: { t: string; d: string }[];
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
    pages: {
      index: {
        badge: "NOS SERVICES — 2026",
        title_l1: "Nos",
        title_l2_it: "services.",
        sub: "Neuf expertises pour rendre votre entreprise visible, crédible et joignable. Choisissez la vôtre — ou laissez le diagnostic vous guider.",
        num: "01 / 01",
        intro: "Chaque service a sa page dédiée : le problème qu'il résout, comment on procède, et ce que ça change pour vous.",
        cardCta: "Découvrir ce service →",
      },
      back: "← Retour aux services",
      answerLabel: "EN BREF",
      caseLabel: "ÉTUDE DE CAS",
      headings: {
        probleme: "Le problème qu'on résout",
        fonctionnement: "Comment ça marche",
        enjeux: "Ce que ça change pour vous",
        preuve: "Preuve sociale",
        faq: "Questions fréquentes",
      },
      ctaHeading_l1: "Pas sûr que ce soit",
      ctaHeading_l2_it: "votre besoin ?",
      ctaSub: "Deux minutes de diagnostic et vous saurez. Sinon, écrivez-nous directement.",
      ctaPrimary: "Faire mon diagnostic →",
      ctaSecondary: "Nous contacter",
      items: [
        {
          name: "Site Vitrine",
          tagline: "L'ESSENTIEL POUR ÊTRE VISIBLE",
          h1Lead: "Site vitrine à Tours ·",
          h1Benefit: "pour exister en ligne",
          sub: "Une présence claire et professionnelle, pensée pour qu'un client vous trouve dès sa première recherche.",
          metaTitle: "Site vitrine à Tours · pour exister en ligne | Sèvalys",
          metaDescription: "Un site vitrine sur mesure à Tours pour être visible, crédible et joignable en ligne. Design responsive, SEO local, mise en ligne rapide, sans engagement.",
          directAnswer: "Un site vitrine est une présence en ligne simple et professionnelle : quelques pages qui présentent votre activité, vos services et vos coordonnées. Il permet à un client de vous trouver, de comprendre ce que vous proposez et de vous contacter en quelques secondes, depuis un mobile comme un ordinateur.",
          problems: [
            { n: "A", title: "Invisible sur Google", desc: "Sans site, vos clients potentiels tapent votre activité et trouvent vos concurrents en premier. Vous perdez des contacts avant même le premier échange." },
            { n: "B", title: "Un site vieillissant ou illisible sur mobile", desc: "Une page qui date ou qui s'affiche mal sur smartphone renvoie une image peu sérieuse, même si votre service est excellent." },
            { n: "C", title: "Un site qui ne génère aucun contact", desc: "Le site existe mais personne ne remplit le formulaire ni n'appelle : il ne travaille pas pour vous, il attend." },
          ],
          features: [
            "Design sur mesure, à votre image",
            "Responsive mobile et tablette",
            "Présentation claire de vos services",
            "Formulaire de contact intégré",
            "Intégration Google Maps",
            "SEO local de base",
            "Mise en ligne incluse",
          ],
          enjeux: [
            "Un site vitrine bien fait change ce qui se passe avant même le premier appel : un client hésitant trouve vos horaires, vos services et un moyen de vous contacter en quelques secondes, sans devoir chercher ailleurs.",
            "Résultat : plus de crédibilité dès le premier regard, et des demandes de contact qui arrivent sans que vous ayez à les provoquer.",
          ],
          caseQuote: "Depuis notre nouveau site, les clients nous trouvent facilement et réservent une table sans avoir à nous appeler pendant le service.",
          signals: [],
          faq: [
            { q: "Combien de temps pour être en ligne ?", a: "Comptez en général quelques semaines entre le premier échange et la mise en ligne, selon le contenu à préparer. Un devis détaillé arrive sous 48h, sans engagement de votre part." },
            { q: "Est-ce que je peux modifier le contenu moi-même ?", a: "Oui, vous gardez la main sur les textes et les images courantes. Pour des changements plus importants, on reste disponibles pour vous accompagner rapidement." },
            { q: "Le référencement local est-il inclus ?", a: "Un socle de référencement local est intégré dès la mise en ligne : structure claire, informations de contact et présence Google Maps pour être trouvé près de chez vous." },
            { q: "Et si je n'ai pas encore de textes ou de photos ?", a: "Pas de problème : on vous guide pour structurer le contenu, et on peut vous orienter vers des solutions simples pour les visuels, sans devis surprise." },
          ],
          crossLink: null,
        },
        {
          name: "Rebranding + Site Premium",
          tagline: "TRANSFORMEZ VOTRE IMAGE",
          h1Lead: "Rebranding + site premium à Tours ·",
          h1Benefit: "image et site, d'un bloc",
          sub: "Modernisez votre identité et votre site en une seule démarche cohérente, plutôt qu'en deux projets déconnectés.",
          metaTitle: "Rebranding + site premium à Tours · image et site, d'un bloc | Sèvalys",
          metaDescription: "Rebranding avec site premium à Tours : identité modernisée et nouveau site cohérent, en une seule démarche. Sans engagement, devis sous 48h.",
          directAnswer: "Un rebranding avec site premium modernise votre identité — logo, palette, typographies — et reconstruit votre site pour qu'il porte cette nouvelle image, en une seule démarche cohérente. Branding s'arrête à votre identité ; Rebranding + Site Premium inclut la refonte du site, la mise en ligne et la prise en main.",
          problems: [
            { n: "A", title: "Une image qui ne reflète plus votre activité", desc: "Votre entreprise a évolué mais votre logo et vos couleurs datent d'une autre époque, et ça se voit au premier coup d'œil." },
            { n: "B", title: "Un site et une identité qui se contredisent", desc: "Le site ne ressemble plus à votre image de marque actuelle, ce qui brouille le message dès la première visite." },
            { n: "C", title: "Une crédibilité en retrait face à la concurrence", desc: "Des concurrents mieux présentés captent l'attention en premier, même quand votre offre est meilleure." },
          ],
          features: [
            "Audit de votre image actuelle",
            "Modernisation du logo",
            "Nouvelle palette de couleurs",
            "Typographies professionnelles",
            "Mini charte graphique",
            "Nouveau site cohérent avec votre identité",
            "Formation à la prise en main",
          ],
          enjeux: [
            "Une image et un site alignés redonnent de la cohérence à chaque point de contact : réseaux sociaux, devanture, documents commerciaux et site web racontent enfin la même histoire.",
            "Vos clients reconnaissent votre marque partout, et votre crédibilité ne dépend plus d'un seul support qui aurait vieilli plus vite que les autres.",
          ],
          caseQuote: null,
          signals: [
            { t: "Méthodologie validée", d: "Chaque étape — audit, identité, site — est validée avec vous avant de passer à la suivante, sans surprise de dernière minute." },
            { t: "Sans engagement", d: "Vous restez libre à chaque étape du projet ; rien n'est figé avant votre accord explicite sur la direction prise." },
            { t: "Réactivité", d: "Une question, un ajustement ? Réponse sous 48h, du premier échange jusqu'à la mise en ligne du nouveau site." },
          ],
          faq: [
            { q: "Combien de temps dure un rebranding avec site premium ?", a: "Comptez plusieurs semaines entre l'audit initial et la mise en ligne, le temps de valider ensemble chaque étape de l'identité puis du site." },
            { q: "Est-ce que je garde mon nom de domaine et mes contenus existants ?", a: "Oui, votre nom de domaine reste le vôtre. Les contenus existants sont repris, adaptés ou remplacés selon ce qui sert la nouvelle identité." },
            { q: "Et si je veux seulement retravailler mon logo, sans refaire le site ?", a: "Dans ce cas, l'offre Branding correspond mieux à votre besoin : elle couvre l'identité seule, sans toucher au site existant." },
          ],
          crossLink: { label: "Juste besoin de votre identité ? Découvrez Branding →", slug: "branding" },
        },
        {
          name: "Branding",
          tagline: "VOTRE IDENTITÉ, AU CLAIR",
          h1Lead: "Branding à Tours ·",
          h1Benefit: "une identité qu'on reconnaît",
          sub: "Une identité cohérente sur votre devanture, vos réseaux et vos documents — sans toucher à votre site existant.",
          metaTitle: "Branding à Tours · une identité qu'on reconnaît | Sèvalys",
          metaDescription: "Branding à Tours : logo, palette, typographies et charte graphique complète pour une identité cohérente, sans refonte de site. Sans engagement.",
          directAnswer: "Le branding construit votre identité de marque — logo, couleurs, typographies, charte graphique et ton de voix — applicable à votre site existant, sans refonte du site : aucun site n'est livré. Branding s'arrête à votre identité ; Rebranding + Site Premium inclut la refonte du site, pour qui a besoin des deux à la fois.",
          problems: [
            { n: "A", title: "Un logo bricolé ou hérité par hasard", desc: "Votre logo actuel a été fait dans l'urgence ou récupéré d'un ancien projet, et ne reflète plus le sérieux de votre activité." },
            { n: "B", title: "Des couleurs et des typos différentes partout", desc: "Chaque support — site, réseaux, documents — utilise ses propres couleurs et polices, ce qui brouille votre image." },
            { n: "C", title: "Une marque qu'on ne reconnaît pas d'un canal à l'autre", desc: "Un client voit votre enseigne, puis vos réseaux sociaux, et ne fait pas le lien entre les deux." },
          ],
          features: [
            "Plateforme de marque (positionnement, promesse)",
            "Création ou refonte du logo",
            "Palette de couleurs",
            "Typographies professionnelles",
            "Charte graphique complète",
            "Déclinaisons enseigne, réseaux et documents",
            "Ton de voix défini",
          ],
          enjeux: [
            "Une identité claire se reconnaît immédiatement, sur votre devanture comme sur vos réseaux sociaux ou vos documents commerciaux — un même visage, partout où vos clients vous croisent.",
            "Cette cohérence renforce votre image professionnelle sans nécessiter de toucher à votre site actuel : vous appliquez la nouvelle identité à ce qui existe déjà.",
          ],
          caseQuote: null,
          signals: [
            { t: "Fichiers sources livrés", d: "Vous recevez tous les fichiers sources de votre identité et en restez pleinement propriétaire, sans dépendance envers nous." },
            { t: "Allers-retours cadrés", d: "Le processus prévoit un nombre défini d'allers-retours à chaque étape, pour affiner l'identité sans jamais repartir de zéro." },
            { t: "Sans engagement", d: "Vous validez chaque étape avant de passer à la suivante ; rien n'est imposé au-delà de ce que vous approuvez." },
          ],
          faq: [
            { q: "Est-ce que je récupère les fichiers sources ?", a: "Oui, tous les fichiers sources (logo, palette, typographies, charte) vous sont remis à la fin du projet. Vous en restez pleinement propriétaire." },
            { q: "Faut-il refaire mon site après un rebranding d'identité ?", a: "Non, la nouvelle identité s'applique à votre site existant. Si vous souhaitez aussi un nouveau site, l'offre Rebranding + Site Premium couvre les deux à la fois." },
            { q: "Combien d'allers-retours sont prévus ?", a: "Le nombre d'allers-retours est défini ensemble avant de démarrer, pour affiner chaque élément de l'identité sans dépasser un cadre clair." },
          ],
          crossLink: { label: "Besoin d'un site aussi ? Découvrez Rebranding + Site Premium →", slug: "rebranding-site-premium" },
        },
        {
          name: "Projet Sur Mesure",
          tagline: "VOS BESOINS SPÉCIFIQUES",
          h1Lead: "Projet web sur mesure à Tours ·",
          h1Benefit: "quand le standard ne suffit plus",
          sub: "Votre activité a dépassé le site vitrine : réservation, catalogue, espace membre. On construit l'outil qui suit votre métier.",
          metaTitle: "Projet web sur mesure à Tours · quand le standard ne suffit plus | Sèvalys",
          metaDescription: "Un projet web sur mesure à Tours pour remplacer réservations papier, catalogues et outils déconnectés par une solution unique adaptée à votre activité. Devis sous 48h.",
          directAnswer: "Un projet sur mesure devient nécessaire quand votre activité dépend d'un processus qu'aucun site vitrine ne couvre : réservations en ligne, catalogue produit, espace client, ou connexion à un outil déjà en place. On construit alors une solution propre à votre métier, pensée pour ce cas précis plutôt que pliée dans un gabarit générique.",
          problems: [
            { n: "A", title: "Un processus géré à la main", desc: "Réservations par téléphone, fiches papier, tableur partagé : chaque étape dépend d'une personne qui s'en souvient et qui doit tout ressaisir." },
            { n: "B", title: "Un outil existant qui ne parle pas au site", desc: "Votre logiciel de caisse, votre planning ou votre stock vivent à part ; le site ne les reflète jamais et vous ressaisissez deux fois la même information." },
            { n: "C", title: "Un besoin fonctionnel qu'aucun template ne couvre", desc: "Réservation avec créneaux, espace membre, catalogue filtrable : ces fonctions demandent un développement pensé pour votre cas, pas un thème générique ajusté." },
          ],
          features: [
            "Site multi-pages complet",
            "Boutique en ligne",
            "Système de réservation",
            "Espace membre ou back-office",
            "Intégrations avec vos outils existants",
            "Refonte complète du site",
            "Accompagnement dédié tout au long du projet",
          ],
          enjeux: [
            "Un outil sur mesure fait gagner un temps concret : plus de ressaisie entre le téléphone, le papier et le site, plus de double gestion entre deux outils qui s'ignorent.",
            "Le processus ne dépend plus de la mémoire d'une seule personne : il est écrit dans l'outil, accessible à toute l'équipe, et continue de fonctionner même les jours où cette personne est absente.",
          ],
          caseQuote: "Avant, les inscriptions se faisaient sur papier, avec des fiches à ressaisir une par une. Maintenant tout se passe en ligne et on gagne un temps précieux chaque rentrée.",
          signals: [],
          faq: [
            { q: "Combien de temps prend un projet sur mesure ?", a: "Cela dépend de l'ampleur du besoin : un système de réservation ou un espace membre demande plus de temps qu'une simple page supplémentaire. Un cadrage précis et un devis arrivent sous 48h, sans engagement de votre part." },
            { q: "Est-ce que vous partez de zéro ou d'un existant ?", a: "Les deux sont possibles : on peut construire l'outil depuis zéro, ou repartir de votre site actuel pour y greffer la fonctionnalité manquante sans tout reconstruire autour, en douceur et sans interruption de service pour vos visiteurs actuels." },
            { q: "Est-ce que je peux faire évoluer l'outil ensuite ?", a: "Oui : l'outil est pensé pour grandir avec vous. Une nouvelle fonctionnalité, un besoin qui change, une intégration supplémentaire — chaque évolution se cadre séparément, sans repartir de zéro, avec un cadrage sans engagement à chaque nouvelle étape." },
          ],
          crossLink: null,
        },
        {
          name: "Agent Vocal IA",
          tagline: "VOTRE TÉLÉPHONE, AUTOMATISÉ",
          h1Lead: "Agent vocal IA à Tours ·",
          h1Benefit: "qui répond pour vous 24/7",
          sub: "Ne manquez plus jamais un appel, même le soir, le week-end ou pendant le coup de feu.",
          metaTitle: "Agent vocal IA à Tours · qui répond pour vous 24/7 | Sèvalys",
          metaDescription: "Un agent vocal IA à Tours qui répond, qualifie et enregistre chaque appel 24h/24, même hors horaires. Vos correspondants sont informés qu'ils parlent à une IA.",
          directAnswer: "Un agent vocal IA est un standard téléphonique intelligent qui répond à votre place, comprend la demande, qualifie l'appel et en garde une trace exploitable. Chaque correspondant est prévenu dès le début de l'appel qu'il échange avec une intelligence artificielle, conformément à l'obligation de transparence prévue par le règlement européen sur l'IA.",
          problems: [
            { n: "A", title: "Appels manqués pendant le service ou hors horaires", desc: "Le soir, le week-end ou en plein coup de feu, personne ne décroche et l'appel part chez le concurrent suivant." },
            { n: "B", title: "Du temps passé au téléphone au lieu du métier", desc: "Chaque appel répétitif — horaires, disponibilités, simples questions — vous détourne du travail que vous seul savez faire." },
            { n: "C", title: "Informations de rappel perdues ou mal notées", desc: "Un post-it égaré, un nom mal orthographié, et le rappel promis n'arrive jamais." },
          ],
          features: [
            "Mise en place VAPI et numéro Twilio dédié",
            "Voix ElevenLabs naturelle",
            "Connexion à votre CRM via MCP",
            "Un scénario métier sur mesure",
            "Transcription et résumé de chaque appel",
            "Annonce explicite au correspondant qu'il parle à une IA",
            "Support inclus au démarrage",
          ],
          enjeux: [
            "L'agent vocal capture les appels que vous manquiez auparavant — le soir, le week-end, pendant le coup de feu — sans jamais faire attendre un client dans le vide.",
            "Votre équipe n'est plus interrompue par le téléphone à chaque commande ou question répétitive : chaque appel est répondu, qualifié et résumé, et vous reprenez la main uniquement quand c'est utile.",
          ],
          caseQuote: "Pendant le coup de feu du matin, on ne décrochait plus. Maintenant l'agent répond à chaque appel et prend la commande sans qu'on ait à lâcher le pétrin.",
          signals: [],
          faq: [
            { q: "Est-ce que mes clients savent qu'ils parlent à une IA ?", a: "Oui, explicitement : l'agent annonce dès le début de l'appel qu'il s'agit d'une intelligence artificielle. C'est une obligation légale de transparence, et ce n'est en rien caché à votre correspondant." },
            { q: "Que se passe-t-il si l'agent ne sait pas répondre ?", a: "L'agent qualifie la demande et prend un message précis si la question dépasse son scénario. Vous recevez la transcription et rappelez la personne vous-même, sans rien perdre de l'échange." },
            { q: "Est-ce que je garde mon numéro actuel ?", a: "Dans la grande majorité des cas, oui : votre numéro existant peut être redirigé vers l'agent, sans que vos clients aient à composer un nouveau numéro ni à changer leurs habitudes d'appel." },
          ],
          crossLink: null,
        },
        {
          name: "Maintenance",
          tagline: "UN SITE QUI RESTE EN VIE",
          h1Lead: "Maintenance de site web à Tours ·",
          h1Benefit: "et vous n'y pensez plus",
          sub: "Mises à jour, sauvegardes, sécurité et petites modifications : tout est géré pour que votre site continue de tourner.",
          metaTitle: "Maintenance de site web à Tours · et vous n'y pensez plus | Sèvalys",
          metaDescription: "Maintenance de site web à Tours : mises à jour, sauvegardes, sécurité et petites modifications gérées pour vous, sans engagement de durée.",
          directAnswer: "Une maintenance de site web couvre les mises à jour techniques et de sécurité, les sauvegardes régulières, la surveillance de la disponibilité et les petites modifications de contenu. Elle est nécessaire car un site laissé sans suivi finit toujours par ralentir, se fragiliser ou devenir obsolète.",
          problems: [
            { n: "A", title: "Un site qui casse ou ralentit sans prévenir", desc: "Une mise à jour oubliée, un module qui casse, et le site devient lent ou inaccessible sans que personne ne le sache tout de suite." },
            { n: "B", title: "Des contenus jamais mis à jour faute de temps", desc: "Entre le métier et le reste, personne ne trouve le temps ni le savoir-faire pour changer une simple ligne sur le site." },
            { n: "C", title: "Aucune sauvegarde le jour où ça tourne mal", desc: "Sans sauvegarde récente, une panne ou une erreur peut effacer des mois de contenu en quelques secondes." },
          ],
          features: [
            "Mises à jour techniques et de sécurité",
            "Sauvegardes régulières et restauration en cas de besoin",
            "Surveillance de la disponibilité du site",
            "Petites modifications de contenu",
            "Hébergement et nom de domaine gérés pour vous",
            "Rapport d'activité régulier",
            "Un interlocuteur unique et joignable",
          ],
          enjeux: [
            "Un site indisponible, même une heure, c'est un client qui abandonne, un appel qui ne vient jamais, une recherche qui se termine chez un concurrent.",
            "La maintenance évite ce scénario : le site reste en ligne, à jour et sécurisé, sans que vous ayez à surveiller quoi que ce soit vous-même.",
          ],
          caseQuote: null,
          signals: [
            { t: "Sans engagement de durée", d: "Vous arrêtez quand vous le souhaitez, sans préavis contraignant ni justification à fournir de votre part." },
            { t: "Délai de réponse annoncé", d: "Un problème signalé reçoit une réponse dans un délai connu à l'avance, pas une attente indéfinie sans nouvelles." },
            { t: "Vous restez propriétaire", d: "Le site, son contenu et ses accès vous appartiennent en totalité, aujourd'hui comme le jour où vous partiriez." },
          ],
          faq: [
            { q: "Qu'est-ce qui est inclus et ce qui ne l'est pas ?", a: "Sont inclus : mises à jour, sauvegardes, surveillance, hébergement et petites modifications de contenu. Les évolutions plus importantes du site — nouvelles pages, nouvelles fonctionnalités — sont cadrées à part, sur devis." },
            { q: "Est-ce que je peux arrêter quand je veux ?", a: "Oui, il n'y a aucun engagement de durée : vous pouvez arrêter à tout moment, sans justification ni pénalité de sortie à prévoir, il suffit de nous prévenir à l'avance pour organiser la transition proprement." },
            { q: "Que se passe-t-il si mon site tombe un dimanche ?", a: "La surveillance de disponibilité détecte l'incident rapidement, et une intervention est déclenchée dès que possible pour remettre le site en ligne, weekend compris, sans attendre le prochain jour ouvré pour agir." },
          ],
          crossLink: null,
        },
        {
          name: "Community Management",
          tagline: "VOS RÉSEAUX, TENUS",
          h1Lead: "Community management à Tours ·",
          h1Benefit: "des réseaux qui vivent",
          sub: "Des comptes sociaux vivants et suivis, sans que vos soirées y passent.",
          metaTitle: "Community management à Tours · des réseaux qui vivent | Sèvalys",
          metaDescription: "Community management à Tours : ligne éditoriale, calendrier de publication et réponses aux messages pour des comptes sociaux vivants et suivis, sans engagement de durée.",
          directAnswer: "Un community manager tient vos comptes Facebook et Instagram à votre place : il définit une ligne éditoriale, planifie les publications, crée les visuels et les textes, répond aux messages et aux avis, puis vous transmet un bilan régulier. Vos réseaux restent actifs et cohérents sans que vous ayez à y consacrer vos soirées.",
          problems: [
            { n: "A", title: "Un compte à l'abandon", desc: "Le compte existe mais n'a pas été mis à jour depuis des mois, ce qui inquiète plus qu'il ne rassure un visiteur qui le découvre." },
            { n: "B", title: "Des publications irrégulières, sans ligne directrice", desc: "Une photo de temps en temps, sans rythme ni fil conducteur : impossible de construire une image cohérente dans la durée." },
            { n: "C", title: "Messages et avis laissés sans réponse", desc: "Une question en message privé, un avis Google qui attend une réponse : le silence se voit et donne une mauvaise image." },
          ],
          features: [
            "Ligne éditoriale définie avec vous",
            "Calendrier de publication",
            "Création des visuels et des textes",
            "Publication sur vos comptes",
            "Réponses aux messages et aux commentaires",
            "Veille et suivi des avis",
            "Bilan régulier de l'activité",
          ],
          enjeux: [
            "Entre deux recherches Google, un client hésitant passe souvent par vos réseaux sociaux pour se faire une idée : un compte vivant, qui répond et qui montre votre quotidien, rassure là où un compte à l'abandon inquiète.",
            "Cette présence régulière construit la confiance avant même le premier contact direct, et transforme vos réseaux en un réel point d'appui commercial plutôt qu'en simple vitrine oubliée.",
          ],
          caseQuote: null,
          signals: [
            { t: "Validation avant publication", d: "Chaque publication vous est soumise avant sa mise en ligne ; rien ne part sur vos comptes sans votre accord explicite." },
            { t: "Comptes à votre nom", d: "Facebook et Instagram restent enregistrés à votre nom, avec vos accès ; vous en gardez la pleine maîtrise à tout moment." },
            { t: "Sans reconduction automatique", d: "L'engagement est mensuel et ne se renouvelle jamais automatiquement ; vous décidez de continuer ou non, mois après mois." },
          ],
          faq: [
            { q: "Combien de publications par mois sont prévues ?", a: "Le rythme est défini ensemble selon votre activité et vos réseaux, généralement plusieurs publications chaque semaine. Le volume exact est fixé avant de démarrer, sans surprise ensuite." },
            { q: "Est-ce que je valide les publications avant qu'elles partent ?", a: "Oui, chaque publication vous est soumise pour accord avant sa mise en ligne. Rien ne part sur vos comptes sans votre validation explicite, à chaque fois." },
            { q: "Agence ou freelance, quelle différence pour ce service ?", a: "La différence tient à la continuité et au cadre : un interlocuteur unique, un engagement mensuel sans reconduction automatique, et une ligne éditoriale suivie dans la durée plutôt qu'une prestation ponctuelle." },
          ],
          crossLink: null,
        },
        {
          name: "Meta Ads",
          tagline: "FACEBOOK ET INSTAGRAM",
          h1Lead: "Meta Ads à Tours ·",
          h1Benefit: "des campagnes qui ciblent juste",
          sub: "Toucher les bons clients près de chez vous sur Facebook et Instagram, plutôt que booster une publication au hasard.",
          metaTitle: "Meta Ads à Tours · des campagnes qui ciblent juste | Sèvalys",
          metaDescription: "Meta Ads à Tours : audiences locales, visuels et suivi de conversion pour des campagnes Facebook et Instagram qui ciblent juste. Sans engagement de durée.",
          directAnswer: "Une campagne Meta Ads sert à montrer vos publicités aux bonnes personnes, dans votre zone de chalandise, sur Facebook et Instagram, plutôt qu'à espérer une visibilité aléatoire. Elle cible par lieu, âge et centres d'intérêt, mesure ce qui convertit réellement, et s'ajuste en continu pour toucher un client potentiel plutôt qu'un inconnu hors zone.",
          problems: [
            { n: "A", title: "Publications boostées au hasard", desc: "Un bouton \"booster\" cliqué de temps en temps, sans stratégie ni suivi, ne produit presque jamais de résultat lisible ou durable." },
            { n: "B", title: "Un ciblage trop large", desc: "Sans réglage précis, les publicités touchent des personnes situées loin de votre zone, qui ne deviendront jamais des clientes." },
            { n: "C", title: "Aucune visibilité sur ce que ça rapporte", desc: "La dépense publicitaire part chaque mois sans qu'aucun rapport ne montre ce qu'elle a réellement apporté à l'activité." },
          ],
          features: [
            "Définition des audiences locales",
            "Création des visuels et des accroches",
            "Mise en place du suivi de conversion",
            "Lancement et pilotage des campagnes",
            "Tests de plusieurs accroches",
            "Rapport clair des résultats",
            "Ajustements en cours de route",
          ],
          enjeux: [
            "Une campagne bien ciblée touche le quartier et la ville où vivent vos clients, pas l'ensemble du pays : chaque impression a une chance réelle de devenir un client plutôt qu'une vue perdue.",
            "Ce ciblage local change la nature même de la publicité : elle cesse d'être une dépense floue pour devenir un levier mesurable, ajusté semaine après semaine selon ce qui fonctionne vraiment.",
          ],
          caseQuote: null,
          signals: [
            { t: "Vous gardez la main sur le compte", d: "Le compte publicitaire reste sous votre contrôle ; vous gardez un accès complet et pouvez le reprendre à tout moment." },
            { t: "Résultats sans jargon", d: "Les rapports sont présentés en langage clair, sans termes techniques inutiles, pour que vous compreniez exactement ce qui fonctionne." },
            { t: "Arrêt possible à tout moment", d: "Aucune durée minimale n'est imposée ; une campagne peut être mise en pause ou arrêtée dès que vous le souhaitez." },
          ],
          faq: [
            { q: "Qui paie la diffusion des publicités, et à qui ?", a: "La diffusion est payée directement à Meta depuis votre propre compte publicitaire ; nous ne facturons rien en plus de ce paiement direct, uniquement notre accompagnement sur la stratégie et le pilotage." },
            { q: "En combien de temps voit-on des résultats ?", a: "Les premiers signaux apparaissent souvent après une à deux semaines de diffusion, le temps d'affiner le ciblage et les accroches ; des résultats stables et durables demandent généralement plusieurs semaines de pilotage continu." },
            { q: "Faut-il déjà avoir une page Facebook active ?", a: "Une page Facebook et un compte Instagram sont nécessaires pour diffuser les publicités ; s'ils n'existent pas encore ou doivent être mis à jour, la création ou la remise à niveau se fait avant le lancement." },
          ],
          crossLink: null,
        },
        {
          name: "Google Ads",
          tagline: "VISIBLE QUAND ON VOUS CHERCHE",
          h1Lead: "Google Ads à Tours ·",
          h1Benefit: "en tête quand ça compte",
          sub: "Apparaître en tête sur les recherches qui amènent vraiment des clients, pas sur toutes les requêtes possibles.",
          metaTitle: "Google Ads à Tours · en tête quand ça compte | Sèvalys",
          metaDescription: "Google Ads à Tours : sélection des requêtes qui convertissent, annonces rédigées et suivi des appels pour être visible quand on vous cherche. Sans engagement de durée.",
          directAnswer: "Google Ads est pertinent pour une PME locale dès qu'il existe des recherches immédiates à capter — un besoin urgent, une envie précise — car les annonces apparaissent en tête dès leur activation, contrairement au référencement naturel qui prend des mois à s'installer mais reste ensuite durable sans coût par clic. Les deux se complètent plutôt qu'ils ne s'opposent.",
          problems: [
            { n: "A", title: "Invisible sur les requêtes qui comptent", desc: "Vos clients tapent exactement ce que vous proposez, mais une autre enseigne apparaît en premier et capte la demande à votre place." },
            { n: "B", title: "Une campagne lancée puis oubliée", desc: "Des annonces mises en ligne une fois, puis jamais ajustées, finissent par gaspiller le budget sans plus rien apporter d'utile." },
            { n: "C", title: "Des clics hors zone ou hors cible", desc: "Sans exclusions précises, une partie des clics vient de personnes situées loin de Tours ou sans réel besoin, pour rien." },
          ],
          features: [
            "Sélection des requêtes qui convertissent",
            "Exclusion des requêtes inutiles",
            "Rédaction des annonces",
            "Extensions et fiche établissement reliées",
            "Suivi des appels et des formulaires",
            "Pilotage et ajustements continus",
            "Rapport clair des résultats",
          ],
          enjeux: [
            "Google Ads ne crée pas l'envie d'achat : il capte une intention qui existe déjà, au moment précis où quelqu'un cherche activement ce que vous proposez, plutôt que d'espérer qu'il tombe sur vous par hasard.",
            "Cette logique change la manière de dépenser un budget publicitaire : chaque clic répond à une recherche réelle, avec une intention déjà présente, ce qui rend le suivi et l'ajustement bien plus lisibles qu'une publicité display classique.",
          ],
          caseQuote: null,
          signals: [
            { t: "Propriété du compte publicitaire", d: "Le compte Google Ads est ouvert à votre nom et reste votre propriété complète, aujourd'hui comme si vous partiez demain." },
            { t: "Requêtes et exclusions visibles", d: "Vous pouvez consulter à tout moment la liste des requêtes ciblées et exclues, sans zone d'ombre sur le pilotage." },
            { t: "Aucune durée imposée", d: "La campagne peut être mise en pause ou arrêtée à tout moment, sans durée minimale ni justification à fournir." },
          ],
          faq: [
            { q: "Google Ads ou référencement naturel : faut-il choisir ?", a: "Les deux se complètent plutôt qu'ils ne s'opposent : Google Ads apporte une visibilité immédiate le temps que le référencement naturel s'installe durablement sur les mêmes requêtes, sans dépendre uniquement des annonces payantes." },
            { q: "Qui paie les clics, et à qui vont-ils ?", a: "Chaque clic est payé directement à Google depuis votre propre compte Google Ads ; nous ne facturons rien en plus de ce paiement direct, uniquement le pilotage et la stratégie des campagnes." },
            { q: "En combien de temps les annonces tournent-elles ?", a: "Une fois le compte configuré et les annonces validées, la diffusion démarre généralement en quelques jours seulement ; les premiers ajustements de ciblage suivent dès les toutes premières semaines de diffusion réelle." },
          ],
          crossLink: null,
        },
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
  simulateur: {
    metaTitle: 'Simulateur de diagnostic digital à Tours · Sèvalys',
    metaDescription: "Répondez à quelques questions sur votre activité et obtenez immédiatement une recommandation personnalisée de 2 à 4 leviers digitaux prioritaires, sans engagement.",
    badge: 'Diagnostic · sans engagement',
    h1Lead: 'Quels leviers digitaux',
    h1Benefit: 'pour votre entreprise ?',
    sub: "Un diagnostic court et honnête : quelques questions sur votre activité, et nous identifions les 2 à 4 leviers qui comptent vraiment pour vous — pas une liste de tout ce que nous savons faire.",
    directAnswer: "Le simulateur Sèvalys est un questionnaire de diagnostic en ligne : vous répondez à quatre ou cinq questions sur votre secteur, l'état de votre présence en ligne et vos freins actuels, puis vous obtenez immédiatement une recommandation de 2 à 4 services adaptés et un indice de maturité digitale. Aucune estimation chiffrée n'est produite.",
    intro: {
      heading: 'Comment fonctionne ce diagnostic',
      paragraphs: [
        "Ce diagnostic sert à trier. La plupart des entreprises que nous rencontrons n'ont pas besoin de tout refaire : elles ont besoin de savoir par quoi commencer.",
        "Vous répondez à quatre ou cinq questions — votre secteur, l'état de votre présence en ligne, ce qui vous freine aujourd'hui, et votre priorité des trois prochains mois. Chaque réponse pondère les neuf services de Sèvalys, et seuls les deux à quatre mieux classés vous sont proposés.",
        "Répondez honnêtement, surtout quand la réponse est peu flatteuse : une réponse optimiste produit une recommandation inutile. À la fin, vous laissez vos coordonnées et votre résultat s'affiche immédiatement.",
      ],
    },
    start: 'Commencer mon diagnostic →',
    progressLabel: 'Question {current} sur {total}',
    next: 'Suivant →',
    nextFinal: 'Voir ma recommandation →',
    back: '← Précédent',
    questions: {
      'secteur': {
        text: 'Dans quel secteur travaillez-vous ?',
        hint: "Cela nous aide à pondérer les recommandations. Aucun service n'est écarté d'avance.",
        options: {
          'commerce-local': 'Commerce de proximité',
          'restauration-hotellerie': 'Restauration ou hôtellerie',
          'artisan-btp': 'Artisanat ou BTP',
          'services-pro': 'Services aux entreprises',
          'sante-bien-etre': 'Santé ou bien-être',
          autre: 'Autre secteur',
        },
      },
      'presence-en-ligne': {
        text: "Comment jugez-vous votre présence en ligne aujourd'hui ?",
        hint: 'Site, fiche Google, réseaux sociaux : votre impression générale suffit.',
        options: {
          inexistante: 'Inexistante — on ne me trouve nulle part',
          datee: 'Datée — ça existe, mais ça ne me ressemble plus',
          correcte: 'Correcte — ça fait le travail, sans plus',
          solide: 'Solide — je suis satisfait de l\'ensemble',
        },
      },
      'site-fiabilite': {
        text: 'Votre site actuel est-il suivi, à jour et fiable ?',
        hint: 'Mises à jour, sauvegardes, sécurité, vitesse de chargement.',
        options: {
          'jamais-touche': "Personne n'y a touché depuis sa mise en ligne",
          'bugs-frequents': 'Il plante ou ralentit régulièrement',
          'quelques-alertes': 'Quelques alertes de temps en temps',
          'suivi-regulier': 'Il est suivi régulièrement',
        },
      },
      'frictions': {
        text: "Qu'est-ce qui vous freine le plus aujourd'hui ?",
        hint: 'Plusieurs réponses possibles.',
        options: {
          'appels-manques': 'Je rate des appels',
          'pas-assez-de-demandes': "Je n'ai pas assez de demandes entrantes",
          'image-depassee': 'Mon image ne correspond plus à ce que je fais',
          'site-lent-ou-casse': 'Mon site est lent ou cassé',
          'reseaux-inactifs': 'Mes réseaux sociaux sont à l\'abandon',
          'taches-repetitives': 'Je perds du temps sur des tâches répétitives',
          'rien-de-bloquant': 'Rien ne me bloque, je veux surtout progresser',
        },
      },
      'priorite': {
        text: 'Sur quoi voulez-vous agir en priorité dans les trois prochains mois ?',
        hint: 'Une seule priorité : c\'est ce qui rend le diagnostic utile.',
        options: {
          'etre-trouve': 'Être trouvé plus facilement',
          'convertir-plus': 'Transformer plus de visiteurs en clients',
          'gagner-du-temps': 'Gagner du temps au quotidien',
          'changer-d-image': "Changer d'image",
        },
      },
    },
    contact: {
      heading: 'Où vous envoyer votre diagnostic ?',
      sub: 'Vos réponses sont enregistrées avec vos coordonnées pour que nous puissions revenir vers vous avec un avis argumenté. Votre résultat s\'affiche juste après.',
      nomLabel: 'Nom',
      nomPlaceholder: 'Votre nom',
      emailLabel: 'Email',
      emailPlaceholder: 'vous@entreprise.fr',
      telephoneLabel: 'Téléphone',
      telephonePlaceholder: '06 00 00 00 00',
      consentLabel: "J'accepte que Sèvalys utilise mes réponses pour me recontacter dans le cadre de ce diagnostic.",
      rgpdHeading: 'Traitement de vos données',
      rgpdMentions: [
        { k: 'Responsable', v: 'Sèvalys — Anatholy Bricon, Tours (37), France — contact@sevalys.com' },
        { k: 'Finalité', v: 'Qualification de votre demande et prise de contact par notre équipe' },
        { k: 'Base légale', v: 'Votre consentement, donné en cochant la case ci-dessus' },
        { k: 'Conservation', v: '12 mois si vous ne devenez pas client, puis suppression automatique' },
        { k: 'Vos droits', v: 'Accès, rectification, effacement, limitation, opposition et portabilité, à exercer auprès de contact@sevalys.com. Vous pouvez introduire une réclamation auprès de la CNIL.' },
      ],
      submit: 'Obtenir mon diagnostic →',
      submitting: 'Envoi en cours…',
      errorHeading: 'Une erreur est survenue',
      errorBody: "Votre diagnostic n'a pas pu être envoyé. Réessayez, ou contactez-nous directement : +33 (0)6 07 18 41 33 / contact@sevalys.com.",
    },
    result: {
      heading: 'Votre diagnostic',
      gaugeCaption: 'Indice de maturité digitale',
      framing: {
        low: "Beaucoup de leviers restent inexploités. C'est une bonne nouvelle : les gains les plus rapides sont devant vous, et les services ci-dessous sont exactement par où commencer.",
        mid: 'Vos fondations tiennent, mais plusieurs leviers tournent au ralenti. Les services ci-dessous sont ceux qui débloqueront le plus de résultats à court terme.',
        high: 'Votre base est solide. Ce qu\'il vous reste à gagner se joue sur l\'exécution — les services ci-dessous sont les leviers les plus rentables dans votre situation.',
      },
      servicesHeading: 'Vos leviers prioritaires',
      ctaHeading: 'Parlons de votre diagnostic',
      ctaSub: 'Un échange de quinze minutes suffit à confirmer — ou corriger — ce que ce diagnostic a identifié.',
      callLabel: 'Appeler',
      writeLabel: 'Écrire',
    },
    faq: [
      {
        q: 'Le simulateur donne-t-il une estimation chiffrée ?',
        a: "Non. Il identifie les leviers prioritaires pour votre situation, pas un montant. Un chiffre annoncé sans avoir vu votre activité n'aurait aucune valeur — nous en parlons lors de l'échange qui suit.",
      },
      {
        q: 'Combien de temps prend le diagnostic ?',
        a: "Moins de deux minutes. Quatre ou cinq questions selon vos réponses : si vous n'avez pas encore de présence en ligne, la question sur la fiabilité de votre site est automatiquement passée.",
      },
      {
        q: 'Pourquoi seulement 2 à 4 services recommandés ?',
        a: "Parce qu'une recommandation qui liste les neuf services n'est pas une recommandation. Chaque réponse pondère les services, et seuls les deux à quatre mieux classés vous sont proposés. Le reste attendra.",
      },
      {
        q: 'Que deviennent mes réponses ?',
        a: 'Elles sont enregistrées avec vos coordonnées pour préparer notre échange, conservées 12 mois au maximum si vous ne devenez pas client, puis supprimées automatiquement. Vous pouvez demander leur suppression à tout moment à contact@sevalys.com.',
      },
    ],
  },
  landing: {
    hero: {
      pill: 'AGENCE · TOURS, FR · DISPONIBLE EN MAI 2026',
      title_l1: 'Des outils',
      title_l2: 'qui ',
      title_l2_it: 'travaillent',
      title_l3: 'pour vos clients.',
      sub: "On conçoit des sites, des outils de gestion et des agents IA pour les commerces, restaurants et services. Pas du sur-mesure inutile : ce qui vous fait gagner du temps, des appels et des ventes.",
      cta_primary: 'Lancer le diagnostic',
      cta_secondary: 'Discutons de votre projet',
      stat_1_n: '06', stat_1_l: 'Partenaires actifs', stat_1_d: 'Restaurants, écoles, indépendants',
      stat_2_n: '24h', stat_2_l: 'Première réponse', stat_2_d: 'Audit téléphonique offert',
      stat_3_n: '100%', stat_3_l: 'Code possédé', stat_3_d: 'Vous gardez tout, dès le jour 1',
      stat_4_n: '1.5x', stat_4_l: 'Ratio appels traités', stat_4_d: 'Avec un phone agent en place',
      canvas_l: 'MODEL · BA-01 · ATELIER',
      canvas_r: 'ROTATION · 0.4 RPM',
    },
    manifeste: {
      num: '01 / 07',
      title_l1: 'Sites, outils,',
      title_l2_it: 'agents.',
      intro: "Trois choses qu'on fait — pour une seule chose qu'on vise.",
      p1: "Vous êtes patron de pizzeria, gérante de salon, dirigeant d'école de danse. Vous voulez un outil qui marche, pas un projet tech.",
      p2: "On vient avec une seule promesse : on construit ce que vos clients vont vraiment utiliser. Le reste, on l'enlève.",
      quote: "« Un site beau, c'est bien. Un site qui rapporte, c'est mieux. »",
      p3: "Aujourd'hui, on construit surtout des agents IA — phone agents qui répondent à vos clients, assistants qui prennent les commandes, automatisations qui font le boulot pendant que vous vivez.",
      p4: "Demain, on construira ce dont vous aurez besoin. Le métier reste le même : faire des outils utiles.",
    },
    problems: {
      num: '02 / 07',
      title_l1: 'Ce qui vous',
      title_l2_it: 'fait perdre des clients.',
      intro: "Quatre situations qui reviennent chez presque toutes les PME qu'on rencontre.",
      items: [
        { n: '01', title: 'Invisible en ligne', desc: "Un client tape votre activité sur Google et tombe sur vos concurrents avant même de vous trouver. Chaque jour sans présence claire, c'est du monde qui part ailleurs." },
        { n: '02', title: 'Personne ne répond au téléphone', desc: "Un appel manqué pendant le rush, c'est une commande ou une réservation qui part chez le concurrent d'à côté. Ça arrive plus souvent qu'on ne le pense." },
        { n: '03', title: 'Une image dépassée', desc: 'Logo, site, réseaux : quand tout date d\'une autre époque, un nouveau client hésite avant même le premier échange.' },
        { n: '04', title: 'Pas le temps de gérer les réseaux', desc: "Entre le quotidien et les clients sur place, les réseaux sociaux passent en dernier — alors que c'est souvent là que les nouveaux clients regardent en premier." },
      ],
      good_news: "La bonne nouvelle : chacun de ces problèmes a une solution simple, sans devoir tout changer d'un coup.",
      cta: 'Tester le diagnostic',
    },
    servicesPreview: {
      num: '03 / 07',
      title_l1: 'Neuf façons',
      title_l2_it: 'de vous aider.',
      intro: 'Chaque service a sa page dédiée : le problème qu\'il résout, comment on procède, et ce que ça change pour vous.',
    },
    work: {
      num: '06 / 07',
      title_l1: 'Quelques',
      title_l2_it: 'réalisations.',
      intro: 'Six partenaires, six métiers différents, une même méthode : on règle un vrai problème métier.',
      items: [
        { name: 'Feuillette', desc: 'Phone agent pour boulangerie — prise de commande automatique, intégration CRM, suivi temps réel.', tags: ['IA', 'VOIX', 'CRM'], year: '2025' },
        { name: 'Gecko Cabane', desc: 'Site vitrine + réservation pour restaurant. Charte sur-mesure, hébergement managé.', tags: ['SITE', 'RESA'], year: '2024' },
        { name: 'Les Folies Temps Danse', desc: "Plateforme inscription école de danse — outils de gestion intégrés.", tags: ['WEB', 'GESTION'], year: '2024' },
        { name: 'Ghjulianu Codani', desc: 'Portfolio professionnel — design éditorial, intégration soignée.', tags: ['SITE', 'EDITORIAL'], year: '2025' },
      ],
      bridge_title_l1: 'Quel service',
      bridge_title_it: 'vous correspond ?',
      bridge_body: "Deux minutes de diagnostic pour savoir exactement ce qu'il vous faut.",
    },
    method: {
      num: '04 / 07',
      title_l1: 'Comment',
      title_l2_it: 'on travaille.',
      intro: "Un déroulé simple, du premier échange au suivi dans la durée.",
      steps: [
        { n: '01', t: 'Diagnostic', d: 'On fait le point sur votre activité et ce qui vous freine aujourd\'hui, en quelques questions ciblées.' },
        { n: '02', t: 'Proposition sur mesure', d: 'Vous recevez une recommandation claire des services adaptés à votre situation, sans jargon.' },
        { n: '03', t: 'Déploiement', d: "On met en place la solution retenue, à votre rythme, avec des points d'étape réguliers." },
        { n: '04', t: 'Suivi & support', d: 'On reste disponibles après la mise en ligne pour ajuster et répondre à vos questions.' },
      ],
    },
    enjeux: {
      num: '05 / 07',
      title_l1: 'Ce qui est',
      title_l2_it: 'en jeu.',
      intro: 'Ne rien faire a aussi un effet — juste moins visible au quotidien.',
      points: [
        { t: 'Vos concurrents captent la recherche locale', d: 'Pendant que vous hésitez, ceux qui ont déjà une présence claire raflent les recherches Google de vos futurs clients.' },
        { t: 'Les appels manqués s\'accumulent', d: "Un appel manqué isolé ne semble rien. Multiplié sur l'année, c'est un volume de commandes qui a filé ailleurs." },
        { t: 'Votre image perd en crédibilité', d: "Une identité qui ne bouge pas pendant que le marché évolue finit par sembler dépassée, même si le service reste excellent." },
        { t: 'Les réseaux sociaux vous échappent', d: "Sans présence régulière, l'audience qui s'y forme se construit ailleurs, chez ceux qui prennent le temps d'y être." },
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
      num: '07 / 07',
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
    pages: {
      index: {
        badge: "OUR SERVICES — 2026",
        title_l1: "Our",
        title_l2_it: "services.",
        sub: "Nine areas of expertise to make your business visible, credible and reachable. Pick yours — or let the diagnostic guide you.",
        num: "01 / 01",
        intro: "Each service has its own dedicated page: the problem it solves, how we proceed, and what changes for you.",
        cardCta: "Discover this service →",
      },
      back: "← Back to services",
      answerLabel: "IN SHORT",
      caseLabel: "CASE STUDY",
      headings: {
        probleme: "The problem we solve",
        fonctionnement: "How it works",
        enjeux: "What changes for you",
        preuve: "Social proof",
        faq: "Frequently asked questions",
      },
      ctaHeading_l1: "Not sure that's",
      ctaHeading_l2_it: "what you need?",
      ctaSub: "Two minutes of diagnostic and you'll know. Otherwise, write to us directly.",
      ctaPrimary: "Run my diagnostic →",
      ctaSecondary: "Contact us",
      items: [
        {
          name: "Site Vitrine",
          tagline: "THE ESSENTIALS TO BE VISIBLE",
          h1Lead: "Site Vitrine in Tours ·",
          h1Benefit: "to exist online",
          sub: "A clear, professional online presence, built so a customer finds you on their very first search.",
          metaTitle: "Site Vitrine in Tours · to exist online | Sèvalys",
          metaDescription: "A custom Site Vitrine in Tours to be visible, credible and reachable online. Responsive design, local SEO, fast launch, no commitment.",
          directAnswer: "A Site Vitrine is a simple, professional online presence: a few pages that present your business, your services and your contact details. It lets a customer find you, understand what you offer and reach out in seconds, from a phone or a computer.",
          problems: [
            { n: "A", title: "Invisible on Google", desc: "Without a site, potential customers search for your business and find your competitors first. You lose contacts before the first conversation even happens." },
            { n: "B", title: "An outdated or non-mobile site", desc: "An ageing page, or one that displays poorly on a smartphone, projects an unprofessional image — even if your service is excellent." },
            { n: "C", title: "A site that generates zero contact", desc: "The site exists but nobody fills the form or calls: it is not working for you, it is just sitting there." },
          ],
          features: [
            "Custom design, built around you",
            "Responsive on mobile and tablet",
            "Clear presentation of your services",
            "Built-in contact form",
            "Google Maps integration",
            "Basic local SEO",
            "Deployment included",
          ],
          enjeux: [
            "A well-built Site Vitrine changes what happens before the first call: a hesitant customer finds your hours, your services and a way to reach you in seconds, without looking elsewhere.",
            "Result: more credibility from the very first glance, and contact requests that arrive without you having to chase them.",
          ],
          caseQuote: "Since our new site went live, customers find us easily and book a table without needing to call during service.",
          signals: [],
          faq: [
            { q: "How long until the site is live?", a: "Expect a few weeks between the first conversation and launch, depending on the content to prepare. A detailed quote arrives within 48h, with no commitment on your part." },
            { q: "Can I edit the content myself?", a: "Yes, you keep control of everyday text and images. For bigger changes, we stay available to help quickly." },
            { q: "Is local SEO included?", a: "A local SEO foundation is built in from launch: clear structure, contact details and a Google Maps presence so nearby customers find you." },
            { q: "What if I don't have text or photos yet?", a: "No problem: we guide you through structuring the content, and can point you to simple solutions for visuals, with no surprise costs." },
          ],
          crossLink: null,
        },
        {
          name: "Rebranding + Site Premium",
          tagline: "TRANSFORM YOUR IMAGE",
          h1Lead: "Rebranding + Premium Site in Tours ·",
          h1Benefit: "image and site, as one",
          sub: "Modernise your identity and your website in a single coherent process, rather than two disconnected projects.",
          metaTitle: "Rebranding + Premium Site in Tours · image and site, as one | Sèvalys",
          metaDescription: "Rebranding with a premium site in Tours: a modernised identity and a coherent new website, in one process. No commitment, quote within 48h.",
          directAnswer: "A rebranding with a premium site modernises your identity — logo, palette, typography — and rebuilds your website to carry that new image, in one coherent process. Branding stops at your identity; Rebranding + Premium Site includes the site rebuild, launch and hand-off.",
          problems: [
            { n: "A", title: "An image that no longer reflects your business", desc: "Your business has evolved but your logo and colours are stuck in another era — and it shows at first glance." },
            { n: "B", title: "A site and an identity that contradict each other", desc: "The site no longer matches your current brand image, which blurs the message from the first visit." },
            { n: "C", title: "Credibility lost to better-presented competitors", desc: "Competitors with a stronger presentation grab attention first, even when your offer is better." },
          ],
          features: [
            "Audit of your current image",
            "Logo modernisation",
            "New colour palette",
            "Professional typography",
            "Mini brand guidelines",
            "New site aligned with your identity",
            "Hand-off training included",
          ],
          enjeux: [
            "An aligned image and website bring consistency to every touchpoint: social media, storefront, business documents and website finally tell the same story.",
            "Customers recognise your brand everywhere, and your credibility no longer depends on a single outdated touchpoint.",
          ],
          caseQuote: null,
          signals: [
            { t: "Validated methodology", d: "Every stage — audit, identity, site — is validated with you before moving to the next, with no last-minute surprises." },
            { t: "No commitment", d: "You stay free at every stage of the project; nothing is locked in before you explicitly approve the direction." },
            { t: "Responsive", d: "A question, an adjustment? Response within 48h, from the first conversation through to the new site going live." },
          ],
          faq: [
            { q: "How long does a rebranding with premium site take?", a: "Expect several weeks between the initial audit and launch, allowing time to validate each stage of the identity and then the site together." },
            { q: "Do I keep my domain name and existing content?", a: "Yes, your domain name stays yours. Existing content is reused, adapted or replaced depending on what serves the new identity." },
            { q: "What if I only want to rework my logo, without redoing the site?", a: "In that case, the Branding offer fits better: it covers identity alone, without touching your existing site." },
          ],
          crossLink: { label: "Just need your identity refreshed? Discover Branding →", slug: "branding" },
        },
        {
          name: "Branding",
          tagline: "YOUR IDENTITY, CLARIFIED",
          h1Lead: "Branding in Tours ·",
          h1Benefit: "an identity people recognise",
          sub: "A coherent identity across your storefront, your social media and your documents — without touching your existing site.",
          metaTitle: "Branding in Tours · an identity people recognise | Sèvalys",
          metaDescription: "Branding in Tours: logo, palette, typography and full brand guidelines for a coherent identity, no site rebuild. No commitment.",
          directAnswer: "Branding builds your brand identity — logo, colours, typography, full guidelines and tone of voice — applicable to your existing site, with no site rebuild: no website is delivered. Branding stops at your identity; Rebranding + Premium Site includes the site rebuild, for those who need both at once.",
          problems: [
            { n: "A", title: "A logo thrown together or inherited", desc: "Your current logo was made in a rush or carried over from an old project, and no longer reflects the seriousness of your business." },
            { n: "B", title: "Different colours and fonts everywhere", desc: "Every touchpoint — site, social media, documents — uses its own colours and fonts, which blurs your image." },
            { n: "C", title: "A brand nobody recognises from one channel to the next", desc: "A customer sees your storefront, then your social media, and doesn't connect the two." },
          ],
          features: [
            "Brand platform (positioning, promise)",
            "Logo creation or redesign",
            "Colour palette",
            "Professional typography",
            "Full brand guidelines",
            "Storefront, social and document variations",
            "Defined tone of voice",
          ],
          enjeux: [
            "A clear identity is recognised immediately, on your storefront as much as on your social media or business documents — one face, everywhere your customers meet you.",
            "This consistency strengthens your professional image without needing to touch your current site: you apply the new identity to what already exists.",
          ],
          caseQuote: null,
          signals: [
            { t: "Source files delivered", d: "You receive every source file for your identity and remain its full owner, with no dependency on us." },
            { t: "Structured feedback rounds", d: "The process includes a defined number of feedback rounds at each stage, to refine the identity without ever starting from zero." },
            { t: "No commitment", d: "You approve each stage before moving to the next; nothing is imposed beyond what you agree to." },
          ],
          faq: [
            { q: "Do I get the source files?", a: "Yes, every source file (logo, palette, typography, guidelines) is handed over at the end of the project. You remain its full owner." },
            { q: "Do I need to redo my site after a rebranding of identity?", a: "No, the new identity applies to your existing site. If you also want a new site, the Rebranding + Premium Site offer covers both at once." },
            { q: "How many feedback rounds are planned?", a: "The number of feedback rounds is agreed together before starting, to refine each element of the identity within a clear framework." },
          ],
          crossLink: { label: "Need a site too? Discover Rebranding + Premium Site →", slug: "rebranding-site-premium" },
        },
        {
          name: "Projet Sur Mesure",
          tagline: "YOUR SPECIFIC NEEDS",
          h1Lead: "Custom web project in Tours ·",
          h1Benefit: "when a standard template isn't enough",
          sub: "Outgrown a template site? Booking, catalogue or a member area — we build the tool that fits your business.",
          metaTitle: "Custom web project in Tours · when a standard template isn't enough | Sèvalys",
          metaDescription: "A custom web project in Tours to replace paper bookings, disconnected tools and generic templates with a solution built around your business. Quote within 48h.",
          directAnswer: "A custom project becomes necessary when your business depends on something no template site covers: online booking, a product catalogue, a client area, or a connection to a tool you already use. We then build a solution built specifically for your business, rather than bent to fit a generic template.",
          problems: [
            { n: "A", title: "A process still run by hand", desc: "Bookings by phone, paper forms, a shared spreadsheet — every step depends on someone remembering it and re-typing it later." },
            { n: "B", title: "An existing tool that doesn't talk to the site", desc: "Your till, your planning or your stock live apart from the site, so you re-enter the same information twice, every time." },
            { n: "C", title: "A functional need no template covers", desc: "Timed booking slots, a member area, a filterable catalogue — these features need real development, not a generic theme stretched to fit." },
          ],
          features: [
            "Full multi-page website",
            "Online shop",
            "Booking system",
            "Member area or back-office",
            "Integrations with your existing tools",
            "Full site rebuild",
            "Dedicated support throughout the project",
          ],
          enjeux: [
            "A custom tool saves real time: no more re-typing between the phone, paper and the site, no more juggling two tools that ignore each other.",
            "The process no longer depends on one person's memory: it lives in the tool, accessible to the whole team, and keeps working even on the days that person is away.",
          ],
          caseQuote: "Enrolment used to mean paper forms re-entered one by one. Now everything happens online, and we save real time at the start of every term.",
          signals: [],
          faq: [
            { q: "How long does a custom project take?", a: "It depends on the scope: a booking system or a member area takes longer than a single extra page. A precise scope and quote arrive within 48h, with no commitment on your part." },
            { q: "Do you start from scratch or from what I already have?", a: "Both are possible: we can build the tool from zero, or start from your current site and add the missing feature without rebuilding everything around it, smoothly and without disrupting your current visitors." },
            { q: "Can the tool evolve afterwards?", a: "Yes — it's built to grow with you. A new feature, a changing need, an extra integration: each evolution is scoped separately, with no need to start over, and no commitment beyond what you approve at each stage." },
          ],
          crossLink: null,
        },
        {
          name: "Agent Vocal IA",
          tagline: "YOUR PHONE, AUTOMATED",
          h1Lead: "AI Voice Agent in Tours ·",
          h1Benefit: "answering for you 24/7",
          sub: "Never miss a call again — evenings, weekends or during the rush, someone is always on the line.",
          metaTitle: "AI Voice Agent in Tours · answering for you 24/7 | Sèvalys",
          metaDescription: "An AI voice agent in Tours that answers, qualifies and logs every call around the clock, even outside opening hours. Callers are told upfront they're speaking to an AI.",
          directAnswer: "An AI voice agent is an intelligent phone line that answers on your behalf, understands the request, qualifies the call and keeps a usable record of it. Every caller is told at the very start of the call that they are speaking with an artificial intelligence, in line with the transparency duty set out in the EU's AI regulation.",
          problems: [
            { n: "A", title: "Missed calls during service or outside opening hours", desc: "Evenings, weekends or mid-rush, nobody picks up, and the call goes straight to the next competitor." },
            { n: "B", title: "Time spent on the phone instead of on the job", desc: "Every repetitive call — hours, availability, simple questions — pulls you away from the work only you can do." },
            { n: "C", title: "Callback details lost or scribbled down wrong", desc: "A misplaced note, a misspelled name, and the callback you promised never happens." },
          ],
          features: [
            "VAPI setup with a dedicated Twilio number",
            "Natural-sounding ElevenLabs voice",
            "CRM connection via MCP",
            "One custom business scenario",
            "Transcript and summary of every call",
            "Explicit disclosure to callers that they're speaking to an AI",
            "Support included at launch",
          ],
          enjeux: [
            "The voice agent captures the calls you used to miss — evenings, weekends, the lunch rush — without ever leaving a customer hanging.",
            "Your team stops being interrupted by the phone for every order or repetitive question: every call gets answered, qualified and summarised, and you only step back in when it actually matters.",
          ],
          caseQuote: "During the morning rush we simply couldn't pick up. Now the agent answers every call and takes the order without anyone stepping away from the ovens.",
          signals: [],
          faq: [
            { q: "Do my customers know they're talking to an AI?", a: "Yes, explicitly: the agent states at the very start of the call that it's an artificial intelligence. It's a legal transparency requirement, and nothing is hidden from the caller." },
            { q: "What happens if the agent can't answer something?", a: "The agent qualifies the request and takes a precise message when the question goes beyond its scenario. You get the transcript and call the person back yourself, without losing any of the context." },
            { q: "Do I keep my current phone number?", a: "In most cases, yes: your existing number can be forwarded to the agent, so your customers never need to dial a new number or change how they call you." },
          ],
          crossLink: null,
        },
        {
          name: "Maintenance",
          tagline: "A SITE THAT STAYS ALIVE",
          h1Lead: "Website maintenance in Tours ·",
          h1Benefit: "so you never have to think about it",
          sub: "Updates, backups, security and small changes — all handled so your site keeps running smoothly.",
          metaTitle: "Website maintenance in Tours · so you never have to think about it | Sèvalys",
          metaDescription: "Website maintenance in Tours: updates, backups, security and small content changes handled for you, with no fixed-term commitment.",
          directAnswer: "Website maintenance covers technical and security updates, regular backups, uptime monitoring and small content changes, so your site keeps working without you having to manage any of it. It matters because a site left unattended always ends up slowing down, weakening, or falling out of date.",
          problems: [
            { n: "A", title: "A site that breaks or slows down without warning", desc: "A missed update, a broken plugin, and the site turns sluggish or unreachable before anyone even notices." },
            { n: "B", title: "Content that never gets updated for lack of time", desc: "Between running the business and everything else, nobody finds the time or the know-how to change a single line on the site." },
            { n: "C", title: "No backup on the day something goes wrong", desc: "Without a recent backup, a crash or a mistake can wipe out months of content in seconds." },
          ],
          features: [
            "Technical and security updates",
            "Regular backups with restore when needed",
            "Uptime monitoring",
            "Small content changes",
            "Hosting and domain name managed for you",
            "Regular activity report",
            "A single point of contact, always reachable",
          ],
          enjeux: [
            "A site down for even an hour means a customer who leaves, a call that never comes, a search that ends with a competitor instead.",
            "Maintenance prevents that scenario: the site stays online, up to date and secure, without you having to watch over any of it yourself.",
          ],
          caseQuote: null,
          signals: [
            { t: "No fixed-term commitment", d: "Stop whenever you want, with no binding notice period or justification required on your side." },
            { t: "Stated response time", d: "A reported issue gets a response within a known window, not an indefinite wait with no news." },
            { t: "You stay the owner", d: "The site, its content and its access all belong to you, today and on the day you'd choose to leave." },
          ],
          faq: [
            { q: "What's included and what isn't?", a: "Included: updates, backups, monitoring, hosting and small content changes. Bigger changes to the site — new pages, new features — are scoped separately, on request." },
            { q: "Can I stop whenever I want?", a: "Yes, there's no fixed-term commitment: you can stop at any time, with no justification or exit penalty — just let us know in advance so we can hand things over cleanly." },
            { q: "What happens if my site goes down on a Sunday?", a: "Uptime monitoring catches the incident quickly, and we step in as soon as possible to bring the site back online, weekends included, without waiting for the next business day to act." },
          ],
          crossLink: null,
        },
        {
          name: "Community Management",
          tagline: "YOUR SOCIAL, HANDLED",
          h1Lead: "Community Management in Tours ·",
          h1Benefit: "social accounts that stay alive",
          sub: "Social accounts that stay active and well-run, without eating into your evenings.",
          metaTitle: "Community Management in Tours · social accounts that stay alive | Sèvalys",
          metaDescription: "Community management in Tours: editorial line, publishing calendar and replies to messages, so your social accounts stay alive. No fixed-term commitment.",
          directAnswer: "A community manager runs your Facebook and Instagram accounts on your behalf: defining an editorial line, planning posts, creating visuals and copy, replying to messages and reviews, and sending you a regular report. Your social accounts stay active and consistent without you having to spend your evenings on them.",
          problems: [
            { n: "A", title: "An abandoned account", desc: "The account exists but hasn't been updated in months, which worries a visitor more than it reassures them." },
            { n: "B", title: "Irregular posts with no direction", desc: "An occasional photo, with no rhythm or throughline, makes it impossible to build a consistent image over time." },
            { n: "C", title: "Messages and reviews left unanswered", desc: "A private message, a Google review waiting for a reply: the silence is visible, and it leaves a poor impression." },
          ],
          features: [
            "Editorial line defined with you",
            "Publishing calendar",
            "Visuals and copy created for you",
            "Posting to your accounts",
            "Replies to messages and comments",
            "Review monitoring",
            "Regular activity report",
          ],
          enjeux: [
            "Between two Google searches, a hesitant customer often checks your social accounts to form an opinion: an active account that replies and shows your day-to-day reassures, where an abandoned one raises doubts.",
            "This steady presence builds trust before the first direct contact, turning your social accounts into a real commercial asset rather than a forgotten storefront.",
          ],
          caseQuote: null,
          signals: [
            { t: "Approval before publishing", d: "Every post is submitted to you before it goes live; nothing reaches your accounts without your explicit approval." },
            { t: "Accounts stay in your name", d: "Your Facebook and Instagram accounts stay registered under your name and login, so you keep full control at all times." },
            { t: "No automatic renewal", d: "The commitment runs month to month and never renews automatically; you decide whether to continue each month." },
          ],
          faq: [
            { q: "How many posts are included each month?", a: "The pace is agreed together based on your business and your accounts, typically several posts a week. The exact volume is set before starting, with no surprises later." },
            { q: "Do I approve posts before they go live?", a: "Yes, every post is submitted for your approval before publishing. Nothing reaches your accounts without your explicit sign-off, every time." },
            { q: "Agency or freelancer — what's the difference here?", a: "The difference lies in continuity and structure: a single point of contact, a month-to-month commitment with no automatic renewal, and an editorial line followed over time rather than a one-off job." },
          ],
          crossLink: null,
        },
        {
          name: "Meta Ads",
          tagline: "FACEBOOK AND INSTAGRAM",
          h1Lead: "Meta Ads in Tours ·",
          h1Benefit: "campaigns that target right",
          sub: "Reaching the right local customers on Facebook and Instagram, instead of boosting posts at random.",
          metaTitle: "Meta Ads in Tours · campaigns that target right | Sèvalys",
          metaDescription: "Meta Ads in Tours: local audiences, visuals and conversion tracking for Facebook and Instagram campaigns that target right. No fixed-term commitment.",
          directAnswer: "A Meta Ads campaign puts your ads in front of the right people, in your local catchment area, on Facebook and Instagram, rather than hoping for random visibility. It targets by location, age and interests, measures what actually converts, and keeps adjusting so every campaign reaches a real potential customer rather than someone outside your area.",
          problems: [
            { n: "A", title: "Posts boosted at random", desc: "Clicking \"boost\" now and then, with no strategy or follow-up, almost never produces a readable or lasting result." },
            { n: "B", title: "Targeting spread too wide", desc: "Without precise settings, ads reach people far outside your area who were never going to become customers." },
            { n: "C", title: "No visibility into what it brings back", desc: "Ad spend goes out every month with no report showing what it actually brought back to the business." },
          ],
          features: [
            "Local audience definition",
            "Visuals and headlines created for you",
            "Conversion tracking set up",
            "Campaign launch and management",
            "Testing multiple headlines",
            "Clear results reporting",
            "Ongoing adjustments",
          ],
          enjeux: [
            "A well-targeted campaign reaches the neighbourhood and the city where your customers actually live, not the whole country: every impression has a real chance of becoming a customer rather than a wasted view.",
            "This local targeting changes what advertising actually is: it stops being a vague expense and becomes a measurable lever, adjusted week after week based on what genuinely works.",
          ],
          caseQuote: null,
          signals: [
            { t: "You keep control of the account", d: "The ad account stays under your control; you keep full access and can take it back at any time." },
            { t: "Results without jargon", d: "Reports are presented in plain language, without unnecessary technical terms, so you understand exactly what's working." },
            { t: "Stop any time", d: "No minimum term applies; a campaign can be paused or stopped as soon as you decide to." },
          ],
          faq: [
            { q: "Who pays for the ad delivery, and to whom?", a: "Ad delivery is paid directly to Meta from your own ad account; we bill nothing on top of that direct payment, only our work on strategy and management." },
            { q: "How soon do results show up?", a: "Early signals often appear after one to two weeks of delivery, while targeting and headlines get refined; stable, lasting results usually take several weeks of ongoing management." },
            { q: "Do I need an existing Facebook page?", a: "A Facebook page and an Instagram account are required to run ads; if they don't exist yet or need updating, creating or refreshing them happens before launch." },
          ],
          crossLink: null,
        },
        {
          name: "Google Ads",
          tagline: "VISIBLE WHEN PEOPLE SEARCH FOR YOU",
          h1Lead: "Google Ads in Tours ·",
          h1Benefit: "top of the page when it counts",
          sub: "Appearing at the top for the searches that actually bring in customers, not every possible query.",
          metaTitle: "Google Ads in Tours · top of the page when it counts | Sèvalys",
          metaDescription: "Google Ads in Tours: converting search terms selected, ads written and call tracking in place to be visible when people search for you. No fixed-term commitment.",
          directAnswer: "Google Ads matters for a local SMB whenever there's immediate intent to capture — an urgent need, a specific request — since ads appear at the top as soon as they go live, unlike local SEO which takes months to build but then stays durable with no cost per click. The two complement each other rather than compete.",
          problems: [
            { n: "A", title: "Invisible on the searches that matter", desc: "Customers type exactly what you offer, but another business appears first and captures the demand instead of you." },
            { n: "B", title: "A campaign launched, then forgotten", desc: "Ads go live once and are never adjusted again, quietly wasting the budget without bringing anything useful back." },
            { n: "C", title: "Clicks from outside your area or audience", desc: "Without precise exclusions, some clicks come from people far from Tours or with no real need, for nothing." },
          ],
          features: [
            "Selection of converting search terms",
            "Exclusion of irrelevant search terms",
            "Ad copywriting",
            "Extensions and business listing linked",
            "Call and form tracking",
            "Ongoing management and adjustments",
            "Clear results reporting",
          ],
          enjeux: [
            "Google Ads doesn't create the desire to buy: it captures an intent that already exists, at the exact moment someone is actively searching for what you offer, rather than hoping they stumble onto you by chance.",
            "This logic changes how an advertising budget gets spent: every click answers a real search, with intent already present, which makes tracking and adjusting far clearer than with classic display advertising.",
          ],
          caseQuote: null,
          signals: [
            { t: "Ad account ownership", d: "The Google Ads account is opened under your name and stays fully yours, today and on the day you'd choose to leave." },
            { t: "Search terms and exclusions visible", d: "You can check the list of targeted and excluded search terms at any time, with no blind spot in the management." },
            { t: "No imposed minimum term", d: "The campaign can be paused or stopped at any time, with no minimum duration or justification required." },
          ],
          faq: [
            { q: "Google Ads or SEO — do I have to choose?", a: "The two complement each other rather than compete: Google Ads brings immediate visibility while SEO settles in durably on the same search terms, so you're never relying on paid ads alone." },
            { q: "Who pays for the clicks, and to whom?", a: "Each click is paid directly to Google from your own Google Ads account; we bill nothing on top of that direct payment, only the management and strategy behind the campaigns." },
            { q: "How soon do the ads start running?", a: "Once the account is set up and ads approved, delivery usually starts within a few days; the first targeting adjustments follow within the very first weeks of real delivery." },
          ],
          crossLink: null,
        },
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
  simulateur: {
    metaTitle: "Digital Diagnostic Simulator in Tours · Sèvalys",
    metaDescription: "Answer a few questions about your business and get an immediate, personalised recommendation of 2 to 4 priority digital levers, with no commitment.",
    badge: "Diagnostic · no commitment",
    h1Lead: "Which digital levers",
    h1Benefit: "for your business?",
    sub: "A short, honest diagnostic: a few questions about your business, and we identify the 2 to 4 levers that actually matter for you — not a list of everything we know how to do.",
    directAnswer: "The Sèvalys simulator is an online diagnostic questionnaire: you answer four or five questions about your sector, the state of your online presence and your current friction points, then you immediately get a recommendation of 2 to 4 suitable services plus a digital maturity score. No cost estimate is produced.",
    intro: {
      heading: "How this diagnostic works",
      paragraphs: [
        "This diagnostic is a sorting tool. Most businesses we meet don't need to redo everything — they need to know where to start.",
        "You answer four or five questions — your sector, the state of your online presence, what's holding you back today, and your priority for the next three months. Each answer weights Sèvalys's nine services, and only the two to four highest-ranked are shown to you.",
        "Answer honestly, especially when the answer isn't flattering: an optimistic answer produces a useless recommendation. At the end, you leave your details and your result appears immediately.",
      ],
    },
    start: "Start my diagnostic →",
    progressLabel: "Question {current} of {total}",
    next: "Next →",
    nextFinal: "See my recommendation →",
    back: "← Back",
    questions: {
      'secteur': {
        text: "Which sector do you work in?",
        hint: "This helps us weight the recommendations. No service is ruled out in advance.",
        options: {
          'commerce-local': "Local retail",
          'restauration-hotellerie': "Restaurant or hospitality",
          'artisan-btp': "Trades or construction",
          'services-pro': "Professional services",
          'sante-bien-etre': "Health or wellbeing",
          autre: "Other sector",
        },
      },
      'presence-en-ligne': {
        text: "How would you rate your online presence today?",
        hint: "Website, Google listing, social media — your general impression is enough.",
        options: {
          inexistante: "Non-existent — no one can find me",
          datee: "Outdated — it's there, but it no longer reflects me",
          correcte: "Decent — it does the job, nothing more",
          solide: "Strong — I'm satisfied with it overall",
        },
      },
      'site-fiabilite': {
        text: "Is your current website maintained, up to date and reliable?",
        hint: "Updates, backups, security, loading speed.",
        options: {
          'jamais-touche': "No one has touched it since it went live",
          'bugs-frequents': "It crashes or slows down regularly",
          'quelques-alertes': "A few alerts from time to time",
          'suivi-regulier': "It's maintained regularly",
        },
      },
      'frictions': {
        text: "What holds you back the most today?",
        hint: "Multiple answers possible.",
        options: {
          'appels-manques': "I miss calls",
          'pas-assez-de-demandes': "I don't get enough incoming requests",
          'image-depassee': "My image no longer matches what I do",
          'site-lent-ou-casse': "My website is slow or broken",
          'reseaux-inactifs': "My social media has been abandoned",
          'taches-repetitives': "I lose time on repetitive tasks",
          'rien-de-bloquant': "Nothing is blocking me, I mainly want to progress",
        },
      },
      'priorite': {
        text: "What do you want to prioritise over the next three months?",
        hint: "Just one priority: that's what makes the diagnostic useful.",
        options: {
          'etre-trouve': "Being found more easily",
          'convertir-plus': "Turning more visitors into clients",
          'gagner-du-temps': "Saving time day to day",
          'changer-d-image': "Changing my image",
        },
      },
    },
    contact: {
      heading: "Where should we send your diagnostic?",
      sub: "Your answers are saved along with your details so we can get back to you with a well-argued opinion. Your result appears right after.",
      nomLabel: "Name",
      nomPlaceholder: "Your name",
      emailLabel: "Email",
      emailPlaceholder: "you@business.com",
      telephoneLabel: "Phone",
      telephonePlaceholder: "06 00 00 00 00",
      consentLabel: "I agree that Sèvalys may use my answers to contact me again about this diagnostic.",
      rgpdHeading: "How we handle your data",
      rgpdMentions: [
        { k: "Controller", v: "Sèvalys — Anatholy Bricon, Tours (37), France — contact@sevalys.com" },
        { k: "Purpose", v: "Qualifying your request and follow-up contact from our team" },
        { k: "Legal basis", v: "Your consent, given by ticking the box above" },
        { k: "Retention", v: "12 months if you don't become a client, then automatic deletion" },
        { k: "Your rights", v: "Access, rectification, erasure, restriction, objection and portability, exercised via contact@sevalys.com. You may lodge a complaint with the CNIL." },
      ],
      submit: "Get my diagnostic →",
      submitting: "Sending…",
      errorHeading: "Something went wrong",
      errorBody: "Your diagnostic could not be sent. Please try again, or contact us directly: +33 (0)6 07 18 41 33 / contact@sevalys.com.",
    },
    result: {
      heading: "Your diagnostic",
      gaugeCaption: "Digital maturity score",
      framing: {
        low: "Many levers remain untapped. That's good news: the quickest wins are ahead of you, and the services below are exactly where to start.",
        mid: "Your foundations hold, but several levers are running below their potential. The services below are the ones that will unlock the most short-term results.",
        high: "Your base is solid. What's left to gain comes down to execution — the services below are the most profitable levers for your situation.",
      },
      servicesHeading: "Your priority levers",
      ctaHeading: "Let's talk about your diagnostic",
      ctaSub: "A fifteen-minute conversation is enough to confirm — or correct — what this diagnostic identified.",
      callLabel: "Call",
      writeLabel: "Write",
    },
    faq: [
      {
        q: "Does the simulator produce a cost estimate?",
        a: "No. It identifies the priority levers for your situation, not an amount. A figure quoted without having seen your business would have no value — we discuss that during the follow-up conversation.",
      },
      {
        q: "How long does the diagnostic take?",
        a: "Under two minutes. Four or five questions depending on your answers: if you don't yet have an online presence, the question about your website's reliability is automatically skipped.",
      },
      {
        q: "Why only 2 to 4 recommended services?",
        a: "Because a recommendation listing all nine services isn't a recommendation. Each answer weights the services, and only the two to four highest-ranked are shown to you. The rest can wait.",
      },
      {
        q: "What happens to my answers?",
        a: "They're saved along with your details to prepare our conversation, kept for a maximum of 12 months if you don't become a client, then automatically deleted. You can request their deletion at any time at contact@sevalys.com.",
      },
    ],
  },
  landing: {
    hero: {
      pill: 'AGENCY · TOURS, FR · AVAILABLE FROM MAY 2026',
      title_l1: 'Tools',
      title_l2: 'that ',
      title_l2_it: 'work',
      title_l3: 'for your customers.',
      sub: 'We design websites, internal tools and AI agents for restaurants, shops and local services. No useless custom work — just what saves you time, calls and sales.',
      cta_primary: 'Start the diagnostic',
      cta_secondary: "Let's discuss your project",
      stat_1_n: '06', stat_1_l: 'Active partners', stat_1_d: 'Restaurants, schools, makers',
      stat_2_n: '24h', stat_2_l: 'First reply', stat_2_d: 'Free phone audit',
      stat_3_n: '100%', stat_3_l: 'You own the code', stat_3_d: 'From day one',
      stat_4_n: '1.5x', stat_4_l: 'Calls handled ratio', stat_4_d: 'With a phone agent live',
      canvas_l: 'MODEL · BA-01 · STUDIO',
      canvas_r: 'ROTATION · 0.4 RPM',
    },
    manifeste: {
      num: '01 / 07',
      title_l1: 'Sites, tools,',
      title_l2_it: 'agents.',
      intro: 'Three things we make — for a single thing we aim at.',
      p1: 'You run a pizzeria, a salon, a dance school. You want a tool that works, not a tech project.',
      p2: 'One promise: we build what your customers will actually use. The rest is removed.',
      quote: '\u201cA beautiful site is fine. A site that earns is better.\u201d',
      p3: "Today, we mostly build AI agents — phone agents that answer your customers, assistants that take orders, automations that work while you live.",
      p4: "Tomorrow, we'll build what you'll need. The craft stays the same: useful tools.",
    },
    problems: {
      num: '02 / 07',
      title_l1: 'What makes you',
      title_l2_it: 'lose customers.',
      intro: 'Four situations that come up with almost every small business we meet.',
      items: [
        { n: '01', title: 'Invisible online', desc: "A customer searches for your business on Google and finds your competitors before they find you. Every day without a clear presence, people go elsewhere." },
        { n: '02', title: 'Nobody answers the phone', desc: "A missed call during the rush is an order or a booking that goes to the shop next door. It happens more often than you'd think." },
        { n: '03', title: 'A dated image', desc: "Logo, site, social pages: when everything looks like another era, a new customer hesitates before the first exchange." },
        { n: '04', title: "No time to run social media", desc: "Between the day-to-day and customers on site, social media comes last — even though that's often where new customers look first." },
      ],
      good_news: 'The good news: each of these problems has a simple fix, without changing everything at once.',
      cta: 'Take the diagnostic',
    },
    servicesPreview: {
      num: '03 / 07',
      title_l1: 'Nine ways',
      title_l2_it: 'to help you.',
      intro: 'Each service has its own dedicated page: the problem it solves, how it works, and what it changes for you.',
    },
    method: {
      num: '04 / 07',
      title_l1: 'How',
      title_l2_it: 'we work.',
      intro: 'A simple process, from first contact to ongoing support.',
      steps: [
        { n: '01', t: 'Diagnostic', d: "We review your business and what's holding you back today, with a few targeted questions." },
        { n: '02', t: 'Tailored proposal', d: 'You get a clear recommendation of the services suited to your situation, no jargon.' },
        { n: '03', t: 'Deployment', d: 'We set up the chosen solution at your pace, with regular check-ins.' },
        { n: '04', t: 'Support & follow-up', d: "We stay available after launch to adjust things and answer your questions." },
      ],
    },
    enjeux: {
      num: '05 / 07',
      title_l1: "What's",
      title_l2_it: 'at stake.',
      intro: "Doing nothing has an effect too — just a less visible one, day to day.",
      points: [
        { t: 'Your competitors capture local search', d: 'While you hesitate, those who already have a clear presence take the Google searches from your future customers.' },
        { t: 'Missed calls add up', d: 'A single missed call seems like nothing. Over a year, it adds up to a real volume of orders lost elsewhere.' },
        { t: 'Your brand loses credibility', d: 'An identity that stays still while the market moves ends up looking dated, even when the service is still excellent.' },
        { t: 'Social media slips away', d: 'Without a regular presence, the audience forming there builds up elsewhere, with those who take the time to show up.' },
      ],
    },
    work: {
      num: '06 / 07',
      title_l1: 'Selected',
      title_l2_it: 'work.',
      intro: 'Six partners, six trades, one method: solve a real business problem.',
      items: [
        { name: 'Feuillette', desc: 'Phone agent for a bakery — automatic order taking, CRM integration, real-time tracking.', tags: ['AI', 'VOICE', 'CRM'], year: '2025' },
        { name: 'Gecko Cabane', desc: 'Restaurant site + booking. Custom design, managed hosting.', tags: ['SITE', 'BOOKING'], year: '2024' },
        { name: 'Les Folies Temps Danse', desc: 'Dance school enrolment platform — integrated management tools.', tags: ['WEB', 'TOOLS'], year: '2024' },
        { name: 'Ghjulianu Codani', desc: 'Professional portfolio — editorial design, careful build.', tags: ['SITE', 'EDITORIAL'], year: '2025' },
      ],
      bridge_title_l1: 'Which service',
      bridge_title_it: 'fits you?',
      bridge_body: 'A two-minute diagnostic to find out exactly what you need.',
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
      num: '07 / 07',
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
    pages: {
      index: {
        badge: "บริการของเรา — 2026",
        title_l1: "บริการ",
        title_l2_it: "ของเรา",
        sub: "เก้าความเชี่ยวชาญเพื่อให้ธุรกิจของคุณมองเห็นได้ น่าเชื่อถือ และติดต่อได้ง่าย เลือกบริการของคุณ — หรือให้แบบประเมินช่วยแนะนำ",
        num: "01 / 01",
        intro: "แต่ละบริการมีหน้าเฉพาะของตัวเอง: ปัญหาที่แก้ไข วิธีการทำงาน และสิ่งที่เปลี่ยนแปลงสำหรับคุณ",
        cardCta: "ดูรายละเอียดบริการนี้ →",
      },
      back: "← กลับไปหน้าบริการ",
      answerLabel: "สรุปสั้นๆ",
      caseLabel: "กรณีศึกษา",
      headings: {
        probleme: "ปัญหาที่เราแก้ไข",
        fonctionnement: "วิธีการทำงาน",
        enjeux: "สิ่งที่เปลี่ยนแปลงสำหรับคุณ",
        preuve: "หลักฐานทางสังคม",
        faq: "คำถามที่พบบ่อย",
      },
      ctaHeading_l1: "ไม่แน่ใจว่านี่คือ",
      ctaHeading_l2_it: "สิ่งที่คุณต้องการ?",
      ctaSub: "แบบประเมินสองนาทีแล้วคุณจะรู้ หรือติดต่อเราได้โดยตรง",
      ctaPrimary: "เริ่มแบบประเมิน →",
      ctaSecondary: "ติดต่อเรา",
      items: [
        {
          name: "Site Vitrine",
          tagline: "สิ่งจำเป็นเพื่อการมองเห็น",
          h1Lead: "Site Vitrine ที่ตูร์ ·",
          h1Benefit: "เพื่อมีตัวตนออนไลน์",
          sub: "การปรากฏตัวออนไลน์ที่ชัดเจนและเป็นมืออาชีพ ให้ลูกค้าพบคุณได้ตั้งแต่การค้นหาครั้งแรก",
          metaTitle: "Site Vitrine ที่ตูร์ · เพื่อมีตัวตนออนไลน์ | Sèvalys",
          metaDescription: "เว็บไซต์ Site Vitrine ที่ออกแบบเฉพาะสำหรับธุรกิจของคุณในตูร์ ให้มองเห็นได้ น่าเชื่อถือ และติดต่อได้ง่าย ดีไซน์รองรับทุกอุปกรณ์ SEO ท้องถิ่น เปิดใช้งานรวดเร็ว ไม่มีข้อผูกมัด",
          directAnswer: "Site Vitrine คือการปรากฏตัวออนไลน์ที่เรียบง่ายและเป็นมืออาชีพ ประกอบด้วยไม่กี่หน้าที่นำเสนอธุรกิจ บริการ และข้อมูลติดต่อของคุณ ช่วยให้ลูกค้าค้นพบคุณ เข้าใจสิ่งที่คุณนำเสนอ และติดต่อคุณได้ภายในไม่กี่วินาที ทั้งจากมือถือและคอมพิวเตอร์",
          problems: [
            { n: "A", title: "มองไม่เห็นบน Google", desc: "หากไม่มีเว็บไซต์ ลูกค้าที่มีศักยภาพจะค้นหาแล้วเจอคู่แข่งของคุณก่อน คุณสูญเสียโอกาสติดต่อก่อนที่จะได้พูดคุยกันด้วยซ้ำ" },
            { n: "B", title: "เว็บไซต์เก่าหรือไม่รองรับมือถือ", desc: "หน้าเว็บที่ล้าสมัยหรือแสดงผลไม่ดีบนสมาร์ทโฟน สร้างภาพลักษณ์ที่ไม่เป็นมืออาชีพ แม้บริการของคุณจะดีเยี่ยม" },
            { n: "C", title: "เว็บไซต์ที่ไม่สร้างการติดต่อใดๆ", desc: "เว็บไซต์มีอยู่แต่ไม่มีใครกรอกแบบฟอร์มหรือโทรมา มันไม่ได้ทำงานให้คุณ มันแค่นอนอยู่เฉยๆ" },
          ],
          features: [
            "ดีไซน์เฉพาะตัว ตรงกับภาพลักษณ์ของคุณ",
            "รองรับมือถือและแท็บเล็ต",
            "นำเสนอบริการของคุณอย่างชัดเจน",
            "แบบฟอร์มติดต่อในตัว",
            "ผสาน Google Maps",
            "SEO ท้องถิ่นพื้นฐาน",
            "รวมการเปิดใช้งาน",
          ],
          enjeux: [
            "Site Vitrine ที่ทำมาอย่างดีเปลี่ยนสิ่งที่เกิดขึ้นก่อนการโทรครั้งแรก ลูกค้าที่ลังเลจะพบเวลาทำการ บริการ และวิธีติดต่อคุณได้ภายในไม่กี่วินาที โดยไม่ต้องมองหาที่อื่น",
            "ผลลัพธ์คือความน่าเชื่อถือที่มากขึ้นตั้งแต่แรกเห็น และคำขอติดต่อที่เข้ามาเองโดยไม่ต้องเรียกร้อง",
          ],
          caseQuote: "ตั้งแต่มีเว็บไซต์ใหม่ ลูกค้าหาเราเจอง่ายขึ้นมากและจองโต๊ะได้โดยไม่ต้องโทรมาระหว่างเวลาให้บริการ",
          signals: [],
          faq: [
            { q: "ใช้เวลานานแค่ไหนกว่าจะออนไลน์ได้?", a: "โดยทั่วไปจะใช้เวลาไม่กี่สัปดาห์ระหว่างการพูดคุยครั้งแรกจนถึงการเปิดใช้งาน ขึ้นอยู่กับเนื้อหาที่ต้องเตรียม ใบเสนอราคาโดยละเอียดจะส่งภายใน 48 ชั่วโมง โดยไม่มีข้อผูกมัดใดๆ" },
            { q: "ฉันสามารถแก้ไขเนื้อหาเองได้ไหม?", a: "ได้ คุณสามารถจัดการข้อความและรูปภาพทั่วไปได้เอง สำหรับการเปลี่ยนแปลงที่ใหญ่กว่านั้น เราพร้อมช่วยเหลืออย่างรวดเร็ว" },
            { q: "รวม SEO ท้องถิ่นด้วยหรือไม่?", a: "พื้นฐาน SEO ท้องถิ่นถูกรวมไว้ตั้งแต่การเปิดใช้งาน โครงสร้างที่ชัดเจน ข้อมูลติดต่อ และการปรากฏบน Google Maps ช่วยให้คนใกล้เคียงพบคุณได้" },
            { q: "ถ้าฉันยังไม่มีข้อความหรือรูปภาพล่ะ?", a: "ไม่มีปัญหา เราจะช่วยจัดโครงสร้างเนื้อหาให้ และสามารถแนะนำทางเลือกง่ายๆ สำหรับภาพ โดยไม่มีค่าใช้จ่ายที่ไม่คาดคิด" },
          ],
          crossLink: null,
        },
        {
          name: "Rebranding + Site Premium",
          tagline: "เปลี่ยนภาพลักษณ์ของคุณ",
          h1Lead: "Rebranding + Site Premium ที่ตูร์ ·",
          h1Benefit: "ภาพลักษณ์และเว็บไซต์ ในคราวเดียว",
          sub: "ปรับปรุงอัตลักษณ์และเว็บไซต์ของคุณในกระบวนการเดียวที่สอดคล้องกัน แทนที่จะเป็นสองโปรเจกต์ที่แยกจากกัน",
          metaTitle: "Rebranding + Site Premium ที่ตูร์ · ภาพลักษณ์และเว็บไซต์ ในคราวเดียว | Sèvalys",
          metaDescription: "Rebranding พร้อม Site Premium ที่ตูร์ ปรับปรุงอัตลักษณ์และสร้างเว็บไซต์ใหม่ในกระบวนการเดียว ไม่มีข้อผูกมัด ใบเสนอราคาภายใน 48 ชั่วโมง",
          directAnswer: "Rebranding พร้อม Site Premium คือการปรับปรุงอัตลักษณ์ของคุณ — โลโก้ ชุดสี ฟอนต์ — และสร้างเว็บไซต์ใหม่ให้สอดคล้องกับภาพลักษณ์นั้น ในกระบวนการเดียว Branding หยุดอยู่ที่อัตลักษณ์ของคุณ ส่วน Rebranding + Site Premium รวมการปรับปรุงเว็บไซต์ การเปิดใช้งาน และการฝึกอบรมการใช้งาน",
          problems: [
            { n: "A", title: "ภาพลักษณ์ที่ไม่สะท้อนธุรกิจของคุณอีกต่อไป", desc: "ธุรกิจของคุณพัฒนาไปแล้ว แต่โลโก้และสีของคุณยังคงเป็นแบบเดิม เห็นได้ชัดตั้งแต่แรกมอง" },
            { n: "B", title: "เว็บไซต์และอัตลักษณ์ที่ขัดแย้งกัน", desc: "เว็บไซต์ไม่ตรงกับภาพลักษณ์แบรนด์ปัจจุบันของคุณ ทำให้ข้อความสับสนตั้งแต่การเข้าชมครั้งแรก" },
            { n: "C", title: "ความน่าเชื่อถือที่ลดลงเมื่อเทียบกับคู่แข่ง", desc: "คู่แข่งที่มีการนำเสนอที่ดีกว่าดึงดูดความสนใจก่อน แม้ว่าข้อเสนอของคุณจะดีกว่าก็ตาม" },
          ],
          features: [
            "ตรวจสอบภาพลักษณ์ปัจจุบันของคุณ",
            "ปรับปรุงโลโก้",
            "ชุดสีใหม่",
            "ฟอนต์มืออาชีพ",
            "แนวทางแบรนด์แบบย่อ",
            "เว็บไซต์ใหม่ที่สอดคล้องกับอัตลักษณ์",
            "การฝึกอบรมการใช้งาน",
          ],
          enjeux: [
            "ภาพลักษณ์และเว็บไซต์ที่สอดคล้องกันสร้างความต่อเนื่องในทุกจุดสัมผัส ทั้งโซเชียลมีเดีย หน้าร้าน เอกสารทางธุรกิจ และเว็บไซต์ที่บอกเล่าเรื่องราวเดียวกันในที่สุด",
            "ลูกค้าของคุณจะจดจำแบรนด์ได้ทุกที่ และความน่าเชื่อถือของคุณจะไม่ขึ้นอยู่กับจุดสัมผัสเดียวที่ล้าสมัยไปแล้ว",
          ],
          caseQuote: null,
          signals: [
            { t: "วิธีการที่ผ่านการตรวจสอบ", d: "ทุกขั้นตอน — การตรวจสอบ อัตลักษณ์ เว็บไซต์ — ได้รับการยืนยันร่วมกับคุณก่อนไปขั้นต่อไป ไม่มีเรื่องเซอร์ไพรส์ในนาทีสุดท้าย" },
            { t: "ไม่มีข้อผูกมัด", d: "คุณมีอิสระในทุกขั้นตอนของโปรเจกต์ ไม่มีอะไรถูกกำหนดตายตัวก่อนที่คุณจะเห็นชอบทิศทางที่เลือก" },
            { t: "ตอบสนองรวดเร็ว", d: "มีคำถามหรือต้องการปรับแก้? ตอบกลับภายใน 48 ชั่วโมง ตั้งแต่การพูดคุยครั้งแรกจนถึงเว็บไซต์ใหม่เปิดใช้งาน" },
          ],
          faq: [
            { q: "Rebranding พร้อม Site Premium ใช้เวลานานแค่ไหน?", a: "โดยทั่วไปใช้เวลาหลายสัปดาห์ระหว่างการตรวจสอบเบื้องต้นจนถึงการเปิดใช้งาน เพื่อยืนยันแต่ละขั้นตอนของอัตลักษณ์แล้วจึงเว็บไซต์ร่วมกัน" },
            { q: "ฉันจะยังคงโดเมนเนมและเนื้อหาเดิมไว้ได้ไหม?", a: "ได้ โดเมนเนมของคุณยังคงเป็นของคุณ เนื้อหาเดิมจะถูกนำมาใช้ซ้ำ ปรับปรุง หรือแทนที่ตามความเหมาะสมกับอัตลักษณ์ใหม่" },
            { q: "ถ้าฉันต้องการแค่ปรับโลโก้ โดยไม่ทำเว็บไซต์ใหม่ล่ะ?", a: "ในกรณีนั้น บริการ Branding จะเหมาะกับความต้องการของคุณมากกว่า ครอบคลุมเฉพาะอัตลักษณ์ โดยไม่แตะต้องเว็บไซต์เดิม" },
          ],
          crossLink: { label: "ต้องการแค่อัตลักษณ์ของคุณใช่ไหม? ดูบริการ Branding →", slug: "branding" },
        },
        {
          name: "Branding",
          tagline: "อัตลักษณ์ของคุณ ชัดเจน",
          h1Lead: "Branding ที่ตูร์ ·",
          h1Benefit: "อัตลักษณ์ที่จดจำได้",
          sub: "อัตลักษณ์ที่สอดคล้องกันบนหน้าร้าน โซเชียลมีเดีย และเอกสารของคุณ โดยไม่แตะต้องเว็บไซต์เดิม",
          metaTitle: "Branding ที่ตูร์ · อัตลักษณ์ที่จดจำได้ | Sèvalys",
          metaDescription: "Branding ที่ตูร์: โลโก้ ชุดสี ฟอนต์ และแนวทางแบรนด์แบบเต็มเพื่ออัตลักษณ์ที่สอดคล้องกัน ไม่มีการปรับปรุงเว็บไซต์ ไม่มีข้อผูกมัด",
          directAnswer: "Branding สร้างอัตลักษณ์แบรนด์ของคุณ — โลโก้ สี ฟอนต์ แนวทางแบรนด์ฉบับเต็ม และโทนเสียงแบรนด์ — ใช้ได้กับเว็บไซต์เดิมของคุณ โดยไม่มีการปรับปรุงเว็บไซต์ใดๆ ไม่มีการส่งมอบเว็บไซต์ Branding หยุดอยู่ที่อัตลักษณ์ของคุณ ส่วน Rebranding + Site Premium รวมการปรับปรุงเว็บไซต์ สำหรับผู้ที่ต้องการทั้งสองอย่างพร้อมกัน",
          problems: [
            { n: "A", title: "โลโก้ที่ทำขึ้นอย่างเร่งรีบหรือสืบทอดมา", desc: "โลโก้ปัจจุบันของคุณทำขึ้นอย่างเร่งรีบหรือนำมาจากโปรเจกต์เก่า และไม่สะท้อนความน่าเชื่อถือของธุรกิจคุณอีกต่อไป" },
            { n: "B", title: "สีและฟอนต์ที่แตกต่างกันในทุกที่", desc: "ทุกจุดสัมผัส — เว็บไซต์ โซเชียล เอกสาร — ใช้สีและฟอนต์ของตัวเอง ทำให้ภาพลักษณ์ของคุณสับสน" },
            { n: "C", title: "แบรนด์ที่จำไม่ได้จากช่องทางหนึ่งไปอีกช่องทางหนึ่ง", desc: "ลูกค้าเห็นหน้าร้านของคุณ แล้วเห็นโซเชียลมีเดีย แต่ไม่เชื่อมโยงว่าเป็นแบรนด์เดียวกัน" },
          ],
          features: [
            "แพลตฟอร์มแบรนด์ (การวางตำแหน่ง คำสัญญา)",
            "สร้างหรือปรับปรุงโลโก้",
            "ชุดสี",
            "ฟอนต์มืออาชีพ",
            "แนวทางแบรนด์แบบเต็ม",
            "การประยุกต์ใช้กับหน้าร้าน โซเชียล และเอกสาร",
            "โทนเสียงแบรนด์ที่ชัดเจน",
          ],
          enjeux: [
            "อัตลักษณ์ที่ชัดเจนจะถูกจดจำได้ทันที ทั้งบนหน้าร้านและโซเชียลมีเดียหรือเอกสารทางธุรกิจ — หน้าตาเดียวกัน ทุกที่ที่ลูกค้าของคุณพบเจอ",
            "ความสอดคล้องนี้เสริมภาพลักษณ์มืออาชีพของคุณ โดยไม่ต้องแตะต้องเว็บไซต์ปัจจุบัน คุณเพียงนำอัตลักษณ์ใหม่มาใช้กับสิ่งที่มีอยู่แล้ว",
          ],
          caseQuote: null,
          signals: [
            { t: "ส่งมอบไฟล์ต้นฉบับ", d: "คุณจะได้รับไฟล์ต้นฉบับทั้งหมดของอัตลักษณ์ และเป็นเจ้าของอย่างเต็มที่ โดยไม่ต้องพึ่งพาเรา" },
            { t: "รอบการแก้ไขที่ชัดเจน", d: "กระบวนการมีจำนวนรอบการแก้ไขที่กำหนดไว้ในแต่ละขั้นตอน เพื่อปรับแต่งอัตลักษณ์โดยไม่ต้องเริ่มใหม่ตั้งแต่ศูนย์" },
            { t: "ไม่มีข้อผูกมัด", d: "คุณอนุมัติแต่ละขั้นตอนก่อนไปต่อ ไม่มีอะไรถูกบังคับเกินกว่าที่คุณเห็นชอบ" },
          ],
          faq: [
            { q: "ฉันจะได้รับไฟล์ต้นฉบับไหม?", a: "ได้ ไฟล์ต้นฉบับทั้งหมด (โลโก้ ชุดสี ฟอนต์ แนวทางแบรนด์) จะถูกส่งมอบเมื่อจบโปรเจกต์ คุณเป็นเจ้าของอย่างเต็มที่" },
            { q: "ต้องทำเว็บไซต์ใหม่หลังจาก rebranding อัตลักษณ์ไหม?", a: "ไม่ต้อง อัตลักษณ์ใหม่จะนำไปใช้กับเว็บไซต์เดิมของคุณ หากต้องการเว็บไซต์ใหม่ด้วย บริการ Rebranding + Site Premium ครอบคลุมทั้งสองอย่าง" },
            { q: "มีรอบการแก้ไขกี่รอบ?", a: "จำนวนรอบการแก้ไขจะถูกกำหนดร่วมกันก่อนเริ่มงาน เพื่อปรับแต่งแต่ละองค์ประกอบของอัตลักษณ์ภายในกรอบที่ชัดเจน" },
          ],
          crossLink: { label: "ต้องการเว็บไซต์ด้วยใช่ไหม? ดู Rebranding + Site Premium →", slug: "rebranding-site-premium" },
        },
        {
          name: "Projet Sur Mesure",
          tagline: "ความต้องการเฉพาะของคุณ",
          h1Lead: "โปรเจกต์เว็บกำหนดเองที่ตูร์ ·",
          h1Benefit: "เมื่อเทมเพลตมาตรฐานไม่พอ",
          sub: "ธุรกิจของคุณเติบโตเกินเว็บสำเร็จรูปแล้ว ไม่ว่าจะเป็นระบบจอง แคตตาล็อก หรือพื้นที่สมาชิก เราสร้างเครื่องมือที่ตรงกับธุรกิจคุณ",
          metaTitle: "โปรเจกต์เว็บกำหนดเองที่ตูร์ · เมื่อเทมเพลตมาตรฐานไม่พอ | Sèvalys",
          metaDescription: "โปรเจกต์เว็บกำหนดเองที่ตูร์ เพื่อแทนที่การจองทางกระดาษ เครื่องมือที่แยกจากกัน และเทมเพลตทั่วไป ด้วยโซลูชันที่สร้างเฉพาะสำหรับธุรกิจของคุณ ใบเสนอราคาภายใน 48 ชั่วโมง",
          directAnswer: "โปรเจกต์กำหนดเองจำเป็นเมื่อธุรกิจของคุณต้องพึ่งพาสิ่งที่ไม่มีเว็บสำเร็จรูปใดครอบคลุม เช่น การจองออนไลน์ แคตตาล็อกสินค้า พื้นที่สมาชิก หรือการเชื่อมต่อกับเครื่องมือที่คุณใช้อยู่แล้ว เราจะสร้างโซลูชันที่ออกแบบมาเฉพาะสำหรับธุรกิจของคุณ แทนที่จะดัดแปลงจากเทมเพลตทั่วไป",
          problems: [
            { n: "A", title: "กระบวนการที่จัดการด้วยมือ", desc: "การจองทางโทรศัพท์ กระดาษ ตารางคำนวณ — ทุกขั้นตอนขึ้นอยู่กับคนที่ต้องจำและกรอกข้อมูลซ้ำทุกครั้ง" },
            { n: "B", title: "เครื่องมือเดิมที่ไม่เชื่อมกับเว็บไซต์", desc: "ระบบแคชเชียร์ ตารางงาน หรือสต๊อกของคุณแยกออกจากเว็บไซต์ ทำให้ต้องกรอกข้อมูลซ้ำสองครั้งทุกครั้ง" },
            { n: "C", title: "ความต้องการเฉพาะที่ไม่มีเทมเพลตใดครอบคลุม", desc: "ระบบจองแบบกำหนดช่วงเวลา พื้นที่สมาชิก แคตตาล็อกที่กรองได้ — ฟีเจอร์เหล่านี้ต้องพัฒนาเฉพาะ ไม่ใช่ธีมทั่วไปที่ดัดแปลง" },
          ],
          features: [
            "เว็บไซต์หลายหน้าแบบครบวงจร",
            "ร้านค้าออนไลน์",
            "ระบบการจอง",
            "พื้นที่สมาชิกหรือระบบหลังบ้าน",
            "การเชื่อมต่อกับเครื่องมือที่คุณใช้อยู่",
            "ออกแบบเว็บไซต์ใหม่ทั้งหมด",
            "การดูแลเฉพาะตลอดโปรเจกต์",
          ],
          enjeux: [
            "เครื่องมือที่กำหนดเองช่วยประหยัดเวลาได้จริง ไม่ต้องกรอกข้อมูลซ้ำระหว่างโทรศัพท์ กระดาษ และเว็บไซต์ ไม่ต้องจัดการสองเครื่องมือที่ไม่เชื่อมกัน",
            "กระบวนการไม่ขึ้นอยู่กับความจำของคนคนเดียวอีกต่อไป มันถูกบันทึกไว้ในเครื่องมือ ทุกคนในทีมเข้าถึงได้ และยังทำงานต่อได้แม้วันที่คนคนนั้นไม่อยู่",
          ],
          caseQuote: "เมื่อก่อนการลงทะเบียนต้องใช้กระดาษและกรอกข้อมูลทีละใบ ตอนนี้ทุกอย่างทำออนไลน์ได้หมด ช่วยประหยัดเวลาได้มากทุกช่วงเปิดเทอมใหม่",
          signals: [],
          faq: [
            { q: "โปรเจกต์กำหนดเองใช้เวลานานแค่ไหน?", a: "ขึ้นอยู่กับขนาดของความต้องการ ระบบจองหรือพื้นที่สมาชิกใช้เวลานานกว่าการเพิ่มหน้าเดียว การประเมินขอบเขตและใบเสนอราคาจะส่งภายใน 48 ชั่วโมง โดยไม่มีข้อผูกมัด" },
            { q: "เริ่มจากศูนย์หรือจากเว็บไซต์เดิม?", a: "ทำได้ทั้งสองแบบ เราสามารถสร้างเครื่องมือใหม่ทั้งหมด หรือเริ่มจากเว็บไซต์ปัจจุบันแล้วเพิ่มฟีเจอร์ที่ขาดไปโดยไม่ต้องสร้างใหม่ทั้งหมด อย่างราบรื่นและไม่กระทบผู้เข้าชมปัจจุบัน" },
            { q: "เครื่องมือสามารถพัฒนาต่อได้ไหม?", a: "ได้ เครื่องมือถูกออกแบบมาให้เติบโตไปกับคุณ ฟีเจอร์ใหม่ ความต้องการที่เปลี่ยนไป การเชื่อมต่อเพิ่มเติม — แต่ละการพัฒนาจะถูกประเมินแยกกัน โดยไม่ต้องเริ่มใหม่ทั้งหมด และไม่มีข้อผูกมัดเกินกว่าที่คุณเห็นชอบ" },
          ],
          crossLink: null,
        },
        {
          name: "Agent Vocal IA",
          tagline: "โทรศัพท์ของคุณ ระบบอัตโนมัติ",
          h1Lead: "Agent Vocal IA ที่ตูร์ ·",
          h1Benefit: "ที่รับสายแทนคุณตลอด 24 ชั่วโมง",
          sub: "ไม่พลาดสายอีกต่อไป ไม่ว่าจะเป็นตอนเย็น วันหยุด หรือช่วงเวลาเร่งด่วน มีคนรับสายเสมอ",
          metaTitle: "Agent Vocal IA ที่ตูร์ · ที่รับสายแทนคุณตลอด 24 ชั่วโมง | Sèvalys",
          metaDescription: "Agent Vocal IA ที่ตูร์ ที่รับสาย คัดกรอง และบันทึกทุกสายตลอด 24 ชั่วโมง แม้นอกเวลาทำการ ผู้โทรจะได้รับแจ้งล่วงหน้าว่ากำลังคุยกับ AI",
          directAnswer: "Agent Vocal IA คือระบบรับสายอัจฉริยะที่ตอบแทนคุณ เข้าใจคำขอ คัดกรองสาย และบันทึกข้อมูลไว้ใช้งานต่อได้ ผู้โทรทุกคนจะได้รับแจ้งตั้งแต่ต้นสายว่ากำลังคุยกับปัญญาประดิษฐ์ ตามข้อกำหนดความโปร่งใสของกฎหมาย AI ของสหภาพยุโรป",
          problems: [
            { n: "A", title: "สายที่พลาดระหว่างเวลาทำงานหรือนอกเวลาทำการ", desc: "ตอนเย็น วันหยุด หรือช่วงเร่งด่วน ไม่มีใครรับสาย และลูกค้าก็โทรไปหาคู่แข่งแทน" },
            { n: "B", title: "เสียเวลากับโทรศัพท์แทนที่จะทำงานหลัก", desc: "ทุกสายซ้ำๆ เรื่องเวลาทำการ ความพร้อม หรือคำถามง่ายๆ ดึงคุณออกจากงานที่มีแต่คุณเท่านั้นที่ทำได้" },
            { n: "C", title: "ข้อมูลที่ต้องโทรกลับหายหรือจดผิด", desc: "โพสต์อิทหาย ชื่อสะกดผิด แล้วการโทรกลับที่สัญญาไว้ก็ไม่เกิดขึ้น" },
          ],
          features: [
            "ติดตั้ง VAPI พร้อมเบอร์ Twilio เฉพาะ",
            "เสียง ElevenLabs ที่เป็นธรรมชาติ",
            "เชื่อมต่อ CRM ผ่าน MCP",
            "สคริปต์ธุรกิจที่กำหนดเอง 1 แบบ",
            "บันทึกเสียงและสรุปทุกสาย",
            "แจ้งผู้โทรอย่างชัดเจนว่ากำลังคุยกับ AI",
            "รองรับการเริ่มต้นใช้งาน",
          ],
          enjeux: [
            "Agent Vocal IA รับสายที่คุณเคยพลาด ทั้งตอนเย็น วันหยุด และช่วงเร่งด่วน โดยไม่ปล่อยให้ลูกค้ารอสาย",
            "ทีมของคุณไม่ถูกขัดจังหวะด้วยโทรศัพท์ทุกครั้งที่มีคำสั่งซื้อหรือคำถามซ้ำๆ อีกต่อไป ทุกสายจะถูกรับ คัดกรอง และสรุปไว้ คุณเข้ามาดูแลเองเฉพาะเมื่อจำเป็นจริงๆ",
          ],
          caseQuote: "ช่วงเร่งด่วนตอนเช้าเราแทบไม่มีเวลารับสายเลย ตอนนี้ agent รับทุกสายและจดคำสั่งซื้อได้โดยที่เราไม่ต้องละมือจากเตาอบ",
          signals: [],
          faq: [
            { q: "ลูกค้าของฉันรู้ไหมว่ากำลังคุยกับ AI?", a: "รู้แน่นอน agent จะแจ้งตั้งแต่ต้นสายว่านี่คือปัญญาประดิษฐ์ นี่เป็นข้อกำหนดทางกฎหมายด้านความโปร่งใส และไม่มีการปิดบังผู้โทรแต่อย่างใด" },
            { q: "ถ้า agent ตอบไม่ได้จะเกิดอะไรขึ้น?", a: "Agent จะคัดกรองคำขอและจดข้อความไว้อย่างละเอียดเมื่อคำถามเกินขอบเขตสคริปต์ คุณจะได้รับบันทึกเสียงและโทรกลับหาลูกค้าเองโดยไม่เสียรายละเอียดใดๆ" },
            { q: "ฉันจะยังใช้เบอร์เดิมได้ไหม?", a: "ส่วนใหญ่ได้แน่นอน เบอร์เดิมของคุณสามารถโอนสายไปที่ agent ได้เลย ลูกค้าไม่ต้องจำเบอร์ใหม่หรือเปลี่ยนวิธีโทรหาคุณ" },
          ],
          crossLink: null,
        },
        {
          name: "Maintenance",
          tagline: "เว็บไซต์ที่ยังมีชีวิตอยู่เสมอ",
          h1Lead: "Maintenance เว็บไซต์ที่ตูร์ ·",
          h1Benefit: "แล้วคุณไม่ต้องกังวลอีกต่อไป",
          sub: "อัพเดต สำรองข้อมูล ความปลอดภัย และการแก้ไขเล็กๆ น้อยๆ ทุกอย่างมีคนดูแลให้เว็บไซต์ทำงานต่อเนื่อง",
          metaTitle: "Maintenance เว็บไซต์ที่ตูร์ · แล้วคุณไม่ต้องกังวลอีกต่อไป | Sèvalys",
          metaDescription: "Maintenance เว็บไซต์ที่ตูร์ อัพเดต สำรองข้อมูล ความปลอดภัย และแก้ไขเนื้อหาเล็กน้อยดูแลให้คุณ โดยไม่มีข้อผูกมัดระยะเวลา",
          directAnswer: "Maintenance เว็บไซต์ครอบคลุมการอัพเดตด้านเทคนิคและความปลอดภัย การสำรองข้อมูลสม่ำเสมอ การตรวจสอบความพร้อมใช้งาน และการแก้ไขเนื้อหาเล็กน้อย เพื่อให้เว็บไซต์ทำงานต่อเนื่องโดยที่คุณไม่ต้องดูแลเอง จำเป็นเพราะเว็บไซต์ที่ไม่มีใครดูแลมักจะช้าลง อ่อนแอลง หรือล้าสมัยในที่สุด",
          problems: [
            { n: "A", title: "เว็บไซต์ที่พังหรือช้าลงโดยไม่แจ้งเตือน", desc: "การอัพเดตที่พลาดไป ปลั๊กอินที่พัง แล้วเว็บไซต์ก็ช้าลงหรือเข้าไม่ได้ก่อนที่ใครจะทันสังเกต" },
            { n: "B", title: "เนื้อหาที่ไม่เคยได้รับการอัพเดตเพราะไม่มีเวลา", desc: "ระหว่างการทำธุรกิจและเรื่องอื่นๆ ไม่มีใครมีเวลาหรือความรู้พอที่จะแก้ไขแม้แต่บรรทัดเดียวบนเว็บไซต์" },
            { n: "C", title: "ไม่มีการสำรองข้อมูลในวันที่เกิดปัญหา", desc: "หากไม่มีการสำรองข้อมูลล่าสุด ความผิดพลาดหรือระบบล่มอาจลบเนื้อหาหลายเดือนได้ในไม่กี่วินาที" },
          ],
          features: [
            "อัพเดตด้านเทคนิคและความปลอดภัย",
            "สำรองข้อมูลสม่ำเสมอพร้อมกู้คืนเมื่อจำเป็น",
            "ตรวจสอบความพร้อมใช้งานของเว็บไซต์",
            "แก้ไขเนื้อหาเล็กน้อย",
            "ดูแลโฮสติ้งและโดเมนให้คุณ",
            "รายงานกิจกรรมสม่ำเสมอ",
            "ผู้ติดต่อเดียวที่ติดต่อได้เสมอ",
          ],
          enjeux: [
            "เว็บไซต์ที่ใช้งานไม่ได้แม้เพียงชั่วโมงเดียว หมายถึงลูกค้าที่หายไป สายที่ไม่เคยโทรเข้ามา หรือการค้นหาที่จบลงที่คู่แข่งแทน",
            "Maintenance ป้องกันสถานการณ์นี้ เว็บไซต์ยังคงออนไลน์ ทันสมัย และปลอดภัยอยู่เสมอ โดยที่คุณไม่ต้องคอยดูแลด้วยตัวเอง",
          ],
          caseQuote: null,
          signals: [
            { t: "ไม่มีข้อผูกมัดระยะเวลา", d: "หยุดได้ทุกเมื่อที่ต้องการ โดยไม่ต้องแจ้งล่วงหน้าแบบผูกมัดหรือให้เหตุผลใดๆ" },
            { t: "แจ้งระยะเวลาตอบกลับ", d: "ปัญหาที่แจ้งเข้ามาจะได้รับการตอบกลับภายในระยะเวลาที่แจ้งไว้ล่วงหน้า ไม่ใช่การรอโดยไม่มีกำหนด" },
            { t: "คุณยังคงเป็นเจ้าของ", d: "เว็บไซต์ เนื้อหา และสิทธิ์การเข้าถึงทั้งหมดเป็นของคุณเสมอ ทั้งวันนี้และวันที่คุณเลือกจะไป" },
          ],
          faq: [
            { q: "อะไรรวมอยู่และอะไรไม่รวม?", a: "รวม: อัพเดต สำรองข้อมูล ตรวจสอบระบบ โฮสติ้ง และแก้ไขเนื้อหาเล็กน้อย ส่วนการเปลี่ยนแปลงใหญ่ๆ เช่นหน้าใหม่หรือฟีเจอร์ใหม่ จะประเมินแยกต่างหาก" },
            { q: "ฉันสามารถหยุดได้ทุกเมื่อไหม?", a: "ได้ ไม่มีข้อผูกมัดระยะเวลาใดๆ คุณสามารถหยุดได้ทุกเมื่อโดยไม่ต้องให้เหตุผลหรือเสียค่าปรับ เพียงแจ้งล่วงหน้าเพื่อให้เราส่งมอบงานอย่างเรียบร้อย" },
            { q: "ถ้าเว็บไซต์ล่มวันอาทิตย์จะเกิดอะไรขึ้น?", a: "ระบบตรวจสอบจะตรวจพบปัญหาอย่างรวดเร็ว และเราจะเข้าดำเนินการทันทีที่ทำได้เพื่อให้เว็บไซต์กลับมาออนไลน์ รวมถึงวันหยุดสุดสัปดาห์ โดยไม่ต้องรอจนถึงวันทำการถัดไป" },
          ],
          crossLink: null,
        },
        {
          name: "Community Management",
          tagline: "โซเชียลของคุณ มีคนดูแล",
          h1Lead: "Community Management ที่ตูร์ ·",
          h1Benefit: "โซเชียลที่มีชีวิตอยู่เสมอ",
          sub: "บัญชีโซเชียลที่มีชีวิตและได้รับการดูแลอย่างต่อเนื่อง โดยไม่ต้องเสียเวลาช่วงเย็นของคุณ",
          metaTitle: "Community Management ที่ตูร์ · โซเชียลที่มีชีวิตอยู่เสมอ | Sèvalys",
          metaDescription: "Community Management ที่ตูร์: แนวทางเนื้อหา ปฏิทินการโพสต์ และการตอบข้อความ เพื่อให้โซเชียลมีเดียของคุณมีชีวิตอยู่เสมอ ไม่มีข้อผูกมัดระยะเวลา",
          directAnswer: "Community manager ดูแลบัญชี Facebook และ Instagram ของคุณแทนคุณ กำหนดแนวทางเนื้อหา วางแผนการโพสต์ สร้างภาพและข้อความ ตอบข้อความและรีวิว แล้วส่งสรุปผลให้คุณเป็นประจำ โซเชียลมีเดียของคุณยังคงมีชีวิตและสอดคล้องกันโดยที่คุณไม่ต้องเสียเวลาช่วงเย็นไปกับมัน",
          problems: [
            { n: "A", title: "บัญชีที่ถูกทิ้งร้าง", desc: "บัญชีมีอยู่แต่ไม่ได้อัพเดตมาหลายเดือนแล้ว ซึ่งสร้างความกังวลมากกว่าความมั่นใจให้กับผู้ที่พบเจอ" },
            { n: "B", title: "โพสต์ไม่สม่ำเสมอ ไม่มีทิศทาง", desc: "โพสต์รูปบ้างเป็นครั้งคราว โดยไม่มีจังหวะหรือแนวทางต่อเนื่อง ทำให้สร้างภาพลักษณ์ที่สอดคล้องกันไม่ได้เลย" },
            { n: "C", title: "ข้อความและรีวิวที่ไม่มีใครตอบ", desc: "คำถามในข้อความส่วนตัว รีวิว Google ที่รอคำตอบ ความเงียบนี้มองเห็นได้ชัดและสร้างภาพลักษณ์ที่ไม่ดี" },
          ],
          features: [
            "แนวทางเนื้อหาที่กำหนดร่วมกับคุณ",
            "ปฏิทินการโพสต์",
            "สร้างภาพและข้อความให้",
            "โพสต์บนบัญชีของคุณ",
            "ตอบข้อความและความคิดเห็น",
            "ติดตามและดูแลรีวิว",
            "สรุปผลกิจกรรมสม่ำเสมอ",
          ],
          enjeux: [
            "ระหว่างการค้นหาบน Google สองครั้ง ลูกค้าที่ลังเลมักจะดูโซเชียลมีเดียของคุณเพื่อตัดสินใจ บัญชีที่มีชีวิตและตอบกลับ พร้อมแสดงชีวิตประจำวันของคุณ จะสร้างความมั่นใจ ในขณะที่บัญชีที่ถูกทิ้งร้างกลับสร้างความกังวล",
            "การมีตัวตนอย่างสม่ำเสมอนี้สร้างความไว้วางใจตั้งแต่ก่อนการติดต่อโดยตรงครั้งแรก และเปลี่ยนโซเชียลมีเดียของคุณให้เป็นจุดแข็งทางธุรกิจอย่างแท้จริง แทนที่จะเป็นหน้าร้านที่ถูกลืม",
          ],
          caseQuote: null,
          signals: [
            { t: "ตรวจสอบก่อนเผยแพร่", d: "ทุกโพสต์จะถูกส่งให้คุณตรวจสอบก่อนเผยแพร่จริง ไม่มีสิ่งใดถูกโพสต์บนบัญชีของคุณโดยไม่ได้รับความยินยอมจากคุณ" },
            { t: "บัญชีเป็นชื่อของคุณ", d: "บัญชี Facebook และ Instagram ยังคงลงทะเบียนในชื่อและข้อมูลเข้าสู่ระบบของคุณ คุณจึงควบคุมได้เต็มที่ตลอดเวลา" },
            { t: "ไม่มีการต่ออายุอัตโนมัติ", d: "ข้อตกลงเป็นรายเดือนและไม่มีการต่ออายุอัตโนมัติ คุณเป็นผู้ตัดสินใจว่าจะดำเนินต่อหรือไม่ในแต่ละเดือน" },
          ],
          faq: [
            { q: "แต่ละเดือนมีการโพสต์กี่ครั้ง?", a: "จังหวะการโพสต์จะถูกกำหนดร่วมกันตามลักษณะธุรกิจและบัญชีของคุณ โดยทั่วไปจะเป็นหลายโพสต์ต่อสัปดาห์ ปริมาณที่แน่นอนจะถูกกำหนดไว้ก่อนเริ่มงาน ไม่มีเรื่องเซอร์ไพรส์ในภายหลัง" },
            { q: "ฉันได้ตรวจสอบโพสต์ก่อนเผยแพร่ไหม?", a: "ได้ ทุกโพสต์จะถูกส่งให้คุณอนุมัติก่อนเผยแพร่จริง ไม่มีสิ่งใดถูกโพสต์บนบัญชีของคุณโดยไม่ได้รับการอนุมัติจากคุณทุกครั้ง" },
            { q: "เอเจนซี่หรือฟรีแลนซ์ ต่างกันอย่างไรสำหรับบริการนี้?", a: "ความแตกต่างอยู่ที่ความต่อเนื่องและโครงสร้าง ผู้ติดต่อเพียงคนเดียว ข้อตกลงรายเดือนที่ไม่ต่ออายุอัตโนมัติ และแนวทางเนื้อหาที่ติดตามอย่างต่อเนื่อง แทนที่จะเป็นงานเฉพาะกิจครั้งเดียว" },
          ],
          crossLink: null,
        },
        {
          name: "Meta Ads",
          tagline: "FACEBOOK และ INSTAGRAM",
          h1Lead: "Meta Ads ที่ตูร์ ·",
          h1Benefit: "แคมเปญที่เจาะกลุ่มเป้าหมายได้ตรงจุด",
          sub: "เข้าถึงลูกค้าที่ใช่ใกล้ตัวคุณบน Facebook และ Instagram แทนที่จะบูสต์โพสต์แบบสุ่ม",
          metaTitle: "Meta Ads ที่ตูร์ · แคมเปญที่เจาะกลุ่มเป้าหมายได้ตรงจุด | Sèvalys",
          metaDescription: "Meta Ads ที่ตูร์: กำหนดกลุ่มเป้าหมายท้องถิ่น สร้างภาพและติดตามผลการแปลงเพื่อแคมเปญ Facebook และ Instagram ที่เจาะกลุ่มเป้าหมายได้ตรงจุด ไม่มีข้อผูกมัดระยะเวลา",
          directAnswer: "แคมเปญ Meta Ads ช่วยแสดงโฆษณาของคุณให้กับคนที่ใช่ ในพื้นที่ที่ลูกค้าของคุณอยู่จริง บน Facebook และ Instagram แทนที่จะหวังผลแบบสุ่ม โดยกำหนดเป้าหมายตามพื้นที่ อายุ และความสนใจ วัดผลสิ่งที่แปลงเป็นลูกค้าจริง และปรับอย่างต่อเนื่องเพื่อให้ทุกแคมเปญเข้าถึงลูกค้าที่มีศักยภาพจริง แทนที่จะเป็นคนนอกพื้นที่",
          problems: [
            { n: "A", title: "บูสต์โพสต์แบบสุ่ม", desc: "กดปุ่มบูสต์เป็นครั้งคราว โดยไม่มีกลยุทธ์หรือการติดตามผล แทบไม่เคยให้ผลลัพธ์ที่ชัดเจนหรือยั่งยืนเลย" },
            { n: "B", title: "กำหนดกลุ่มเป้าหมายกว้างเกินไป", desc: "หากไม่ตั้งค่าให้แม่นยำ โฆษณาจะเข้าถึงคนที่อยู่ไกลจากพื้นที่ของคุณ ซึ่งไม่มีทางกลายเป็นลูกค้าได้เลย" },
            { n: "C", title: "ไม่รู้เลยว่าได้อะไรกลับมา", desc: "งบโฆษณาถูกใช้ไปทุกเดือน โดยไม่มีรายงานใดแสดงให้เห็นว่ามันสร้างผลลัพธ์อะไรกลับมาให้ธุรกิจจริง" },
          ],
          features: [
            "กำหนดกลุ่มเป้าหมายท้องถิ่น",
            "สร้างภาพและข้อความโฆษณาให้",
            "ติดตั้งระบบติดตามผลการแปลง",
            "เปิดตัวและดูแลแคมเปญ",
            "ทดสอบข้อความโฆษณาหลายแบบ",
            "รายงานผลลัพธ์ที่ชัดเจน",
            "ปรับปรุงอย่างต่อเนื่อง",
          ],
          enjeux: [
            "แคมเปญที่เจาะกลุ่มเป้าหมายได้ดีจะเข้าถึงย่านและเมืองที่ลูกค้าของคุณอาศัยอยู่จริง ไม่ใช่ทั้งประเทศ ทุกการมองเห็นมีโอกาสจริงที่จะกลายเป็นลูกค้า แทนที่จะเป็นเพียงการมองผ่านที่สูญเปล่า",
            "การเจาะกลุ่มเป้าหมายท้องถิ่นนี้เปลี่ยนธรรมชาติของการโฆษณาไปเลย มันไม่ใช่ค่าใช้จ่ายที่คลุมเครืออีกต่อไป แต่กลายเป็นเครื่องมือที่วัดผลได้ ปรับปรุงทุกสัปดาห์ตามสิ่งที่ได้ผลจริง",
          ],
          caseQuote: null,
          signals: [
            { t: "คุณควบคุมบัญชีโฆษณาเอง", d: "บัญชีโฆษณายังคงอยู่ภายใต้การควบคุมของคุณ คุณมีสิทธิ์เข้าถึงเต็มรูปแบบและสามารถนำกลับไปดูแลเองได้ทุกเมื่อ" },
            { t: "ผลลัพธ์ที่เข้าใจง่าย", d: "รายงานถูกนำเสนอด้วยภาษาที่เข้าใจง่าย ไม่มีศัพท์เทคนิคที่ไม่จำเป็น เพื่อให้คุณเข้าใจได้ชัดเจนว่าอะไรได้ผล" },
            { t: "หยุดได้ทุกเมื่อ", d: "ไม่มีระยะเวลาขั้นต่ำใดๆ แคมเปญสามารถหยุดชั่วคราวหรือยกเลิกได้ทันทีที่คุณต้องการ" },
          ],
          faq: [
            { q: "ใครเป็นคนจ่ายค่าเผยแพร่โฆษณา และจ่ายให้ใคร?", a: "ค่าเผยแพร่โฆษณาจ่ายตรงให้ Meta จากบัญชีโฆษณาของคุณเอง เราไม่คิดค่าใช้จ่ายเพิ่มเติมใดๆ นอกเหนือจากการชำระเงินโดยตรงนี้ นอกจากค่าดูแลด้านกลยุทธ์และการบริหารแคมเปญ" },
            { q: "ใช้เวลานานแค่ไหนกว่าจะเห็นผลลัพธ์?", a: "สัญญาณแรกมักปรากฏหลังจากเผยแพร่ไปแล้วหนึ่งถึงสองสัปดาห์ ในช่วงที่กำลังปรับกลุ่มเป้าหมายและข้อความโฆษณา ส่วนผลลัพธ์ที่มั่นคงและยั่งยืนมักต้องใช้เวลาหลายสัปดาห์ของการดูแลอย่างต่อเนื่อง" },
            { q: "ต้องมีเพจ Facebook อยู่แล้วไหม?", a: "จำเป็นต้องมีเพจ Facebook และบัญชี Instagram เพื่อเผยแพร่โฆษณา หากยังไม่มีหรือต้องปรับปรุง การสร้างหรือปรับปรุงจะดำเนินการก่อนเริ่มแคมเปญ" },
          ],
          crossLink: null,
        },
        {
          name: "Google Ads",
          tagline: "มองเห็นได้เมื่อมีคนค้นหาคุณ",
          h1Lead: "Google Ads ที่ตูร์ ·",
          h1Benefit: "อยู่อันดับต้นเมื่อสำคัญที่สุด",
          sub: "ปรากฏอยู่อันดับต้นสำหรับการค้นหาที่นำลูกค้ามาจริง ไม่ใช่ทุกคำค้นหาที่เป็นไปได้",
          metaTitle: "Google Ads ที่ตูร์ · อยู่อันดับต้นเมื่อสำคัญที่สุด | Sèvalys",
          metaDescription: "Google Ads ที่ตูร์: คัดเลือกคำค้นหาที่แปลงเป็นลูกค้า เขียนโฆษณา และติดตามการโทร เพื่อให้มองเห็นได้เมื่อมีคนค้นหาคุณ ไม่มีข้อผูกมัดระยะเวลา",
          directAnswer: "Google Ads เหมาะกับ PME ท้องถิ่นเมื่อมีความต้องการที่เกิดขึ้นทันที เช่นความจำเป็นเร่งด่วนหรือความต้องการเฉพาะเจาะจง เพราะโฆษณาจะปรากฏอันดับต้นทันทีที่เปิดใช้งาน ต่างจาก SEO ท้องถิ่นที่ใช้เวลาหลายเดือนกว่าจะติดอันดับ แต่จะคงอยู่ได้ยาวนานโดยไม่มีค่าใช้จ่ายต่อคลิก ทั้งสองอย่างเสริมกันมากกว่าจะแข่งขันกัน",
          problems: [
            { n: "A", title: "มองไม่เห็นบนคำค้นหาที่สำคัญ", desc: "ลูกค้าพิมพ์สิ่งที่คุณนำเสนอพอดี แต่ร้านอื่นกลับปรากฏก่อนและได้รับความสนใจแทนคุณ" },
            { n: "B", title: "แคมเปญที่เปิดแล้วถูกลืม", desc: "โฆษณาถูกเปิดใช้งานครั้งเดียวแล้วไม่เคยปรับปรุงอีกเลย ทำให้งบประมาณสูญเปล่าโดยไม่ได้ประโยชน์อะไรเพิ่ม" },
            { n: "C", title: "คลิกจากคนนอกพื้นที่หรือนอกกลุ่มเป้าหมาย", desc: "หากไม่มีการยกเว้นที่แม่นยำ คลิกบางส่วนจะมาจากคนที่อยู่ไกลจากตูร์หรือไม่มีความต้องการจริง โดยเปล่าประโยชน์" },
          ],
          features: [
            "คัดเลือกคำค้นหาที่แปลงเป็นลูกค้า",
            "ยกเว้นคำค้นหาที่ไม่เป็นประโยชน์",
            "เขียนข้อความโฆษณา",
            "เชื่อมส่วนขยายและข้อมูลธุรกิจ",
            "ติดตามการโทรและแบบฟอร์ม",
            "ดูแลและปรับปรุงอย่างต่อเนื่อง",
            "รายงานผลลัพธ์ที่ชัดเจน",
          ],
          enjeux: [
            "Google Ads ไม่ได้สร้างความต้องการซื้อขึ้นมาใหม่ แต่จับความต้องการที่มีอยู่แล้ว ในช่วงเวลาที่มีคนกำลังค้นหาสิ่งที่คุณนำเสนอจริง แทนที่จะหวังว่าเขาจะเจอคุณโดยบังเอิญ",
            "ตรรกะนี้เปลี่ยนวิธีการใช้งบโฆษณาไปเลย ทุกคลิกตอบสนองต่อการค้นหาจริง ที่มีความต้องการอยู่แล้ว ทำให้การติดตามและปรับปรุงชัดเจนกว่าโฆษณาแบบดิสเพลย์ทั่วไปมาก",
          ],
          caseQuote: null,
          signals: [
            { t: "เจ้าของบัญชีโฆษณา", d: "บัญชี Google Ads เปิดในชื่อของคุณและเป็นทรัพย์สินของคุณอย่างเต็มที่ ทั้งวันนี้และวันที่คุณเลือกจะไป" },
            { t: "เห็นคำค้นหาและการยกเว้นได้เสมอ", d: "คุณสามารถตรวจสอบรายการคำค้นหาที่เลือกและที่ยกเว้นได้ทุกเมื่อ ไม่มีจุดที่มองไม่เห็นในการดูแล" },
            { t: "ไม่มีระยะเวลาบังคับ", d: "แคมเปญสามารถหยุดชั่วคราวหรือยกเลิกได้ทุกเมื่อ โดยไม่มีระยะเวลาขั้นต่ำหรือต้องให้เหตุผลใดๆ" },
          ],
          faq: [
            { q: "Google Ads หรือ SEO ต้องเลือกอย่างใดอย่างหนึ่งไหม?", a: "ทั้งสองอย่างเสริมกันมากกว่าจะแข่งขันกัน Google Ads ให้การมองเห็นทันที ในขณะที่ SEO ค่อยๆ ติดอันดับอย่างยั่งยืนบนคำค้นหาเดียวกัน คุณจึงไม่ต้องพึ่งพาโฆษณาเพียงอย่างเดียว" },
            { q: "ใครเป็นคนจ่ายค่าคลิก และจ่ายให้ใคร?", a: "แต่ละคลิกจ่ายตรงให้ Google จากบัญชี Google Ads ของคุณเอง เราไม่คิดค่าใช้จ่ายเพิ่มเติมใดๆ นอกเหนือจากการชำระเงินโดยตรงนี้ นอกจากค่าดูแลและกลยุทธ์ของแคมเปญ" },
            { q: "โฆษณาจะเริ่มแสดงผลได้เร็วแค่ไหน?", a: "เมื่อตั้งค่าบัญชีและอนุมัติโฆษณาแล้ว การเผยแพร่มักเริ่มภายในไม่กี่วัน การปรับกลุ่มเป้าหมายครั้งแรกจะตามมาในสัปดาห์แรกๆ ของการเผยแพร่จริง" },
          ],
          crossLink: null,
        },
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
  simulateur: {
    metaTitle: "โปรแกรมวิเคราะห์ดิจิทัลที่ตูร์ · Sèvalys",
    metaDescription: "ตอบคำถามสองสามข้อเกี่ยวกับธุรกิจของคุณ แล้วรับคำแนะนำที่ปรับให้เหมาะกับคุณทันที ระบุ 2 ถึง 4 แนวทางดิจิทัลที่สำคัญที่สุด โดยไม่มีข้อผูกมัด",
    badge: "แบบวิเคราะห์ · ไม่มีข้อผูกมัด",
    h1Lead: "แนวทางดิจิทัลใดบ้าง",
    h1Benefit: "ที่เหมาะกับธุรกิจของคุณ?",
    sub: "แบบวิเคราะห์สั้นๆ และตรงไปตรงมา คำถามสองสามข้อเกี่ยวกับธุรกิจของคุณ เราจะระบุ 2 ถึง 4 แนวทางที่สำคัญจริงๆ สำหรับคุณ ไม่ใช่รายการทุกอย่างที่เราทำได้",
    directAnswer: "โปรแกรมวิเคราะห์ของ Sèvalys คือแบบสอบถามออนไลน์ คุณตอบคำถามสี่หรือห้าข้อเกี่ยวกับสาขาธุรกิจของคุณ สถานะการมีตัวตนออนไลน์ และปัญหาที่คุณเจออยู่ตอนนี้ จากนั้นคุณจะได้รับคำแนะนำ 2 ถึง 4 บริการที่เหมาะสมทันที พร้อมคะแนนความพร้อมด้านดิจิทัล ไม่มีการประเมินราคาใดๆ เกิดขึ้น",
    intro: {
      heading: "แบบวิเคราะห์นี้ทำงานอย่างไร",
      paragraphs: [
        "แบบวิเคราะห์นี้มีไว้เพื่อคัดแยก ธุรกิจส่วนใหญ่ที่เราพบไม่จำเป็นต้องทำทุกอย่างใหม่ พวกเขาแค่ต้องรู้ว่าจะเริ่มจากตรงไหน",
        "คุณตอบคำถามสี่หรือห้าข้อ — สาขาธุรกิจของคุณ สถานะการมีตัวตนออนไลน์ สิ่งที่ทำให้คุณติดขัดอยู่ตอนนี้ และเป้าหมายสำคัญที่สุดในสามเดือนข้างหน้า แต่ละคำตอบจะให้น้ำหนักกับบริการทั้งเก้าของ Sèvalys และมีเพียง 2 ถึง 4 บริการที่ได้คะแนนสูงสุดเท่านั้นที่จะถูกเสนอให้คุณ",
        "ตอบตามความเป็นจริง โดยเฉพาะเมื่อคำตอบไม่ค่อยน่าพอใจ คำตอบที่มองโลกในแง่ดีเกินไปจะทำให้คำแนะนำไม่มีประโยชน์ สุดท้าย คุณฝากข้อมูลติดต่อไว้ และผลลัพธ์จะแสดงทันที",
      ],
    },
    start: "เริ่มวิเคราะห์ของฉัน →",
    progressLabel: "คำถาม {current} จาก {total}",
    next: "ถัดไป →",
    nextFinal: "ดูคำแนะนำของฉัน →",
    back: "← ก่อนหน้า",
    questions: {
      'secteur': {
        text: "คุณทำธุรกิจในสาขาใด?",
        hint: "ข้อมูลนี้ช่วยให้เราให้น้ำหนักคำแนะนำได้ตรงขึ้น ไม่มีบริการใดถูกตัดออกล่วงหน้า",
        options: {
          'commerce-local': "ร้านค้าท้องถิ่น",
          'restauration-hotellerie': "ร้านอาหารหรือโรงแรม",
          'artisan-btp': "งานฝีมือหรือก่อสร้าง",
          'services-pro': "บริการทางธุรกิจ",
          'sante-bien-etre': "สุขภาพหรือความเป็นอยู่ที่ดี",
          autre: "สาขาอื่น",
        },
      },
      'presence-en-ligne': {
        text: "คุณคิดว่าการมีตัวตนออนไลน์ของคุณตอนนี้เป็นอย่างไร?",
        hint: "เว็บไซต์ โปรไฟล์ Google โซเชียลมีเดีย — ความรู้สึกโดยรวมของคุณก็เพียงพอ",
        options: {
          inexistante: "ไม่มีเลย — ไม่มีใครหาฉันเจอ",
          datee: "ล้าสมัย — มีอยู่ แต่ไม่เหมือนฉันแล้ว",
          correcte: "พอใช้ได้ — ทำหน้าที่ได้ แต่ไม่มากกว่านั้น",
          solide: "แข็งแรงดี — ฉันพอใจกับโดยรวม",
        },
      },
      'site-fiabilite': {
        text: "เว็บไซต์ปัจจุบันของคุณได้รับการดูแล อัพเดท และเชื่อถือได้หรือไม่?",
        hint: "การอัพเดท การสำรองข้อมูล ความปลอดภัย ความเร็วในการโหลด",
        options: {
          'jamais-touche': "ไม่มีใครแตะต้องมันเลยตั้งแต่เปิดใช้งาน",
          'bugs-frequents': "มันล่มหรือช้าเป็นประจำ",
          'quelques-alertes': "มีการแจ้งเตือนบางครั้ง",
          'suivi-regulier': "มีการดูแลอย่างสม่ำเสมอ",
        },
      },
      'frictions': {
        text: "อะไรที่ทำให้คุณติดขัดที่สุดตอนนี้?",
        hint: "เลือกได้หลายข้อ",
        options: {
          'appels-manques': "ฉันรับสายไม่ทัน",
          'pas-assez-de-demandes': "ฉันได้รับคำขอเข้ามาไม่มากพอ",
          'image-depassee': "ภาพลักษณ์ของฉันไม่ตรงกับสิ่งที่ฉันทำอีกต่อไป",
          'site-lent-ou-casse': "เว็บไซต์ของฉันช้าหรือใช้งานไม่ได้",
          'reseaux-inactifs': "โซเชียลมีเดียของฉันถูกทิ้งไว้เฉยๆ",
          'taches-repetitives': "ฉันเสียเวลากับงานซ้ำๆ",
          'rien-de-bloquant': "ไม่มีอะไรติดขัด ฉันแค่อยากพัฒนาต่อ",
        },
      },
      'priorite': {
        text: "คุณต้องการให้ความสำคัญกับเรื่องใดในสามเดือนข้างหน้า?",
        hint: "เลือกเพียงหนึ่งเป้าหมาย — นั่นคือสิ่งที่ทำให้แบบวิเคราะห์นี้มีประโยชน์",
        options: {
          'etre-trouve': "ให้คนหาฉันเจอง่ายขึ้น",
          'convertir-plus': "เปลี่ยนผู้เข้าชมให้เป็นลูกค้ามากขึ้น",
          'gagner-du-temps': "ประหยัดเวลาในแต่ละวัน",
          'changer-d-image': "เปลี่ยนภาพลักษณ์",
        },
      },
    },
    contact: {
      heading: "ส่งผลวิเคราะห์ของคุณไปที่ไหนดี?",
      sub: "คำตอบของคุณจะถูกบันทึกไว้พร้อมข้อมูลติดต่อ เพื่อให้เราติดต่อกลับพร้อมความเห็นที่มีเหตุผลรองรับ ผลลัพธ์ของคุณจะแสดงทันทีหลังจากนี้",
      nomLabel: "ชื่อ",
      nomPlaceholder: "ชื่อของคุณ",
      emailLabel: "อีเมล",
      emailPlaceholder: "you@business.com",
      telephoneLabel: "โทรศัพท์",
      telephonePlaceholder: "06 00 00 00 00",
      consentLabel: "ฉันยินยอมให้ Sèvalys ใช้คำตอบของฉันเพื่อติดต่อฉันกลับเกี่ยวกับแบบวิเคราะห์นี้",
      rgpdHeading: "การจัดการข้อมูลของคุณ",
      rgpdMentions: [
        { k: "ผู้รับผิดชอบ", v: "Sèvalys — Anatholy Bricon, Tours (37), ฝรั่งเศส — contact@sevalys.com" },
        { k: "วัตถุประสงค์", v: "การพิจารณาความต้องการของคุณและการติดต่อกลับโดยทีมของเรา" },
        { k: "ฐานทางกฎหมาย", v: "ความยินยอมของคุณ ที่ให้ไว้โดยการติ๊กช่องด้านบน" },
        { k: "การเก็บรักษา", v: "12 เดือน หากคุณไม่ได้เป็นลูกค้า จากนั้นจะถูกลบโดยอัตโนมัติ" },
        { k: "สิทธิ์ของคุณ", v: "การเข้าถึง แก้ไข ลบ จำกัดการใช้ คัดค้าน และโอนย้ายข้อมูล ผ่านทาง contact@sevalys.com คุณสามารถยื่นเรื่องร้องเรียนต่อ CNIL ได้" },
      ],
      submit: "รับผลวิเคราะห์ของฉัน →",
      submitting: "กำลังส่ง…",
      errorHeading: "เกิดข้อผิดพลาด",
      errorBody: "ไม่สามารถส่งผลวิเคราะห์ของคุณได้ กรุณาลองใหม่ หรือติดต่อเราโดยตรงที่ +33 (0)6 07 18 41 33 / contact@sevalys.com",
    },
    result: {
      heading: "ผลวิเคราะห์ของคุณ",
      gaugeCaption: "คะแนนความพร้อมด้านดิจิทัล",
      framing: {
        low: "แนวทางดิจิทัลจำนวนมากยังไม่ถูกใช้ประโยชน์ นี่คือข่าวดี เพราะโอกาสที่เห็นผลเร็วที่สุดอยู่ตรงหน้าคุณแล้ว และบริการด้านล่างคือจุดเริ่มต้นที่เหมาะสม",
        mid: "พื้นฐานของคุณมั่นคง แต่แนวทางหลายอย่างยังทำงานได้ไม่เต็มที่ บริการด้านล่างคือสิ่งที่จะปลดล็อกผลลัพธ์ได้มากที่สุดในระยะสั้น",
        high: "พื้นฐานของคุณแข็งแรงดี สิ่งที่เหลืออยู่คือเรื่องการลงมือทำ บริการด้านล่างคือแนวทางที่คุ้มค่าที่สุดสำหรับสถานการณ์ของคุณ",
      },
      servicesHeading: "แนวทางสำคัญของคุณ",
      ctaHeading: "มาพูดคุยเรื่องผลวิเคราะห์ของคุณกัน",
      ctaSub: "การพูดคุยสิบห้านาทีก็เพียงพอที่จะยืนยัน — หรือปรับแก้ — สิ่งที่แบบวิเคราะห์นี้ระบุไว้",
      callLabel: "โทร",
      writeLabel: "เขียนถึงเรา",
    },
    faq: [
      {
        q: "โปรแกรมวิเคราะห์ให้ราคาประเมินหรือไม่?",
        a: "ไม่ แบบวิเคราะห์นี้ระบุแนวทางสำคัญสำหรับสถานการณ์ของคุณ ไม่ใช่จำนวนเงิน การบอกราคาโดยไม่เห็นธุรกิจของคุณจะไม่มีความหมาย เราจะพูดคุยเรื่องนี้ในการสนทนาที่ตามมา",
      },
      {
        q: "แบบวิเคราะห์ใช้เวลานานแค่ไหน?",
        a: "ไม่ถึงสองนาที มีสี่หรือห้าคำถามขึ้นอยู่กับคำตอบของคุณ ถ้าคุณยังไม่มีตัวตนออนไลน์ คำถามเรื่องความเชื่อถือได้ของเว็บไซต์จะถูกข้ามไปโดยอัตโนมัติ",
      },
      {
        q: "ทำไมแนะนำเพียง 2 ถึง 4 บริการ?",
        a: "เพราะคำแนะนำที่รวมทั้งเก้าบริการไม่ใช่คำแนะนำที่แท้จริง แต่ละคำตอบจะให้น้ำหนักกับบริการต่างๆ และมีเพียง 2 ถึง 4 บริการที่ได้คะแนนสูงสุดเท่านั้นที่จะถูกเสนอให้คุณ ส่วนที่เหลือรอได้",
      },
      {
        q: "คำตอบของฉันจะเป็นอย่างไรต่อไป?",
        a: "คำตอบของคุณจะถูกบันทึกไว้พร้อมข้อมูลติดต่อเพื่อเตรียมการสนทนาของเรา เก็บไว้สูงสุด 12 เดือนหากคุณไม่ได้เป็นลูกค้า จากนั้นจะถูกลบโดยอัตโนมัติ คุณสามารถขอให้ลบข้อมูลได้ทุกเมื่อที่ contact@sevalys.com",
      },
    ],
  },
  landing: {
    hero: {
      pill: 'เอเจนซี่ · ตูร์ ฝรั่งเศส · พร้อมตั้งแต่พ.ค. 2026',
      title_l1: 'เครื่องมือ',
      title_l2: 'ที่ ',
      title_l2_it: 'ทำงาน',
      title_l3: 'เพื่อลูกค้าของคุณ',
      sub: 'เราออกแบบเว็บไซต์ เครื่องมือจัดการ และ AI agents สำหรับร้านอาหาร ร้านค้า และบริการท้องถิ่น ไม่มีของฟุ่มเฟือย — มีแต่สิ่งที่ช่วยประหยัดเวลา รับสายและเพิ่มยอดขาย',
      cta_primary: 'เริ่มวินิจฉัย',
      cta_secondary: 'คุยเรื่องโปรเจกต์',
      stat_1_n: '06', stat_1_l: 'พาร์ทเนอร์ปัจจุบัน', stat_1_d: 'ร้านอาหาร โรงเรียน อิสระ',
      stat_2_n: '24ชม', stat_2_l: 'ตอบกลับแรก', stat_2_d: 'ปรึกษาฟรี',
      stat_3_n: '100%', stat_3_l: 'เป็นเจ้าของโค้ด', stat_3_d: 'ตั้งแต่วันแรก',
      stat_4_n: '1.5x', stat_4_l: 'อัตรารับสาย', stat_4_d: 'เมื่อมี phone agent',
      canvas_l: 'โมเดล · BA-01',
      canvas_r: 'หมุน · 0.4 RPM',
    },
    manifeste: {
      num: '01 / 07',
      title_l1: 'เว็บไซต์ เครื่องมือ',
      title_l2_it: 'AI agents',
      intro: 'สามอย่างที่เราทำ — เพื่อเป้าหมายเดียว',
      p1: 'คุณเป็นเจ้าของพิซเซเรีย ผู้จัดการร้านเสริมสวย ผู้บริหารโรงเรียนสอนเต้น คุณต้องการเครื่องมือที่ใช้ได้จริง',
      p2: 'เราสัญญาแค่อย่างเดียว: สร้างสิ่งที่ลูกค้าของคุณจะใช้จริง ส่วนอื่นๆเราตัดทิ้ง',
      quote: '« เว็บสวยก็ดี เว็บที่สร้างรายได้ดีกว่า »',
      p3: 'ตอนนี้เราสร้าง AI agents เป็นหลัก — phone agents ที่รับสายลูกค้า ผู้ช่วยรับออเดอร์ ระบบอัตโนมัติที่ทำงานแทนคุณ',
      p4: 'พรุ่งนี้เราจะสร้างสิ่งที่คุณต้องการ ฝีมือยังเหมือนเดิม: เครื่องมือที่มีประโยชน์',
    },
    problems: {
      num: '02 / 07',
      title_l1: 'สิ่งที่ทำให้คุณ',
      title_l2_it: 'เสียลูกค้า',
      intro: 'สี่สถานการณ์ที่ธุรกิจ SME เกือบทุกรายที่เราพบเจอต้องเผชิญ',
      items: [
        { n: '01', title: 'มองไม่เห็นบนออนไลน์', desc: 'ลูกค้าค้นหาธุรกิจของคุณบน Google แล้วเจอคู่แข่งก่อนเจอคุณ ทุกวันที่ไม่มีตัวตนออนไลน์ที่ชัดเจน ลูกค้าก็เลือกที่อื่น' },
        { n: '02', title: 'ไม่มีใครรับโทรศัพท์', desc: 'สายที่พลาดไปช่วงเร่งด่วน คือออเดอร์หรือการจองที่หลุดไปหาร้านข้างๆ เกิดขึ้นบ่อยกว่าที่คิด' },
        { n: '03', title: 'ภาพลักษณ์ล้าสมัย', desc: 'โลโก้ เว็บไซต์ โซเชียล เมื่อทุกอย่างดูเหมือนยุคก่อน ลูกค้าใหม่ก็ลังเลตั้งแต่ยังไม่ได้คุยกัน' },
        { n: '04', title: 'ไม่มีเวลาดูแลโซเชียลมีเดีย', desc: 'ระหว่างงานประจำวันกับลูกค้าที่ร้าน โซเชียลมีเดียมักถูกทิ้งไว้ทีหลัง ทั้งที่นั่นคือจุดแรกที่ลูกค้าใหม่มักมองหา' },
      ],
      good_news: 'ข่าวดีคือ ปัญหาแต่ละอย่างมีทางแก้ที่ไม่ซับซ้อน โดยไม่ต้องเปลี่ยนทุกอย่างพร้อมกัน',
      cta: 'ทดสอบวินิจฉัย',
    },
    servicesPreview: {
      num: '03 / 07',
      title_l1: 'เก้าวิธี',
      title_l2_it: 'ที่ช่วยคุณได้',
      intro: 'แต่ละบริการมีหน้าเพจของตัวเอง: ปัญหาที่แก้ วิธีการทำงาน และสิ่งที่เปลี่ยนไปสำหรับคุณ',
    },
    method: {
      num: '04 / 07',
      title_l1: 'วิธีการ',
      title_l2_it: 'ทำงานของเรา',
      intro: 'ขั้นตอนง่ายๆ ตั้งแต่การพูดคุยครั้งแรกจนถึงการดูแลต่อเนื่อง',
      steps: [
        { n: '01', t: 'วินิจฉัย', d: 'เราตรวจสอบธุรกิจของคุณและสิ่งที่เป็นอุปสรรคอยู่ตอนนี้ ด้วยคำถามที่ตรงจุด' },
        { n: '02', t: 'ข้อเสนอเฉพาะคุณ', d: 'คุณจะได้รับคำแนะนำที่ชัดเจนของบริการที่เหมาะกับสถานการณ์คุณ ไม่มีศัพท์เทคนิค' },
        { n: '03', t: 'ดำเนินการ', d: 'เราติดตั้งโซลูชันที่เลือกไว้ตามจังหวะของคุณ พร้อมติดตามผลอย่างสม่ำเสมอ' },
        { n: '04', t: 'ดูแลและสนับสนุน', d: 'เราพร้อมให้ความช่วยเหลือหลังเปิดใช้งาน เพื่อปรับแต่งและตอบคำถามของคุณ' },
      ],
    },
    enjeux: {
      num: '05 / 07',
      title_l1: 'สิ่งที่',
      title_l2_it: 'เสี่ยงอยู่',
      intro: 'การไม่ทำอะไรเลยก็ส่งผลเช่นกัน เพียงแต่มองไม่เห็นชัดในแต่ละวัน',
      points: [
        { t: 'คู่แข่งของคุณครองพื้นที่การค้นหาในท้องถิ่น', d: 'ขณะที่คุณลังเล คนที่มีตัวตนออนไลน์ชัดเจนอยู่แล้วก็ดึงการค้นหาบน Google จากลูกค้าในอนาคตของคุณไป' },
        { t: 'สายที่พลาดสะสมมากขึ้นเรื่อยๆ', d: 'สายที่พลาดครั้งเดียวดูเหมือนไม่มีอะไร แต่รวมกันตลอดทั้งปี กลายเป็นออเดอร์จำนวนมากที่หลุดไปที่อื่น' },
        { t: 'ความน่าเชื่อถือของแบรนด์ลดลง', d: 'อัตลักษณ์ที่ไม่เปลี่ยนแปลงในขณะที่ตลาดเปลี่ยนไป จะดูล้าสมัยในที่สุด แม้บริการจะยังดีอยู่ก็ตาม' },
        { t: 'โซเชียลมีเดียหลุดมือไป', d: 'หากไม่มีความสม่ำเสมอ กลุ่มผู้ชมที่ก่อตัวขึ้นจะไปอยู่ที่อื่น กับคนที่ใช้เวลาปรากฏตัวอยู่เสมอ' },
      ],
    },
    work: {
      num: '06 / 07',
      title_l1: 'ผลงาน',
      title_l2_it: 'ที่คัดสรร',
      intro: 'พาร์ทเนอร์ 6 ราย 6 อาชีพ วิธีเดียวกัน: แก้ปัญหาทางธุรกิจจริง',
      items: [
        { name: 'Feuillette', desc: 'Phone agent สำหรับร้านเบเกอรี่ — รับออเดอร์อัตโนมัติ', tags: ['AI', 'เสียง', 'CRM'], year: '2025' },
        { name: 'Gecko Cabane', desc: 'เว็บร้านอาหาร + จองโต๊ะ ดีไซน์เฉพาะ โฮสติ้งดูแลให้', tags: ['เว็บ', 'จอง'], year: '2024' },
        { name: 'Les Folies Temps Danse', desc: 'แพลตฟอร์มลงทะเบียนโรงเรียนสอนเต้น', tags: ['เว็บ', 'จัดการ'], year: '2024' },
        { name: 'Ghjulianu Codani', desc: 'Portfolio ระดับมืออาชีพ', tags: ['เว็บ', 'บรรณาธิการ'], year: '2025' },
      ],
      bridge_title_l1: 'บริการไหน',
      bridge_title_it: 'เหมาะกับคุณ?',
      bridge_body: 'วินิจฉัยสองนาทีเพื่อรู้แน่ชัดว่าคุณต้องการอะไร',
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
      num: '07 / 07',
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
