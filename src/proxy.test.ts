import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PRIVATE_PREFIXES } from '@/lib/privateRoutes';

const root = process.cwd();
const source = readFileSync(join(root, 'src/proxy.ts'), 'utf8');

function readMatcher(): string[] {
  const m = source.match(/matcher:\s*\[([^\]]*)\]/);
  expect(m).not.toBeNull();
  return [...m![1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
}

describe('src/proxy.ts', () => {
  it('has the literal matcher', () => {
    expect(readMatcher()).toEqual([
      '/espace-client/:path*',
      '/espace-client',
      '/admin/:path*',
      '/admin',
      '/connexion',
      '/auth/:path*',
    ]);
  });

  it('covers every PRIVATE_PREFIXES entry', () => {
    const matcher = readMatcher();
    for (const prefix of PRIVATE_PREFIXES) {
      expect(matcher.some((p) => p === prefix || p === `${prefix}/:path*`)).toBe(true);
    }
  });

  it('excludes /api and has no catch-all', () => {
    const matcher = readMatcher();
    expect(matcher.some((p) => p.startsWith('/api'))).toBe(false);
    expect(matcher).not.toContain('/:path*');
  });

  it('exports proxy, not middleware, and no middleware file exists', () => {
    expect(source).toMatch(/export async function proxy\(/);
    expect(source).not.toMatch(/export (async )?function middleware/);
    expect(existsSync(join(root, 'middleware.ts'))).toBe(false);
    expect(existsSync(join(root, 'src/middleware.ts'))).toBe(false);
  });
});
