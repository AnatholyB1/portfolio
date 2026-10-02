import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8');
const dialog = read('./ConsentDialog.tsx');
const css = read('./consent.css');
const layout = read('../../app/layout.tsx');

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|css)$/.test(name) && !/\.test\.ts$/.test(name)) out.push(p);
  }
  return out;
}

describe('ConsentDialog contract (LEAD-09, D-02)', () => {
  it('uses a native modal dialog with a11y attributes', () => {
    for (const s of ['<dialog', 'showModal', 'aria-labelledby', 'aria-describedby', 'tabIndex={-1}']) {
      expect(dialog).toContain(s);
    }
  });

  it('neutralises Escape (cancel) and posts to /api/consent', () => {
    expect(dialog).toMatch(/cancel/i);
    expect(dialog).toContain('preventDefault');
    expect(dialog).toContain('/api/consent');
    expect(dialog).toContain('CONSENT_CHANGED_EVENT');
  });

  it('renders two identical buttons, Refuser first', () => {
    const buttons = dialog.match(/<button[\s\S]*?<\/button>/g) ?? [];
    expect(buttons).toHaveLength(2);
    for (const b of buttons) {
      expect(b).toContain('className="consent-btn"');
      expect(b).not.toMatch(/btn-ghost|btn-primary|acid/);
    }
    expect(buttons[0]).toContain("'refused'");
    expect(buttons[1]).toContain("'accepted'");
  });

  it('is hidden on private paths and the legal page', () => {
    expect(dialog).toContain('isPrivatePath');
    expect(dialog).toContain('/mentions-legales');
  });

  it('css: single shared hover, scoped border token, reduced motion, acid only on focus', () => {
    expect(css).toContain('--consent-border: #6F6B64');
    expect(css).toContain('prefers-reduced-motion');
    expect(css.match(/\.consent-btn\s*\{/g)).toHaveLength(1);
    expect(css.match(/\.consent-btn:hover/g)).toHaveLength(1);
    for (const rule of css.split('}')) {
      if (rule.includes('--acid')) expect(rule).toContain(':focus-visible');
    }
  });

  it('root layout stays static (no cookies())', () => {
    expect(layout).not.toContain('cookies(');
    expect(layout).not.toContain('from "next/headers"');
  });

  it('no advertising tag anywhere in src (D-05)', () => {
    const root = join(process.cwd(), 'src');
    for (const f of walk(root)) {
      const txt = readFileSync(f, 'utf8');
      for (const bad of ['fbevents', 'googletagmanager', 'gtag(', 'connect.facebook.net']) {
        expect(txt.includes(bad), `${f} contains ${bad}`).toBe(false);
      }
    }
  });
});
