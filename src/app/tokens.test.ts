import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const dir = new URL('.', import.meta.url);
const tokens = readFileSync(new URL('tokens.css', dir), 'utf8');
const portal = readFileSync(new URL('portal.css', dir), 'utf8');
const globals = readFileSync(new URL('globals.css', dir), 'utf8');

describe('back-office design tokens', () => {
  it('prefixes every custom property with --pt-', () => {
    const names = [...tokens.matchAll(/^\s*(--[\w-]+)\s*:/gm)].map((m) => m[1]);
    expect(names.length).toBeGreaterThanOrEqual(11);
    for (const n of names) expect(n.startsWith('--pt-')).toBe(true);
  });

  it('defines motion, radius and shadow scales', () => {
    for (const n of ['ease-out', 'ease-in-out', 'dur-fast', 'dur-base', 'dur-slow', 'radius-sm', 'radius-md', 'radius-pill', 'shadow-sm', 'shadow-md', 'shadow-lg']) {
      expect(tokens).toContain(`--pt-${n}:`);
    }
    expect(tokens).toContain('cubic-bezier(0.16, 1, 0.3, 1)');
  });

  it('collapses durations under prefers-reduced-motion', () => {
    const block = tokens.slice(tokens.indexOf('@media (prefers-reduced-motion: reduce)'));
    for (const n of ['fast', 'base', 'slow']) expect(block).toMatch(new RegExp(`--pt-dur-${n}:\\s*0\\.01ms`));
  });

  it('is loaded by the private shells only, never by the public globals', () => {
    expect(portal).toContain('@import "./tokens.css"');
    expect(globals).not.toContain('tokens.css');
    expect(globals).not.toMatch(/--pt-(ease|dur|radius|shadow)/);
  });
});
