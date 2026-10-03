import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Contrat UI partagé projet, vérifié sur le texte source (D-22, 12-UI-SPEC).
const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const timeline = read('./Timeline.tsx');
const files = read('./FilesPanel.tsx');
const css = read('./project.css');
const types = read('./types.ts');

describe('Timeline', () => {
  it('is a labelled ordered list with step semantics', () => {
    expect(timeline).toContain('<ol aria-label="Avancement du projet"');
    expect(timeline).toMatch(/aria-current=\{[^}]*'step'/);
  });

  it('conveys state in text for screen readers', () => {
    expect(timeline).toContain('pt-sr-only');
    const copy = read('../../../lib/projects/copy.ts');
    expect(copy).toContain("doneSuffix: ', terminée'");
    expect(copy).toContain("currentSuffix: ', étape en cours'");
    expect(copy).toContain("upcomingSuffix: ', à venir'");
  });

  it('stays a pure server component without server data imports', () => {
    expect(timeline).not.toMatch(/from '@\/lib\/(server|supabase)/);
    expect(timeline).not.toMatch(/^'use client'/);
  });

  it('only shows the actor kind in the admin variant', () => {
    expect(timeline).toMatch(/variant === 'admin' && s\.completedBy/);
  });
});

describe('FilesPanel', () => {
  it('is a client component using a progress-reporting direct upload', () => {
    expect(files).toMatch(/^'use client'/);
    expect(files).toContain('upload.onprogress');
    expect(files).toContain('<progress');
  });

  it('never touches the admin client nor renders raw HTML or previews', () => {
    expect(files).not.toContain('createSupabaseAdminClient');
    expect(files).not.toContain('dangerouslySetInnerHTML');
    expect(files).not.toContain('<img');
  });

  it('has no animation or cursor dependencies and no delete control', () => {
    for (const src of [timeline, files, types]) {
      expect(src).not.toMatch(/gsap|CustomCursor/);
    }
    expect(files).not.toMatch(/Supprimer|Trash/);
  });
});

describe('project.css', () => {
  it('uses no 12px size and no --ink-faint text color', () => {
    expect(css).not.toMatch(/(^|[^0-9])12px/);
    expect(css).not.toMatch(/(^|[^-])color:\s*var\(--ink-faint\)/);
  });

  it('uses only token colors (no hex literal)', () => {
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it('keeps transitions behind a reduced-motion override and defines no animation', () => {
    expect(css).not.toMatch(/animation\s*:|@keyframes/);
    if (/transition\s*:/.test(css)) expect(css).toContain('prefers-reduced-motion');
  });

  it('scopes rules under .pt-root', () => {
    const selectors = css.match(/^\.(?!pt-root)[a-z-]+/gm) ?? [];
    expect(selectors).toEqual([]);
  });
});

describe('no price copy', () => {
  it('has no euro, price or tariff wording in any project UI source', () => {
    for (const src of [timeline, files, css, types]) {
      expect(src).not.toMatch(/€|\beuros?\b|\bprix\b|\btarifs?\b/i);
    }
  });
});
