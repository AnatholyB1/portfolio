import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { translations } from '@/lib/translations';

// Source guards for the v2.0 public UI/UX fixes (fixes-public.md). Read as text so the
// server components with next/font imports never have to load under vitest.
const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8');
const css = read('./globals.css');
const layout = read('./layout.tsx');
const footer = read('../components/layout/Footer.tsx');
const wizard = read('../components/simulateur/Wizard.tsx');
const mentions = read('./mentions-legales/page.tsx');
const desinscription = read('./desinscription/page.tsx');
const simPage = read('./simulateur/page.tsx');
const home = read('./page.tsx');
const skip = read('../components/ui/SkipLink.tsx');

function luminance(hex: string): number {
  const c = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
const token = (name: string) => {
  const m = css.match(new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6})`));
  if (!m) throw new Error(`token ${name} not found`);
  return m[1];
};

describe('global tokens and a11y base', () => {
  it('--ink-faint is text-safe (>= 4.5:1) on --bg, --bg-2 and --bg-3', () => {
    const faint = token('ink-faint');
    for (const bg of ['bg', 'bg-2', 'bg-3']) {
      expect(contrast(faint, token(bg)), `ink-faint on ${bg}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('declares color-scheme dark, balanced headings and tabular numbers', () => {
    expect(css).toMatch(/color-scheme:\s*dark/);
    expect(css).toMatch(/h1,\s*h2,\s*h3\s*\{\s*text-wrap:\s*balance/);
    expect(css).toMatch(/font-variant-numeric:\s*tabular-nums/);
  });

  it('keeps a 16px mobile gutter', () => {
    expect(css).toMatch(/@media \(max-width: 900px\) \{\s*\.wrap \{ padding: 0 16px; \}/);
  });

  it('footer anchors have a 44px target and a text-safe colour', () => {
    const rule = css.match(/\.foot-links a \{[^}]*\}/)?.[0] ?? '';
    expect(rule).toContain('min-height: 44px');
    expect(rule).not.toContain('--ink-faint');
  });

  it('root layout mounts the skip link and exposes theme-color/color-scheme', () => {
    expect(layout).toContain('<SkipLink />');
    expect(layout).toMatch(/themeColor:\s*"#0A0B0C"/);
    expect(layout).toMatch(/colorScheme:\s*"dark"/);
    expect(skip).toContain('skipToContent');
    expect(css).toContain('.skip-link');
  });

  it('footer review labels come from translations in fr, en and th', () => {
    expect(footer).toContain('{f.reviews}');
    expect(footer).toContain('{f.reviewPolicy}');
    expect(footer).not.toMatch(/>Avis<|>Politique des avis</);
    for (const lang of ['fr', 'en', 'th'] as const) {
      const f = translations[lang].landing.footer;
      expect(f.reviews.length).toBeGreaterThan(0);
      expect(f.reviewPolicy.length).toBeGreaterThan(0);
      expect(translations[lang].nav.skipToContent.length).toBeGreaterThan(0);
    }
  });

  it("simulator contact form: labels bound to inputs, required phone with a visible hint, error described", () => {
    for (const id of ["sim-nom", "sim-email", "sim-telephone"]) {
      expect(wizard).toContain('htmlFor="' + id + '"');
      expect(wizard).toContain('id="' + id + '"');
    }
    // Business rule: the phone number stays required.
    expect(wizard).toMatch(/type="tel"\s+inputMode="tel"\s+required/);
    expect(wizard).toContain('autoComplete="tel"');
    expect(wizard).toContain('id="sim-telephone-hint"');
    expect(wizard).toContain('t.simulateur.contact.telephoneHint');
    expect(wizard).toContain('inputMode="email"');
    expect(wizard).toContain("aria-describedby");
    expect(wizard).toContain('id="sim-error"');
    expect(wizard).toContain('aria-live="assertive"');
    for (const lang of ["fr", "en", "th"] as const) {
      const c = translations[lang].simulateur.contact;
      expect(c.telephoneHint.length).toBeGreaterThan(0);
      expect(c.requiredNote.length).toBeGreaterThan(0);
    }
  });

  it("legal and unsubscribe pages: main target, 44px contact links, non-breaking punctuation", () => {
    expect(mentions).toContain('id="main-content"');
    expect(mentions).toContain("&nbsp;:");
    expect(mentions).toContain("n°&nbsp;");
    expect(mentions).not.toMatch(/[a-zé] :/);
    expect(desinscription.match(/min-h-\[44px\]/g)).toHaveLength(3);
    expect(simPage).toContain('id="main-content"');
  });

  it("home page is a server component with a revalidated, server-fetched review excerpt", () => {
    expect(home).not.toContain("use client");
    expect(home).toContain("export const revalidate");
    expect(home).toContain("<RevealsMount />");
    expect(home).toContain('id="main-content"');
  });
});
