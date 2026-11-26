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
  // ── Blocs optionnels « contenu long » (briefs SEO 2026-11). Un service qui
  // n'en renseigne aucun s'affiche exactement comme avant. Les champs
  // indépendants de la langue (price, proofProjects, hrefs) doivent être
  // identiques en fr/en/th (vérifié par translations.test.ts).
  /** Paragraphes d'introduction affichés sous le hero (pas de titre). */
  longIntro?: string[];
  /** Sections de fond : un H2 chacune, paragraphes, liste et lien optionnels. */
  sections?: ServicePageSection[];
  /** Bloc tarifs « à partir de ». Seul bloc autorisé à contenir des prix. */
  pricing?: ServicePagePricing;
  /** Processus détaillé, étapes numérotées. */
  steps?: ServicePageStep[];
  /** Zone d'intervention : liste de communes / territoires. */
  areas?: string[];
  /** Indices dans caseStudyProjects (src/data/projects.ts) à montrer comme preuves. */
  proofProjects?: number[];
  /** Liens contextuels (ancre descriptive) vers pages et guides : composant « Guides liés ». */
  internalLinks?: ServicePageLink[];
}

export interface ServicePageSection {
  h2: string;
  paragraphs: string[];
  list?: string[];
  link?: { label: string; href: string };
}

export interface ServicePageStep {
  title: string;
  text: string;
  /** Durée indicative, ex. « 1 à 2 jours ». */
  duration: string;
}

export interface ServicePageLink {
  /** Ancre descriptive (jamais « cliquez ici »). */
  label: string;
  /** Chemin interne absolu, ex. « /guides/cout-site-vitrine ». */
  href: string;
  /** Phrase d'accroche facultative sous l'ancre. */
  description?: string;
}

export interface ServicePagePricing {
  /** Libellé avant le montant, ex. « À partir de ». */
  fromLabel: string;
  /** Montant en euros (nombre) : source du JSON-LD offers.price. */
  price: number;
  /** Précision après le montant, ex. « pour un site vitrine de 5 pages ». */
  unit: string;
  includes: string[];
  notIncluded: string[];
  /** Options facturées en plus : tableau libellé / montant (texte libre). */
  extras: { label: string; price: string }[];
  /** Mention légale affichée telle quelle : « TVA non applicable, art. 293 B du CGI ». */
  note: string;
}

