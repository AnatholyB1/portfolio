import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const url = (rel: string) => new URL(rel, import.meta.url);

// 404 scopées : une route inconnue sous /espace-client ou /admin retombait sur la 404 publique.
describe('unknown private routes use the scoped 404', () => {
  for (const [label, page, notFound] of [
    ['portal', './espace-client/[...rest]/page.tsx', './espace-client/not-found.tsx'],
    ['admin', './admin/[...slug]/page.tsx', './admin/not-found.tsx'],
  ] as const) {
    it(`${label}: catch-all page calls notFound() and the segment has its own not-found`, () => {
      expect(existsSync(url(page))).toBe(true);
      expect(existsSync(url(notFound))).toBe(true);
      expect(readFileSync(url(page), 'utf8')).toContain('notFound();');
    });
  }
});
