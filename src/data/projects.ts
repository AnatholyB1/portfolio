// src/data/projects.ts
// Static project records — names, tags, year, optional href
// desc is resolved from t.landing.work.items[project.index].desc at render time (per D-03)

export interface Project {
  /** Index in t.landing.work.items[] — used to retrieve i18n desc + tags */
  index: number;
  /** Canonical project name (same across all locales) */
  name: string;
  /** Display year */
  year: string;
  /** Optional URL for the project — null if no public link */
  href: string | null;
  /** Real screenshot under public/work, 1440 wide */
  image: string;
  imageHeight: number;
  /** Host shown in the browser-frame chrome */
  host: string;
}

/** Projets mis en avant sur l'accueil (ordre d'affichage). index = position dans t.landing.work.items. */
export const projects: Project[] = [
  {
    index: 0,
    name: 'Grand Ouest Habitat',
    year: '2026',
    href: 'https://grandouesthabitat.com',
    image: '/work/grand-ouest-habitat.webp',
    imageHeight: 900,
    host: 'grandouesthabitat.com',
  },
  {
    index: 1,
    name: 'Sellerie Duchet',
    year: '2026',
    href: 'https://sellerieduchet.com',
    image: '/work/sellerie-duchet.webp',
    imageHeight: 900,
    host: 'sellerieduchet.com',
  },
  {
    index: 2,
    name: 'Gecko Cabane',
    year: '2024',
    href: 'https://geckocabanerestaurant.com',
    image: '/work/gecko-cabane.webp',
    imageHeight: 900,
    host: 'geckocabanerestaurant.com',
  },
  {
    index: 3,
    name: 'Ghjulianu Codani',
    year: '2025',
    href: 'https://ghjulianu-codani.com',
    image: '/work/ghjulianu-codani.webp',
    imageHeight: 900,
    host: 'ghjulianu-codani.com',
  },
];

/**
 * Études de cas des pages /services/[slug] uniquement (pas affichées sur
 * l'accueil). index = -1 : pas d'entrée dans t.landing.work.items.
 */
const caseStudyOnly: Project[] = [
  {
    index: -1,
    name: 'Feuillette',
    year: '2025',
    href: '/demo/feuillette',
    image: '/work/feuillette.webp',
    imageHeight: 812,
    host: 'sevalys.com/demo/feuillette',
  },
  {
    index: -1,
    name: 'Les Folies Temps Danse',
    year: '2024',
    href: 'https://lesfoliestempsdanse.com',
    image: '/work/folies-temps-danse.webp',
    imageHeight: 900,
    host: 'lesfoliestempsdanse.com',
  },
];

/** Join key de services.caseStudyProjectIndex : projets d'accueil puis études de cas seules. */
export const caseStudyProjects: Project[] = [...projects, ...caseStudyOnly];