/** Libellés des blocs optionnels (communs à tous les services d'une langue). */
export interface ServicePageExtraLabels {
  pricingHeading: string;
  pricingIncludes: string;
  pricingNotIncluded: string;
  pricingExtras: string;
  extrasColLabel: string;
  extrasColPrice: string;
  stepsHeading: string;
  stepDuration: string;
  areasHeading: string;
  proofHeading: string;
  proofVisit: string;
  guidesHeading: string;
  breadcrumbHome: string;
  breadcrumbServices: string;
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
  | { caseQuote: string; caseQuoteIsFact?: boolean; signals: [] }
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
  /** Shown above a `variant: 'range'` question's slider before the visitor has touched it —
   *  prevents the slider from looking pre-answered with the first option's label. */
  rangePlaceholder: string;
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
    telephoneHint: string;
    requiredNote: string;
    errorSummary: string;
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
    skipToContent: string;
  };
  services: {
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
    pages: {
      index: { badge: string; title_l1: string; title_l2_it: string; sub: string; num: string; intro: string; cardCta: string };
      back: string;
      answerLabel: string;
      caseLabel: string;
      headings: { probleme: string; fonctionnement: string; enjeux: string; preuve: string; faq: string };
      extra: ServicePageExtraLabels;
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
      sub: string;
      cta_primary: string;
      cta_secondary: string;
    };
    manifeste: {
      num: string;
      title_l1: string;
      title_l2_it: string;
      intro: string;
      quote: string;
      items: { t: string; d: string }[];
      cta: string;
    };
    servicesPreview: {
      num: string;
      title_l1: string;
      title_l2_it: string;
      intro: string;
      /** Five featured offers, in the order of FEATURED_SLUGS (ServicesPreview.tsx). */
      cards: { t: string; d: string; link: string }[];
      others: string;
      guide_price: string;
      guide_seo: string;
      vat: string;
      all: string;
    };
    work: {
      num: string;
      title_l1: string;
      title_l2_it: string;
      intro: string;
      items: { name: string; desc: string; tags: string[]; year: string }[];
      bridge_eyebrow: string;
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
    zone: {
      num: string;
      title_l1: string;
      title_l2_it: string;
      text: string;
      label: string;
      towns: string[];
    };
    why: {
      num: string;
      title_l1: string;
      title_l2_it: string;
      items: { t: string; d: string }[];
    };
    faq: {
      num: string;
      title_l1: string;
      title_l2_it: string;
      items: { q: string; a: string }[];
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
      updated: string;
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
      manageCookies: string;
      reviews: string;
      reviewPolicy: string;
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
    skipToContent: 'Aller au contenu principal',
  },
  services: {
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
    pages: {
      index: {
        badge: "NOS SERVICES — 2026",
        title_l1: "Nos",
        title_l2_it: "services.",
        sub: "Dix expertises pour rendre votre entreprise visible, crédible et joignable. Choisissez la vôtre — ou laissez le diagnostic vous guider.",
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
      extra: {
        pricingHeading: "Combien ça coûte",
        pricingIncludes: "Ce qui est inclus",
        pricingNotIncluded: "Ce qui n'est pas inclus",
        pricingExtras: "Options en supplément",
        extrasColLabel: "Option",
        extrasColPrice: "Montant",
        stepsHeading: "Comment se déroule le projet",
        stepDuration: "Durée indicative",
        areasHeading: "Où nous intervenons",
        proofHeading: "Réalisations à consulter",
        proofVisit: "Voir le site",
        guidesHeading: "Guides liés",
        breadcrumbHome: "Accueil",
        breadcrumbServices: "Services",
      },
      items: [
        {
          name: "Site Vitrine",
          tagline: "UN SITE QUI VOUS FAIT TROUVER ET APPELER",
          h1Lead: "Créez votre site internet à Tours,",
          h1Benefit: "simple et clair",
          sub: "Un site internet professionnel pour les artisans, restaurants et commerces de Tours. Vous savez ce que vous payez et qui s'en occupe.",
          metaTitle: "Création site internet à Tours dès 500 €",
          metaDescription: "Site internet pour artisans, restaurants et commerces de Tours. Dès 500 € (TVA non applicable, art. 293 B du CGI). Parlez-nous de votre projet.",
          directAnswer: "Un site vitrine présente votre activité en quelques pages : qui vous êtes, ce que vous faites, où vous trouver, comment vous joindre. Chez Sèvalys, il démarre à 500 € pour l'accueil et jusqu'à 2 pages, avec un délai de 2 à 4 semaines.",
          longIntro: [
            "Sèvalys est une agence digitale de Tours. Nous créons des sites internet pour les artisans, les restaurateurs et les commerçants de Tours et d'Indre-et-Loire. Votre site démarre à 500 €, pour l'accueil et jusqu'à 2 pages.",
            "Un site internet professionnel sert à trois choses : vous faire trouver sur Google, rassurer quelqu'un qui hésite, et lui donner un moyen simple de vous contacter. Une seule personne vous répond, du premier appel à la mise en ligne. Le devis est gratuit et arrive sous 48 h, sans engagement.",
          ],
          problems: [
            { n: "A", title: "On ne vous trouve pas sur Google", desc: "Un client tape votre métier et le nom de Tours. S'il ne voit pas votre site internet, il appelle quelqu'un d'autre. Vous perdez le contact avant d'avoir parlé." },
            { n: "B", title: "Le site date ou s'affiche mal sur mobile", desc: "Beaucoup de clients regardent d'abord depuis leur téléphone. Un site difficile à lire leur donne une mauvaise image de votre travail." },
            { n: "C", title: "Le site existe, mais personne n'appelle", desc: "Pas de numéro visible, pas de formulaire, pas d'itinéraire. Le visiteur ne sait pas quoi faire et repart." },
          ],
          features: [
            "Design sur mesure, à l'image de votre activité",
            "Affichage soigné sur mobile, tablette et ordinateur",
            "Accueil et jusqu'à 2 pages, claires et courtes",
            "Formulaire de contact intégré",
            "Carte Google Maps pour vous situer",
            "Bases du référencement local : titres, balises, fiche Google à relier",
            "Mise en ligne du site par nos soins",
          ],
          enjeux: [
            "Un site internet clair change ce qui se passe avant le premier appel. Le client voit vos horaires, vos réalisations et votre zone d'intervention. Il sait si vous êtes la bonne personne avant de décrocher le téléphone.",
            "Vous gagnez du temps sur les questions de base, et vous recevez des demandes plus sérieuses. Le site travaille pendant que vous êtes sur un chantier, en cuisine ou derrière le comptoir.",
          ],
          caseQuote: "Le site de Gecko Cabane, restaurant franco-thaï à Krabi, est disponible en quatre langues (français, anglais, allemand, suédois) et propose un formulaire de réservation en ligne, avec la carte et les horaires d'ouverture.",
          caseQuoteIsFact: true,
          signals: [],
          sections: [
            {
              h2: "Un site internet pour artisans à Tours",
              paragraphs: [
                "Un artisan attend trois choses de son site : être trouvé, montrer son travail, être appelé. Le reste est secondaire.",
                "Grand Ouest Habitat, une entreprise de rénovation du bâtiment basée à Tours, en donne un bon exemple. Son site affiche le numéro de téléphone, la zone d'intervention, les métiers, des photos de chantiers avant et après, et les avis Google reçus. Voici ce qu'un artisan doit montrer sur son site.",
              ],
              list: [
                "Son métier, en une phrase claire",
                "Ses réalisations, avec de vraies photos",
                "Sa zone d'intervention : Tours, Indre-et-Loire",
                "Un numéro de téléphone visible sur mobile",
                "Un formulaire pour décrire son chantier",
              ],
            },
            {
              h2: "Un site internet pour restaurants",
              paragraphs: [
                "Un client doit trouver quatre réponses en dix secondes : ce qu'on mange, quand c'est ouvert, comment réserver, comment venir.",
                "Le site de Gecko Cabane, restaurant franco-thaï à Krabi, en Thaïlande, présente la cuisine, les horaires, un bouton Réserver et un contact, en plusieurs langues. Pour ne plus décrocher en plein service, un agent vocal peut répondre aux appels à votre place.",
              ],
              link: { label: "Répondre au téléphone pendant le service", href: "/services/agent-vocal-ia" },
            },
            {
              h2: "Commerçants et indépendants : des sites déjà en ligne",
              paragraphs: [
                "Sellerie Duchet, équipement équestre à Chambray-lès-Tours, montre ses rayons, ses produits en vedette et une présentation de la gérante. Ce site propose aussi la vente en ligne : une boutique est un projet plus large qu'un site vitrine, chiffré à part.",
                "Ghjulianu Codani, photographe, présente son portfolio, ses albums, ses tarifs et un moyen de le contacter. Dans les deux cas, le site est construit autour de ce que le visiteur cherche.",
              ],
              link: { label: "Une boutique en ligne : le projet sur mesure", href: "/services/projet-sur-mesure" },
            },
            {
              h2: "Pourquoi un site professionnel plutôt qu'une page sur les réseaux",
              paragraphs: [
                "Une page sur les réseaux sociaux dépanne. Un site internet à vous fait mieux, pour trois raisons.",
                "D'abord, il se trouve sur Google par une recherche, sans compte ni connexion. Ensuite, il rassure : une adresse à votre nom, des pages claires, un numéro de téléphone. Enfin, vous contrôlez le contenu et sa présentation, sans dépendre d'une plateforme qui change ses règles.",
              ],
              link: { label: "Combien coûte un site vitrine : le guide", href: "/guides/prix-site-vitrine" },
            },
            {
              h2: "Comment votre site sera trouvé sur Google à Tours",
              paragraphs: [
                "Nous préparons le site pour la recherche locale : titres clairs, balises soignées, nom de la ville là où c'est utile, et liaison avec votre fiche Google Business Profile.",
                "Aucune position n'est promise. Google décide, et vos concurrents travaillent aussi. Mais ces bases évitent de repartir de zéro si vous décidez d'aller plus loin avec le référencement (SEO).",
              ],
              link: { label: "Faire trouver votre site sur Google à Tours", href: "/services/seo-referencement" },
            },
            {
              h2: "Votre interlocuteur à Tours",
              paragraphs: [
                "Anatholy Bricon, entrepreneur individuel, décroche le téléphone, chiffre votre projet et le met en ligne. C'est le même interlocuteur de l'échange initial à la mise en ligne.",
                "Sèvalys intervient à Tours, Saint-Avertin et dans l'agglomération, partout en Indre-et-Loire. L'échange se fait par téléphone, en visio ou en personne. Vous pouvez aussi lire ce que disent nos clients.",
              ],
              link: { label: "Lire les avis de nos clients", href: "/avis" },
            },
          ],
          steps: [
            { title: "Échange et devis", text: "Vous décrivez votre activité et ce que le site doit vous apporter. Le devis, gratuit, arrive sous 48 h.", duration: "1 à 2 jours" },
            { title: "Contenu et maquette", text: "Nous organisons les pages, vous nous envoyez textes et photos, puis nous dessinons la maquette de l'accueil.", duration: "1 à 2 semaines" },
            { title: "Validation et retouches", text: "Vous regardez la maquette puis le site, et vous donnez vos remarques. Nous les intégrons.", duration: "3 à 7 jours" },
            { title: "Mise en ligne", text: "Nous publions le site sur votre hébergement, avec votre nom de domaine, et nous testons le formulaire de contact.", duration: "1 à 3 jours" },
          ],
          pricing: {
            fromLabel: "À partir de",
            price: 500,
            unit: "pour un site vitrine : accueil + jusqu'à 2 pages",
            includes: [
              "Design sur mesure, à l'image de votre activité",
              "Affichage adapté au mobile, à la tablette et à l'ordinateur",
              "Formulaire de contact",
              "Carte Google Maps intégrée",
              "Bases du référencement local : titres, balises, fiche Google à relier",
              "Mise en ligne du site",
            ],
            notIncluded: [
              "Nom de domaine et hébergement, à votre charge",
              "Rédaction des textes et photos, si vous ne les fournissez pas",
              "Maintenance du site, proposée en option",
            ],
            extras: [
              { label: "Page supplémentaire", price: "Sur devis" },
              { label: "Maintenance du site", price: "Sur devis" },
              { label: "Rédaction des textes", price: "Sur devis" },
              { label: "Boutique en ligne (projet sur mesure)", price: "Sur devis" },
            ],
            note: "TVA non applicable, art. 293 B du CGI. Délai habituel : 2 à 4 semaines. Devis gratuit sous 48 h.",
          },
          areas: ["Tours", "Saint-Avertin", "Joué-lès-Tours", "Saint-Cyr-sur-Loire", "La Riche", "Chambray-lès-Tours", "Indre-et-Loire"],
          proofProjects: [0, 1, 3, 4],
          internalLinks: [
            { label: "Combien coûte un site vitrine : le guide des prix", href: "/guides/prix-site-vitrine", description: "Les fourchettes, et les questions à poser avant un devis." },
            { label: "Faire trouver votre site sur Google à Tours", href: "/services/seo-referencement", description: "Aller plus loin que les bases du référencement local." },
            { label: "Refaire un site existant : la refonte", href: "/services/rebranding-site-premium", description: "Pour un site qui date ou ne vous ressemble plus." },
            { label: "Estimer votre projet en 2 minutes", href: "/simulateur", description: "Quelques questions, puis un conseil sur l'offre adaptée." },
            { label: "Guide : faire trouver son site à Tours", href: "/guides/seo-local", description: "Les gestes simples du référencement local." },
          ],
          faq: [
            { q: "Combien coûte la création d'un site internet à Tours ?", a: "Un site Sèvalys démarre à 500 €, pour l'accueil et jusqu'à 2 pages. TVA non applicable, art. 293 B du CGI. Le prix monte avec le nombre de pages, la rédaction des textes ou les photos à prévoir. Les tarifs du marché varient beaucoup d'un prestataire à l'autre : notre guide « Prix d'un site vitrine » compare les fourchettes relevées en novembre 2026, avec leurs sources." },
            { q: "Que comprend le forfait à partir de 500 € ?", a: "L'accueil et jusqu'à 2 pages, un design sur mesure, l'affichage mobile, un formulaire de contact, une carte Google Maps, les bases du référencement local et la mise en ligne. Ne sont pas compris : le nom de domaine, l'hébergement, la rédaction des textes et les photos si vous ne les fournissez pas, et la maintenance." },
            { q: "Peut-on créer un site internet gratuitement ?", a: "Oui, avec un outil de création en ligne. Mais l'adresse n'est pas à vous, les options sont limitées et personne ne vous accompagne. Pour un projet occasionnel, cela peut suffire. Pour recevoir des appels de clients, un site professionnel sert mieux." },
            { q: "Qui crée mon site, et comment s'appelle ce métier ?", a: "Un webdesigner ou un développeur web. Chez Sèvalys, vous travaillez avec Anatholy Bricon, qui suit votre projet de l'échange initial jusqu'à la mise en ligne." },
            { q: "Mon site sera-t-il visible sur Google à Tours ?", a: "Il est préparé pour : titres clairs, pages bien nommées, liaison avec votre fiche Google. Aucune position n'est promise, car personne ne peut la maîtriser. Pour aller plus loin, une offre de référencement SEO existe : voir la page SEO et référencement." },
            { q: "Faut-il déjà avoir les textes et les photos ?", a: "Ce n'est pas obligatoire, mais cela va plus vite. Si vous les avez, vous nous les envoyez. Sinon, nous vous aidons à structurer le contenu. La rédaction des textes se fait en option, sur devis." },
            { q: "Je travaille à Tours, dois-je venir vous voir ?", a: "Non. L'échange se fait par téléphone ou en visio. Un rendez-vous en personne est possible dans l'agglomération de Tours si vous préférez." },
            { q: "Je suis restaurateur ou artisan : mon site sera-t-il différent ?", a: "Oui. Pour un restaurant : la carte, les horaires, la réservation. Pour un artisan : les réalisations, la zone d'intervention et un moyen de décrire le chantier. Le plan du site suit votre métier." },
          ],
          crossLink: null,
        },
        {
          name: "Refonte de site internet",
          tagline: "REFAIRE VOTRE SITE, GARDER L'ESSENTIEL",
          h1Lead: "Refonte de site internet à Tours :",
          h1Benefit: "refaites votre site sans perdre ce qui marche",
          sub: "Votre site existe déjà, mais il date, il est lent ou personne ne vous contacte ? Sèvalys le refait en gardant ce qui vous amène déjà des visites.",
          metaTitle: "Refonte site internet à Tours · sans tout perdre",
          metaDescription: "Refaire votre site à Tours sans repartir de zéro : audit, nouveau design, redirections 301 et suivi Google. Devis gratuit sous 48h, sans engagement.",
          directAnswer: "Une refonte de site internet consiste à refaire un site qui existe déjà : son design, l'organisation des pages, les textes et la technique. À Tours, Sèvalys commence par un audit de votre site actuel, garde les pages qui vous amènent des visites, redirige les anciennes adresses et vérifie dans Google Search Console après la mise en ligne. Le devis est établi après l'audit : gratuit, sous 48h.",
          longIntro: [
            "Votre site date de quelques années. Sur un téléphone, il met du temps à s'ouvrir. Un horaire a changé, et vous n'osez plus y toucher de peur de tout casser. Une refonte, c'est le refaire sans repartir de zéro : nouveau design, pages réorganisées, textes revus, technique remise à neuf. Le nom de domaine, lui, reste le vôtre.",
            "À Tours, Anatholy Bricon commence par ouvrir votre site comme le ferait un client. Quelles pages reçoivent encore des visites ? Quelles photos de chantier, quels avis Google valent la peine d'être mis en avant ? Ensuite seulement vient le devis, gratuit, sous 48h. Un doute sur le point de départ ? Un diagnostic en ligne de deux minutes vous oriente.",
          ],
          problems: [
            { n: "A", title: "Un site lent, ou illisible sur mobile", desc: "Vos visiteurs viennent surtout depuis un téléphone. Si la page met du temps à s'ouvrir ou si les textes sont trop petits, beaucoup repartent avant d'avoir lu une ligne." },
            { n: "B", title: "Personne ne vous contacte depuis le site", desc: "Le site est en ligne, mais le formulaire reste vide et le téléphone ne sonne pas. Il montre votre activité sans jamais inviter à passer à l'action." },
            { n: "C", title: "Un site qui ne vous ressemble plus, et que vous ne savez plus modifier", desc: "Votre activité a évolué, pas votre site. Changer un horaire ou une photo demande de l'aide, et l'ensemble ne correspond plus à votre image actuelle." },
          ],
          features: [
            "Audit de votre site actuel",
            "Inventaire des pages qui amènent des visites",
            "Nouveau design lisible sur mobile",
            "Nom de domaine et adresses e-mail conservés",
            "Redirection 301 de chaque ancienne adresse",
            "Mise en ligne et suivi dans Google Search Console",
            "Formation à la prise en main",
          ],
          enjeux: [
            "Un site refait avec méthode garde ce qui fonctionne déjà. Les visiteurs qui vous trouvent aujourd'hui retrouvent demain les mêmes pages, mieux présentées, au lieu d'arriver sur une erreur.",
            "Le changement se voit sur des choses simples : un site qui s'affiche vite sur un téléphone, des pages faciles à parcourir, un formulaire ou un numéro que l'on trouve sans chercher. Aucune position sur Google n'est promise : le risque de perte est réduit, puis suivi.",
          ],
          sections: [
            {
              h2: "Refonte ou simple mise à jour : ce qu'il vous faut vraiment",
              paragraphs: [
                "Tout site n'a pas besoin d'être refait. Si la base est saine, une mise à jour suffit : un texte à corriger, une photo à changer, un horaire à ajuster. C'est plus rapide et plus économique.",
                "La refonte devient utile quand la base elle-même pose problème : site trop ancien, trop lent, impossible à lire sur mobile, ou si limité que chaque changement coûte plus qu'un nouveau départ. On reconstruit alors un site existant, avec son histoire et ses pages.",
                "Pendant l'audit, nous vous disons honnêtement dans quel cas vous êtes. Si une simple mise à jour règle votre problème, nous vous le disons.",
              ],
              list: [
                "Mise à jour : le site tient la route, on corrige quelques éléments.",
                "Refonte : le site existe, mais sa base ne suffit plus. On le refait en gardant ce qui marche.",
                "Nouveau site : rien n'est encore en ligne, on part d'une page blanche.",
              ],
              link: { label: "Pas encore de site ? Voir la création d'un site vitrine →", href: "/services/site-vitrine" },
            },
            {
              h2: "Ce que nous gardons, ce que nous changeons",
              paragraphs: [
                "Refaire un site ne veut pas dire tout jeter. Nous partons de ce que vous avez et nous gardons tout ce qui vous sert encore. Vous validez chaque choix avant la mise en ligne.",
              ],
              list: [
                "Votre nom de domaine et vos adresses e-mail : ils restent les vôtres, rien ne change pour vos correspondants.",
                "Vos textes et vos photos qui servent encore : ils sont repris, remis au propre ou remplacés quand ils ne sont plus justes.",
                "Vos pages qui amènent déjà des visites : elles sont repérées avant de toucher à quoi que ce soit, puis conservées ou redirigées.",
                "Ce qui est remplacé : le design, l'organisation des pages, la vitesse d'affichage et le formulaire de contact.",
              ],
            },
            {
              h2: "Comment on protège votre place sur Google",
              paragraphs: [
                "C'est la première crainte, et elle est légitime. Un site refait sans précaution peut perdre ses visiteurs : les anciennes adresses disparaissent, les moteurs de recherche ne retrouvent plus leurs repères et vos pages repartent de zéro.",
                "Voici ce que nous faisons pour limiter ce risque. D'abord, un audit qui repère les pages de votre site actuel recevant déjà des visites. Ensuite, la conservation de ces pages ou de leur contenu utile. Chaque ancienne adresse est redirigée vers sa nouvelle page par une redirection 301, qui indique à Google que la page a simplement déménagé. Après la mise en ligne, nous contrôlons dans Google Search Console que les pages sont bien prises en compte et que rien ne renvoie d'erreur.",
                "Soyons clairs : aucune position n'est garantie, ni avant ni après une refonte. Le risque de perte est réduit et suivi, il n'est pas supprimé.",
              ],
              link: { label: "Protéger et améliorer votre référencement naturel →", href: "/services/seo-referencement" },
            },
            {
              h2: "Combien coûte une refonte de site à Tours ?",
              paragraphs: [
                "Cela dépend de l'état de votre site actuel, du nombre de pages à reprendre et de ce que vous voulez changer. C'est pourquoi une refonte est chiffrée sur devis, après un audit de votre site actuel. Le devis est gratuit, il arrive sous 48h et il ne vous engage à rien.",
                "Un site de quelques pages ne se refait pas comme un site de quarante. Le devis indique ce qui est compris, ce qui est en option et ce qui reste à votre charge, sans ligne cachée. Sèvalys est en franchise de TVA : TVA non applicable, art. 293 B du CGI.",
                "Pour situer les ordres de grandeur du marché avant de nous écrire, notre guide détaille ce qui fait varier le coût d'un site vitrine.",
              ],
              link: { label: "Faire mon diagnostic en 2 minutes →", href: "/simulateur" },
            },
            {
              h2: "Et si vous voulez aussi changer d'image ?",
              paragraphs: [
                "Il arrive qu'un site daté s'accompagne d'une image datée. Dans ce cas, le logo, les couleurs et les polices peuvent être retravaillés en même temps que le site, pour que le nouveau site porte une identité cohérente dès le premier jour.",
                "C'est un bloc optionnel : il se décide pendant l'audit et n'est jamais imposé. Le détail de la charte graphique se trouve sur la page Branding.",
              ],
              link: { label: "Juste besoin de votre identité ? Découvrez Branding →", href: "/services/branding" },
            },
            {
              h2: "Qui s'occupe de votre site",
              paragraphs: [
                "Une seule personne vous répond : Anatholy Bricon, entrepreneur individuel à Tours. C'est lui qui regarde votre site actuel, qui le refait et qui reste joignable après la mise en ligne.",
                "Pas de relais commercial ni de demande qui se perd : vous parlez à la personne qui fait le travail. Il intervient à Tours et dans les communes voisines.",
              ],
            },
          ],
          steps: [
            { title: "On regarde votre site actuel", text: "Audit : ce qui amène des visites, ce qui est lent, ce qui gêne sur mobile, ce qu'on peut garder. Vous recevez un devis gratuit sous 48h.", duration: "Devis sous 48h" },
            { title: "On décide ensemble de ce qui change", text: "Nous listons les pages à garder, à regrouper ou à retirer, et ce qui est repris tel quel. Rien n'est lancé sans votre accord.", duration: "Un échange, selon vos disponibilités" },
            { title: "On maquette et vous validez", text: "Vous voyez le nouveau design avant qu'il soit construit, et vous demandez les ajustements que vous souhaitez.", duration: "Selon vos retours" },
            { title: "On construit et on teste", text: "Nous construisons les pages, reprenons les contenus, puis testons l'affichage sur mobile, la vitesse et le formulaire de contact.", duration: "Quelques semaines selon la taille du site" },
            { title: "On met en ligne et on surveille", text: "Mise en ligne avec les redirections 301 en place, puis contrôle dans Google Search Console. Une prise en main vous permet de modifier vos textes.", duration: "Mise en ligne, puis suivi" },
          ],
          areas: ["Tours", "Saint-Avertin", "Joué-lès-Tours", "Saint-Cyr-sur-Loire", "La Riche", "Chambray-lès-Tours", "Indre-et-Loire"],
          proofProjects: [0, 1, 3, 4],
          internalLinks: [
            { label: "Créer un site vitrine si vous n'avez pas encore de site", href: "/services/site-vitrine", description: "La page pour partir d'une page blanche." },
            { label: "Protéger et améliorer votre référencement naturel", href: "/services/seo-referencement", description: "L'accompagnement qui prolonge une refonte." },
            { label: "Retravailler seulement votre identité visuelle", href: "/services/branding", description: "Logo, couleurs et charte, sans toucher au site." },
            { label: "Garder votre site à jour après la mise en ligne", href: "/services/maintenance", description: "Un suivi une fois le nouveau site publié." },
            { label: "Combien coûte un site vitrine : repères et critères", href: "/guides/prix-site-vitrine", description: "Ce qui fait varier le devis." },
            { label: "Faire mon diagnostic en 2 minutes", href: "/simulateur", description: "Un questionnaire court pour savoir par où commencer." },
          ],
          caseQuote: null,
          signals: [
            { t: "Audit d'abord", d: "Nous regardons votre site actuel avant de proposer quoi que ce soit : ce qui rapporte, ce qui gêne, ce que l'on peut garder." },
            { t: "Un seul interlocuteur", d: "Anatholy Bricon, à Tours, vous répond du premier échange jusqu'à la mise en ligne, sans intermédiaire." },
            { t: "Sans engagement", d: "Le devis est gratuit, sous 48h. Rien n'est lancé avant votre accord explicite." },
          ],
          faq: [
            { q: "Pourquoi faire une refonte de site internet ?", a: "Quatre raisons reviennent : le site est lent ou illisible sur mobile, il ne ramène aucun contact, il ne ressemble plus à votre activité, ou vous ne savez plus le modifier. Si rien de cela ne vous concerne, une simple mise à jour suffit, et nous vous le dirons après l'audit." },
            { q: "Combien coûte une refonte de site à Tours ?", a: "Une refonte est chiffrée sur devis, après un audit de votre site actuel : le montant dépend du nombre de pages à reprendre et de ce que vous voulez changer. Le devis est gratuit, il arrive sous 48h et ne vous engage à rien. TVA non applicable, art. 293 B du CGI." },
            { q: "Vais-je perdre mon référencement Google ?", a: "Le risque existe si les anciennes adresses ne sont pas redirigées. Nous repérons les pages qui reçoivent déjà des visites, nous les conservons ou les redirigeons une à une par des redirections 301, puis nous contrôlons dans Google Search Console après la mise en ligne. Aucune position n'est garantie." },
            { q: "Comment mettre à jour un site internet ?", a: "Un site se met à jour par petites touches tant que sa base est saine : textes, photos, horaires. Quand la base est trop ancienne, trop lente ou trop limitée, la refonte devient plus raisonnable que de rafistoler sans cesse." },
            { q: "Combien de temps dure une refonte ?", a: "Comptez quelques semaines pour un petit site. L'essentiel du délai dépend de la rapidité avec laquelle vous validez les maquettes et envoyez vos contenus. Le calendrier précis figure dans le devis, une fois votre site audité." },
            { q: "Est-ce que je garde mon nom de domaine et mes textes ?", a: "Oui, votre nom de domaine reste le vôtre, comme vos adresses e-mail. Les textes et les photos utiles sont repris, adaptés ou remplacés selon ce qui sert le nouveau site." },
            { q: "Pourrai-je modifier mon site moi-même ensuite ?", a: "Oui pour les textes et les images courantes : une prise en main est prévue à la livraison. Pour le reste, nous restons disponibles, et le suivi dans la durée peut passer par notre offre de maintenance." },
            { q: "Je n'ai pas de site : est-ce la bonne page ?", a: "Non. La refonte concerne un site qui existe déjà. Si vous partez de zéro, la page Site vitrine correspond mieux à votre besoin." },
          ],
          crossLink: { label: "Juste besoin de votre identité ? Découvrez Branding →", slug: "branding" },
        },
        {
          name: "Branding",
          tagline: "VOTRE IDENTITÉ, AU CLAIR",
          h1Lead: "Branding à Tours ·",
          h1Benefit: "une identité qu'on reconnaît",
          sub: "Une identité cohérente sur votre devanture, vos réseaux et vos documents — sans toucher à votre site existant.",
          metaTitle: "Branding à Tours · identité reconnaissable",
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
          crossLink: { label: "Besoin de refaire aussi votre site ? Découvrez la refonte →", slug: "rebranding-site-premium" },
        },
        {
          name: "Projet Sur Mesure",
          tagline: "VOS BESOINS SPÉCIFIQUES",
          h1Lead: "Projet web sur mesure à Tours ·",
          h1Benefit: "quand le standard ne suffit plus",
          sub: "Votre activité a dépassé le site vitrine : réservation, catalogue, espace membre. On construit l'outil qui suit votre métier.",
          metaTitle: "Projet web sur mesure à Tours",
          metaDescription: "Projet web sur mesure à Tours : remplacez réservations papier, catalogues et outils déconnectés par une solution unique. Devis sous 48h.",
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
          metaTitle: "Agent vocal IA à Tours · répond 24/7",
          metaDescription: "Agent vocal IA à Tours : répond, qualifie et enregistre chaque appel 24h/24. Vos correspondants savent qu'ils parlent à une IA.",
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
          metaTitle: "Maintenance de site web à Tours",
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
          metaTitle: "Community management à Tours",
          metaDescription: "Community management à Tours : ligne éditoriale, calendrier de publication et réponses aux messages. Sans engagement de durée.",
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
          metaTitle: "Meta Ads à Tours · campagnes ciblées",
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
          metaTitle: "Google Ads à Tours · en tête quand ça compte",
          metaDescription: "Google Ads à Tours : requêtes qui convertissent, annonces rédigées et suivi des appels pour être visible quand on vous cherche.",
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
        {
          name: "SEO & Référencement",
          tagline: "ÊTRE TROUVÉ SUR GOOGLE",
          h1Lead: "Agence SEO à Tours ·",
          h1Benefit: "soyez trouvé par vos clients sur Google",
          sub: "Vos clients de Tours cherchent votre métier sur Google. On travaille votre site et votre fiche pour qu'ils tombent sur vous.",
          metaTitle: "Agence SEO Tours : faites-vous trouver, dès 300 €",
          metaDescription: "Agence SEO à Tours pour artisans, commerçants et restaurants. 2 pages travaillées, 1 lien par mois, suivi Search Console à votre nom. Dès 300 €/mois.",
          directAnswer: "Une agence SEO à Tours travaille votre référencement naturel pour que les clients qui cherchent votre métier tombent sur vous. Chez Sèvalys, c'est dès 300 € par mois, sans promesse de position : personne ne contrôle l'algorithme de Google.",
          longIntro: [
            "Sèvalys est une agence SEO à Tours pour les artisans, les commerçants et les restaurants. On retravaille vos deux pages les plus importantes, votre fiche Google et on obtient un lien de qualité chaque mois.",
            "Vous gardez la main : la Search Console est créée à votre nom. Les résultats demandent plusieurs mois, et on vous l'explique franchement plus bas.",
          ],
          problems: [
            { n: "A", title: "Votre site n'apparaît pas", desc: "Vos clients tapent « plombier Tours » ou « restaurant Tours ». Les premières places vont à des concurrents mieux structurés." },
            { n: "B", title: "Votre fiche Google est incomplète", desc: "Catégories mal choisies, horaires flous, photos anciennes : la fiche existe, mais elle ne rassure pas." },
            { n: "C", title: "Vous ne savez pas ce qui marche", desc: "Sans Search Console, impossible de voir si le site progresse ni sur quelles recherches il apparaît." },
          ],
          features: [
            "Audit de départ du site et de la fiche Google",
            "Choix des recherches locales à viser",
            "Titres, textes et balises de 2 pages retravaillés",
            "Fiche Google Business Profile mise à jour",
            "Vitesse, mobile et indexation vérifiés",
            "Suivi Search Console à votre nom",
            "Rapport mensuel de ce qui bouge",
          ],
          enjeux: [
            "Une page bien construite continue d'être trouvée sans payer chaque clic. Une annonce, elle, s'arrête avec le budget.",
            "On clique surtout sur les premiers résultats, et la fiche Google compte autant que le site. Les deux se travaillent ensemble.",
          ],
          sections: [
            {
              h2: "Ce qu'on fait pour votre référencement naturel",
              paragraphs: ["Quatre chantiers, sans jargon."],
              list: [
                "Vos 2 pages principales : titres, textes et structure écrits pour les recherches de vos clients.",
                "Votre fiche Google Business Profile : catégories, horaires, photos et réponses aux avis.",
                "La technique, en clair : un site rapide, lisible sur mobile et bien lu par Google.",
                "Un lien de qualité par mois : un autre site sérieux parle de vous, et Google le remarque.",
              ],
            },
            {
              h2: "SEO local : être trouvé près de chez vous",
              paragraphs: [
                "Le SEO local, c'est apparaître quand on cherche « métier + ville ». On vise ces recherches autour de Tours, pas un classement national.",
                "Pour comprendre le principe avant de vous lancer, lisez notre guide.",
              ],
              link: { label: "Comprendre le SEO local à Tours", href: "/guides/seo-local" },
            },
            {
              h2: "Pour qui : restaurants, artisans, commerçants",
              paragraphs: [
                "Un restaurant a besoin d'une fiche Google soignée, d'un menu lisible et d'un lien de réservation. Un artisan, de pages claires par métier et par zone, avec des photos de chantiers. Un commerçant, d'horaires justes et de pages pour ses produits phares.",
                "Ce n'est pas adapté à une boutique en ligne de 500 produits, ni à un marché national très disputé.",
              ],
            },
            {
              h2: "Comment on mesure ce qui se passe",
              paragraphs: [
                "La Search Console est créée à votre nom. Vous voyez vous-même les affichages, les clics et la position moyenne sur vos recherches. On y ajoute les appels reçus depuis votre fiche Google. Si vous partez, vous gardez tous les accès.",
                "Chaque mois, un rapport court : ce qui a bougé, ce qui a été fait, ce qui vient ensuite.",
              ],
            },
            {
              h2: "Ce qu'on ne promet pas",
              paragraphs: [
                "Aucune position n'est garantie, et méfiez-vous de qui la promet. Les premiers signes se voient souvent après 3 à 6 mois, parfois plus. Tout dépend de la concurrence locale : un plombier à Tours n'est pas dans la situation d'un fleuriste de village.",
                "Ce que nous nous engageons à faire : le travail décrit ici et un suivi que vous pouvez vérifier vous-même.",
              ],
            },
            {
              h2: "SEO ou Google Ads : par quoi commencer ?",
              paragraphs: ["Les annonces amènent des clients vite, mais s'arrêtent avec le budget. Le référencement naturel est plus lent et dure. Si votre site existe déjà, commencez par le SEO. Si le besoin est urgent, lancez des annonces en attendant."],
              list: [
                "SEO : plus lent, dure dans le temps, aucun coût par clic.",
                "Google Ads : rapide, s'arrête avec le budget, chaque clic est payé.",
              ],
              link: { label: "Lancer des annonces Google en attendant", href: "/services/google-ads" },
            },
            {
              h2: "Engagement de 3 mois minimum",
              paragraphs: ["Trois mois, c'est le temps de voir les premiers signes. Ensuite, l'offre se reconduit chaque mois et vous arrêtez avec un mois de préavis. Vos pages et vos accès restent à vous."],
            },
          ],
          pricing: {
            fromLabel: "À partir de",
            price: 300,
            unit: "par mois, pour 2 pages suivies",
            includes: [
              "Audit de départ du site et de la fiche Google",
              "Optimisation de 2 pages (titres, textes, balises)",
              "Mise à jour de la fiche Google Business Profile",
              "1 lien de qualité par mois",
              "Suivi Search Console à votre nom",
              "Rapport mensuel",
            ],
            notIncluded: [
              "Refonte du site",
              "Publicité Google Ads",
              "Rédaction d'articles de blog",
            ],
            extras: [
              { label: "Page supplémentaire suivie (3 pages = 400 € par mois)", price: "+ 100 € par mois" },
            ],
            note: "TVA non applicable, art. 293 B du CGI",
          },
          areas: ["Tours", "Saint-Avertin", "Joué-lès-Tours", "Saint-Cyr-sur-Loire", "La Riche", "Chambray-lès-Tours", "Indre-et-Loire"],
          proofProjects: [0, 1, 3, 4],
          internalLinks: [
            { label: "Comprendre le SEO local à Tours", href: "/guides/seo-local", description: "Le principe, expliqué simplement." },
            { label: "Créer votre site à Tours", href: "/services/site-vitrine", description: "Pas encore de site ? On commence par là." },
            { label: "Lancer des annonces Google en attendant", href: "/services/google-ads", description: "Des clients vite, le temps que le SEO s'installe." },
            { label: "Faire le diagnostic de votre visibilité", href: "/simulateur", description: "Quelques questions pour savoir par où commencer." },
          ],
          caseQuote: null,
          signals: [
            { t: "Aucune promesse de position", d: "On décrit le travail fait et ce qui est mesuré. La place dans Google reste hors de notre contrôle." },
            { t: "Comptes à votre nom", d: "La Search Console et la fiche Google restent rattachées à votre compte, même si vous partez." },
            { t: "3 mois minimum, puis mois par mois", d: "Le temps de voir les premiers signes. Ensuite, vous arrêtez avec un mois de préavis." },
          ],
          faq: [
            { q: "Combien coûte une agence SEO à Tours ?", a: "Chez Sèvalys, dès 300 € par mois pour 2 pages suivies. Chaque page en plus coûte 100 € par mois : 3 pages font 400 €. Un lien de qualité par mois est compris, avec 3 mois minimum. TVA non applicable, art. 293 B du CGI." },
            { q: "Quand voit-on les premiers résultats du SEO local ?", a: "Les premiers signes se mesurent souvent après 3 à 6 mois, selon la concurrence et l'état du site. Aucune position n'est garantie. C'est pour cela que l'engagement est de 3 mois : le temps de voir si ça bouge." },
            { q: "Promettez-vous une position sur Google ?", a: "Non, et méfiez-vous de qui le fait. Les résultats dépendent d'un algorithme que personne ne contrôle. Nous nous engageons sur le travail réalisé et sur un suivi que vous vérifiez vous-même." },
            { q: "Comment saurai-je que ça marche ?", a: "La Search Console est créée à votre nom : vous voyez les clics, les affichages et la position moyenne. Vous recevez aussi un rapport chaque mois. Si vous partez, vous gardez l'accès." },
            { q: "SEO ou Google Ads : lequel choisir ?", a: "Les annonces donnent des clients vite, mais s'arrêtent avec le budget. Le SEO s'installe sur la durée. Souvent, on commence par le SEO si vous avez un site, et par Google Ads si le besoin est urgent." },
            { q: "Que faites-vous sur ma fiche Google Business Profile ?", a: "On vérifie les informations, les catégories, les horaires et les photos, puis on la met à jour chaque mois et on suit les avis. La fiche reste à votre nom : vous en gardez l'accès." },
            { q: "Faut-il déjà avoir un site ?", a: "Oui, ou en faire un : il faut au moins une page qui parle de votre activité. Sinon, on commence par un site vitrine, puis on travaille le référencement." },
            { q: "Y a-t-il un engagement ?", a: "3 mois minimum, puis reconduction chaque mois. Vous arrêtez avec un mois de préavis. Vos pages et vos accès restent à vous." },
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
    metaTitle: "Simulateur de diagnostic digital à Tours",
    metaDescription: "Répondez à quelques questions sur votre activité et obtenez une recommandation de 2 à 4 leviers digitaux prioritaires. Sans engagement.",
    badge: 'Diagnostic · sans engagement',
    h1Lead: 'Quels leviers digitaux',
    h1Benefit: 'pour votre entreprise ?',
    sub: "Un diagnostic court et honnête : quelques questions sur votre activité, et nous identifions les 2 à 4 leviers qui comptent vraiment pour vous — pas une liste de tout ce que nous savons faire.",
    directAnswer: "Le simulateur Sèvalys est un questionnaire de diagnostic en ligne : vous répondez à quatre ou cinq questions sur votre secteur, l'état de votre présence en ligne et vos freins actuels, puis vous obtenez immédiatement une recommandation de 2 à 4 services adaptés et un indice de maturité digitale. Aucune estimation chiffrée n'est produite.",
    intro: {
      heading: 'Comment fonctionne ce diagnostic',
      paragraphs: [
        "Ce diagnostic sert à trier. La plupart des entreprises que nous rencontrons n'ont pas besoin de tout refaire : elles ont besoin de savoir par quoi commencer.",
        "Vous répondez à quatre ou cinq questions — votre secteur, l'état de votre présence en ligne, ce qui vous freine aujourd'hui, et votre priorité des trois prochains mois. Chaque réponse pondère les dix services de Sèvalys, et seuls les deux à quatre mieux classés vous sont proposés.",
        "Répondez honnêtement, surtout quand la réponse est peu flatteuse : une réponse optimiste produit une recommandation inutile. À la fin, vous laissez vos coordonnées et votre résultat s'affiche immédiatement.",
      ],
    },
    start: 'Commencer mon diagnostic →',
    progressLabel: 'Question {current} sur {total}',
    next: 'Suivant →',
    nextFinal: 'Voir ma recommandation →',
    back: '← Précédent',
    rangePlaceholder: 'Faites glisser pour choisir',
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
      'budget': {
        text: 'Quel budget avez-vous en tête pour ce projet ?',
        hint: 'Une estimation suffit — elle nous aide à cadrer une recommandation réaliste.',
        options: {
          'budget-0-500': 'Budget serré, je découvre les options',
          'budget-500-1500': 'Budget modéré, prêt à investir raisonnablement',
          'budget-1500-3000': 'Budget confortable, je veux un vrai résultat',
          'budget-3000-plus': 'Budget conséquent, sans limite stricte',
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
      telephoneHint: 'Obligatoire, pour que nous puissions vous rappeler.',
      requiredNote: 'Tous les champs sont obligatoires.',
      errorSummary: 'Corrigez les champs signalés pour continuer.',
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
        a: "Parce qu'une recommandation qui liste les dix services n'est pas une recommandation. Chaque réponse pondère les services, et seuls les deux à quatre mieux classés vous sont proposés. Le reste attendra.",
      },
      {
        q: 'Que deviennent mes réponses ?',
        a: 'Elles sont enregistrées avec vos coordonnées pour préparer notre échange, conservées 12 mois au maximum si vous ne devenez pas client, puis supprimées automatiquement. Vous pouvez demander leur suppression à tout moment à contact@sevalys.com.',
      },
    ],
  },
  landing: {
    hero: {
      pill: "AGENCE WEB · TOURS, FR",
      title_l1: "Agence web",
      title_l2: "à ",
      title_l2_it: "Tours",
      sub: "Des outils qui travaillent pour vos clients. Sites internet, référencement local et agents IA pour les commerces, restaurants, artisans et PME de Tours.",
      cta_primary: "Lancer le diagnostic",
      cta_secondary: "Discutons de votre projet",
    },
    manifeste: {
      num: "01 / 08",
      title_l1: "Une agence web à Tours",
      title_l2_it: "pour les commerces et les PME.",
      intro: "Sèvalys, c'est une petite agence web de Tours, aussi agence digitale par ses services. Des sites internet, du référencement local, des agents IA pour les commerces, restaurants, artisans et PME d'Indre-et-Loire. Au bout du fil, une seule personne : Anatholy Bricon, le fondateur.",
      quote: "« Un site beau, c'est bien. Un site qui rapporte, c'est mieux. »",
      items: [
        { t: "Invisible sur Google", d: "Vos clients cherchent votre métier et trouvent vos concurrents avant vous." },
        { t: "Appels manqués", d: "Un appel sans réponse pendant le rush, c'est une commande qui part ailleurs." },
        { t: "Image dépassée", d: "Un site ou un logo d'une autre époque fait hésiter les nouveaux clients." },
        { t: "Réseaux délaissés", d: "Sans temps pour les réseaux, l'audience se construit chez vos concurrents." },
      ],
      cta: "Faire le diagnostic gratuit",
    },
    servicesPreview: {
      num: "02 / 08",
      title_l1: "Nos offres à Tours :",
      title_l2_it: "site internet, référencement, publicité, IA.",
      intro: "Des offres à périmètre défini, avec le prix affiché. Chacune a sa page détaillée.",
      cards: [
        { t: "Site internet professionnel, à partir de 500 €", d: "Accueil et jusqu'à 2 pages, au forfait. Devis sous 48 h, sans engagement.", link: "Site internet professionnel à Tours" },
        { t: "Référencement local, à partir de 300 €/mois", d: "2 pages suivies, 1 lien par mois inclus, 3 mois minimum, +100 €/mois par page. Aucune position garantie.", link: "Référencement local" },
        { t: "Refonte de site et nouvelle image", d: "Une identité visuelle et un site refaits à neuf pour une image à jour.", link: "Refonte de site" },
        { t: "Publicité Google Ads", d: "Des annonces visibles quand vos clients vous cherchent, avec un budget que vous pilotez.", link: "Campagnes Google Ads" },
        { t: "Agent vocal IA pour ne plus rater d'appels", d: "Un agent qui décroche, prend les rendez-vous et vous prévient.", link: "Agent vocal IA" },
      ],
      others: "Aussi :",
      guide_price: "Combien coûte un site internet ?",
      guide_seo: "Le SEO local à Tours expliqué",
      vat: "Prix en euros, TVA non applicable, art. 293 B du CGI.",
      all: "Voir tous les services",
    },
    work: {
      num: "03 / 08",
      title_l1: "Cinq sites réalisés,",
      title_l2_it: "cinq métiers.",
      intro: "Cinq sites en ligne, que vous pouvez ouvrir : une entreprise de rénovation à Tours, une sellerie à Chambray-lès-Tours, une entreprise de nettoyage de locaux à Tours, un restaurant franco-thaï à Krabi et un photographe.",
      items: [
        { name: 'Grand Ouest Habitat', desc: "Rénovation du bâtiment à Tours : photos avant et après, demande de projet en ligne, visite technique puis devis sous 48 h.", tags: ['SITE', 'DEVIS'], year: '2026' },
        { name: 'Sellerie Duchet', desc: "Équipement équestre à Chambray-lès-Tours : rayons, produits en vedette, livraison et paiement en plusieurs fois.", tags: ['BOUTIQUE', 'E-COMMERCE'], year: '2026' },
        { name: 'NEF Nettoyage', desc: "Nettoyage de locaux à Tours et alentours : prestations pour professionnels et particuliers, équipe, projets réalisés, avant/après et demande de devis gratuit.", tags: ['SITE', 'DEVIS'], year: '2026' },
        { name: 'Gecko Cabane', desc: 'Restaurant franco-thaï à Krabi : carte, horaires et formulaire de réservation, en quatre langues.', tags: ['SITE', 'RESA'], year: '2024' },
        { name: 'Ghjulianu Codani', desc: 'Photographe : portfolio, albums, tarifs et contact.', tags: ['SITE', 'EDITORIAL'], year: '2025' },
      ],
      bridge_eyebrow: 'PROCHAINE ÉTAPE',
      bridge_title_l1: 'Quel service',
      bridge_title_it: 'vous correspond ?',
      bridge_body: "Deux minutes de diagnostic pour savoir exactement ce qu'il vous faut.",
    },
    method: {
      num: "04 / 08",
      title_l1: "Comment",
      title_l2_it: "on travaille.",
      intro: "Quatre étapes, du premier échange au suivi.",
      steps: [
        { n: '01', t: "Diagnostic", d: "Quelques questions sur votre activité et ce qui vous freine." },
        { n: '02', t: "Proposition", d: "Une recommandation claire et un devis sous 48 h." },
        { n: '03', t: "Mise en place", d: "Le projet est réalisé avec des points d'étape réguliers." },
        { n: '04', t: "Suivi", d: "On reste disponible après la mise en ligne." },
      ],
    },
    zone: {
      num: "05 / 08",
      title_l1: "Où intervenons-nous ?",
      title_l2_it: "Tours et Indre-et-Loire.",
      text: "Sèvalys est basée à Tours. Les clients sont des commerces, des restaurants, des artisans et des entreprises de Tours et d'Indre-et-Loire : on se retrouve sur place, ou on s'appelle, comme vous préférez. Le diagnostic et le suivi marchent aussi à distance, partout en France.",
      label: "Communes :",
      towns: ["Tours", "Saint-Avertin", "Joué-lès-Tours", "Saint-Cyr-sur-Loire", "La Riche", "Chambray-lès-Tours"],
    },
    why: {
      num: "06 / 08",
      title_l1: "Pourquoi choisir une agence web",
      title_l2_it: "à taille humaine ?",
      items: [
        { t: "Un interlocuteur", d: "Le fondateur, Anatholy Bricon, répond lui-même et fait le travail : aucun commercial entre vous et lui." },
        { t: "Des prix affichés", d: "Site dès 500 €, référencement dès 300 €/mois : vous savez où vous allez." },
        { t: "Vous gardez tout", d: "Le code et le nom de domaine sont à vous dès le premier jour." },
      ],
    },
    faq: {
      num: "07 / 08",
      title_l1: "Questions",
      title_l2_it: "fréquentes.",
      items: [
        { q: "Que fait une agence web à Tours comme Sèvalys ?", a: "Sèvalys, agence web et digitale à Tours, crée des sites internet, assure le référencement local, gère des campagnes Google Ads et installe des agents vocaux IA pour les commerces et PME de Tours. Vous parlez directement à Anatholy Bricon, le fondateur, du premier échange à la mise en ligne." },
        { q: "Quelle différence entre agence web et agence digitale ?", a: "Une agence web réalise le site. Une agence digitale s'occupe aussi d'être trouvé sur Google (référencement, publicité) et des outils du quotidien (agent IA, automatisations)." },
        { q: "Combien coûte un site internet ?", a: "À partir de 500 € : accueil et jusqu'à 2 pages, au forfait à périmètre défini. Devis sous 48 h, sans engagement. TVA non applicable, art. 293 B du CGI." },
        { q: "Combien coûte le référencement (SEO) ?", a: "À partir de 300 €/mois pour 2 pages suivies, +100 €/mois par page supplémentaire, 1 lien par mois compris, engagement de 3 mois minimum. Aucune position n'est garantie : on mesure et on rend compte." },
        { q: "Intervenez-vous seulement à Tours ?", a: "Sèvalys est basée à Tours et intervient en Indre-et-Loire, sur place ou en visio, ainsi qu'à distance partout en France." },
        { q: "En combien de temps mon site est-il en ligne ?", a: "En général en quelques semaines, selon le temps nécessaire pour préparer les textes et les photos." },
        { q: "Est-ce que je garde mon site et mon nom de domaine ?", a: "Oui. Le code et le nom de domaine vous appartiennent dès le premier jour." },
        { q: "Avec qui vais-je travailler ?", a: "Avec Anatholy Bricon, entrepreneur individuel. Il fait le devis, le travail et le suivi lui-même." },
      ],
    },
    partners: {
      title: 'ILS NOUS FONT CONFIANCE',
      items: [
        { name: 'Selenium Studio', role: 'STUDIO ASSOCIÉ', color: '#C4F542' },
        { name: 'Gecko Cabane', role: 'RESTAURANT', color: '#E07856' },
        { name: 'Victor Verissimo', role: 'ARTIST PORTFOLIO', color: '#9A9690' },
        { name: 'Ghjulianu Codani', role: 'PROFESSIONAL', color: '#C4F542' },
        { name: 'Grand Ouest Habitat', role: 'RÉNOVATION BÂTIMENT', color: '#E07856' },
        { name: 'Sellerie Duchet', role: 'ÉQUIPEMENT ÉQUESTRE', color: '#C4F542' },
        { name: 'AJMG·EXP', role: 'EXPERTISE', color: '#9A9690' },
      ],
    },
    contact: {
      num: "08 / 08",
      title_l1: "Un projet à Tours ?",
      title_l2_it: "Parlons-en.",
      sub: "Réponse sous 24 h ouvrées. Premier appel offert, sans engagement, pour comprendre où vous en êtes.",
      updated: "Mis à jour en novembre 2026.",
      info: [
        { k: 'Email', v: 'contact@sevalys.com' },
        { k: 'Téléphone', v: '+33 (0)6 07 18 41 33' },
        { k: 'Adresse', v: 'Tours, France · à distance partout' },
        { k: 'Disponibilité', v: 'Disponible dès maintenant pour de nouveaux projets' },
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
      manageCookies: 'Gérer les cookies',
      reviews: 'Avis',
      reviewPolicy: 'Politique des avis',
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
    skipToContent: 'Skip to main content',
  },
  services: {
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
    pages: {
      index: {
        badge: "OUR SERVICES — 2026",
        title_l1: "Our",
        title_l2_it: "services.",
        sub: "Ten areas of expertise to make your business visible, credible and reachable. Pick yours — or let the diagnostic guide you.",
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
      extra: {
        pricingHeading: "What it costs",
        pricingIncludes: "What is included",
        pricingNotIncluded: "What is not included",
        pricingExtras: "Optional extras",
        extrasColLabel: "Option",
        extrasColPrice: "Amount",
        stepsHeading: "How the project runs",
        stepDuration: "Typical duration",
        areasHeading: "Where we work",
        proofHeading: "Work you can visit",
        proofVisit: "Visit the site",
        guidesHeading: "Related guides",
        breadcrumbHome: "Home",
        breadcrumbServices: "Services",
      },
      items: [
        {
          name: "Site Vitrine",
          tagline: "A SITE THAT GETS YOU FOUND AND CALLED",
          h1Lead: "Create your website in Tours,",
          h1Benefit: "simple and clear",
          sub: "A professional website for tradespeople, restaurants and shops in Tours. You know what you pay and who looks after it.",
          metaTitle: "Website creation in Tours from €500 | Sèvalys",
          metaDescription: "Website for tradespeople, restaurants and shops in Tours. From €500 (VAT not applicable, art. 293 B CGI). Tell us about your project.",
          directAnswer: "A Site Vitrine presents your business in a few pages: who you are, what you do, where to find you, how to reach you. At Sèvalys it starts at €500 for the home page and up to 2 pages, with a 2 to 4 week lead time.",
          longIntro: [
            "Sèvalys is a digital agency in Tours. We build websites for tradespeople, restaurant owners and shopkeepers in Tours and Indre-et-Loire. Your site starts at €500, for the home page and up to 2 pages.",
            "A professional website does three things: it gets you found on Google, it reassures someone who hesitates, and it gives them a simple way to contact you. You speak directly to Anatholy Bricon, from the first call to launch. The quote is free, arrives within 48 h, and commits you to nothing.",
          ],
          problems: [
            { n: "A", title: "Nobody finds you on Google", desc: "A customer types your trade and Tours. If they do not see your site, they call someone else. You lose the contact before you have spoken." },
            { n: "B", title: "The site is dated or poor on mobile", desc: "Many customers look on their phone first. A site that is hard to read gives them a poor impression of your work." },
            { n: "C", title: "The site exists, but nobody calls", desc: "No visible phone number, no form, no directions. The visitor does not know what to do and leaves." },
          ],
          features: [
            "Custom design that fits your business",
            "Clean display on mobile, tablet and computer",
            "Home page and up to 2 pages, clear and short",
            "Built-in contact form",
            "Google Maps so people can find you",
            "Local SEO basics: titles, tags, Google listing to link",
            "Launch handled by us",
          ],
          enjeux: [
            "A clear site changes what happens before the first call. The customer sees your hours, your work and your service area. They know whether you are the right person before they pick up the phone.",
            "You save time on basic questions and get more serious enquiries. The site works while you are on a job, in the kitchen or behind the counter.",
          ],
          caseQuote: "The Gecko Cabane website, a French-Thai restaurant in Krabi, is available in four languages (French, English, German, Swedish) and offers an online booking form, with the menu and opening hours.",
          caseQuoteIsFact: true,
          signals: [],
          sections: [
            {
              h2: "A website for tradespeople in Tours",
              paragraphs: [
                "A tradesperson wants three things from a site: to be found, to show their work, to get called. The rest is secondary.",
                "Grand Ouest Habitat, a building renovation company based in Tours, is a good example. Its site shows the phone number, the area it covers, its trades, before and after photos of jobs, and the Google reviews it has received. Here is what a tradesperson should show on a site.",
              ],
              list: [
                "Their trade, in one clear sentence",
                "Their work, with real photos",
                "Their service area: Tours, Indre-et-Loire",
                "A phone number visible on mobile",
                "A form to describe the job",
              ],
            },
            {
              h2: "A website for restaurants",
              paragraphs: [
                "A customer must find four answers in ten seconds: what is on the menu, when you are open, how to book, how to get there.",
                "The Gecko Cabane site, a French-Thai restaurant in Krabi, Thailand, shows the cuisine, the hours, a Book button and a contact, in several languages. To stop picking up the phone mid-service, a voice agent can answer calls for you.",
              ],
              link: { label: "Answer the phone during service", href: "/services/agent-vocal-ia" },
            },
            {
              h2: "Shops and independents: sites already online",
              paragraphs: [
                "Sellerie Duchet, equestrian equipment in Chambray-lès-Tours, shows its departments, featured products and an introduction to its owner. That site also sells online: a shop is a larger project than a Site Vitrine, quoted separately.",
                "Ghjulianu Codani, a photographer, presents his portfolio, albums, rates and a way to contact him. In both cases, the site is built around what the visitor is looking for.",
              ],
              link: { label: "An online shop: the custom project", href: "/services/projet-sur-mesure" },
            },
            {
              h2: "Why a professional site rather than a social media page",
              paragraphs: [
                "A social media page will do in a pinch. A site of your own does better, for three reasons.",
                "First, it can be found on Google with no account or login. Second, it reassures: an address in your name, clear pages, a phone number. Third, you control the content and how it looks, without relying on a platform that changes its rules.",
              ],
              link: { label: "How much a Site Vitrine costs: the guide", href: "/guides/prix-site-vitrine" },
            },
            {
              h2: "How your site gets found on Google in Tours",
              paragraphs: [
                "We prepare the site for local search: clear titles, careful tags, the town name where it helps, and a link to your Google Business Profile listing.",
                "No ranking is promised. Google decides, and your competitors work too. But these basics save you starting from scratch if you later go further with SEO.",
              ],
              link: { label: "Get your site found on Google in Tours", href: "/services/seo-referencement" },
            },
            {
              h2: "Your contact in Tours",
              paragraphs: [
                "You speak directly to Anatholy Bricon, a sole trader. He follows your project from the first conversation to launch.",
                "Sèvalys works in Tours, Saint-Avertin and the surrounding area, across Indre-et-Loire. We talk by phone, video call or in person. You can also read what our customers say.",
              ],
              link: { label: "Read our customers' reviews", href: "/avis" },
            },
          ],
          steps: [
            { title: "Conversation and quote", text: "You describe your business and what the site should do for you. The free quote arrives within 48 h.", duration: "1 to 2 days" },
            { title: "Content and mock-up", text: "We organise the pages, you send text and photos, then we design the home page mock-up.", duration: "1 to 2 weeks" },
            { title: "Review and tweaks", text: "You look at the mock-up and then the site, and give your feedback. We apply it.", duration: "3 to 7 days" },
            { title: "Launch", text: "We publish the site on your hosting, with your domain name, and we test the contact form.", duration: "1 to 3 days" },
          ],
          pricing: {
            fromLabel: "From",
            price: 500,
            unit: "for a Site Vitrine: home page + up to 2 pages",
            includes: [
              "Custom design that fits your business",
              "Layout adapted to mobile, tablet and computer",
              "Contact form",
              "Built-in Google Maps",
              "Local SEO basics: titles, tags, Google listing to link",
              "Site launch",
            ],
            notIncluded: [
              "Domain name and hosting, paid by you",
              "Writing the text and photos, if you do not provide them",
              "Site maintenance, available as an option",
            ],
            extras: [
              { label: "Extra page", price: "On quote" },
              { label: "Site maintenance", price: "On quote" },
              { label: "Writing the text", price: "On quote" },
              { label: "Online shop (custom project)", price: "On quote" },
            ],
            note: "VAT not applicable, art. 293 B of the CGI. Usual lead time: 2 to 4 weeks. Free quote within 48 h.",
          },
          areas: ["Tours", "Saint-Avertin", "Joué-lès-Tours", "Saint-Cyr-sur-Loire", "La Riche", "Chambray-lès-Tours", "Indre-et-Loire"],
          proofProjects: [0, 1, 3, 4],
          internalLinks: [
            { label: "How much a Site Vitrine costs: the price guide", href: "/guides/prix-site-vitrine", description: "The ranges, and the questions to ask before a quote." },
            { label: "Get your site found on Google in Tours", href: "/services/seo-referencement", description: "Go further than the local SEO basics." },
            { label: "Redo an existing site: the redesign", href: "/services/rebranding-site-premium", description: "For a site that is dated or no longer looks like you." },
            { label: "Estimate your project in 2 minutes", href: "/simulateur", description: "A few questions, then advice on the right offer." },
            { label: "Guide: getting your site found in Tours", href: "/guides/seo-local", description: "The simple steps of local SEO." },
          ],
          faq: [
            { q: "How much does a website cost in Tours?", a: "A Sèvalys site starts at €500, for the home page and up to 2 pages. VAT not applicable, art. 293 B of the CGI. The price rises with the number of pages, copywriting or photos to arrange. Providers in Tours range from about €700 to €3,000 (survey of November 2026): the price guide explains the gap." },
            { q: "What does the package from €500 include?", a: "The home page and up to 2 pages, a custom design, mobile display, a contact form, a Google Maps map, local SEO basics and launch. Not included: the domain name, hosting, writing the text and photos if you do not provide them, and maintenance." },
            { q: "Can you build a website for free?", a: "Yes, with an online builder. But the address is not yours, options are limited and nobody guides you. For an occasional project it may be enough. To receive calls from customers, a professional site works better." },
            { q: "Who builds my site, and what is the job called?", a: "A web designer or web developer. At Sèvalys you work with Anatholy Bricon, who follows your project from the first conversation to launch." },
            { q: "Will my site be visible on Google in Tours?", a: "It is prepared for it: clear titles, well-named pages, a link to your Google listing. No ranking is promised, because nobody controls it. To go further, an SEO offer exists: see the SEO page." },
            { q: "Do I need to have the text and photos already?", a: "It is not required, but it is faster. If you have them, send them over. If not, we help you structure the content. Writing the text is an option, on quote." },
            { q: "I work in Tours, do I have to come and see you?", a: "No. We talk by phone or video call. An in-person meeting is possible around Tours if you prefer." },
            { q: "I am a restaurant owner or tradesperson: will my site be different?", a: "Yes. For a restaurant: the menu, hours, booking. For a tradesperson: the work, the service area and a way to describe the job. The site layout follows your trade." },
          ],
          crossLink: null,
        },
        {
          name: "Website redesign",
          tagline: "REDO YOUR SITE, KEEP WHAT MATTERS",
          h1Lead: "Website redesign in Tours:",
          h1Benefit: "redo your site without losing what works",
          sub: "Your site already exists, but it looks dated, loads slowly or brings no enquiries? Sèvalys rebuilds it and keeps what already brings you visitors.",
          metaTitle: "Website redesign in Tours · keep what works | Sèvalys",
          metaDescription: "Redo your site in Tours without starting over: audit, new design, 301 redirects and Google follow-up. Free quote within 48h, no commitment.",
          directAnswer: "A website redesign means rebuilding a site that already exists: its design, page structure, text and technology. In Tours, Sèvalys starts with an audit of your current site, keeps the pages that bring visitors, redirects old addresses and checks Google Search Console after launch. The quote comes after the audit: free, within 48h.",
          longIntro: [
            "A redesign means rebuilding a site that already exists. The design changes, pages are reorganised, the text is reviewed and the technology is renewed. Your domain name stays yours.",
            "Anatholy Bricon, in Tours, redoes websites while keeping what already brings visitors. The amount is set by quote, after an audit of your current site — free quote within 48h. Not sure where to begin? A two-minute online diagnostic points you the right way.",
          ],
          problems: [
            { n: "A", title: "A slow site, or one that is unreadable on mobile", desc: "Most visitors arrive from a phone. If the page is slow to open or the text is too small, many leave before reading a single line." },
            { n: "B", title: "Nobody contacts you through the site", desc: "The site is online, but the form stays empty and the phone does not ring. It shows your business without ever inviting action." },
            { n: "C", title: "A site that no longer looks like you, and that you can no longer edit", desc: "Your business has moved on, your site has not. Changing an opening time or a photo needs help, and the whole thing no longer matches your image." },
          ],
          features: [
            "Audit of your current site",
            "Inventory of the pages that bring visitors",
            "New design that reads well on mobile",
            "Domain name and e-mail addresses kept",
            "301 redirect for every old address",
            "Launch and follow-up in Google Search Console",
            "Hand-off training included",
          ],
          enjeux: [
            "A site redone with method keeps what already works. Visitors who find you today find the same pages tomorrow, better presented, instead of landing on an error.",
            "The change shows in simple things: a site that opens fast on a phone, pages that are easy to browse, a form or a number you find without searching. No Google position is promised: the risk of loss is reduced, then monitored.",
          ],
          sections: [
            {
              h2: "Redesign or simple update: what you really need",
              paragraphs: [
                "Not every site needs to be rebuilt. If the foundation is sound, an update is enough: a text to fix, a photo to swap, an opening time to adjust. It is faster and cheaper.",
                "A redesign becomes useful when the foundation itself is the problem: a site that is too old, too slow, unreadable on mobile, or so limited that each change costs more than a fresh start. We then rebuild an existing site, with its history and its pages.",
                "During the audit, we tell you honestly which case you are in. If a simple update solves your problem, we say so.",
              ],
              list: [
                "Update: the site holds up, a few elements are corrected.",
                "Redesign: the site exists, but its foundation is no longer enough. We rebuild it and keep what works.",
                "New site: nothing is online yet, we start from a blank page.",
              ],
              link: { label: "No site yet? See the showcase website page →", href: "/services/site-vitrine" },
            },
            {
              h2: "What we keep, what we change",
              paragraphs: [
                "Redoing a site does not mean throwing everything away. We start from what you have and keep whatever still serves you. You approve every choice before launch.",
              ],
              list: [
                "Your domain name and e-mail addresses: they stay yours, nothing changes for your contacts.",
                "Your text and photos that still work: they are reused, tidied up or replaced when they are no longer accurate.",
                "Your pages that already bring visitors: they are identified before anything is touched, then kept or redirected.",
                "What is replaced: the design, the page structure, the loading speed and the contact form.",
              ],
            },
            {
              h2: "How we protect your place on Google",
              paragraphs: [
                "This is the first worry, and it is a fair one. A site redone without care can lose its visitors: old addresses disappear, search engines lose their bearings and your pages start from zero.",
                "Here is what we do to limit that risk. First, an audit that identifies the pages of your current site already receiving visits. Then we keep those pages or their useful content. Each old address is redirected to its new page with a 301 redirect, which tells Google the page has simply moved. After launch, we check in Google Search Console that pages are picked up and that nothing returns an error.",
                "To be clear: no position is guaranteed, before or after a redesign. The risk of loss is reduced and monitored, not removed.",
              ],
              link: { label: "Protect and improve your search ranking →", href: "/services/seo-referencement" },
            },
            {
              h2: "How much does a website redesign in Tours cost?",
              paragraphs: [
                "It depends on the state of your current site, the number of pages to carry over and what you want to change. That is why a redesign is quoted after an audit of your current site. The quote is free, arrives within 48h and commits you to nothing.",
                "A site of a few pages is not redone like a site of forty. The quote states what is included, what is optional and what stays with you, with no hidden line. Sèvalys is VAT-exempt: VAT not applicable, art. 293 B of the French tax code.",
                "To get a sense of market ranges before writing to us, our guide explains what makes the cost of a showcase website vary.",
              ],
              link: { label: "Run my diagnostic in 2 minutes →", href: "/simulateur" },
            },
            {
              h2: "What if you also want a new look?",
              paragraphs: [
                "A dated site sometimes comes with a dated image. In that case, the logo, colours and fonts can be reworked together with the site, so the new site carries a coherent identity from day one.",
                "This is optional: it is decided during the audit and never imposed. The detail of the brand guidelines is on the Branding page.",
              ],
              link: { label: "Just need your identity? Discover Branding →", href: "/services/branding" },
            },
            {
              h2: "Who looks after your site",
              paragraphs: [
                "One person answers you: Anatholy Bricon, sole trader in Tours. He reviews your current site, redoes it and stays reachable after launch.",
                "No sales relay and no request that gets lost: you speak to the person doing the work. He works in Tours and the surrounding towns.",
              ],
            },
          ],
          steps: [
            { title: "We look at your current site", text: "Audit: what brings visitors, what is slow, what gets in the way on mobile, what can be kept. You receive a free quote within 48h.", duration: "Quote within 48h" },
            { title: "We decide together what changes", text: "We list the pages to keep, merge or remove, and what is carried over as it is. Nothing starts without your agreement.", duration: "One conversation, at your convenience" },
            { title: "We mock up and you approve", text: "You see the new design before it is built, and ask for the adjustments you want.", duration: "Depends on your feedback" },
            { title: "We build and test", text: "We build the pages, carry over the content, then test display on mobile, speed and the contact form.", duration: "A few weeks depending on site size" },
            { title: "We launch and keep watch", text: "Launch with the 301 redirects in place, then a check in Google Search Console. A hand-off lets you edit your text yourself.", duration: "Launch, then follow-up" },
          ],
          areas: ["Tours", "Saint-Avertin", "Joué-lès-Tours", "Saint-Cyr-sur-Loire", "La Riche", "Chambray-lès-Tours", "Indre-et-Loire"],
          proofProjects: [0, 1, 3, 4],
          internalLinks: [
            { label: "Build a showcase website if you have no site yet", href: "/services/site-vitrine", description: "The page for starting from a blank page." },
            { label: "Protect and improve your search ranking", href: "/services/seo-referencement", description: "The support that extends a redesign." },
            { label: "Rework only your visual identity", href: "/services/branding", description: "Logo, colours and guidelines, without touching the site." },
            { label: "Keep your site up to date after launch", href: "/services/maintenance", description: "Follow-up once the new site is published." },
            { label: "What a showcase website costs: ranges and criteria", href: "/guides/prix-site-vitrine", description: "What makes the quote vary." },
            { label: "Run my diagnostic in 2 minutes", href: "/simulateur", description: "A short questionnaire to see where to start." },
          ],
          caseQuote: null,
          signals: [
            { t: "Audit first", d: "We look at your current site before proposing anything: what pays off, what gets in the way, what can be kept." },
            { t: "One point of contact", d: "Anatholy Bricon, in Tours, answers you from the first conversation to launch, with no intermediary." },
            { t: "No commitment", d: "The quote is free, within 48h. Nothing starts before your explicit agreement." },
          ],
          faq: [
            { q: "Why redo a website?", a: "Four reasons come up: the site is slow or unreadable on mobile, it brings no enquiries, it no longer looks like your business, or you can no longer edit it. If none applies, a simple update is enough, and we will tell you after the audit." },
            { q: "How much does a website redesign in Tours cost?", a: "A redesign is quoted after an audit of your current site: the amount depends on the number of pages to carry over and what you want to change. The quote is free, arrives within 48h and commits you to nothing. VAT not applicable, art. 293 B of the French tax code." },
            { q: "Will I lose my Google ranking?", a: "The risk exists if old addresses are not redirected. We identify the pages already receiving visits, keep them or redirect them one by one with 301 redirects, then check in Google Search Console after launch. No position is guaranteed." },
            { q: "How do I update a website?", a: "A site can be updated in small steps as long as its foundation is sound: text, photos, opening times. When the foundation is too old, too slow or too limited, a redesign becomes more reasonable than endless patching." },
            { q: "How long does a redesign take?", a: "Expect a few weeks for a small site. Most of the time depends on how quickly you approve the mock-ups and send your content. The precise schedule is in the quote, once your site has been audited." },
            { q: "Do I keep my domain name and my text?", a: "Yes, your domain name stays yours, as do your e-mail addresses. Useful text and photos are reused, adapted or replaced depending on what serves the new site." },
            { q: "Will I be able to edit my site myself afterwards?", a: "Yes for everyday text and images: a hand-off is included at delivery. For the rest, we remain available, and long-term follow-up can go through our maintenance offer." },
            { q: "I have no site: is this the right page?", a: "No. A redesign is for a site that already exists. If you are starting from zero, the Showcase website page fits your need better." },
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
          crossLink: { label: "Need your site redone too? Discover the redesign →", slug: "rebranding-site-premium" },
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
        {
          name: "SEO & Search Visibility",
          tagline: "GET FOUND ON GOOGLE",
          h1Lead: "SEO agency in Tours ·",
          h1Benefit: "get found by your customers on Google",
          sub: "Your customers in Tours search for your trade on Google. We work on your site and profile so they find you.",
          metaTitle: "SEO agency in Tours: get found, from €300/month",
          metaDescription: "SEO agency in Tours for tradespeople, shops and restaurants. 2 pages optimised, 1 link a month, Search Console in your name. From €300/month.",
          directAnswer: "An SEO agency in Tours works on your organic search so that customers looking for your trade find you. At Sèvalys it starts at €300 a month, with no promised ranking: nobody controls Google's algorithm.",
          longIntro: [
            "Sèvalys is the SEO agency in Tours for tradespeople, shops and restaurants. We rework your two most important pages and your Google profile, and earn one quality link every month.",
            "You stay in control: Search Console is created in your name. Results take several months, and we explain that plainly below.",
          ],
          problems: [
            { n: "A", title: "Your site doesn't show up", desc: "Your customers type \"plumber Tours\" or \"restaurant Tours\". The top spots go to better-structured competitors." },
            { n: "B", title: "Your Google profile is incomplete", desc: "Poorly chosen categories, vague opening hours, old photos: the profile exists but doesn't reassure." },
            { n: "C", title: "You don't know what works", desc: "Without Search Console, there's no way to see whether the site is progressing or which searches it appears on." },
          ],
          features: [
            "Starting audit of the site and Google profile",
            "Choice of local searches to target",
            "Titles, copy and tags reworked on 2 pages",
            "Google Business Profile kept up to date",
            "Speed, mobile and indexing checked",
            "Search Console tracking in your name",
            "Monthly report on what moves",
          ],
          enjeux: [
            "A well-built page keeps being found without paying for each click. An ad stops when the budget does.",
            "People mostly click the top results, and the Google profile matters as much as the site. The two are worked on together.",
          ],
          sections: [
            {
              h2: "What we do for your organic search",
              paragraphs: ["Four workstreams, no jargon."],
              list: [
                "Your 2 main pages: titles, copy and structure written for your customers' searches.",
                "Your Google Business Profile: categories, opening hours, photos and replies to reviews.",
                "The technical side, plainly: a fast site, readable on mobile and well read by Google.",
                "One quality link a month: another serious site mentions you, and Google notices.",
              ],
            },
            {
              h2: "Local SEO: be found near you",
              paragraphs: [
                "Local SEO means showing up when people search \"trade + town\". We target those searches around Tours, not a national ranking.",
                "To understand the principle before you start, read our guide.",
              ],
              link: { label: "Understand local SEO in Tours", href: "/guides/seo-local" },
            },
            {
              h2: "Who it's for: restaurants, tradespeople, shops",
              paragraphs: [
                "A restaurant needs a polished Google profile, a readable menu and a booking link. A tradesperson needs clear pages by trade and area, with photos of jobs. A shop needs accurate opening hours and pages for its star products.",
                "It isn't suited to an online store with 500 products, or to a fiercely contested national market.",
              ],
            },
            {
              h2: "How we measure what happens",
              paragraphs: [
                "Search Console is created in your name. You see impressions, clicks and average position on your searches yourself. We add the calls received from your Google profile. If you leave, you keep every access.",
                "Each month, a short report: what moved, what was done, what comes next.",
              ],
            },
            {
              h2: "What we don't promise",
              paragraphs: [
                "No position is guaranteed, and beware of anyone who promises one. First signs often appear after 3 to 6 months, sometimes longer. It all depends on local competition: a plumber in Tours isn't in the same position as a village florist.",
                "What we do guarantee: the work described here and tracking you can check yourself.",
              ],
            },
            {
              h2: "SEO or Google Ads: where to start?",
              paragraphs: ["Ads bring customers fast, but stop with the budget. Organic search is slower and lasts. If you already have a site, start with SEO. If the need is urgent, run ads in the meantime."],
              list: [
                "SEO: slower, lasts over time, no cost per click.",
                "Google Ads: fast, stops with the budget, every click is paid.",
              ],
              link: { label: "Run Google ads in the meantime", href: "/services/google-ads" },
            },
            {
              h2: "3-month minimum commitment",
              paragraphs: ["Three months is the time to see the first signs. After that the offer renews monthly and you stop with one month's notice. Your pages and your accesses stay yours."],
            },
          ],
          pricing: {
            fromLabel: "From",
            price: 300,
            unit: "per month, for 2 tracked pages",
            includes: [
              "Starting audit of the site and Google profile",
              "Optimisation of 2 pages (titles, copy, tags)",
              "Google Business Profile update",
              "1 quality link per month",
              "Search Console tracking in your name",
              "Monthly report",
            ],
            notIncluded: [
              "Website redesign",
              "Google Ads advertising",
              "Blog article writing",
            ],
            extras: [
              { label: "Extra tracked page (3 pages = €400 a month)", price: "+ €100 per month" },
            ],
            note: "VAT not applicable, art. 293 B of the French tax code (CGI)",
          },
          areas: ["Tours", "Saint-Avertin", "Joué-lès-Tours", "Saint-Cyr-sur-Loire", "La Riche", "Chambray-lès-Tours", "Indre-et-Loire"],
          proofProjects: [0, 1, 3, 4],
          internalLinks: [
            { label: "Understand local SEO in Tours", href: "/guides/seo-local", description: "The principle, explained simply." },
            { label: "Build your website in Tours", href: "/services/site-vitrine", description: "No site yet? Start there." },
            { label: "Run Google ads in the meantime", href: "/services/google-ads", description: "Customers fast, while SEO settles in." },
            { label: "Run the visibility diagnostic", href: "/simulateur", description: "A few questions to know where to start." },
          ],
          caseQuote: null,
          signals: [
            { t: "No promised ranking", d: "We describe the work done and what is measured. Your place on Google is outside our control." },
            { t: "Accounts in your name", d: "Search Console and the Google profile stay tied to your account, even if you leave." },
            { t: "3-month minimum, then month to month", d: "Time to see the first signs. After that, you stop with one month's notice." },
          ],
          faq: [
            { q: "How much does an SEO agency in Tours cost?", a: "At Sèvalys, from €300 a month for 2 tracked pages. Each extra page is €100 a month: 3 pages make €400. One quality link a month is included, with a 3-month minimum. VAT not applicable, art. 293 B of the CGI." },
            { q: "How long before results show?", a: "First signs are often measurable after 3 to 6 months, depending on competition and the state of the site. No position is guaranteed. That is why the commitment is 3 months: time to see whether things move." },
            { q: "Can you guarantee first place on Google?", a: "No, and be wary of anyone who does. Results depend on an algorithm nobody controls. We guarantee the work done and tracking you can check yourself." },
            { q: "How will I know it's working?", a: "Search Console is created in your name: you see clicks, impressions and average position. You also get a report every month. If you leave, you keep access." },
            { q: "SEO or Google Ads: which one?", a: "Ads bring customers fast but stop with the budget. SEO builds over time. We often start with SEO if you have a site, and with Google Ads if the need is urgent." },
            { q: "What do you do on my Google Business Profile?", a: "We check the details, categories, opening hours and photos, then update it every month and follow the reviews. The profile stays in your name: you keep access." },
            { q: "Do I need a site already?", a: "Yes, or have one built: you need at least one page about your business. Otherwise we start with a showcase site, then work on search." },
            { q: "Is there a commitment?", a: "3 months minimum, then monthly renewal. You stop with one month's notice. Your pages and accesses stay yours." },
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
        "You answer four or five questions — your sector, the state of your online presence, what's holding you back today, and your priority for the next three months. Each answer weights Sèvalys's ten services, and only the two to four highest-ranked are shown to you.",
        "Answer honestly, especially when the answer isn't flattering: an optimistic answer produces a useless recommendation. At the end, you leave your details and your result appears immediately.",
      ],
    },
    start: "Start my diagnostic →",
    progressLabel: "Question {current} of {total}",
    next: "Next →",
    nextFinal: "See my recommendation →",
    back: "← Back",
    rangePlaceholder: "Drag to choose",
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
      'budget': {
        text: "What budget do you have in mind for this project?",
        hint: "A rough estimate is enough — it helps us shape a realistic recommendation.",
        options: {
          'budget-0-500': "Tight budget, just exploring options",
          'budget-500-1500': "Moderate budget, ready to invest reasonably",
          'budget-1500-3000': "Comfortable budget, I want real results",
          'budget-3000-plus': "Substantial budget, no strict ceiling",
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
      telephoneHint: "Required, so that we can call you back.",
      requiredNote: "All fields are required.",
      errorSummary: "Fix the highlighted fields to continue.",
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
        a: "Because a recommendation listing all ten services isn't a recommendation. Each answer weights the services, and only the two to four highest-ranked are shown to you. The rest can wait.",
      },
      {
        q: "What happens to my answers?",
        a: "They're saved along with your details to prepare our conversation, kept for a maximum of 12 months if you don't become a client, then automatically deleted. You can request their deletion at any time at contact@sevalys.com.",
      },
    ],
  },
  landing: {
    hero: {
      pill: "WEB AGENCY · TOURS, FR",
      title_l1: "Web agency",
      title_l2: "in ",
      title_l2_it: "Tours",
      sub: "Tools that work for your customers. Websites, local SEO and AI agents for the shops, restaurants, craftspeople and small businesses of Tours.",
      cta_primary: "Start the diagnostic",
      cta_secondary: "Let's discuss your project",
    },
    manifeste: {
      num: "01 / 08",
      title_l1: "A web agency in Tours",
      title_l2_it: "for shops and small businesses.",
      intro: "Sèvalys builds websites, handles local SEO and sets up AI agents for the shops, restaurants, craftspeople and small businesses of Tours and Indre-et-Loire. You talk directly to Anatholy Bricon, the founder.",
      quote: "“A beautiful site is fine. A site that earns is better.”",
      items: [
        { t: "Invisible on Google", d: "Your customers search for your trade and find your competitors first." },
        { t: "Missed calls", d: "A call unanswered during the rush is an order that goes elsewhere." },
        { t: "Dated image", d: "A site or logo from another era makes new customers hesitate." },
        { t: "Neglected social media", d: "With no time for social media, the audience builds up with your competitors." },
      ],
      cta: "Take the free diagnostic",
    },
    servicesPreview: {
      num: "02 / 08",
      title_l1: "Our services in Tours:",
      title_l2_it: "website, SEO, advertising, AI.",
      intro: "Fixed-scope offers with the price shown. Each one has its own detailed page.",
      cards: [
        { t: "Professional website, from €500", d: "Home page and up to 2 pages, fixed price. Quote within 48 h, no commitment.", link: "Professional website in Tours" },
        { t: "Local SEO, from €300/month", d: "2 pages tracked, 1 link a month included, 3 months minimum, +€100/month per extra page. No ranking guaranteed.", link: "Local SEO" },
        { t: "Website redesign and new image", d: "A new visual identity and a rebuilt site for an up-to-date image.", link: "Website redesign" },
        { t: "Google Ads advertising", d: "Ads shown when your customers search for you, with a budget you control.", link: "Google Ads campaigns" },
        { t: "AI voice agent so you never miss a call", d: "An agent that picks up, books appointments and notifies you.", link: "AI voice agent" },
      ],
      others: "Also:",
      guide_price: "How much does a website cost?",
      guide_seo: "Local SEO in Tours explained",
      vat: "Prices in euros, VAT not applicable, art. 293 B of the French tax code (CGI).",
      all: "See all services",
    },
    method: {
      num: "04 / 08",
      title_l1: "How",
      title_l2_it: "we work.",
      intro: "Four steps, from first contact to follow-up.",
      steps: [
        { n: '01', t: "Diagnostic", d: "A few questions about your business and what holds you back." },
        { n: '02', t: "Proposal", d: "A clear recommendation and a quote within 48 h." },
        { n: '03', t: "Delivery", d: "The project is built with regular check-ins." },
        { n: '04', t: "Follow-up", d: "We stay available after launch." },
      ],
    },
    zone: {
      num: "05 / 08",
      title_l1: "Where do we work?",
      title_l2_it: "Tours and Indre-et-Loire.",
      text: "Sèvalys is based in Tours. We work with the shops, restaurants, craftspeople and companies of Tours and Indre-et-Loire, in person or remotely. The diagnostic and follow-up are also done remotely anywhere in France.",
      label: "Towns:",
      towns: ["Tours", "Saint-Avertin", "Joué-lès-Tours", "Saint-Cyr-sur-Loire", "La Riche", "Chambray-lès-Tours"],
    },
    why: {
      num: "06 / 08",
      title_l1: "Why choose a web agency",
      title_l2_it: "of human size?",
      items: [
        { t: "One contact", d: "You talk directly to Anatholy Bricon, sole trader and founder of Sèvalys." },
        { t: "Prices shown", d: "Website from €500, SEO from €300/month: you know where you are going." },
        { t: "You keep everything", d: "The code and the domain name are yours from day one." },
      ],
    },
    faq: {
      num: "07 / 08",
      title_l1: "Frequently asked",
      title_l2_it: "questions.",
      items: [
        { q: "What does a web agency in Tours like Sèvalys do?", a: "Sèvalys, a web and digital agency in Tours, builds websites, handles local SEO, runs Google Ads campaigns and sets up AI voice agents for the shops and small businesses of Tours. You talk directly to Anatholy Bricon, from first contact to launch." },
        { q: "What is the difference between a web agency and a digital agency?", a: "A web agency builds the site. A digital agency also gets you found on Google (SEO, advertising) and handles everyday tools (AI agent, automations)." },
        { q: "How much does a website cost?", a: "From €500: home page and up to 2 pages, at a fixed price with a defined scope. Quote within 48 h, no commitment. VAT not applicable, art. 293 B of the French tax code (CGI)." },
        { q: "How much does SEO cost?", a: "From €300/month for 2 tracked pages, +€100/month per extra page, 1 link per month included, 3 months minimum. No ranking is guaranteed: we measure and report." },
        { q: "Do you only work in Tours?", a: "Sèvalys is based in Tours and works across Indre-et-Loire, in person or by video call, and remotely anywhere in France." },
        { q: "How long until my site is live?", a: "Usually a few weeks, depending on the time needed to prepare texts and photos." },
        { q: "Do I keep my site and domain name?", a: "Yes. The code and the domain name belong to you from day one." },
        { q: "Who will I work with?", a: "With Anatholy Bricon, sole trader and founder of Sèvalys: you speak to him directly, from quote to follow-up." },
      ],
    },
    work: {
      num: "03 / 08",
      title_l1: "Five sites delivered,",
      title_l2_it: "five trades.",
      intro: "Real sites, live online, that you can visit.",
      items: [
        { name: 'Grand Ouest Habitat', desc: 'General building renovation site — online project request, technical visit, then a quote within 48 h.', tags: ['SITE', 'QUOTE'], year: '2026' },
        { name: 'Sellerie Duchet', desc: 'Online shop for equestrian equipment — catalogue by department, delivery and instalment payment.', tags: ['SHOP', 'E-COMMERCE'], year: '2026' },
        { name: 'NEF Nettoyage', desc: 'Commercial cleaning company in Tours and surrounding area — services for businesses and individuals, team, completed projects, before/after photos and a free quote request.', tags: ['SITE', 'QUOTE'], year: '2026' },
        { name: 'Gecko Cabane', desc: 'Restaurant site + booking. Custom design, managed hosting.', tags: ['SITE', 'BOOKING'], year: '2024' },
        { name: 'Ghjulianu Codani', desc: 'Professional portfolio — editorial design, careful build.', tags: ['SITE', 'EDITORIAL'], year: '2025' },
      ],
      bridge_eyebrow: 'NEXT STEP',
      bridge_title_l1: 'Which service',
      bridge_title_it: 'fits you?',
      bridge_body: 'A two-minute diagnostic to find out exactly what you need.',
    },
    partners: {
      title: 'TRUSTED BY — SINCE 2023',
      items: [
        { name: 'Selenium Studio', role: 'PARTNER STUDIO', color: '#C4F542' },
        { name: 'Gecko Cabane', role: 'RESTAURANT', color: '#E07856' },
        { name: 'Victor Verissimo', role: 'ARTIST PORTFOLIO', color: '#9A9690' },
        { name: 'Ghjulianu Codani', role: 'PROFESSIONAL', color: '#C4F542' },
        { name: 'Grand Ouest Habitat', role: 'BUILDING RENOVATION', color: '#E07856' },
        { name: 'Sellerie Duchet', role: 'EQUESTRIAN GEAR', color: '#C4F542' },
        { name: 'AJMG·EXP', role: 'EXPERTISE', color: '#9A9690' },
      ],
    },
    contact: {
      num: "08 / 08",
      title_l1: "A project in Tours?",
      title_l2_it: "Let's talk.",
      sub: "Reply within 24 business hours. First call free, no commitment, to understand where you stand.",
      updated: "Updated in November 2026.",
      info: [
        { k: 'Email', v: 'contact@sevalys.com' },
        { k: 'Phone', v: '+33 (0)6 07 18 41 33' },
        { k: 'Address', v: 'Tours, France · remote everywhere' },
        { k: 'Availability', v: 'Available now for new projects' },
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
      manageCookies: 'Manage cookies',
      reviews: 'Reviews',
      reviewPolicy: 'Review policy',
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
    skipToContent: 'ข้ามไปยังเนื้อหาหลัก',
  },
  services: {
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
    pages: {
      index: {
        badge: "บริการของเรา — 2026",
        title_l1: "บริการ",
        title_l2_it: "ของเรา",
        sub: "สิบความเชี่ยวชาญเพื่อให้ธุรกิจของคุณมองเห็นได้ น่าเชื่อถือ และติดต่อได้ง่าย เลือกบริการของคุณ — หรือให้แบบประเมินช่วยแนะนำ",
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
      extra: {
        pricingHeading: "ค่าใช้จ่าย",
        pricingIncludes: "สิ่งที่รวมอยู่ด้วย",
        pricingNotIncluded: "สิ่งที่ไม่รวม",
        pricingExtras: "ตัวเลือกเสริม",
        extrasColLabel: "ตัวเลือก",
        extrasColPrice: "ราคา",
        stepsHeading: "โปรเจกต์ดำเนินไปอย่างไร",
        stepDuration: "ระยะเวลาโดยประมาณ",
        areasHeading: "พื้นที่ให้บริการ",
        proofHeading: "ผลงานที่เข้าชมได้",
        proofVisit: "ดูเว็บไซต์",
        guidesHeading: "คู่มือที่เกี่ยวข้อง",
        breadcrumbHome: "หน้าแรก",
        breadcrumbServices: "บริการ",
      },
      items: [
        {
          name: "Site Vitrine",
          tagline: "เว็บไซต์ที่ทำให้ลูกค้าพบคุณและโทรหาคุณ",
          h1Lead: "สร้างเว็บไซต์ของคุณที่ตูร์",
          h1Benefit: "เรียบง่ายและชัดเจน",
          sub: "เว็บไซต์มืออาชีพสำหรับช่าง ร้านอาหาร และร้านค้าในตูร์ คุณรู้ว่าจ่ายเท่าไรและใครดูแลงานให้",
          metaTitle: "สร้างเว็บไซต์ที่ตูร์ เริ่ม 500 € | Sèvalys",
          metaDescription: "เว็บไซต์สำหรับช่าง ร้านอาหาร และร้านค้าในตูร์ เริ่มต้น 500 € (ไม่คิด TVA ตามมาตรา 293 B ของ CGI) เล่าโปรเจกต์ของคุณให้เราฟัง",
          directAnswer: "Site Vitrine คือเว็บไซต์ไม่กี่หน้าที่แนะนำธุรกิจของคุณ ว่าคุณคือใคร ทำอะไร หาคุณได้ที่ไหน และติดต่อได้อย่างไร ที่ Sèvalys เริ่มต้น 500 € สำหรับหน้าแรกและอีกไม่เกิน 2 หน้า ใช้เวลา 2 ถึง 4 สัปดาห์",
          longIntro: [
            "Sèvalys เป็นเอเจนซี่ดิจิทัลในตูร์ เราสร้างเว็บไซต์ให้ช่าง เจ้าของร้านอาหาร และพ่อค้าแม่ค้าในตูร์และ Indre-et-Loire เว็บไซต์ของคุณเริ่มต้น 500 € สำหรับหน้าแรกและอีกไม่เกิน 2 หน้า",
            "เว็บไซต์มืออาชีพทำหน้าที่สามอย่าง คือให้คนพบคุณบน Google ทำให้คนที่ลังเลมั่นใจ และมีช่องทางติดต่อที่ง่าย คุณคุยกับ Anatholy Bricon โดยตรงตั้งแต่โทรครั้งแรกจนถึงวันเปิดเว็บไซต์ ใบเสนอราคาไม่มีค่าใช้จ่าย ส่งภายใน 48 ชั่วโมง และไม่มีข้อผูกมัด",
          ],
          problems: [
            { n: "A", title: "ไม่มีใครพบคุณบน Google", desc: "ลูกค้าพิมพ์อาชีพของคุณกับคำว่าตูร์ หากไม่เห็นเว็บไซต์ของคุณ เขาจะโทรหาคนอื่น คุณเสียโอกาสก่อนจะได้คุยกัน" },
            { n: "B", title: "เว็บไซต์เก่าหรือดูยากบนมือถือ", desc: "ลูกค้าจำนวนมากเปิดดูจากโทรศัพท์ก่อน เว็บไซต์ที่อ่านยากทำให้ภาพลักษณ์งานของคุณแย่ลง" },
            { n: "C", title: "มีเว็บไซต์ แต่ไม่มีใครโทรมา", desc: "ไม่มีเบอร์โทรที่เห็นชัด ไม่มีแบบฟอร์ม ไม่มีแผนที่ ผู้เข้าชมไม่รู้ว่าต้องทำอะไรต่อและจากไป" },
          ],
          features: [
            "ดีไซน์เฉพาะตัว ตรงกับธุรกิจของคุณ",
            "แสดงผลสวยงามบนมือถือ แท็บเล็ต และคอมพิวเตอร์",
            "หน้าแรกและอีกไม่เกิน 2 หน้า ชัดเจนและกระชับ",
            "แบบฟอร์มติดต่อในตัว",
            "แผนที่ Google Maps บอกที่ตั้ง",
            "พื้นฐาน SEO ท้องถิ่น: ชื่อหน้า แท็ก และการเชื่อมกับข้อมูลธุรกิจบน Google",
            "เราเปิดใช้งานเว็บไซต์ให้",
          ],
          enjeux: [
            "เว็บไซต์ที่ชัดเจนเปลี่ยนสิ่งที่เกิดขึ้นก่อนการโทรครั้งแรก ลูกค้าเห็นเวลาทำการ ผลงาน และพื้นที่ให้บริการของคุณ เขารู้ว่าคุณใช่คนที่ต้องการหรือไม่ ก่อนจะยกโทรศัพท์",
            "คุณประหยัดเวลากับคำถามพื้นฐาน และได้รับคำขอที่จริงจังขึ้น เว็บไซต์ทำงานแทนคุณขณะที่คุณอยู่หน้างาน ในครัว หรือหลังเคาน์เตอร์",
          ],
          caseQuote: "เว็บไซต์ของ Gecko Cabane ร้านอาหารฝรั่งเศส-ไทยในกระบี่ มี 4 ภาษา (ฝรั่งเศส อังกฤษ เยอรมัน สวีเดน) พร้อมแบบฟอร์มจองโต๊ะออนไลน์ เมนู และเวลาเปิดให้บริการ",
          caseQuoteIsFact: true,
          signals: [],
          sections: [
            {
              h2: "เว็บไซต์สำหรับช่างในตูร์",
              paragraphs: [
                "ช่างต้องการสามอย่างจากเว็บไซต์ คือให้คนพบ แสดงผลงาน และได้รับสายโทรศัพท์ ที่เหลือเป็นเรื่องรอง",
                "Grand Ouest Habitat บริษัทปรับปรุงอาคารในตูร์ เป็นตัวอย่างที่ดี เว็บไซต์แสดงเบอร์โทร พื้นที่ให้บริการ งานที่รับ รูปหน้างานก่อนและหลัง และรีวิว Google ที่ได้รับ นี่คือสิ่งที่ช่างควรแสดงบนเว็บไซต์",
              ],
              list: [
                "อาชีพของคุณ ในประโยคเดียวที่ชัดเจน",
                "ผลงาน พร้อมรูปถ่ายจริง",
                "พื้นที่ให้บริการ: ตูร์ และ Indre-et-Loire",
                "เบอร์โทรที่เห็นชัดบนมือถือ",
                "แบบฟอร์มให้อธิบายงานที่ต้องการ",
              ],
            },
            {
              h2: "เว็บไซต์สำหรับร้านอาหาร",
              paragraphs: [
                "ลูกค้าต้องได้คำตอบสี่ข้อภายในสิบวินาที คือมีอะไรให้กิน เปิดเมื่อไร จองอย่างไร และไปอย่างไร",
                "เว็บไซต์ Gecko Cabane ร้านอาหารฝรั่งเศส-ไทยในกระบี่ ประเทศไทย แสดงอาหาร เวลาเปิด ปุ่มจอง และช่องทางติดต่อ ในหลายภาษา หากไม่อยากรับสายระหว่างให้บริการ ผู้ช่วยเสียงสามารถรับสายแทนคุณได้",
              ],
              link: { label: "รับสายโทรศัพท์ระหว่างให้บริการ", href: "/services/agent-vocal-ia" },
            },
            {
              h2: "ร้านค้าและผู้ประกอบการอิสระ: เว็บไซต์ที่เปิดใช้งานแล้ว",
              paragraphs: [
                "Sellerie Duchet อุปกรณ์ขี่ม้าใน Chambray-lès-Tours แสดงหมวดสินค้า สินค้าแนะนำ และการแนะนำเจ้าของร้าน เว็บไซต์นี้ขายของออนไลน์ด้วย ร้านค้าออนไลน์เป็นโปรเจกต์ที่ใหญ่กว่า Site Vitrine และเสนอราคาแยก",
                "Ghjulianu Codani ช่างภาพ แสดงพอร์ตโฟลิโอ อัลบั้ม ราคา และช่องทางติดต่อ ทั้งสองกรณี เว็บไซต์สร้างจากสิ่งที่ผู้เข้าชมต้องการค้นหา",
              ],
              link: { label: "ร้านค้าออนไลน์: โปรเจกต์ตามสั่ง", href: "/services/projet-sur-mesure" },
            },
            {
              h2: "ทำไมต้องมีเว็บไซต์มืออาชีพ แทนเพจโซเชียลมีเดีย",
              paragraphs: [
                "เพจโซเชียลพอแก้ขัดได้ แต่เว็บไซต์ของคุณเองดีกว่าด้วยเหตุผลสามข้อ",
                "หนึ่ง ค้นเจอบน Google โดยไม่ต้องมีบัญชีหรือล็อกอิน สอง สร้างความมั่นใจ มีที่อยู่เว็บเป็นชื่อคุณ หน้าที่ชัดเจน และเบอร์โทร สาม คุณควบคุมเนื้อหาและการแสดงผลเอง โดยไม่ต้องพึ่งแพลตฟอร์มที่เปลี่ยนกฎได้เสมอ",
              ],
              link: { label: "Site Vitrine ราคาเท่าไร: คู่มือ", href: "/guides/prix-site-vitrine" },
            },
            {
              h2: "เว็บไซต์ของคุณจะถูกพบบน Google ในตูร์อย่างไร",
              paragraphs: [
                "เราเตรียมเว็บไซต์สำหรับการค้นหาในพื้นที่ ชื่อหน้าชัดเจน แท็กเรียบร้อย ใส่ชื่อเมืองในจุดที่เหมาะสม และเชื่อมกับข้อมูลธุรกิจของคุณบน Google Business Profile",
                "เราไม่สัญญาอันดับใดๆ Google เป็นผู้ตัดสิน และคู่แข่งก็ทำงานเช่นกัน แต่พื้นฐานเหล่านี้ช่วยให้คุณไม่ต้องเริ่มใหม่ หากต่อยอดด้วย SEO ภายหลัง",
              ],
              link: { label: "ทำให้เว็บไซต์ของคุณถูกพบบน Google ในตูร์", href: "/services/seo-referencement" },
            },
            {
              h2: "ผู้ติดต่อของคุณในตูร์",
              paragraphs: [
                "คุณคุยกับ Anatholy Bricon โดยตรง เขาเป็นผู้ประกอบการรายบุคคล ดูแลโปรเจกต์ของคุณตั้งแต่การคุยครั้งแรกจนถึงเปิดใช้งาน",
                "Sèvalys ให้บริการในตูร์ Saint-Avertin และพื้นที่โดยรอบทั่ว Indre-et-Loire เราคุยกันทางโทรศัพท์ วิดีโอคอล หรือพบกันตัวต่อตัว คุณอ่านสิ่งที่ลูกค้าของเราพูดถึงได้ด้วย",
              ],
              link: { label: "อ่านรีวิวจากลูกค้าของเรา", href: "/avis" },
            },
          ],
          steps: [
            { title: "พูดคุยและเสนอราคา", text: "คุณเล่าเรื่องธุรกิจและสิ่งที่ต้องการจากเว็บไซต์ ใบเสนอราคาไม่มีค่าใช้จ่าย ส่งภายใน 48 ชั่วโมง", duration: "1 ถึง 2 วัน" },
            { title: "เนื้อหาและแบบร่าง", text: "เราจัดโครงสร้างหน้า คุณส่งข้อความและรูปภาพ จากนั้นเราออกแบบหน้าแรก", duration: "1 ถึง 2 สัปดาห์" },
            { title: "ตรวจสอบและแก้ไข", text: "คุณดูแบบร่างและเว็บไซต์ แล้วให้ข้อเสนอแนะ เราปรับตามนั้น", duration: "3 ถึง 7 วัน" },
            { title: "เปิดใช้งาน", text: "เราเผยแพร่เว็บไซต์บนโฮสติ้งของคุณ พร้อมชื่อโดเมนของคุณ และทดสอบแบบฟอร์มติดต่อ", duration: "1 ถึง 3 วัน" },
          ],
          pricing: {
            fromLabel: "เริ่มต้น",
            price: 500,
            unit: "สำหรับ Site Vitrine: หน้าแรก + อีกไม่เกิน 2 หน้า",
            includes: [
              "ดีไซน์เฉพาะตัว ตรงกับธุรกิจของคุณ",
              "แสดงผลเหมาะกับมือถือ แท็บเล็ต และคอมพิวเตอร์",
              "แบบฟอร์มติดต่อ",
              "แผนที่ Google Maps ในตัว",
              "พื้นฐาน SEO ท้องถิ่น: ชื่อหน้า แท็ก และการเชื่อมกับข้อมูลธุรกิจบน Google",
              "การเปิดใช้งานเว็บไซต์",
            ],
            notIncluded: [
              "ชื่อโดเมนและโฮสติ้ง คุณเป็นผู้จ่ายเอง",
              "การเขียนข้อความและรูปภาพ หากคุณไม่ได้เตรียมมา",
              "การดูแลรักษาเว็บไซต์ มีให้เป็นตัวเลือก",
            ],
            extras: [
              { label: "หน้าเพิ่มเติม", price: "ตามใบเสนอราคา" },
              { label: "การดูแลรักษาเว็บไซต์", price: "ตามใบเสนอราคา" },
              { label: "การเขียนข้อความ", price: "ตามใบเสนอราคา" },
              { label: "ร้านค้าออนไลน์ (โปรเจกต์ตามสั่ง)", price: "ตามใบเสนอราคา" },
            ],
            note: "ไม่ใช้ภาษีมูลค่าเพิ่ม (TVA) ตามมาตรา 293 B ของ CGI ระยะเวลาโดยทั่วไป 2 ถึง 4 สัปดาห์ ใบเสนอราคาไม่มีค่าใช้จ่ายภายใน 48 ชั่วโมง",
          },
          areas: ["Tours", "Saint-Avertin", "Joué-lès-Tours", "Saint-Cyr-sur-Loire", "La Riche", "Chambray-lès-Tours", "Indre-et-Loire"],
          proofProjects: [0, 1, 3, 4],
          internalLinks: [
            { label: "Site Vitrine ราคาเท่าไร: คู่มือราคา", href: "/guides/prix-site-vitrine", description: "ช่วงราคา และคำถามที่ควรถามก่อนรับใบเสนอราคา" },
            { label: "ทำให้เว็บไซต์ของคุณถูกพบบน Google ในตูร์", href: "/services/seo-referencement", description: "ก้าวต่อจากพื้นฐาน SEO ท้องถิ่น" },
            { label: "ปรับปรุงเว็บไซต์เดิม: การรีดีไซน์", href: "/services/rebranding-site-premium", description: "สำหรับเว็บไซต์ที่เก่าหรือไม่เหมือนคุณอีกต่อไป" },
            { label: "ประเมินโปรเจกต์ของคุณใน 2 นาที", href: "/simulateur", description: "ตอบไม่กี่คำถาม แล้วรับคำแนะนำบริการที่เหมาะ" },
            { label: "คู่มือ: ทำให้เว็บไซต์ถูกพบในตูร์", href: "/guides/seo-local", description: "ขั้นตอนง่ายๆ ของ SEO ท้องถิ่น" },
          ],
          faq: [
            { q: "การสร้างเว็บไซต์ในตูร์ราคาเท่าไร?", a: "เว็บไซต์ของ Sèvalys เริ่มต้น 500 € สำหรับหน้าแรกและอีกไม่เกิน 2 หน้า ไม่คิด TVA ตามมาตรา 293 B ของ CGI ราคาเพิ่มขึ้นตามจำนวนหน้า การเขียนข้อความ หรือรูปภาพที่ต้องจัดหา ผู้ให้บริการในตูร์ราคาอยู่ราว 700 ถึง 3,000 € (สำรวจเดือนพฤศจิกายน 2026) คู่มือราคาอธิบายความต่างนี้" },
            { q: "แพ็กเกจเริ่มต้น 500 € รวมอะไรบ้าง?", a: "หน้าแรกและอีกไม่เกิน 2 หน้า ดีไซน์เฉพาะตัว การแสดงผลบนมือถือ แบบฟอร์มติดต่อ แผนที่ Google Maps พื้นฐาน SEO ท้องถิ่น และการเปิดใช้งาน ไม่รวม: ชื่อโดเมน โฮสติ้ง การเขียนข้อความและรูปภาพหากคุณไม่ได้เตรียมมา และการดูแลรักษา" },
            { q: "สร้างเว็บไซต์ฟรีได้ไหม?", a: "ได้ ด้วยเครื่องมือสร้างเว็บออนไลน์ แต่ที่อยู่เว็บไม่ใช่ของคุณ ตัวเลือกมีจำกัด และไม่มีใครช่วยแนะนำ สำหรับงานเล็กๆ อาจพอ แต่หากต้องการให้ลูกค้าโทรมา เว็บไซต์มืออาชีพได้ผลกว่า" },
            { q: "ใครสร้างเว็บไซต์ให้ฉัน และอาชีพนี้เรียกว่าอะไร?", a: "เว็บดีไซเนอร์หรือนักพัฒนาเว็บ ที่ Sèvalys คุณทำงานกับ Anatholy Bricon ซึ่งดูแลโปรเจกต์ของคุณตั้งแต่การคุยครั้งแรกจนถึงเปิดใช้งาน" },
            { q: "เว็บไซต์ของฉันจะเห็นบน Google ในตูร์ไหม?", a: "เราเตรียมไว้ให้ ชื่อหน้าชัดเจน ตั้งชื่อหน้าดี เชื่อมกับข้อมูลธุรกิจบน Google แต่ไม่สัญญาอันดับใดๆ เพราะไม่มีใครควบคุมได้ หากต้องการต่อยอด มีบริการ SEO ดูได้ที่หน้า SEO" },
            { q: "ต้องมีข้อความและรูปภาพพร้อมแล้วหรือไม่?", a: "ไม่จำเป็น แต่จะเร็วกว่า หากมีแล้วส่งมาได้เลย หากไม่มี เราช่วยจัดโครงสร้างเนื้อหา การเขียนข้อความเป็นตัวเลือก ตามใบเสนอราคา" },
            { q: "ฉันทำงานในตูร์ ต้องมาพบคุณไหม?", a: "ไม่ต้อง เราคุยกันทางโทรศัพท์หรือวิดีโอคอล หากต้องการพบตัวต่อตัว ทำได้ในเขตตูร์และพื้นที่โดยรอบ" },
            { q: "ฉันเป็นเจ้าของร้านอาหารหรือช่าง เว็บไซต์จะต่างกันไหม?", a: "ต่าง ร้านอาหาร: เมนู เวลาเปิด การจอง ช่าง: ผลงาน พื้นที่ให้บริการ และช่องทางอธิบายงาน โครงสร้างเว็บไซต์ตามอาชีพของคุณ" },
          ],
          crossLink: null,
        },
        {
          name: "ปรับปรุงเว็บไซต์ใหม่ (Refonte)",
          tagline: "ทำเว็บไซต์ใหม่ รักษาสิ่งสำคัญไว้",
          h1Lead: "ปรับปรุงเว็บไซต์ใหม่ที่ตูร์ :",
          h1Benefit: "ทำเว็บไซต์ใหม่โดยไม่สูญเสียสิ่งที่ได้ผลอยู่แล้ว",
          sub: "เว็บไซต์มีอยู่แล้ว แต่ดูเก่า โหลดช้า หรือไม่มีใครติดต่อเข้ามา? Sèvalys ทำใหม่โดยรักษาสิ่งที่พาผู้เข้าชมมาให้คุณอยู่แล้ว",
          metaTitle: "ปรับปรุงเว็บไซต์ที่ตูร์ · รักษาสิ่งที่ได้ผล | Sèvalys",
          metaDescription: "ทำเว็บไซต์ใหม่ที่ตูร์โดยไม่ต้องเริ่มจากศูนย์ ตรวจสอบเว็บเดิม ดีไซน์ใหม่ รีไดเรกต์ 301 และติดตามบน Google ใบเสนอราคาฟรีภายใน 48 ชั่วโมง",
          directAnswer: "การปรับปรุงเว็บไซต์ใหม่ (refonte) คือการทำเว็บไซต์ที่มีอยู่แล้วขึ้นใหม่ ทั้งดีไซน์ โครงสร้างหน้า เนื้อหา และเทคนิค ที่ตูร์ Sèvalys เริ่มจากการตรวจสอบเว็บไซต์ปัจจุบัน รักษาหน้าที่พาผู้เข้าชมมา รีไดเรกต์ที่อยู่เดิม และตรวจใน Google Search Console หลังเปิดใช้งาน ใบเสนอราคาออกหลังการตรวจสอบ ฟรี ภายใน 48 ชั่วโมง",
          longIntro: [
            "การปรับปรุงเว็บไซต์ใหม่คือการทำเว็บไซต์ที่มีอยู่แล้วขึ้นใหม่ ดีไซน์เปลี่ยน หน้าต่างๆ ถูกจัดใหม่ เนื้อหาถูกทบทวน และเทคนิคถูกปรับให้ทันสมัย ส่วนโดเมนเนมยังเป็นของคุณเหมือนเดิม",
            "Anatholy Bricon ที่ตูร์ ทำเว็บไซต์ใหม่โดยรักษาสิ่งที่พาผู้เข้าชมมาอยู่แล้ว ค่าบริการกำหนดตามใบเสนอราคาหลังตรวจสอบเว็บไซต์ปัจจุบัน — ใบเสนอราคาฟรีภายใน 48 ชั่วโมง ไม่แน่ใจว่าจะเริ่มตรงไหน? แบบประเมินออนไลน์สองนาทีช่วยชี้ทางได้",
          ],
          problems: [
            { n: "A", title: "เว็บไซต์ช้า หรืออ่านไม่ออกบนมือถือ", desc: "ผู้เข้าชมส่วนใหญ่มาจากโทรศัพท์ ถ้าหน้าเว็บเปิดช้าหรือตัวอักษรเล็กเกินไป หลายคนจะจากไปก่อนอ่านสักบรรทัด" },
            { n: "B", title: "ไม่มีใครติดต่อผ่านเว็บไซต์", desc: "เว็บไซต์ออนไลน์อยู่ แต่แบบฟอร์มว่างเปล่าและโทรศัพท์ไม่ดัง เว็บแสดงธุรกิจของคุณโดยไม่เคยชวนให้ลงมือทำอะไร" },
            { n: "C", title: "เว็บไซต์ที่ไม่เหมือนคุณอีกแล้ว และคุณแก้ไขเองไม่ได้", desc: "ธุรกิจของคุณเปลี่ยนไป แต่เว็บไซต์ไม่ได้เปลี่ยน การเปลี่ยนเวลาเปิดหรือรูปภาพต้องขอความช่วยเหลือ และภาพรวมไม่ตรงกับภาพลักษณ์ปัจจุบันของคุณ" },
          ],
          features: [
            "ตรวจสอบเว็บไซต์ปัจจุบันของคุณ",
            "สำรวจหน้าที่พาผู้เข้าชมมา",
            "ดีไซน์ใหม่ที่อ่านง่ายบนมือถือ",
            "รักษาโดเมนเนมและอีเมลเดิมไว้",
            "รีไดเรกต์ 301 ทุกที่อยู่เดิม",
            "เปิดใช้งานและติดตามใน Google Search Console",
            "การฝึกอบรมการใช้งาน",
          ],
          enjeux: [
            "เว็บไซต์ที่ทำใหม่อย่างเป็นระบบจะรักษาสิ่งที่ได้ผลอยู่แล้ว ผู้เข้าชมที่พบคุณวันนี้จะพบหน้าเดิมในวันพรุ่งนี้ ในรูปแบบที่ดีขึ้น แทนที่จะเจอหน้าผิดพลาด",
            "ความเปลี่ยนแปลงเห็นได้จากเรื่องง่ายๆ เว็บเปิดเร็วบนโทรศัพท์ หน้าเว็บเลื่อนดูง่าย แบบฟอร์มหรือเบอร์โทรที่หาเจอโดยไม่ต้องค้นหา เราไม่สัญญาอันดับบน Google ความเสี่ยงที่จะสูญเสียถูกลดลงและติดตามผล",
          ],
          sections: [
            {
              h2: "ปรับปรุงใหม่ หรืออัปเดตธรรมดา: คุณต้องการอะไรจริงๆ",
              paragraphs: [
                "ไม่ใช่ทุกเว็บไซต์ที่ต้องทำใหม่ ถ้าพื้นฐานดี การอัปเดตก็พอ เช่น แก้ข้อความ เปลี่ยนรูป ปรับเวลาเปิด ทำได้เร็วกว่าและประหยัดกว่า",
                "การปรับปรุงใหม่มีประโยชน์เมื่อพื้นฐานเองเป็นปัญหา เว็บเก่าเกินไป ช้าเกินไป อ่านไม่ได้บนมือถือ หรือจำกัดจนทุกการแก้ไขแพงกว่าการเริ่มใหม่ เราจึงสร้างเว็บที่มีอยู่ขึ้นใหม่ พร้อมประวัติและหน้าต่างๆ ของมัน",
                "ระหว่างการตรวจสอบ เราบอกตรงๆ ว่าคุณอยู่ในกรณีไหน ถ้าอัปเดตธรรมดาแก้ปัญหาได้ เราก็จะบอก",
              ],
              list: [
                "อัปเดต: เว็บยังใช้ได้ แก้ไขบางจุด",
                "ปรับปรุงใหม่: เว็บมีอยู่แต่พื้นฐานไม่พอแล้ว ทำใหม่โดยรักษาสิ่งที่ได้ผล",
                "เว็บใหม่: ยังไม่มีอะไรออนไลน์ เริ่มจากหน้ากระดาษเปล่า",
              ],
              link: { label: "ยังไม่มีเว็บไซต์? ดูหน้าเว็บไซต์แนะนำธุรกิจ →", href: "/services/site-vitrine" },
            },
            {
              h2: "สิ่งที่เรารักษาไว้ สิ่งที่เราเปลี่ยน",
              paragraphs: [
                "การทำเว็บใหม่ไม่ได้แปลว่าทิ้งทุกอย่าง เราเริ่มจากสิ่งที่คุณมีและรักษาทุกอย่างที่ยังเป็นประโยชน์ คุณอนุมัติทุกการตัดสินใจก่อนเปิดใช้งาน",
              ],
              list: [
                "โดเมนเนมและอีเมลของคุณ: ยังเป็นของคุณ ผู้ติดต่อไม่ต้องเปลี่ยนอะไร",
                "ข้อความและรูปที่ยังใช้ได้: นำกลับมาใช้ จัดให้เรียบร้อย หรือแทนที่เมื่อไม่ถูกต้องแล้ว",
                "หน้าที่พาผู้เข้าชมมาอยู่แล้ว: ถูกระบุก่อนแตะต้องอะไร แล้วรักษาไว้หรือรีไดเรกต์",
                "สิ่งที่ถูกแทนที่: ดีไซน์ โครงสร้างหน้า ความเร็วในการเปิด และแบบฟอร์มติดต่อ",
              ],
            },
            {
              h2: "เราปกป้องตำแหน่งของคุณบน Google อย่างไร",
              paragraphs: [
                "นี่คือความกังวลแรก และเป็นความกังวลที่สมเหตุสมผล เว็บที่ทำใหม่โดยไม่ระวังอาจเสียผู้เข้าชม ที่อยู่เดิมหายไป เสิร์ชเอนจินหาหลักไม่เจอ และหน้าของคุณเริ่มจากศูนย์",
                "นี่คือสิ่งที่เราทำเพื่อลดความเสี่ยง อย่างแรก การตรวจสอบที่ระบุหน้าของเว็บปัจจุบันที่มีผู้เข้าชมอยู่แล้ว จากนั้นรักษาหน้าเหล่านั้นหรือเนื้อหาที่เป็นประโยชน์ ทุกที่อยู่เดิมถูกรีไดเรกต์ไปหน้าใหม่ด้วยรีไดเรกต์ 301 ซึ่งบอก Google ว่าหน้าเพียงย้ายที่ หลังเปิดใช้งาน เราตรวจใน Google Search Console ว่าหน้าถูกรับรู้และไม่มีข้อผิดพลาด",
                "ขอพูดให้ชัด ไม่มีอันดับใดการันตี ทั้งก่อนและหลังการปรับปรุง ความเสี่ยงที่จะสูญเสียถูกลดลงและติดตามผล แต่ไม่ได้หมดไป",
              ],
              link: { label: "ปกป้องและเพิ่มอันดับบนเสิร์ชเอนจินของคุณ →", href: "/services/seo-referencement" },
            },
            {
              h2: "การปรับปรุงเว็บไซต์ที่ตูร์ใช้งบเท่าไร?",
              paragraphs: [
                "ขึ้นอยู่กับสภาพเว็บไซต์ปัจจุบัน จำนวนหน้าที่ต้องย้ายมา และสิ่งที่คุณอยากเปลี่ยน ดังนั้นการปรับปรุงใหม่จึงประเมินตามใบเสนอราคา หลังตรวจสอบเว็บไซต์ปัจจุบัน ใบเสนอราคาฟรี ส่งภายใน 48 ชั่วโมง และไม่มีข้อผูกมัด",
                "เว็บไม่กี่หน้ากับเว็บสี่สิบหน้าทำใหม่ไม่เหมือนกัน ใบเสนอราคาระบุสิ่งที่รวม สิ่งที่เป็นตัวเลือก และสิ่งที่คุณรับผิดชอบเอง โดยไม่มีรายการแอบแฝง Sèvalys ได้รับการยกเว้น VAT: ไม่ใช้ VAT ตามมาตรา 293 B ของประมวลกฎหมายภาษีฝรั่งเศส",
                "หากอยากเห็นช่วงราคาตลาดก่อนติดต่อเรา คู่มือของเราอธิบายสิ่งที่ทำให้ต้นทุนเว็บไซต์แนะนำธุรกิจแตกต่างกัน",
              ],
              link: { label: "เริ่มแบบประเมิน 2 นาที →", href: "/simulateur" },
            },
            {
              h2: "แล้วถ้าคุณอยากเปลี่ยนภาพลักษณ์ด้วย?",
              paragraphs: [
                "บางครั้งเว็บที่ดูเก่ามาพร้อมภาพลักษณ์ที่ดูเก่า ในกรณีนั้นโลโก้ สี และฟอนต์ปรับไปพร้อมกับเว็บได้ เพื่อให้เว็บใหม่มีอัตลักษณ์ที่สอดคล้องตั้งแต่วันแรก",
                "ส่วนนี้เป็นตัวเลือก ตัดสินใจระหว่างการตรวจสอบและไม่บังคับ รายละเอียดแนวทางแบรนด์อยู่ที่หน้า Branding",
              ],
              link: { label: "ต้องการแค่อัตลักษณ์ใช่ไหม? ดูบริการ Branding →", href: "/services/branding" },
            },
            {
              h2: "ใครดูแลเว็บไซต์ของคุณ",
              paragraphs: [
                "มีคนเดียวที่ตอบคุณ: Anatholy Bricon ผู้ประกอบการรายเดียวที่ตูร์ เขาตรวจเว็บไซต์ปัจจุบัน ทำใหม่ และติดต่อได้หลังเปิดใช้งาน",
                "ไม่มีตัวกลางฝ่ายขายและคำขอไม่หลงหาย คุณคุยกับคนที่ทำงานจริง เขาให้บริการที่ตูร์และเมืองใกล้เคียง",
              ],
            },
          ],
          steps: [
            { title: "เราดูเว็บไซต์ปัจจุบันของคุณ", text: "ตรวจสอบ: อะไรพาผู้เข้าชมมา อะไรช้า อะไรเป็นอุปสรรคบนมือถือ อะไรเก็บไว้ได้ คุณได้รับใบเสนอราคาฟรีภายใน 48 ชั่วโมง", duration: "ใบเสนอราคาภายใน 48 ชั่วโมง" },
            { title: "เราตัดสินใจร่วมกันว่าจะเปลี่ยนอะไร", text: "เราทำรายการหน้าที่เก็บไว้ รวม หรือเอาออก และสิ่งที่นำมาใช้ตามเดิม ไม่มีอะไรเริ่มโดยไม่ได้รับความเห็นชอบ", duration: "พูดคุยหนึ่งครั้ง ตามความสะดวกของคุณ" },
            { title: "เราทำต้นแบบและคุณอนุมัติ", text: "คุณเห็นดีไซน์ใหม่ก่อนสร้างจริง และขอปรับแก้ตามต้องการ", duration: "ขึ้นอยู่กับความเห็นของคุณ" },
            { title: "เราสร้างและทดสอบ", text: "เราสร้างหน้า นำเนื้อหามาใส่ แล้วทดสอบการแสดงผลบนมือถือ ความเร็ว และแบบฟอร์มติดต่อ", duration: "ไม่กี่สัปดาห์ ตามขนาดของเว็บ" },
            { title: "เราเปิดใช้งานและเฝ้าติดตาม", text: "เปิดใช้งานพร้อมรีไดเรกต์ 301 แล้วตรวจใน Google Search Console การฝึกอบรมช่วยให้คุณแก้ไขข้อความเองได้", duration: "เปิดใช้งาน แล้วติดตามผล" },
          ],
          areas: ["Tours", "Saint-Avertin", "Joué-lès-Tours", "Saint-Cyr-sur-Loire", "La Riche", "Chambray-lès-Tours", "Indre-et-Loire"],
          proofProjects: [0, 1, 3, 4],
          internalLinks: [
            { label: "สร้างเว็บไซต์แนะนำธุรกิจถ้ายังไม่มีเว็บ", href: "/services/site-vitrine", description: "หน้าสำหรับเริ่มจากหน้ากระดาษเปล่า" },
            { label: "ปกป้องและเพิ่มอันดับบนเสิร์ชเอนจินของคุณ", href: "/services/seo-referencement", description: "การสนับสนุนที่ต่อยอดจากการปรับปรุงใหม่" },
            { label: "ปรับเฉพาะอัตลักษณ์ภาพของคุณ", href: "/services/branding", description: "โลโก้ สี และแนวทางแบรนด์ โดยไม่แตะต้องเว็บ" },
            { label: "ดูแลเว็บไซต์ให้ทันสมัยหลังเปิดใช้งาน", href: "/services/maintenance", description: "การติดตามผลหลังเว็บใหม่เผยแพร่" },
            { label: "เว็บไซต์แนะนำธุรกิจใช้งบเท่าไร: ช่วงและเกณฑ์", href: "/guides/prix-site-vitrine", description: "สิ่งที่ทำให้ใบเสนอราคาแตกต่างกัน" },
            { label: "เริ่มแบบประเมิน 2 นาที", href: "/simulateur", description: "แบบสอบถามสั้นๆ เพื่อดูว่าจะเริ่มตรงไหน" },
          ],
          caseQuote: null,
          signals: [
            { t: "ตรวจสอบก่อน", d: "เราดูเว็บไซต์ปัจจุบันของคุณก่อนเสนออะไร: อะไรให้ผล อะไรเป็นอุปสรรค อะไรเก็บไว้ได้" },
            { t: "ผู้ติดต่อคนเดียว", d: "Anatholy Bricon ที่ตูร์ ตอบคุณตั้งแต่การพูดคุยครั้งแรกจนถึงเปิดใช้งาน โดยไม่มีตัวกลาง" },
            { t: "ไม่มีข้อผูกมัด", d: "ใบเสนอราคาฟรี ภายใน 48 ชั่วโมง ไม่มีอะไรเริ่มก่อนที่คุณจะเห็นชอบอย่างชัดเจน" },
          ],
          faq: [
            { q: "ทำไมต้องปรับปรุงเว็บไซต์ใหม่?", a: "มีสี่เหตุผลที่พบบ่อย เว็บช้าหรืออ่านไม่ออกบนมือถือ ไม่มีใครติดต่อเข้ามา ไม่เหมือนธุรกิจของคุณอีกแล้ว หรือคุณแก้ไขเองไม่ได้ ถ้าไม่เข้าข่ายข้อใดเลย การอัปเดตธรรมดาก็พอ และเราจะบอกหลังการตรวจสอบ" },
            { q: "การปรับปรุงเว็บไซต์ที่ตูร์ใช้งบเท่าไร?", a: "ประเมินตามใบเสนอราคาหลังตรวจสอบเว็บไซต์ปัจจุบัน จำนวนเงินขึ้นอยู่กับจำนวนหน้าที่ต้องย้ายและสิ่งที่คุณอยากเปลี่ยน ใบเสนอราคาฟรี ส่งภายใน 48 ชั่วโมง และไม่มีข้อผูกมัด ไม่ใช้ VAT ตามมาตรา 293 B ของประมวลกฎหมายภาษีฝรั่งเศส" },
            { q: "ฉันจะเสียอันดับบน Google ไหม?", a: "ความเสี่ยงมีอยู่ถ้าที่อยู่เดิมไม่ถูกรีไดเรกต์ เราระบุหน้าที่มีผู้เข้าชมอยู่แล้ว รักษาไว้หรือรีไดเรกต์ทีละหน้าด้วยรีไดเรกต์ 301 แล้วตรวจใน Google Search Console หลังเปิดใช้งาน ไม่มีอันดับใดการันตี" },
            { q: "จะอัปเดตเว็บไซต์ได้อย่างไร?", a: "เว็บอัปเดตทีละเล็กทีละน้อยได้ตราบที่พื้นฐานดี เช่น ข้อความ รูป เวลาเปิด เมื่อพื้นฐานเก่าไป ช้าไป หรือจำกัดเกินไป การปรับปรุงใหม่สมเหตุสมผลกว่าการปะแก้ไปเรื่อยๆ" },
            { q: "การปรับปรุงเว็บไซต์ใช้เวลานานแค่ไหน?", a: "สำหรับเว็บเล็ก คาดว่าไม่กี่สัปดาห์ เวลาส่วนใหญ่ขึ้นอยู่กับความเร็วที่คุณอนุมัติต้นแบบและส่งเนื้อหา ตารางเวลาที่แน่ชัดอยู่ในใบเสนอราคา หลังตรวจสอบเว็บของคุณแล้ว" },
            { q: "ฉันจะยังคงโดเมนเนมและข้อความไว้ได้ไหม?", a: "ได้ โดเมนเนมยังเป็นของคุณ เช่นเดียวกับอีเมล ข้อความและรูปที่ยังมีประโยชน์จะถูกนำมาใช้ซ้ำ ปรับ หรือแทนที่ตามสิ่งที่เหมาะกับเว็บใหม่" },
            { q: "หลังจากนั้นฉันแก้ไขเว็บเองได้ไหม?", a: "ได้ สำหรับข้อความและรูปทั่วไป มีการฝึกอบรมการใช้งานเมื่อส่งมอบ ส่วนเรื่องอื่นเรายังพร้อมช่วย และการติดตามระยะยาวใช้บริการ maintenance ของเราได้" },
            { q: "ฉันยังไม่มีเว็บไซต์ หน้านี้ใช่ไหม?", a: "ไม่ใช่ การปรับปรุงใหม่ใช้กับเว็บไซต์ที่มีอยู่แล้ว ถ้าคุณเริ่มจากศูนย์ หน้าเว็บไซต์แนะนำธุรกิจ (Site Vitrine) เหมาะกับคุณมากกว่า" },
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
          crossLink: { label: "ต้องการปรับปรุงเว็บไซต์ใหม่ด้วยใช่ไหม? ดูบริการปรับปรุงเว็บไซต์ →", slug: "rebranding-site-premium" },
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
        {
          name: "SEO และการค้นหา",
          tagline: "ให้คนพบคุณบน GOOGLE",
          h1Lead: "เอเจนซี่ SEO ที่ตูร์ ·",
          h1Benefit: "ให้ลูกค้าพบคุณบน Google",
          sub: "ลูกค้าในตูร์ค้นหาธุรกิจแบบของคุณบน Google เราปรับเว็บไซต์และโปรไฟล์ของคุณให้พวกเขาพบคุณ",
          metaTitle: "เอเจนซี่ SEO ที่ตูร์ เริ่มที่ 300 € ต่อเดือน",
          metaDescription: "เอเจนซี่ SEO ที่ตูร์สำหรับช่างฝีมือ ร้านค้า และร้านอาหาร ปรับ 2 หน้า ลิงก์ 1 เส้นต่อเดือน Search Console ในชื่อคุณ เริ่มที่ 300 € ต่อเดือน",
          directAnswer: "เอเจนซี่ SEO ที่ตูร์ดูแลการค้นหาแบบธรรมชาติของคุณ เพื่อให้ลูกค้าที่ค้นหาธุรกิจแบบของคุณพบคุณ ที่ Sèvalys เริ่มที่ 300 € ต่อเดือน โดยไม่สัญญาเรื่องอันดับ เพราะไม่มีใครควบคุมอัลกอริทึมของ Google ได้",
          longIntro: [
            "Sèvalys คือเอเจนซี่ SEO ที่ตูร์สำหรับช่างฝีมือ ร้านค้า และร้านอาหาร เราปรับสองหน้าที่สำคัญที่สุดของคุณ โปรไฟล์ Google และหาลิงก์คุณภาพให้ทุกเดือน",
            "คุณคุมได้เอง เพราะ Search Console สร้างในชื่อของคุณ ผลลัพธ์ใช้เวลาหลายเดือน และเราอธิบายตรงๆ ด้านล่าง",
          ],
          problems: [
            { n: "A", title: "เว็บไซต์ของคุณไม่ปรากฏ", desc: "ลูกค้าพิมพ์ \"ช่างประปา Tours\" หรือ \"ร้านอาหาร Tours\" อันดับต้นๆ ตกเป็นของคู่แข่งที่จัดโครงสร้างได้ดีกว่า" },
            { n: "B", title: "โปรไฟล์ Google ของคุณไม่สมบูรณ์", desc: "หมวดหมู่ไม่เหมาะ เวลาทำการไม่ชัด รูปเก่า โปรไฟล์มีอยู่แต่ไม่สร้างความมั่นใจ" },
            { n: "C", title: "คุณไม่รู้ว่าอะไรได้ผล", desc: "หากไม่มี Search Console จะไม่รู้ว่าเว็บไซต์ดีขึ้นหรือไม่ และปรากฏบนคำค้นหาใด" },
          ],
          features: [
            "ตรวจสอบเริ่มต้นของเว็บไซต์และโปรไฟล์ Google",
            "เลือกคำค้นหาท้องถิ่นที่จะเจาะ",
            "ปรับหัวข้อ เนื้อหา และแท็กของ 2 หน้า",
            "อัปเดตโปรไฟล์ Google Business Profile",
            "ตรวจความเร็ว มือถือ และการจัดทำดัชนี",
            "ติดตามผลด้วย Search Console ในชื่อคุณ",
            "รายงานรายเดือนว่าอะไรเปลี่ยนไป",
          ],
          enjeux: [
            "หน้าเว็บที่สร้างมาดียังคงถูกค้นพบโดยไม่ต้องจ่ายทุกคลิก ส่วนโฆษณาหยุดทันทีเมื่องบหมด",
            "คนส่วนใหญ่คลิกผลลัพธ์อันดับต้นๆ และโปรไฟล์ Google สำคัญพอๆ กับเว็บไซต์ ทั้งสองอย่างต้องทำไปด้วยกัน",
          ],
          sections: [
            {
              h2: "สิ่งที่เราทำเพื่อการค้นหาแบบธรรมชาติของคุณ",
              paragraphs: ["สี่งานหลัก อธิบายแบบไม่ใช้ศัพท์เทคนิค"],
              list: [
                "2 หน้าหลักของคุณ: หัวข้อ เนื้อหา และโครงสร้างที่เขียนให้ตรงกับคำค้นของลูกค้า",
                "โปรไฟล์ Google Business Profile: หมวดหมู่ เวลาทำการ รูปภาพ และการตอบรีวิว",
                "ด้านเทคนิคแบบเข้าใจง่าย: เว็บเร็ว อ่านง่ายบนมือถือ และ Google อ่านได้ดี",
                "ลิงก์คุณภาพ 1 เส้นต่อเดือน: เว็บไซต์น่าเชื่อถืออื่นพูดถึงคุณ และ Google สังเกตเห็น",
              ],
            },
            {
              h2: "SEO ท้องถิ่น: ให้คนใกล้คุณพบคุณ",
              paragraphs: [
                "SEO ท้องถิ่นคือการปรากฏเมื่อมีคนค้นหา \"อาชีพ + เมือง\" เราเจาะการค้นหาเหล่านี้รอบตูร์ ไม่ใช่อันดับระดับประเทศ",
                "หากอยากเข้าใจหลักการก่อนเริ่ม อ่านคู่มือของเรา",
              ],
              link: { label: "ทำความเข้าใจ SEO ท้องถิ่นที่ตูร์", href: "/guides/seo-local" },
            },
            {
              h2: "เหมาะกับใคร: ร้านอาหาร ช่างฝีมือ ร้านค้า",
              paragraphs: [
                "ร้านอาหารต้องมีโปรไฟล์ Google ที่ดูแลดี เมนูอ่านง่าย และลิงก์จอง ช่างฝีมือต้องมีหน้าชัดเจนแยกตามงานและพื้นที่ พร้อมรูปงานจริง ร้านค้าต้องมีเวลาทำการที่ถูกต้องและหน้าสินค้าเด่น",
                "ไม่เหมาะกับร้านค้าออนไลน์ 500 รายการ หรือตลาดระดับประเทศที่แข่งขันสูงมาก",
              ],
            },
            {
              h2: "เราวัดผลอย่างไร",
              paragraphs: [
                "Search Console สร้างในชื่อของคุณ คุณเห็นจำนวนการแสดงผล คลิก และตำแหน่งเฉลี่ยบนคำค้นของคุณเอง เรายังเพิ่มสายโทรเข้าจากโปรไฟล์ Google หากคุณเลิกใช้บริการ คุณยังคงมีสิทธิ์เข้าถึงทั้งหมด",
                "ทุกเดือนมีรายงานสั้นๆ: อะไรเปลี่ยนไป ทำอะไรไปแล้ว และขั้นต่อไปคืออะไร",
              ],
            },
            {
              h2: "สิ่งที่เราไม่สัญญา",
              paragraphs: [
                "ไม่มีการรับประกันอันดับ และควรระวังผู้ที่สัญญา สัญญาณแรกมักปรากฏหลัง 3 ถึง 6 เดือน บางครั้งนานกว่านั้น ขึ้นอยู่กับคู่แข่งในพื้นที่ ช่างประปาที่ตูร์ไม่ได้อยู่ในสถานการณ์เดียวกับร้านดอกไม้ในหมู่บ้าน",
                "สิ่งที่เรารับประกัน: งานที่อธิบายไว้ที่นี่ และการติดตามผลที่คุณตรวจสอบได้เอง",
              ],
            },
            {
              h2: "SEO หรือ Google Ads: เริ่มจากอะไรดี?",
              paragraphs: ["โฆษณาพาลูกค้ามาเร็วแต่หยุดเมื่องบหมด การค้นหาแบบธรรมชาติช้ากว่าแต่อยู่ได้นาน หากมีเว็บไซต์แล้วให้เริ่มที่ SEO หากด่วนให้ลงโฆษณาไปก่อน"],
              list: [
                "SEO: ช้ากว่า อยู่ได้นาน ไม่มีค่าใช้จ่ายต่อคลิก",
                "Google Ads: เร็ว หยุดเมื่องบหมด ทุกคลิกต้องจ่าย",
              ],
              link: { label: "ลงโฆษณา Google ไปก่อน", href: "/services/google-ads" },
            },
            {
              h2: "ผูกมัดขั้นต่ำ 3 เดือน",
              paragraphs: ["สามเดือนคือเวลาที่พอเห็นสัญญาณแรก หลังจากนั้นข้อเสนอต่ออายุทุกเดือน และคุณหยุดได้โดยแจ้งล่วงหน้าหนึ่งเดือน หน้าเว็บและสิทธิ์เข้าถึงยังเป็นของคุณ"],
            },
          ],
          pricing: {
            fromLabel: "เริ่มที่",
            price: 300,
            unit: "ต่อเดือน สำหรับ 2 หน้าที่ติดตามผล",
            includes: [
              "ตรวจสอบเริ่มต้นของเว็บไซต์และโปรไฟล์ Google",
              "ปรับ 2 หน้า (หัวข้อ เนื้อหา แท็ก)",
              "อัปเดตโปรไฟล์ Google Business Profile",
              "ลิงก์คุณภาพ 1 เส้นต่อเดือน",
              "ติดตามผลด้วย Search Console ในชื่อคุณ",
              "รายงานรายเดือน",
            ],
            notIncluded: [
              "การปรับโฉมเว็บไซต์",
              "โฆษณา Google Ads",
              "การเขียนบทความบล็อก",
            ],
            extras: [
              { label: "หน้าที่ติดตามเพิ่ม (3 หน้า = 400 € ต่อเดือน)", price: "+ 100 € ต่อเดือน" },
            ],
            note: "ไม่ต้องเสียภาษีมูลค่าเพิ่ม ตามมาตรา 293 B ของประมวลกฎหมายภาษีฝรั่งเศส (CGI) (TVA non applicable, art. 293 B du CGI)",
          },
          areas: ["Tours", "Saint-Avertin", "Joué-lès-Tours", "Saint-Cyr-sur-Loire", "La Riche", "Chambray-lès-Tours", "Indre-et-Loire"],
          proofProjects: [0, 1, 3, 4],
          internalLinks: [
            { label: "ทำความเข้าใจ SEO ท้องถิ่นที่ตูร์", href: "/guides/seo-local", description: "หลักการ อธิบายแบบเข้าใจง่าย" },
            { label: "สร้างเว็บไซต์ของคุณที่ตูร์", href: "/services/site-vitrine", description: "ยังไม่มีเว็บไซต์? เริ่มจากตรงนี้" },
            { label: "ลงโฆษณา Google ไปก่อน", href: "/services/google-ads", description: "ได้ลูกค้าเร็ว ระหว่างที่ SEO ค่อยๆ ติด" },
            { label: "ทำแบบประเมินการมองเห็นของคุณ", href: "/simulateur", description: "ไม่กี่คำถามเพื่อรู้ว่าควรเริ่มจากจุดไหน" },
          ],
          caseQuote: null,
          signals: [
            { t: "ไม่สัญญาเรื่องอันดับ", d: "เราอธิบายงานที่ทำและสิ่งที่วัดได้ ตำแหน่งบน Google อยู่นอกเหนือการควบคุมของเรา" },
            { t: "บัญชีอยู่ในชื่อของคุณ", d: "Search Console และโปรไฟล์ Google ผูกกับบัญชีของคุณ แม้คุณจะเลิกใช้บริการ" },
            { t: "ขั้นต่ำ 3 เดือน จากนั้นรายเดือน", d: "เวลาที่พอเห็นสัญญาณแรก หลังจากนั้นคุณหยุดได้โดยแจ้งล่วงหน้าหนึ่งเดือน" },
          ],
          faq: [
            { q: "เอเจนซี่ SEO ที่ตูร์ราคาเท่าไร?", a: "ที่ Sèvalys เริ่มที่ 300 € ต่อเดือน สำหรับ 2 หน้าที่ติดตามผล หน้าเพิ่มหน้าละ 100 € ต่อเดือน 3 หน้าเท่ากับ 400 € รวมลิงก์คุณภาพ 1 เส้นต่อเดือน ผูกมัดขั้นต่ำ 3 เดือน ไม่ต้องเสียภาษีมูลค่าเพิ่ม ตามมาตรา 293 B ของ CGI" },
            { q: "ใช้เวลานานแค่ไหนกว่าจะเห็นผล?", a: "สัญญาณแรกมักวัดได้หลัง 3 ถึง 6 เดือน ขึ้นอยู่กับการแข่งขันและสภาพเว็บไซต์ ไม่มีการรับประกันอันดับ ข้อผูกมัด 3 เดือนจึงเป็นเวลาพอที่จะดูว่ามีความเคลื่อนไหวหรือไม่" },
            { q: "รับประกันอันดับหนึ่งบน Google ได้ไหม?", a: "ไม่ได้ และควรระวังผู้ที่รับประกัน ผลลัพธ์ขึ้นอยู่กับอัลกอริทึมที่ไม่มีใครควบคุมได้ เรารับประกันงานที่ทำและการติดตามผลที่คุณตรวจสอบได้เอง" },
            { q: "ฉันจะรู้ได้อย่างไรว่าได้ผล?", a: "Search Console สร้างในชื่อของคุณ คุณเห็นคลิก การแสดงผล และตำแหน่งเฉลี่ย และได้รับรายงานทุกเดือน หากเลิกใช้บริการ คุณยังเข้าถึงได้" },
            { q: "SEO หรือ Google Ads: เลือกอะไรดี?", a: "โฆษณาพาลูกค้ามาเร็วแต่หยุดเมื่องบหมด SEO ค่อยๆ สะสมในระยะยาว มักเริ่มที่ SEO หากมีเว็บไซต์แล้ว และเริ่มที่ Google Ads หากเร่งด่วน" },
            { q: "คุณทำอะไรกับโปรไฟล์ Google Business Profile ของฉัน?", a: "เราตรวจสอบข้อมูล หมวดหมู่ เวลาทำการ และรูปภาพ จากนั้นอัปเดตทุกเดือนและติดตามรีวิว โปรไฟล์ยังอยู่ในชื่อของคุณและคุณมีสิทธิ์เข้าถึงเสมอ" },
            { q: "ต้องมีเว็บไซต์อยู่แล้วหรือไม่?", a: "ใช่ หรือสร้างขึ้นมา อย่างน้อยต้องมีหนึ่งหน้าที่พูดถึงธุรกิจของคุณ หากไม่มี เราเริ่มจากเว็บไซต์แนะนำธุรกิจก่อน แล้วจึงทำเรื่องการค้นหา" },
            { q: "มีข้อผูกมัดหรือไม่?", a: "ขั้นต่ำ 3 เดือน จากนั้นต่ออายุรายเดือน คุณหยุดได้โดยแจ้งล่วงหน้าหนึ่งเดือน หน้าเว็บและสิทธิ์เข้าถึงยังเป็นของคุณ" },
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
        "คุณตอบคำถามสี่หรือห้าข้อ — สาขาธุรกิจของคุณ สถานะการมีตัวตนออนไลน์ สิ่งที่ทำให้คุณติดขัดอยู่ตอนนี้ และเป้าหมายสำคัญที่สุดในสามเดือนข้างหน้า แต่ละคำตอบจะให้น้ำหนักกับบริการทั้งสิบของ Sèvalys และมีเพียง 2 ถึง 4 บริการที่ได้คะแนนสูงสุดเท่านั้นที่จะถูกเสนอให้คุณ",
        "ตอบตามความเป็นจริง โดยเฉพาะเมื่อคำตอบไม่ค่อยน่าพอใจ คำตอบที่มองโลกในแง่ดีเกินไปจะทำให้คำแนะนำไม่มีประโยชน์ สุดท้าย คุณฝากข้อมูลติดต่อไว้ และผลลัพธ์จะแสดงทันที",
      ],
    },
    start: "เริ่มวิเคราะห์ของฉัน →",
    progressLabel: "คำถาม {current} จาก {total}",
    next: "ถัดไป →",
    nextFinal: "ดูคำแนะนำของฉัน →",
    back: "← ก่อนหน้า",
    rangePlaceholder: "ลากเพื่อเลือก",
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
      'budget': {
        text: "คุณมีงบประมาณเท่าไหร่สำหรับโปรเจกต์นี้?",
        hint: "ประมาณคร่าวๆ ก็เพียงพอ ช่วยให้เราเสนอแนะได้อย่างเหมาะสม",
        options: {
          'budget-0-500': "งบจำกัด กำลังสำรวจตัวเลือกอยู่",
          'budget-500-1500': "งบปานกลาง พร้อมลงทุนตามความเหมาะสม",
          'budget-1500-3000': "งบสบายๆ ต้องการผลลัพธ์ที่จับต้องได้จริง",
          'budget-3000-plus': "งบสูง ไม่มีเพดานตายตัว",
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
      telephoneHint: "จำเป็นต้องระบุ เพื่อให้เราโทรกลับหาคุณได้",
      requiredNote: "ทุกช่องจำเป็นต้องกรอก",
      errorSummary: "โปรดแก้ไขช่องที่ระบุเพื่อดำเนินการต่อ",
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
        a: "เพราะคำแนะนำที่รวมทั้งสิบบริการไม่ใช่คำแนะนำที่แท้จริง แต่ละคำตอบจะให้น้ำหนักกับบริการต่างๆ และมีเพียง 2 ถึง 4 บริการที่ได้คะแนนสูงสุดเท่านั้นที่จะถูกเสนอให้คุณ ส่วนที่เหลือรอได้",
      },
      {
        q: "คำตอบของฉันจะเป็นอย่างไรต่อไป?",
        a: "คำตอบของคุณจะถูกบันทึกไว้พร้อมข้อมูลติดต่อเพื่อเตรียมการสนทนาของเรา เก็บไว้สูงสุด 12 เดือนหากคุณไม่ได้เป็นลูกค้า จากนั้นจะถูกลบโดยอัตโนมัติ คุณสามารถขอให้ลบข้อมูลได้ทุกเมื่อที่ contact@sevalys.com",
      },
    ],
  },
  landing: {
    hero: {
      pill: "เอเจนซี่เว็บ · ตูร์ ฝรั่งเศส",
      title_l1: "เอเจนซี่เว็บ",
      title_l2: "ที่ ",
      title_l2_it: "ตูร์",
      sub: "เครื่องมือที่ทำงานเพื่อลูกค้าของคุณ เว็บไซต์ SEO ท้องถิ่น และ AI agents สำหรับร้านค้า ร้านอาหาร ช่างฝีมือ และ SME ในเมืองตูร์",
      cta_primary: "เริ่มวินิจฉัย",
      cta_secondary: "คุยเรื่องโปรเจกต์",
    },
    manifeste: {
      num: "01 / 08",
      title_l1: "เอเจนซี่เว็บที่ตูร์",
      title_l2_it: "สำหรับร้านค้าและ SME",
      intro: "Sèvalys สร้างเว็บไซต์ ดูแล SEO ท้องถิ่น และติดตั้ง AI agents ให้ร้านค้า ร้านอาหาร ช่างฝีมือ และ SME ในเมืองตูร์และแคว้นอ็องดร์-เอ-ลัวร์ คุณคุยกับ Anatholy Bricon ผู้ก่อตั้งโดยตรง",
      quote: "« เว็บสวยก็ดี เว็บที่สร้างรายได้ดีกว่า »",
      items: [
        { t: "มองไม่เห็นบน Google", d: "ลูกค้าค้นหาธุรกิจของคุณแล้วเจอคู่แข่งก่อน" },
        { t: "สายที่พลาดไป", d: "สายที่ไม่มีคนรับช่วงเร่งด่วน คือออเดอร์ที่หลุดไปที่อื่น" },
        { t: "ภาพลักษณ์ล้าสมัย", d: "เว็บไซต์หรือโลโก้ยุคเก่าทำให้ลูกค้าใหม่ลังเล" },
        { t: "โซเชียลถูกทิ้งไว้", d: "ไม่มีเวลาดูแลโซเชียล ผู้ติดตามจึงไปอยู่กับคู่แข่ง" },
      ],
      cta: "ทำแบบวินิจฉัยฟรี",
    },
    servicesPreview: {
      num: "02 / 08",
      title_l1: "บริการของเราที่ตูร์:",
      title_l2_it: "เว็บไซต์ SEO โฆษณา AI",
      intro: "ข้อเสนอที่ขอบเขตชัดเจน แสดงราคาไว้ แต่ละบริการมีหน้ารายละเอียดของตัวเอง",
      cards: [
        { t: "เว็บไซต์มืออาชีพ เริ่มต้น 500 €", d: "หน้าแรกและอีกไม่เกิน 2 หน้า ราคาเหมาจ่าย ใบเสนอราคาใน 48 ชม. ไม่มีข้อผูกมัด", link: "เว็บไซต์มืออาชีพที่ตูร์" },
        { t: "SEO ท้องถิ่น เริ่มต้น 300 €/เดือน", d: "ติดตาม 2 หน้า รวมลิงก์ 1 รายการต่อเดือน ขั้นต่ำ 3 เดือน หน้าเพิ่ม +100 €/เดือน ไม่รับประกันอันดับ", link: "SEO ท้องถิ่น" },
        { t: "ปรับโฉมเว็บไซต์และภาพลักษณ์ใหม่", d: "อัตลักษณ์ภาพและเว็บไซต์ที่ทำใหม่ทั้งหมดเพื่อภาพลักษณ์ที่ทันสมัย", link: "ปรับโฉมเว็บไซต์" },
        { t: "โฆษณา Google Ads", d: "โฆษณาที่แสดงเมื่อลูกค้าค้นหาคุณ ด้วยงบที่คุณควบคุมได้", link: "แคมเปญ Google Ads" },
        { t: "AI voice agent ไม่พลาดทุกสาย", d: "เอเจนต์ที่รับสาย จองนัด และแจ้งคุณ", link: "AI voice agent" },
      ],
      others: "และ:",
      guide_price: "เว็บไซต์ราคาเท่าไร?",
      guide_seo: "อธิบาย SEO ท้องถิ่นที่ตูร์",
      vat: "ราคาเป็นยูโร ไม่มี VAT ตามมาตรา 293 B ของประมวลกฎหมายภาษีฝรั่งเศส (CGI)",
      all: "ดูบริการทั้งหมด",
    },
    method: {
      num: "04 / 08",
      title_l1: "วิธีการ",
      title_l2_it: "ทำงานของเรา",
      intro: "สี่ขั้นตอน ตั้งแต่พูดคุยครั้งแรกจนถึงการดูแลต่อ",
      steps: [
        { n: '01', t: "วินิจฉัย", d: "คำถามไม่กี่ข้อเกี่ยวกับธุรกิจและสิ่งที่เป็นอุปสรรค" },
        { n: '02', t: "ข้อเสนอ", d: "คำแนะนำที่ชัดเจนและใบเสนอราคาใน 48 ชม." },
        { n: '03', t: "ดำเนินการ", d: "ทำโปรเจกต์พร้อมรายงานความคืบหน้าสม่ำเสมอ" },
        { n: '04', t: "ดูแลต่อ", d: "เราพร้อมช่วยหลังเปิดใช้งาน" },
      ],
    },
    zone: {
      num: "05 / 08",
      title_l1: "เราให้บริการที่ไหน?",
      title_l2_it: "ตูร์และอ็องดร์-เอ-ลัวร์",
      text: "Sèvalys ตั้งอยู่ที่ตูร์ เราทำงานกับร้านค้า ร้านอาหาร ช่างฝีมือ และบริษัทในตูร์และอ็องดร์-เอ-ลัวร์ ทั้งนัดพบหน้าและออนไลน์ การวินิจฉัยและการดูแลต่อทำทางไกลได้ทั่วฝรั่งเศส",
      label: "เมือง:",
      towns: ["Tours", "Saint-Avertin", "Joué-lès-Tours", "Saint-Cyr-sur-Loire", "La Riche", "Chambray-lès-Tours"],
    },
    why: {
      num: "06 / 08",
      title_l1: "ทำไมต้องเลือกเอเจนซี่เว็บ",
      title_l2_it: "ขนาดพอดีตัว?",
      items: [
        { t: "คุยกับคนเดียว", d: "คุณคุยกับ Anatholy Bricon ผู้ประกอบการรายเดียวและผู้ก่อตั้ง Sèvalys โดยตรง" },
        { t: "ราคาชัดเจน", d: "เว็บไซต์เริ่มต้น 500 € SEO เริ่มต้น 300 €/เดือน คุณรู้ล่วงหน้า" },
        { t: "คุณเป็นเจ้าของทุกอย่าง", d: "โค้ดและชื่อโดเมนเป็นของคุณตั้งแต่วันแรก" },
      ],
    },
    faq: {
      num: "07 / 08",
      title_l1: "คำถาม",
      title_l2_it: "ที่พบบ่อย",
      items: [
        { q: "เอเจนซี่เว็บที่ตูร์อย่าง Sèvalys ทำอะไร?", a: "Sèvalys เอเจนซี่เว็บและดิจิทัลในตูร์ สร้างเว็บไซต์ ดูแล SEO ท้องถิ่น ทำแคมเปญ Google Ads และติดตั้ง AI voice agent ให้ร้านค้าและ SME ในตูร์ คุณคุยกับ Anatholy Bricon โดยตรง ตั้งแต่ครั้งแรกจนเว็บไซต์เปิดใช้งาน" },
        { q: "เอเจนซี่เว็บกับเอเจนซี่ดิจิทัลต่างกันอย่างไร?", a: "เอเจนซี่เว็บทำเว็บไซต์ เอเจนซี่ดิจิทัลดูแลให้คุณถูกค้นเจอบน Google (SEO โฆษณา) และเครื่องมือประจำวัน (AI agent ระบบอัตโนมัติ) ด้วย" },
        { q: "เว็บไซต์ราคาเท่าไร?", a: "เริ่มต้น 500 € หน้าแรกและอีกไม่เกิน 2 หน้า ราคาเหมาจ่ายขอบเขตชัดเจน ใบเสนอราคาใน 48 ชม. ไม่มีข้อผูกมัด ไม่มี VAT ตามมาตรา 293 B ของ CGI" },
        { q: "SEO ราคาเท่าไร?", a: "เริ่มต้น 300 €/เดือน สำหรับ 2 หน้า หน้าเพิ่ม +100 €/เดือน รวมลิงก์ 1 รายการต่อเดือน ขั้นต่ำ 3 เดือน ไม่รับประกันอันดับ เราวัดผลและรายงาน" },
        { q: "ให้บริการเฉพาะที่ตูร์ใช่ไหม?", a: "Sèvalys ตั้งอยู่ที่ตูร์ ให้บริการทั่วอ็องดร์-เอ-ลัวร์ ทั้งนัดพบหน้าและวิดีโอคอล และทางไกลได้ทั่วฝรั่งเศส" },
        { q: "เว็บไซต์ใช้เวลานานเท่าไรกว่าจะออนไลน์?", a: "โดยทั่วไปไม่กี่สัปดาห์ ขึ้นอยู่กับเวลาที่ใช้เตรียมข้อความและรูปภาพ" },
        { q: "ฉันยังเป็นเจ้าของเว็บไซต์และชื่อโดเมนใช่ไหม?", a: "ใช่ โค้ดและชื่อโดเมนเป็นของคุณตั้งแต่วันแรก" },
        { q: "ฉันจะทำงานกับใคร?", a: "กับ Anatholy Bricon ผู้ประกอบการรายเดียวและผู้ก่อตั้ง Sèvalys คุณคุยกับเขาโดยตรง ตั้งแต่ใบเสนอราคาจนถึงการดูแลต่อ" },
      ],
    },
    work: {
      num: "03 / 08",
      title_l1: "ห้าเว็บไซต์ที่ส่งมอบ",
      title_l2_it: "ห้าธุรกิจ",
      intro: "เว็บไซต์จริงที่เปิดใช้งานอยู่ คุณเข้าไปดูได้",
      items: [
        { name: 'Grand Ouest Habitat', desc: 'เว็บไซต์ปรับปรุงอาคารทั่วไป — ส่งคำขอโครงการออนไลน์ ตรวจหน้างาน แล้วรับใบเสนอราคาภายใน 48 ชั่วโมง', tags: ['เว็บ', 'ใบเสนอราคา'], year: '2026' },
        { name: 'Sellerie Duchet', desc: 'ร้านค้าออนไลน์อุปกรณ์ขี่ม้า — แค็ตตาล็อกตามหมวด จัดส่ง และผ่อนชำระได้', tags: ['ร้านค้า', 'อีคอมเมิร์ซ'], year: '2026' },
        { name: 'NEF Nettoyage', desc: 'เว็บไซต์บริษัททำความสะอาดอาคารสถานที่ในเมืองตูร์และพื้นที่ใกล้เคียง — บริการสำหรับธุรกิจและบุคคลทั่วไป ทีมงาน ผลงานที่ผ่านมา ภาพก่อน/หลัง และแบบฟอร์มขอใบเสนอราคาฟรี', tags: ['เว็บ', 'ใบเสนอราคา'], year: '2026' },
        { name: 'Gecko Cabane', desc: 'เว็บร้านอาหาร + จองโต๊ะ ดีไซน์เฉพาะ โฮสติ้งดูแลให้', tags: ['เว็บ', 'จอง'], year: '2024' },
        { name: 'Ghjulianu Codani', desc: 'Portfolio ระดับมืออาชีพ', tags: ['เว็บ', 'บรรณาธิการ'], year: '2025' },
      ],
      bridge_eyebrow: 'ขั้นตอนถัดไป',
      bridge_title_l1: 'บริการไหน',
      bridge_title_it: 'เหมาะกับคุณ?',
      bridge_body: 'วินิจฉัยสองนาทีเพื่อรู้แน่ชัดว่าคุณต้องการอะไร',
    },
    partners: {
      title: 'ลูกค้าที่ไว้วางใจ — ตั้งแต่ 2023',
      items: [
        { name: 'Selenium Studio', role: 'STUDIO หุ้นส่วน', color: '#C4F542' },
        { name: 'Gecko Cabane', role: 'ร้านอาหาร', color: '#E07856' },
        { name: 'Victor Verissimo', role: 'ARTIST PORTFOLIO', color: '#9A9690' },
        { name: 'Ghjulianu Codani', role: 'PROFESSIONAL', color: '#C4F542' },
        { name: 'Grand Ouest Habitat', role: 'ปรับปรุงอาคาร', color: '#E07856' },
        { name: 'Sellerie Duchet', role: 'อุปกรณ์ขี่ม้า', color: '#C4F542' },
        { name: 'AJMG·EXP', role: 'EXPERTISE', color: '#9A9690' },
      ],
    },
    contact: {
      num: "08 / 08",
      title_l1: "มีโปรเจกต์ที่ตูร์?",
      title_l2_it: "มาคุยกัน",
      sub: "ตอบภายใน 24 ชั่วโมงทำการ โทรครั้งแรกฟรี ไม่มีข้อผูกมัด เพื่อทำความเข้าใจสถานการณ์ของคุณ",
      updated: "อัปเดตเมื่อพฤศจิกายน 2026",
      info: [
        { k: 'อีเมล', v: 'contact@sevalys.com' },
        { k: 'โทรศัพท์', v: '+33 (0)6 07 18 41 33' },
        { k: 'ที่อยู่', v: 'ตูร์ ฝรั่งเศส · รีโมททุกที่' },
        { k: 'ความพร้อม', v: 'พร้อมรับโปรเจกต์ใหม่ตอนนี้' },
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
      manageCookies: 'จัดการคุกกี้',
      reviews: 'รีวิว',
      reviewPolicy: 'นโยบายรีวิว',
      rights: 'สงวนลิขสิทธิ์',
    },
  },
};

export const translations: Record<Lang, Translations> = { fr, en, th };
