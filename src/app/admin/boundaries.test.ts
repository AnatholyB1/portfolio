import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const loading = read('./loading.tsx');
const error = read('./error.tsx');
const notFound = read('./not-found.tsx');
const layout = read('./layout.tsx');
const nav = read('../../components/admin/AdminNav.tsx');
const css = read('../../components/admin/admin.css');
const leadsCss = read('../../components/admin/leads/leads.css');

describe('admin route boundaries and shell', () => {
  it('loading keeps the shell, announces the wait with a status role and a real ellipsis', () => {
    // Le squelette vit dans AdminLoadingShell, partagé par les loading.tsx de chaque route.
    const shell = read('../../components/admin/AdminLoadingShell.tsx');
    expect(loading).toContain('AdminLoadingShell');
    expect(shell).toContain('<AdminNav');
    expect(shell).toContain('role="status"');
    expect(shell).toContain('Chargement…');
    expect(shell).not.toContain('...');
    expect(shell).toContain('aria-hidden="true"');
  });

  it('error is a client boundary in French with retry and a way back, nav preserved', () => {
    expect(error.startsWith("'use client';")).toBe(true);
    expect(error).toContain('<AdminNav');
    expect(error).toContain('reset()');
    expect(error).toContain('Réessayer');
    expect(error).toContain('href="/admin"');
    expect(error).toContain('role="alert"');
  });

  it('not-found stays inside the private shell (no public navbar)', () => {
    expect(notFound).toContain('<AdminNav');
    expect(notFound).toContain('Élément introuvable');
    for (const banned of ['@/components/layout/Navbar', '@/components/layout/Footer']) expect(notFound).not.toContain(banned);
  });

  it('layout provides a skip link whose target is rendered by the nav', () => {
    expect(layout).toContain('href="#admin-contenu"');
    expect(nav).toContain('id="admin-contenu"');
  });

  it('nav wraps instead of overflowing and its rules live in admin.css, not leads.css', () => {
    expect(css).toMatch(/\.pt-admin \.pt-admin-nav ul \{[^}]*flex-wrap: wrap/);
    expect(leadsCss).not.toContain('.pt-admin-nav');
    expect(nav).not.toContain('leads.css');
    expect(nav).toContain("import './admin.css'");
  });

  it('nav keeps its label, aria-current and the eight entries', () => {
    expect(nav).toContain('aria-label="Administration"');
    expect(nav).toContain("aria-current={i.key === current ? 'page' : undefined}");
    expect((nav.match(/\{ key: '/g) ?? []).length).toBe(8);
  });
});
