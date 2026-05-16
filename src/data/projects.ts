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
}

export const projects: Project[] = [
  {
    index: 0,
    name: 'Feuillette',
    year: '2025',
    href: '/demo/feuillette',
  },
  {
    index: 1,
    name: 'Gecko Cabane',
    year: '2024',
    href: null,
  },
  {
    index: 2,
    name: 'Les Folies Temps Danse',
    year: '2024',
    href: null,
  },
  {
    index: 3,
    name: 'Ghjulianu Codani',
    year: '2025',
    href: null,
  },
];
