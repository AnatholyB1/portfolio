import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { GUARDED_PUBLIC_FILES, PRICE_ALLOWED_ZONES, isInPriceAllowedZone } from './priceScope';

// FOUND-06 / D-17 / D-11 / D-12 / D-18 : le périmètre prix est explicite et les
// frontières d'import sont vérifiées. Les dossiers absents sont tolérés (les
// plans suivants les créent) ; les garde-fous s'appliquent dès qu'ils existent.

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const SRC = join(ROOT, 'src');

const rel = (f: string) => relative(ROOT, f).split(sep).join('/');

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(full));
    else if (/\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) out.push(full);
  }
  return out;
}

function specifiers(source: string): string[] {
  const out: string[] = [];
  for (const m of source.matchAll(/(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]/g)) out.push(m[1]);
  for (const m of source.matchAll(/import\s*['"]([^'"]+)['"]/g)) out.push(m[1]);
  for (const m of source.matchAll(/import\(\s*['"]([^'"]+)['"]\s*\)/g)) out.push(m[1]);
  return out;
}

// Chemin repo-relatif d'un import local ('@/…' ou relatif), sinon null.
function resolveLocal(file: string, spec: string): string | null {
  if (spec.startsWith('@/')) return rel(join(SRC, spec.slice(2)));
  if (spec.startsWith('.')) return rel(resolve(dirname(file), spec));
  return null;
}

const allSrc = walk(SRC);
const read = (f: string) => readFileSync(f, 'utf8');

describe('price scope zones (D-17)', () => {
  it('(a) every guarded public file exists and is outside the allowed zones', () => {
    expect(GUARDED_PUBLIC_FILES.length).toBe(8);
    for (const g of GUARDED_PUBLIC_FILES) {
      expect(existsSync(join(ROOT, g.file)), g.file).toBe(true);
      expect(isInPriceAllowedZone(g.file), g.file).toBe(false);
      expect(g.guardedBy.length).toBeGreaterThan(0);
    }
  });

  it('lists the fifteen documented zones with a rationale', () => {
    expect(PRICE_ALLOWED_ZONES.map((z) => z.path).sort()).toEqual(
      [
        'src/app/admin',
        'src/app/api/avis',
        'src/app/api/cron',
        'src/app/api/resend',
        'src/app/api/stripe',
        'src/app/api/unsubscribe',
        'src/app/auth',
        'src/app/connexion',
        'src/app/desinscription',
        'src/app/espace-client',
        'src/components/admin',
        'src/components/portal',
        'src/lib/documents',
        'src/lib/server',
        'src/lib/signature',
      ].sort(),
    );
    for (const z of PRICE_ALLOWED_ZONES) expect(z.reason.length).toBeGreaterThan(10);
  });

  it('keeps the public review pages and helpers outside every zone', () => {
    for (const f of [
      'src/app/avis',
      'src/app/avis/[token]/page.tsx',
      'src/app/politique-des-avis',
      'src/components/sections/AvisExcerpt.tsx',
      'src/lib/reviews/token.ts',
    ]) {
      expect(isInPriceAllowedZone(f), f).toBe(false);
    }
    expect(isInPriceAllowedZone('src/app/api/avis/route.ts')).toBe(true);
  });

  it('(b) no code outside the allowed zones imports from an allowed zone', () => {
    for (const file of allSrc) {
      if (isInPriceAllowedZone(rel(file))) continue;
      for (const spec of specifiers(read(file))) {
        const target = resolveLocal(file, spec);
        if (!target) continue;
        expect(isInPriceAllowedZone(target), `${rel(file)} imports ${spec}`).toBe(false);
      }
    }
  });
});

describe('private zones isolation (D-11, D-12)', () => {
  const privateDirs = [
    'app/espace-client',
    'app/admin',
    'app/connexion',
    'app/auth',
    'components/portal',
    'components/admin',
  ].map((d) => join(SRC, d));
  const privateFiles = privateDirs.flatMap(walk);
  const forbidden = [
    /^gsap(\/|$)/,
    /^three(\/|$)/,
    /^@react-three\//,
    /CinemaIntro/,
    /CustomCursor/,
    /^@\/context\/LanguageContext/,
    /^@\/components\/ui\/ClientProviders/,
    /^@\/components\/layout\/Navbar/,
    /^@\/components\/layout\/Footer/,
  ];

  it('(c) private zones never import gsap/three/cinema/cursor/language/public chrome', () => {
    for (const file of privateFiles) {
      const src = read(file);
      for (const spec of specifiers(src)) {
        for (const re of forbidden) expect(re.test(spec), `${rel(file)} imports ${spec}`).toBe(false);
      }
      expect(/useLanguage\(/.test(src), `${rel(file)} calls useLanguage`).toBe(false);
    }
  });

  it('(c) the forbidden list actually matches known public modules', () => {
    for (const spec of [
      'gsap',
      'gsap/ScrollTrigger',
      'three',
      '@react-three/fiber',
      '@/components/ui/CinemaIntro',
      '@/components/ui/CustomCursor',
      '@/context/LanguageContext',
      '@/components/ui/ClientProviders',
      '@/components/layout/Navbar',
      '@/components/layout/Footer',
    ]) {
      expect(forbidden.some((re) => re.test(spec)), spec).toBe(true);
    }
    expect(existsSync(join(SRC, 'components/layout/Navbar.tsx'))).toBe(true);
    expect(existsSync(join(SRC, 'components/layout/Footer.tsx'))).toBe(true);
  });
});

describe('server-only boundary (D-18)', () => {
  const serverOnly = [
    /^@\/lib\/supabase\/admin/,
    /^@\/lib\/supabase\/server/,
    /^@\/lib\/server\//,
    /^@\/lib\/leads\/(ingest|ipHash|requestAttribution|visits)/,
    /^@\/lib\/throttle/,
    /^@\/lib\/consent\/serverLog/,
    /^server-only$/,
  ];
  const isUseClient = (src: string) =>
    /^(?:\s|\/\/[^\n]*\n|\/\*[\s\S]*?\*\/)*['"]use client['"]/.test(src);

  it("(d) no 'use client' file imports server-only modules", () => {
    for (const file of allSrc) {
      const src = read(file);
      if (!isUseClient(src)) continue;
      for (const spec of specifiers(src)) {
        for (const re of serverOnly) expect(re.test(spec), `${rel(file)} imports ${spec}`).toBe(false);
      }
    }
  });

  it("(d) the 'use client' detector recognises real client files", () => {
    expect(isUseClient(read(join(SRC, 'components/ui/ClientProviders.tsx')))).toBe(true);
    expect(isUseClient("// c\n'use client';\nimport x from 'server-only'")).toBe(true);
    expect(isUseClient("import 'server-only'\n'use client'")).toBe(false);
  });
});

describe('scoped, not blanket (e)', () => {
  it('a public file containing a euro sign is outside every allowed zone and not flagged', () => {
    const f = 'src/app/calculateur-roi/page.tsx';
    expect(read(join(ROOT, f))).toContain('€');
    expect(isInPriceAllowedZone(f)).toBe(false);
    expect(isInPriceAllowedZone('src/app/espace-client/page.tsx')).toBe(true);
    expect(isInPriceAllowedZone('src/app/espace-clientele/page.tsx')).toBe(false);
  });
});
