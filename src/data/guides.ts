// src/data/guides.ts
// Contenu éditorial des guides /guides/[slug] (français uniquement, pas d'i18n).
// Rendu côté serveur : tout le texte est dans le HTML initial.
//
// Marquage inline accepté dans les textes : [ancre](/chemin ou https://…) et **gras**.
// Les réponses de FAQ restent en texte brut : elles sont reprises mot pour mot dans le
// JSON-LD FAQPage, qui doit être identique au texte visible.

export type GuideBlock =
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "table"; caption: string; headers: string[]; rows: string[][]; note?: string }
  | { type: "callout"; title: string; paragraphs: string[] };

export interface GuideSubsection {
  id: string;
  title: string;
  blocks: GuideBlock[];
}

export interface GuideSection {
  id: string;
  title: string;
  blocks: GuideBlock[];
  subsections?: GuideSubsection[];
}

export interface GuideFaq {
  q: string;
  a: string;
}

export interface GuideSource {
  label: string;
  href: string;
  /** Mois de relevé, affiché à côté du lien. */
  retrieved: string;
}

export interface Guide {
  slug: string;
  /** Titre SANS la marque : le gabarit du layout racine ajoute « · Sèvalys ». */
  metaTitle: string;
  metaDescription: string;
  h1: string;
  /** Libellé court pour le fil d'Ariane. */
  crumb: string;
  /** Description courte pour la page index /guides. */
  listSummary: string;
  /** Réponse courte affichée en haut de page. */
  answer: string;
  intro: string[];
  datePublished: string;
  dateModified: string;
  authorName: string;
  authorRole: string;
  sections: GuideSection[];
  faq: GuideFaq[];
  sources: GuideSource[];
  cta: {
    title: string;
    text: string;
    primary: { label: string; href: string };
    secondary: { label: string; href: string };
  };
  authorBio: string;
}

const AUTHOR = "Anatholy Bricon";
const AUTHOR_ROLE = "Entrepreneur individuel, fondateur de Sèvalys, agence digitale à Tours";
const AUTHOR_BIO =
  "Anatholy Bricon est entrepreneur individuel. Il dirige [Sèvalys, agence digitale à Tours](/) : sites vitrines, référencement local et outils sur mesure pour les indépendants et les petites entreprises. Sèvalys est en franchise de TVA (art. 293 B du CGI).";

