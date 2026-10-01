import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Lecture en texte source (comme layout.test.ts) : on n'importe jamais les layouts.
const SEGMENTS = [
  { dir: 'connexion', title: 'Connexion' },
  { dir: 'auth', title: 'Connexion' },
  { dir: 'espace-client', title: 'Espace client' },
  { dir: 'admin', title: 'Administration' },
] as const;

const sources = SEGMENTS.map((s) => ({
  ...s,
  src: readFileSync(new URL(`./${s.dir}/layout.tsx`, import.meta.url), 'utf8'),
}));

describe('private segment layouts (FOUND-05, D-11 to D-15)', () => {
  for (const { dir, title, src } of sources) {
    describe(`/${dir}`, () => {
      it('is noindex/nofollow', () => {
        expect(src).toContain('index: false');
        expect(src).toContain('follow: false');
      });

      it('overrides the inherited root canonical', () => {
        expect(src).toContain('alternates');
      });

      it('has its own plain-string title', () => {
        expect(src).toContain(`title: "${title}"`);
      });

      it('imports portal.css and wraps children in pt-root', () => {
        expect(src).toMatch(/import\s+["']\.\.\/portal\.css["']/);
        expect(src).toContain('className="pt-root"');
      });

      it('stays out of the public shell (no navbar, providers, language, motion libs, client directive)', () => {
        for (const banned of [
          'Navbar',
          'Footer',
          'ClientProviders',
          'LanguageContext',
          'useLanguage',
          'gsap',
          'three',
          'use client',
        ]) {
          expect(src).not.toContain(banned);
        }
      });
    });
  }
});
