import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Gardes source : l'espace client a ses propres limites (chargement, erreur, 404), sans l'enveloppe publique.
const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8').replace(/\r\n/g, '\n');

describe('espace client boundaries', () => {
  it('ships loading, error and not-found files', () => {
    for (const f of ['./loading.tsx', './error.tsx', './not-found.tsx']) {
      expect(existsSync(new URL(f, import.meta.url)), f).toBe(true);
    }
  });

  it('error boundary is a client component with a retry button and keeps the shell', () => {
    const src = read('./error.tsx');
    expect(src.startsWith("'use client'")).toBe(true);
    expect(src).toContain('reset');
    expect(src).toContain('COPY.retry');
    expect(src).toContain('<ShellHeader');
    expect(src).toContain('<ShellMain');
  });

  it('not-found never renders the public navbar or footer', () => {
    const src = read('./not-found.tsx');
    expect(src).toContain('<ShellHeader');
    expect(src).not.toMatch(/layout\/(Navbar|Footer)/);
    expect(src).not.toContain('svc-h1');
  });

  it('boundary copy lives in PROJECT_COPY (French)', () => {
    const copy = read('../../lib/projects/copy.ts');
    expect(copy).toContain('boundaries: {');
    expect(copy).toContain('Réessayer');
    expect(copy).toContain('Page introuvable');
  });
});

describe('skip link and main landmark', () => {
  it('private layouts start with a skip link to #contenu', () => {
    for (const f of ['./layout.tsx', '../connexion/layout.tsx', '../auth/layout.tsx']) {
      const src = read(f);
      expect(src, f).toContain('href="#contenu"');
      expect(src, f).toContain('pt-skip');
    }
  });

  it('shell main and auth card expose the target', () => {
    expect(read('../../components/portal/ShellMain.tsx')).toContain('id="contenu"');
    expect(read('../../components/portal/AuthCard.tsx')).toContain('id="contenu"');
    expect(read('../portal.css')).toContain('.pt-skip');
  });
});