// ─────────────────────────────────────────────────────────────────────────────
// Guide 1 : prix d'un site vitrine
// ─────────────────────────────────────────────────────────────────────────────
const prixSiteVitrine: Guide = {
  slug: "prix-site-vitrine",
  metaTitle: "Prix site vitrine en 2026 : tarifs et budget",
  metaDescription:
    "Combien coûte un site vitrine ? Fourchettes sourcées de 0 à 6 000 €, facteurs de prix et coûts cachés. Estimez votre budget avant de demander un devis.",
  h1: "Combien coûte un site vitrine en 2026 ? Tarifs et budget",
  crumb: "Prix d'un site vitrine",
  listSummary:
    "Fourchettes de prix sourcées et datées, facteurs qui font varier un devis, coûts oubliés et six questions à poser avant de signer.",
  answer:
    "Un site vitrine coûte de 0 € (fait soi-même) à plus de 6 000 € (agence). Pour un site de 3 à 5 pages, l'ordre de grandeur relevé le plus souvent est de 1 500 à 5 000 €.",
  intro: [
    "Combien ça coûte ? Ça dépend. Deux exemples chez nous. Grand Ouest Habitat, rénovation à Tours : des photos avant et après, des avis Google, un formulaire où l'on décrit son projet. Ghjulianu Codani, photographe : un portfolio, des albums, ses tarifs. Rien à voir côté travail, donc rien à voir côté prix.",
    "Ce guide aligne les tarifs publiés en novembre 2026 par des freelances, des agences et des éditeurs d'outils (les sources sont en bas de page). Il montre ce qui fait grimper une facture et vous laisse six questions à poser avant de signer. Pas de vente forcée : juste de quoi comparer deux devis sans vous tromper.",
  ],
  datePublished: "2026-11-26",
  dateModified: "2026-11-26",
  authorName: AUTHOR,
  authorRole: AUTHOR_ROLE,
  authorBio: AUTHOR_BIO,
  sections: [
    {
      id: "reponse-tableau",
      title: "La réponse en un tableau",
      blocks: [
        {
          type: "p",
          text: "Voici les fourchettes publiées pour chaque voie. Elles ne se valent pas toutes : certaines sont hors taxes, d'autres ne le disent pas, et le nombre de pages change d'une source à l'autre. Lisez-les comme des repères, pas comme des devis.",
        },
        {
          type: "table",
          caption: "Prix d'un site vitrine selon la voie choisie, avec source et date",
          headers: ["Voie", "Prix annoncé", "Pour qui", "Source et date"],
          rows: [
            [
              "Le faire soi-même",
              "0 à 50 € par mois, ou 100 à 500 € par an avec le nom de domaine",
              "Petit budget, un peu de temps, goût pour les réglages",
              "iPaoo, 2026 ; Trend Design, 2026",
            ],
            [
              "Passer par un freelance",
              "800 à 3 000 € HT chez Fenxi ; 300 à 3 000 € chez iPaoo",
              "Site de 3 à 5 pages, un seul interlocuteur",
              "Fenxi, décembre 2025 ; iPaoo, 2026",
            ],
            [
              "Passer par une agence",
              "2 000 à 6 000 € HT chez Fenxi ; 1 500 à 6 000 € selon le nombre de pages chez Dilo",
              "Site plus riche, plusieurs métiers sur le projet",
              "Fenxi, décembre 2025 ; Dilo, mars 2024",
            ],
            [
              "Prendre un forfait d'appel",
              "Dès 490 à 500 € pour un périmètre réduit : une page ou une landing page",
              "Une activité simple qui veut une première présence en ligne",
              "ConvertiLab, La Weberie, relevés en novembre 2026",
            ],
          ],
          note: "Un prix HT n'inclut pas la TVA, un prix TTC l'inclut. Quand une source ne précise rien, nous ne précisons rien non plus.",
        },
        {
          type: "p",
          text: "Ce que l'on peut dire sans risque : les prix annoncés vont de 300 € à plus de 10 000 €. Pour un site de 3 à 5 pages, l'ordre de grandeur relevé le plus souvent est de 1 500 à 5 000 € (Trend Design, Dilo, Fenxi).",
        },
      ],
    },
    {
      id: "budget-selon-la-voie",
      title: "Quel budget selon la façon de faire votre site ?",
      blocks: [
        {
          type: "p",
          text: "Quatre voies existent. Elles ne demandent ni le même argent ni le même temps. Le bon choix dépend de ce que vous voulez garder en main.",
        },
      ],
      subsections: [
        {
          id: "faire-soi-meme",
          title: "Le faire soi-même",
          blocks: [
            {
              type: "p",
              text: "Les créateurs de site (Wix, WordPress avec un modèle, outils guidés par IA) annoncent 0 à 50 € par mois selon iPaoo (2026). Un plan payant démarre autour de 6 € par mois. Trend Design (2026) parle de 100 à 500 € par an, domaine compris.",
            },
            {
              type: "p",
              text: "Le vrai coût, c'est votre temps. Prenons une coiffeuse qui monte son site un dimanche. Elle choisit un modèle, écrit ses textes, trie ses photos, règle l'affichage sur mobile. Elle y passe plusieurs jours, répartis sur des semaines. Si ce temps est gratuit pour vous, la voie est économique. S'il vous sert à servir des clients, elle l'est beaucoup moins.",
            },
          ],
        },
        {
          id: "freelance",
          title: "Passer par un freelance",
          blocks: [
            {
              type: "p",
              text: "Selon Fenxi (décembre 2025), un freelance facture 800 à 3 000 € HT. Trend Design (2026) donne 800 à 2 800 € pour 3 pages et 1 500 à 5 000 € pour 5 pages. Codeur.com (page datée 2025, relevée en novembre 2026) cite 1 200 à 3 000 € pour un site vitrine marketing et 1 500 à 4 000 € pour un WordPress sur mesure.",
            },
            {
              type: "p",
              text: "Vous avez une seule personne en face de vous, souvent plus souple sur le périmètre. Le point à vérifier : qui répond si elle est indisponible, six mois plus tard ?",
            },
          ],
        },
        {
          id: "agence",
          title: "Passer par une agence",
          blocks: [
            {
              type: "p",
              text: "Fenxi (décembre 2025) annonce 2 000 à 6 000 € HT. Dilo (mars 2024) donne 1 500 à 3 000 € pour 3 à 5 pages et 3 000 à 6 000 € pour 5 à 15 pages. Trend Design (2026) va de 3 000 à 6 000 € pour 3 pages et de 5 000 à 10 000 € pour 5 pages. AmphiBee, relevé en novembre 2026, affiche dès 5 000 € pour 5 pages sur un thème préconçu et dès 13 500 € avec un thème sur mesure.",
            },
            {
              type: "p",
              text: "Vous payez une équipe : design, développement, suivi de projet. C'est utile quand le site est complexe ou que plusieurs personnes doivent valider.",
            },
          ],
        },
        {
          id: "forfait",
          title: "Les plateformes et sites au forfait",
          blocks: [
            {
              type: "p",
              text: "Certains prestataires affichent un prix d'appel : dès 490 € pour une landing page et dès 890 € pour un site vitrine chez ConvertiLab, dès 500 € pour une page chez La Weberie, dont le site vitrine démarre à 1 800 € (relevés en novembre 2026). Ces prix sont possibles parce que le périmètre est fermé : un nombre de pages fixé, un modèle adapté, peu d'allers-retours.",
            },
            {
              type: "p",
              text: "Un forfait à périmètre défini change la lecture du prix. Vous savez ce que vous achetez avant de signer, et ce qui sort du forfait passe par un devis. Le piège, c'est le forfait flou : le prix est bas, mais rien n'est écrit.",
            },
          ],
        },
      ],
    },
    {
      id: "prix-selon-nombre-de-pages",
      title: "Combien coûte un site vitrine selon le nombre de pages ?",
      blocks: [
        {
          type: "p",
          text: "C'est la question qui revient le plus. Voici les fourchettes observées, avec le périmètre écrit.",
        },
        {
          type: "table",
          caption: "Prix d'un site vitrine selon la taille du site",
          headers: ["Taille du site", "Fourchette observée", "Source et date"],
          rows: [
            [
              "Page unique",
              "Dès 500 € (La Weberie) ; dès 490 € pour une landing page (ConvertiLab)",
              "Relevés du 26 novembre 2026",
            ],
            [
              "3 pages",
              "Freelance 800 à 2 800 € ; agence 3 000 à 6 000 €",
              "Trend Design, 2026",
            ],
            [
              "5 pages",
              "Freelance 1 500 à 5 000 € ; agence 5 000 à 10 000 €",
              "Trend Design, 2026",
            ],
            [
              "5 à 15 pages",
              "3 000 à 6 000 € en agence",
              "Dilo, mars 2024",
            ],
          ],
        },
        {
          type: "p",
          text: "Attention à une idée reçue : un site ne se facture pas « à la page ». iPaoo le rappelle dans son guide. Vous payez le travail : cadrage, design, textes, mise en ligne, tests. Trois pages simples ne coûtent pas le tiers de neuf pages, parce qu'une partie du travail ne dépend pas du nombre de pages.",
        },
        {
          type: "p",
          text: "Pour estimer votre cas, le [simulateur de budget Sèvalys](/simulateur) pose quelques questions sur votre activité. Il sert à cadrer votre besoin, pas à remplacer un devis.",
        },
      ],
    },
    {
      id: "ce-qui-fait-varier-le-prix",
      title: "Ce qui fait monter ou baisser le prix",
      blocks: [
        {
          type: "p",
          text: "Deux sites de 5 pages peuvent coûter 1 500 € ou 8 000 €. L'écart vient presque toujours des mêmes cinq postes. Repérez-les dans chaque devis.",
        },
      ],
      subsections: [
        {
          id: "design",
          title: "Le design : modèle adapté ou création sur mesure",
          blocks: [
            {
              type: "p",
              text: "Un modèle (template) adapté à vos couleurs et à votre logo coûte moins cher qu'un design dessiné pour vous. Le sur mesure se justifie quand votre image est un argument de vente. Pour beaucoup de commerces locaux, un modèle bien travaillé suffit.",
            },
          ],
        },
        {
          id: "textes-photos",
          title: "Les textes et les photos",
          blocks: [
            {
              type: "p",
              text: "Qui écrit ? Qui photographie ? D'après AmphiBee (relevé de novembre 2026), la rédaction se facture environ 0,10 € le mot et des visuels originaux 500 à 1 000 € pour une dizaine d'images. Si vous fournissez vos textes et vos photos, la facture baisse. Si le prestataire s'en charge, elle monte.",
            },
          ],
        },
        {
          id: "fonctions",
          title: "Les fonctions : formulaire, réservation, blog, plusieurs langues",
          blocks: [
            {
              type: "p",
              text: "Un formulaire de contact est standard. Une prise de rendez-vous, un blog, un espace client ou un site en plusieurs langues demandent du développement : le prix grimpe avec la complexité. Un site e-commerce, avec panier et paiement, est un autre projet : les prix annoncés vont de 2 000 € à plus de 5 000 € selon les sources.",
            },
          ],
        },
        {
          id: "referencement-depart",
          title: "Le référencement de départ",
          blocks: [
            {
              type: "p",
              text: "Les balises, la vitesse d'affichage, la fiche Google : certains devis les incluent, d'autres non. Demandez ce qui est fait avant la mise en ligne. Le suivi dans la durée relève d'un autre métier, le [référencement après la mise en ligne](/services/seo-referencement), avec son propre budget.",
            },
          ],
        },
        {
          id: "delai-allers-retours",
          title: "Le délai et le nombre d'allers-retours",
          blocks: [
            {
              type: "p",
              text: "Un site pressé coûte plus cher, car il bouscule le planning du prestataire. Les retours de correction comptent aussi : un devis qui en prévoit deux n'est pas comparable à un devis qui en prévoit cinq. Vérifiez ce nombre noir sur blanc.",
            },
          ],
        },
      ],
    },
    {
      id: "couts-oublies",
      title: "Les coûts qu'on oublie : domaine, hébergement, maintenance",
      blocks: [
        {
          type: "p",
          text: "Le prix de création n'est que le début. Ces frais reviennent chaque année ou chaque mois. D'après nos relevés de novembre 2026 :",
        },
        {
          type: "ul",
          items: [
            "**Nom de domaine** : 10 à 70 € par an. Un .fr coûte 10 à 15 €.",
            "**Hébergement** : 20 à 50 € par an en mutualisé, environ 100 € par an pour un VPS (relevés Codeur.com).",
            "**Textes et photos** : à votre charge, ou facturés en plus.",
            "**Maintenance** : mises à jour, sauvegardes, corrections. Elle se facture à part.",
          ],
        },
        {
          type: "p",
          text: "Posez toujours cette question : « Qu'est-ce qui est récurrent, et à qui appartient le site ? » La propriété du site compte. Si le nom de domaine est enregistré au nom du prestataire, partir devient compliqué. Il doit être à votre nom.",
        },
      ],
    },
    {
      id: "site-vitrine-pas-cher",
      title: "Site vitrine pas cher : à quoi faire attention",
      blocks: [
        {
          type: "p",
          text: "Un petit budget n'est pas un mauvais choix. Il permet un site de 3 pages sur un modèle adapté, souvent suffisant pour démarrer. Ce qu'il faut vérifier, c'est ce qui manque parfois à ce prix.",
        },
        {
          type: "ul",
          items: [
            "**La propriété du site** : domaine à votre nom, accès à votre espace de gestion.",
            "**La vitesse** : testez la page d'accueil sur votre téléphone, en 4G.",
            "**La version mobile** : ouvrez le site sur votre téléphone et vérifiez que tout se lit sans zoomer.",
            "**Les textes** : écrits pour votre activité, pas du texte générique à remplacer.",
          ],
        },
        {
          type: "p",
          text: "Si vous avez déjà un site qui ne vous apporte rien, la question n'est peut-être pas le prix mais la [refonte d'un site existant](/services/rebranding-site-premium). On y regarde ce qui peut être gardé.",
        },
      ],
    },
    {
      id: "ou-se-situe-sevalys",
      title: "Où se situe Sèvalys",
      blocks: [
        {
          type: "callout",
          title: "Notre offre, sans détour",
          paragraphs: [
            "[Notre offre de site vitrine](/services/site-vitrine) démarre à partir de 500 € (TVA non applicable, art. 293 B du CGI). Le forfait couvre l'accueil et jusqu'à 2 pages, un formulaire de contact et la mise en ligne. Le délai est de 2 à 4 semaines.",
            "Le nom de domaine et l'hébergement sont à votre charge. La maintenance est en option. Dit autrement : 500 € couvre un site de 3 pages. Au-delà (5 pages et plus, blog, réservation, design sur mesure), nous chiffrons sur devis.",
            "Ce forfait ne suffit donc pas pour un site riche ou une boutique en ligne. Parmi nos réalisations : [Grand Ouest Habitat](https://grandouesthabitat.com), [Sellerie Duchet](https://sellerieduchet.com), [Gecko Cabane](https://geckocabanerestaurant.com) et [Ghjulianu Codani](https://ghjulianu-codani.com).",
          ],
        },
      ],
    },
    {
      id: "questions-avant-devis",
      title: "6 questions à poser avant de signer un devis",
      blocks: [
        {
          type: "p",
          text: "Ces six questions rendent deux devis comparables. Posez-les par écrit, pour garder les réponses.",
        },
        {
          type: "ol",
          items: [
            "**Quel est le périmètre ?** Nombre de pages, fonctions, textes et photos fournis ou non.",
            "**À qui appartient le site ?** Domaine, contenu, accès. Réponse attendue : à vous.",
            "**Quel est le délai ?** Avec une date de début et une date de mise en ligne.",
            "**Combien de retours de correction ?** Un chiffre, pas « autant que nécessaire ».",
            "**Quels coûts reviennent chaque mois ou chaque année ?** Hébergement, domaine, maintenance.",
            "**Qu'est-ce qui n'est pas inclus ?** C'est la question qui évite les mauvaises surprises.",
          ],
        },
      ],
    },
    {
      id: "choisir-son-budget",
      title: "Comment choisir votre budget",
      blocks: [
        {
          type: "p",
          text: "Trois cas types, sans promesse de résultat : un site ne remplace pas votre travail commercial, il le rend plus facile à trouver et à croire.",
        },
        {
          type: "ul",
          items: [
            "**Un artisan qui démarre** : un forfait à périmètre défini, 3 pages, un modèle adapté. L'important est d'être en ligne avec des informations justes.",
            "**Un commerce qui a déjà une clientèle** : un budget intermédiaire, avec de vrais textes et de vraies photos, pour que le site ressemble à la boutique.",
            "**Une activité qui veut aller chercher des clients** : un budget plus large, avec des pages dédiées à chaque service et un suivi du référencement.",
          ],
        },
        {
          type: "p",
          text: "Pour partir d'un chiffre, [estimez le budget de votre site](/simulateur) avec le simulateur, puis demandez deux ou trois devis comparables.",
        },
      ],
    },
  ],
  faq: [
    {
      q: "Combien coûte en moyenne un site web ?",
      a: "Pour un site vitrine de 3 à 5 pages, l'ordre de grandeur relevé le plus souvent est de 1 500 à 5 000 € chez un professionnel (voir les sources en bas de page). Les prix d'appel démarrent vers 490 à 500 €, et les agences montent à 6 000 € et plus. Fenxi (décembre 2025) annonce par exemple 2 000 à 6 000 € HT en agence et 800 à 3 000 € HT chez un freelance.",
    },
    {
      q: "Comment faire un site vitrine ?",
      a: "Trois voies : le faire soi-même avec un créateur de site, passer par un freelance, ou passer par une agence. Dans tous les cas, les étapes sont les mêmes : fixer l'objectif, préparer les textes et les photos, choisir le design, puis mettre en ligne et tester sur mobile.",
    },
    {
      q: "Quelle est la différence entre un site vitrine et un site e-commerce ?",
      a: "Le site vitrine présente votre activité et pousse à vous contacter. Le site e-commerce vend en ligne, avec un panier, un paiement et un suivi de stock. Il coûte plus cher : les prix annoncés vont de 2 000 € à plus de 5 000 € selon les sources.",
    },
    {
      q: "Un site vitrine à 500 € est-il possible ?",
      a: "Oui, pour un périmètre limité : environ 3 pages et un design adapté. Chez Sèvalys, l'offre démarre à partir de 500 € (TVA non applicable, art. 293 B du CGI) pour l'accueil et jusqu'à 2 pages. Les sites plus riches passent par un devis.",
    },
    {
      q: "Quels frais prévoir en plus du prix de création ?",
      a: "Le nom de domaine (10 à 70 € par an), l'hébergement (à partir de 20 € par an en mutualisé), puis la rédaction et les visuels quand le prestataire s'en charge, et la maintenance. Demandez au prestataire, pour chaque ligne, si elle est incluse ou non.",
    },
    {
      q: "Le prix d'un site vitrine est-il HT ou TTC ?",
      a: "Cela varie, donc vérifiez toujours. Un prestataire en franchise de TVA, comme Sèvalys (art. 293 B du CGI), affiche un prix sans TVA ajoutée : le montant annoncé est le montant payé.",
    },
    {
      q: "Combien coûte un site vitrine par mois ?",
      a: "Avec un créateur de site, comptez 6 à 50 € par mois selon les formules (iPaoo). ConvertiLab propose un site dès 39 € par mois, en paiement étalé sur 24 mois et sans abonnement. Pensez à additionner les mois : un abonnement se paie tant que le site reste en ligne, un paiement étalé s'arrête au dernier versement.",
    },
  ],
  sources: [
    { label: "Fenxi, combien coûte un site internet", href: "https://fenxi.fr/blog/combien-coute-site-internet-2026-prix-delais", retrieved: "novembre 2026" },
    { label: "iPaoo, créer un site vitrine : prix", href: "https://ipaoo.fr/creer-un-site-vitrine/prix/", retrieved: "novembre 2026" },
    { label: "Trend Design, prix d'un site vitrine", href: "https://trend-design.fr/post/prix-site-vitrine", retrieved: "novembre 2026" },
    { label: "Codeur.com, quel prix pour un site vitrine", href: "https://codeur.com/pages/quel-prix-site-vitrine", retrieved: "novembre 2026" },
    { label: "Dilo, tarif de création d'un site internet", href: "https://agence-dilo.fr/blog/tarif-creation-site-internet", retrieved: "novembre 2026" },
    { label: "AmphiBee, combien coûte un site vitrine", href: "https://amphibee.fr/blog/combien-coute-la-creation-dun-site-vitrine", retrieved: "novembre 2026" },
    { label: "La Weberie, création de sites web à Tours : tarifs", href: "https://laweberie.fr/service/creation-de-sites-web/", retrieved: "novembre 2026" },
    { label: "ConvertiLab, nos tarifs", href: "https://convertilab.com/prix", retrieved: "novembre 2026" },
  ],
  cta: {
    title: "Voir ce que 500 € couvre",
    text: "Le détail du forfait, le périmètre et le délai sont sur la page de l'offre. Pour cadrer votre projet avant de demander des devis, le simulateur vous donne un point de départ.",
    primary: { label: "Voir l'offre de site vitrine", href: "/services/site-vitrine" },
    secondary: { label: "Estimer mon budget", href: "/simulateur" },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Guide 2 : SEO local
// ─────────────────────────────────────────────────────────────────────────────
const seoLocal: Guide = {
  slug: "seo-local",
  metaTitle: "Référencement local : être trouvé près de vous",
  metaDescription:
    "Fiche Google, avis, adresse, page locale : les étapes dans l'ordre pour apparaître sur Google près de chez vous. Durée de chaque action et plan en 7 jours.",
  h1: "Référencement local : le guide du SEO local pour être trouvé près de chez vous",
  crumb: "SEO local",
  listSummary:
    "Fiche Google, adresse, avis, pages locales : cinq étapes dans l'ordre, avec le temps de chacune, ce que vous pouvez faire seul et un plan en 7 jours.",
  answer:
    "Le référencement local sert à apparaître quand quelqu'un tape « métier + ville » sur son téléphone. Voici cinq étapes, dans l'ordre, avec le temps que chacune demande.",
  intro: [
    "« Sellerie près de moi », « rénovation maison Tours ». Le client regarde les trois fiches en haut de l'écran, jette un œil aux étoiles, puis appelle. Pas de fiche, ou un mauvais horaire : il appelle le voisin.",
    "Les sites que nous avons faits montrent ce que le client cherche. Chez Grand Ouest Habitat, entreprise de rénovation à Tours, on voit le téléphone, la zone d'intervention, des photos avant et après et les avis Google. Chez Sellerie Duchet, à Chambray-lès-Tours, les rayons et la gérante. Ce guide est écrit pour un commerçant ou un artisan qui préfère s'y mettre seul, sans jargon. Chaque étape a une durée indicative. Aucune ne promet de position : l'algorithme de Google, personne ne le maîtrise.",
  ],
  datePublished: "2026-11-26",
  dateModified: "2026-11-26",
  authorName: AUTHOR,
  authorRole: AUTHOR_ROLE,
  authorBio: AUTHOR_BIO,
  sections: [
    {
      id: "seo-local-definition",
      title: "Le SEO local, c'est quoi ?",
      blocks: [
        {
          type: "p",
          text: "Le référencement local rassemble ce qui permet d'apparaître dans les recherches liées à un lieu. Il se joue sur quatre choses : votre fiche Google, votre adresse, vos avis et votre site. Le tout se règle presque sans argent. Il demande surtout de la méthode.",
        },
      ],
      subsections: [
        {
          id: "criteres-google",
          title: "Ce que Google regarde : pertinence, distance, notoriété",
          blocks: [
            {
              type: "p",
              text: "Google explique classer les résultats locaux selon trois critères. La **pertinence** : votre fiche correspond-elle à la recherche ? La **distance** : êtes-vous proche de la personne, ou du lieu cherché ? La **notoriété** : êtes-vous connu, avec des avis et des mentions sur le web ?",
            },
            {
              type: "p",
              text: "Vous ne contrôlez pas la distance. Vous agissez sur les deux autres, en remplissant bien votre fiche et en collectant des avis.",
            },
          ],
        },
        {
          id: "pack-local-maps",
          title: "Pack local, Google Maps, résultats classiques",
          blocks: [
            {
              type: "p",
              text: "Trois emplacements existent. Le **pack local** est le bloc de trois fiches avec une carte, en haut de la page. **Google Maps** montre les mêmes fiches en plein écran. Les **résultats classiques** listent les sites. Une bonne fiche vous ouvre les deux premiers. Un bon site vous ouvre le troisième.",
            },
          ],
        },
      ],
    },
    {
      id: "etape-1-fiche-google",
      title: "Étape 1 : Remplissez votre fiche Google (45 min)",
      blocks: [
        {
          type: "p",
          text: "La fiche Google, aussi appelée Google Business Profile ou fiche Google My Business, est gratuite. Créez-la ou revendiquez celle qui existe déjà. Google vous demandera de vérifier votre entreprise, par courrier, téléphone ou vidéo selon les cas. Ne publiez que l'adresse où vous recevez vraiment du public.",
        },
      ],
      subsections: [
        {
          id: "categorie-horaires-adresse",
          title: "Catégorie, horaires, adresse ou zone desservie",
          blocks: [
            {
              type: "p",
              text: "Choisissez une catégorie principale juste : mieux vaut « Boulangerie » que dix catégories approximatives. Ajoutez les horaires, y compris les jours fermés, le téléphone, le site et une description claire. N'écrivez pas de mots-clés dans le nom de la fiche : il doit être celui de votre enseigne.",
            },
          ],
        },
        {
          id: "photos-produits",
          title: "Photos, produits, publications",
          blocks: [
            {
              type: "p",
              text: "Ajoutez de vraies photos : la façade, l'intérieur, vos produits, votre équipe, vos chantiers. Évitez les images de banque d'images. Publiez de temps en temps une nouveauté ou une offre. Dix minutes par mois suffisent.",
            },
          ],
        },
      ],
    },
    {
      id: "etape-2-nap",
      title: "Étape 2 : Même nom, même adresse, même téléphone partout (1 h)",
      blocks: [
        {
          type: "p",
          text: "Les initiales NAP désignent le nom, l'adresse et le téléphone. Ces trois informations doivent être écrites de la même façon sur votre site, votre fiche et les annuaires. Google recoupe les sources : des écritures différentes brouillent le signal. Vérifiez aussi le téléphone : un seul numéro, au même format partout.",
        },
      ],
      subsections: [
        {
          id: "test-trois-ecritures",
          title: "Le test des 3 écritures d'adresse",
          blocks: [
            {
              type: "p",
              text: "Cherchez votre entreprise sur le web et notez toutes les écritures de votre adresse. « 12 rue de la Paix », « 12 r. de la Paix », « 12 Rue Paix » : une même adresse écrite de plusieurs façons, que Google doit rapprocher. Choisissez une écriture, copiez-la partout et corrigez le reste.",
            },
          ],
        },
      ],
    },
    {
      id: "etape-3-avis",
      title: "Étape 3 : Demandez des avis, répondez à tous (15 min par client)",
      blocks: [
        {
          type: "p",
          text: "Les avis pèsent sur la notoriété et sur le choix du client : il compare la note et le nombre d'avis avant d'appeler. Demandez-les à la fin d'une bonne prestation, quand la personne est contente. Ne les achetez pas et n'en écrivez pas vous-même : c'est interdit par Google. Répondez ensuite à chaque avis, positif ou non, sous quelques jours : une réponse courte et personnelle montre que quelqu'un tient la fiche.",
        },
      ],
      subsections: [
        {
          id: "lien-direct-avis",
          title: "Un lien direct vers vos avis",
          blocks: [
            {
              type: "p",
              text: "Votre fiche vous donne un lien qui ouvre directement le formulaire d'avis. Mettez-le sur la facture, sur le ticket de caisse, sur votre carte de visite ou dans un message de remerciement. Plus c'est simple, plus on répond.",
            },
          ],
        },
        {
          id: "repondre-avis-negatif",
          title: "Répondre à un avis négatif",
          blocks: [
            {
              type: "p",
              text: "Répondez en trois phrases, sans polémique : remerciez, reconnaissez le problème, proposez de le régler hors ligne. Exemple : « Merci pour votre retour. Nous sommes désolés de cette attente. Appelez-nous au numéro de la fiche, nous voulons y remédier. » Les futurs clients lisent aussi votre réponse.",
            },
          ],
        },
      ],
    },
    {
      id: "etape-4-pages-locales",
      title: "Étape 4 : Faites une page par métier et par ville",
      blocks: [
        {
          type: "p",
          text: "Un site avec une page par activité et par zone aide Google à comprendre où vous intervenez. Imaginons un plombier à Tours qui dépanne aussi à Joué-lès-Tours : une page par ville, avec ses photos de chantiers, ses avis et son téléphone. Pas de texte copié d'une page à l'autre : chaque page doit apporter quelque chose de vrai. Nommez le métier et la ville de façon naturelle, comme « plombier à Tours » : ces mots-clés locaux aident Google, à condition de rester lisibles.",
        },
        {
          type: "p",
          text: "Pas de site pour l'instant ? [Créer un site pour être trouvé](/services/site-vitrine) est l'étape qui demande le plus de temps. C'est aussi celle qui vous donne le plus de maîtrise.",
        },
        {
          type: "callout",
          title: "Restaurant",
          paragraphs: [
            "Une carte lisible en texte (pas seulement en image), les horaires à jour, un lien de réservation. Mettez à jour la fiche à chaque changement de carte.",
          ],
        },
        {
          type: "callout",
          title: "Artisan",
          paragraphs: [
            "Une page par métier et par zone, des chantiers photographiés avant et après, la zone desservie déclarée sur la fiche.",
          ],
        },
      ],
    },
    {
      id: "etape-5-annuaires",
      title: "Étape 5 : Soyez listé aux bons endroits",
      blocks: [
        {
          type: "p",
          text: "Les annuaires et les mentions locales renforcent la notoriété : l'annuaire de votre profession, la chambre de commerce ou des métiers, l'office de tourisme, le site de votre commune. Visez quelques sources sérieuses plutôt que cinquante annuaires inconnus. Dans chacune, reprenez votre écriture de l'étape 2. Faites de même sur vos réseaux sociaux : même nom, même téléphone, un lien vers le site.",
        },
      ],
    },
    {
      id: "erreurs-courantes",
      title: "Les erreurs qui coûtent le plus cher",
      blocks: [
        {
          type: "ul",
          items: [
            "**Une fiche en double** : deux fiches pour le même lieu se concurrencent. Faites fusionner ou supprimer l'une.",
            "**Une adresse écrite différemment** selon les sites.",
            "**Des faux avis** : Google les interdit et peut les retirer, voire suspendre la fiche.",
            "**Des mots-clés dans le nom de la fiche** : le nom doit rester celui de l'enseigne.",
            "**Un site illisible sur mobile** : un client qui cherche un artisan est souvent dans la rue, son téléphone à la main.",
          ],
        },
      ],
    },
    {
      id: "mesurer-les-resultats",
      title: "Comment savoir si ça marche ?",
      blocks: [
        {
          type: "p",
          text: "Trois outils gratuits suffisent. Les statistiques de votre fiche montrent les appels, les demandes d'itinéraire et les clics vers le site. La Search Console de Google montre les recherches qui mènent à votre site. Et un simple décompte des clients qui disent « je vous ai trouvé sur Google » ne coûte rien.",
        },
        {
          type: "p",
          text: "Notez chaque mois trois chiffres dans un tableau simple : appels, itinéraires, visites du site. Au bout de trois mois, vous voyez la tendance. N'attendez pas de délai précis : cela dépend de votre métier et de la concurrence autour de vous.",
        },
      ],
    },
    {
      id: "seul-ou-deleguer",
      title: "Ce que vous pouvez faire seul, et quand le déléguer",
      blocks: [
        {
          type: "table",
          caption: "Tâches du SEO local : temps, coût et moment où déléguer",
          headers: ["Tâche", "Temps", "Coût", "Vous", "À déléguer si…"],
          rows: [
            ["Fiche Google", "45 min", "0 €", "Oui", "vous n'avez pas le temps de la tenir"],
            ["Nom, adresse, téléphone et annuaires", "1 à 3 h", "0 € à quelques dizaines d'euros", "Oui", "plus de 10 annuaires à tenir"],
            ["Avis", "15 min par client", "0 €", "Oui", "jamais"],
            ["Page locale", "2 à 4 h par page", "0 €", "Possible", "pas de site ou site ancien"],
            ["Suivi mensuel", "30 min", "0 €", "Oui", "vous voulez un suivi et des rapports"],
          ],
        },
        {
          type: "p",
          text: "Presque tout se fait seul. Ce qui prend du temps, c'est la régularité. Si vous préférez déléguer, voyez le travail d'une [agence SEO à Tours](/services/seo-referencement) : elle reprend l'audit, les pages, la fiche et le suivi.",
        },
      ],
    },
    {
      id: "plan-7-jours",
      title: "Votre plan en 7 jours",
      blocks: [
        {
          type: "p",
          text: "Une action par jour, vingt à quarante-cinq minutes chacune. Imprimez la liste.",
        },
        {
          type: "ol",
          items: [
            "Jour 1 : créez ou revendiquez votre fiche Google.",
            "Jour 2 : remplissez catégorie, horaires, téléphone, site et description.",
            "Jour 3 : ajoutez dix vraies photos.",
            "Jour 4 : faites le test des 3 écritures d'adresse et corrigez.",
            "Jour 5 : récupérez votre lien d'avis et mettez-le sur vos factures.",
            "Jour 6 : demandez un avis à trois clients récents.",
            "Jour 7 : listez vos pages à créer ou à améliorer, une par métier et par ville.",
          ],
        },
      ],
    },
    {
      id: "aller-plus-loin",
      title: "Aller plus loin",
      blocks: [
        {
          type: "ul",
          items: [
            "[Le prix d'un site vitrine en 2026](/guides/prix-site-vitrine) : fourchettes et questions à poser avant un devis.",
            "[Faire le diagnostic gratuit](/simulateur) de votre présence en ligne.",
            "[Des annonces Google](/services/google-ads) en attendant les premiers résultats du référencement.",
            "[Refaire un site qui ne rapporte rien](/services/rebranding-site-premium) : refonte et site premium.",
          ],
        },
      ],
    },
  ],
  faq: [
    {
      q: "Qu'est-ce que le référencement local ?",
      a: "C'est ce qui permet d'être trouvé quand on cherche un métier près de chez soi, sur Google ou Google Maps. Il se joue sur la fiche Google, l'adresse, les avis et le site.",
    },
    {
      q: "Comment faire apparaître mon entreprise sur Google gratuitement ?",
      a: "Créez et remplissez la fiche Google, qui est gratuite, vérifiez l'adresse puis demandez des avis à vos clients. Un site aide, mais rien n'oblige à payer pour apparaître.",
    },
    {
      q: "Comment valider une fiche Google My Business ?",
      a: "Google demande un code ou une vérification par courrier, téléphone ou vidéo, selon les cas. Prévoyez quelques jours. La procédure change : suivez les instructions affichées dans l'aide de Google.",
    },
    {
      q: "Combien de temps avant de voir un effet ?",
      a: "Cela dépend de votre métier et de la concurrence : personne ne peut annoncer un délai fiable. Les premières semaines servent à fiabiliser vos informations. Suivez ensuite les statistiques de la fiche chaque mois.",
    },
    {
      q: "Faut-il un site si j'ai une fiche Google ?",
      a: "Ce n'est pas obligatoire pour apparaître. Mais un site rassure et vous permet de créer des pages par métier et par ville. Un site vitrine simple suffit souvent pour commencer.",
    },
    {
      q: "Que faire si mon adresse ou mon nom est écrit de plusieurs façons ?",
      a: "Choisissez une écriture, copiez-la sur votre site, votre fiche et vos annuaires, puis corrigez les autres. C'est le test des 3 écritures décrit à l'étape 2.",
    },
    {
      q: "Peut-on faire du référencement local sans boutique ?",
      a: "Oui. Un artisan qui se déplace déclare sa zone desservie et masque son adresse s'il ne reçoit pas de public. Il crée aussi une page par zone sur son site.",
    },
  ],
  sources: [
    { label: "Google Business Profile, conseils pour améliorer votre classement local", href: "https://support.google.com/business/answer/7091?hl=fr", retrieved: "novembre 2026" },
  ],
  cta: {
    title: "Pour déléguer le suivi",
    text: "Notre offre SEO & Référencement démarre à partir de 300 € par mois (TVA non applicable, art. 293 B du CGI) pour 2 pages, avec 100 € de plus par mois et par page ajoutée. Elle comprend un audit de départ, l'optimisation des pages, la fiche Google, un lien par mois et un rapport mensuel. Engagement de 3 mois minimum.",
    primary: { label: "Voir l'offre SEO & Référencement", href: "/services/seo-referencement" },
    secondary: { label: "Faire le diagnostic gratuit", href: "/simulateur" },
  },
};

export const guides: Guide[] = [prixSiteVitrine, seoLocal];

export function getGuideBySlug(slug: string): Guide | undefined {
  return guides.find((g) => g.slug === slug);
}

const MONTHS_FR = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

/** « 2026-11-26 » → « 26 novembre 2026 » (sans Intl : stable côté serveur). */
export function formatGuideDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d === 1 ? "1er" : d} ${MONTHS_FR[m - 1]} ${y}`;
}

/** Retire le marquage inline ([ancre](href), **gras**) pour obtenir le texte lu. */
export function stripInline(text: string): string {
  return text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/\*\*/g, "");
}

function blockTexts(b: GuideBlock): string[] {
  switch (b.type) {
    case "p":
      return [b.text];
    case "ul":
    case "ol":
      return b.items;
    case "callout":
      return [b.title, ...b.paragraphs];
    case "table":
      return [b.caption, ...b.headers, ...b.rows.flat(), ...(b.note ? [b.note] : [])];
  }
}

/** Tout le texte lisible de l'article (réponse, intro, sections, FAQ), hors sources, CTA et bio. */
export function guideBodyTexts(g: Guide): string[] {
  const out: string[] = [g.h1, g.answer, ...g.intro];
  for (const s of g.sections) {
    out.push(s.title, ...s.blocks.flatMap(blockTexts));
    for (const sub of s.subsections ?? []) out.push(sub.title, ...sub.blocks.flatMap(blockTexts));
  }
  for (const f of g.faq) out.push(f.q, f.a);
  return out;
}

export function guideWordCount(g: Guide): number {
  return guideBodyTexts(g)
    .map(stripInline)
    .join(" ")
    .split(/\s+/)
    .filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

/** Durée de lecture indicative (≈ 220 mots/minute), jamais moins d'une minute. */
export function guideReadingMinutes(g: Guide): number {
  return Math.max(1, Math.round(guideWordCount(g) / 220));
}
