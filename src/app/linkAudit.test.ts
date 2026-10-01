import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { services } from '@/data/services';
import { translations } from '@/lib/translations';
import sitemap from './sitemap';

// SEO-03 regression guard (D-09): every internal href must resolve to a real
// route, and every hash to an id rendered on that route.

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const SRC = join(ROOT, 'src');
const APP = join(SRC, 'app');

const readSafe = (file: string): string => {
  try {
    return readFileSync(file, 'utf8');
  } catch {
    return '';
  }
};

function walk(dir: string, accept: (name: string) => boolean, skipDirs: string[] = []): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (skipDirs.includes(entry.name)) continue;
      out.push(...walk(full, accept, skipDirs));
    } else if (accept(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

const ID_PATTERN = /\bid="([^"]+)"/g;
function extractIds(source: string): string[] {
  return Array.from(source.matchAll(ID_PATTERN), (m) => m[1]);
}

function resolveImport(spec: string): string | null {
  const base = join(SRC, spec.slice(2));
  for (const ext of ['.tsx', '.ts', '/index.tsx']) {
    const candidate = base + ext;
    if (readSafe(candidate)) return candidate;
  }
  return null;
}

function collectIds(pageFile: string): Set<string> {
  const source = readSafe(pageFile);
  const ids = new Set(extractIds(source));
  for (const m of source.matchAll(/from\s+'(@\/components\/[^']+)'|from\s+"(@\/components\/[^"]+)"/g)) {
    const file = resolveImport(m[1] ?? m[2]);
    if (file) extractIds(readSafe(file)).forEach((id) => ids.add(id));
  }
  return ids;
}

type RouteTable = Map<string, Set<string>>;

function buildRouteTable(): RouteTable {
  const table: RouteTable = new Map();
  const slugs = services.map((s) => s.slug);
  for (const page of walk(APP, (n) => n === 'page.tsx', ['api'])) {
    const dir = relative(APP, join(page, '..'));
    const segments = dir.split(sep).filter((seg) => seg && !/^\(.*\)$/.test(seg));
    const ids = collectIds(page);
    const variants = segments.some((seg) => seg === '[slug]')
      ? slugs.map((slug) => segments.map((seg) => (seg === '[slug]' ? slug : seg)))
      : [segments];
    for (const v of variants) table.set('/' + v.join('/'), ids);
  }
  return table;
}

const ROUTES = buildRouteTable();

const ALLOWED_TEMPLATES = ['`/services/${s.slug}`', '`/services/${copy.crossLink.slug}`'];

function resolveHref(href: string, fromRoute: string): { ok: boolean; reason: string } {
  if (/^(https?:|mailto:|tel:)/.test(href)) return { ok: true, reason: 'external' };
  if (href.startsWith('`')) {
    return ALLOWED_TEMPLATES.includes(href)
      ? { ok: true, reason: 'known slug template' }
      : { ok: false, reason: 'unknown template href, needs explicit decision' };
  }
  let path: string;
  let hash = '';
  if (href.startsWith('#')) {
    path = fromRoute;
    hash = href.slice(1);
  } else {
    const idx = href.indexOf('#');
    path = idx === -1 ? href : href.slice(0, idx);
    hash = idx === -1 ? '' : href.slice(idx + 1);
  }
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
  const ids = ROUTES.get(path);
  if (!ids) return { ok: false, reason: `no route ${path}` };
  if (hash && !ids.has(hash)) return { ok: false, reason: `no id "${hash}" on ${path}` };
  return { ok: true, reason: 'ok' };
}

const HREF_PATTERN = /href=(?:"([^"]*)"|\{`([^`]*)`\})/g;
function extractHrefs(source: string): string[] {
  const hrefs: string[] = [];
  let match: RegExpExecArray | null;
  HREF_PATTERN.lastIndex = 0;
  while ((match = HREF_PATTERN.exec(source)) !== null) {
    if (match[1] !== undefined) hrefs.push(match[1]);
    else if (match[2] !== undefined) hrefs.push(`\`${match[2]}\``);
  }
  return hrefs;
}

describe('resolveHref fixtures', () => {
  it('rejects known-bad targets', () => {
    expect(resolveHref('/services#phone-agent', '/').ok).toBe(false);
    expect(resolveHref('/nope', '/').ok).toBe(false);
    expect(resolveHref('/services/not-a-slug', '/').ok).toBe(false);
    expect(resolveHref('/#phone-agent', '/').ok).toBe(false);
    expect(resolveHref('`/other/${x}`', '/').ok).toBe(false);
  });

  it('accepts known-good targets', () => {
    for (const href of ['/#contact', '/services', '/services/branding', '/simulateur', '#contact']) {
      const r = resolveHref(href, '/');
      expect(r.ok, `${href} -> ${r.reason}`).toBe(true);
    }
  });
});

describe('route table', () => {
  it('is derived from the filesystem and includes services slugs', () => {
    for (const r of ['/', '/services', '/simulateur', '/demo/feuillette']) {
      expect(ROUTES.has(r), r).toBe(true);
    }
    for (const s of services) expect(ROUTES.has(`/services/${s.slug}`)).toBe(true);
    const nonSlug = [...ROUTES.keys()].filter((r) => !r.startsWith('/services/'));
    expect(nonSlug.length).toBeGreaterThanOrEqual(7);
  });
});

function routeForFile(file: string): string {
  const rel = relative(APP, file);
  if (rel.startsWith('..')) return '/';
  const segments = rel.split(sep).slice(0, -1).filter((seg) => seg && !/^\(.*\)$/.test(seg));
  if (segments.length === 0) return '/';
  const route = '/' + segments.map((seg) => (seg === '[slug]' ? services[0].slug : seg)).join('/');
  return route;
}

describe('internal links', () => {
  it('every href in src tsx files and projects.ts resolves', () => {
    const files = walk(SRC, (n) => n.endsWith('.tsx') && !/\.test\.tsx?$/.test(n));
    let internalCount = 0;
    for (const file of files) {
      const from = routeForFile(file);
      for (const href of extractHrefs(readSafe(file))) {
        if (!/^(https?:|mailto:|tel:)/.test(href)) internalCount++;
        const r = resolveHref(href, from);
        expect(r.ok, `${relative(ROOT, file)}: ${href} -> ${r.reason}`).toBe(true);
      }
    }
    const projectsFile = join(SRC, 'data', 'projects.ts');
    for (const m of readSafe(projectsFile).matchAll(/href:\s*'([^']+)'/g)) {
      if (!/^(https?:|mailto:|tel:)/.test(m[1])) internalCount++;
      const r = resolveHref(m[1], '/');
      expect(r.ok, `src/data/projects.ts: ${m[1]} -> ${r.reason}`).toBe(true);
    }
    expect(internalCount).toBeGreaterThan(10);
  });

  it('every crossLink slug is a valid service slug', () => {
    const slugs = services.map((s) => s.slug);
    for (const lang of ['fr', 'en', 'th'] as const) {
      const items = translations[lang].services.pages.items as { crossLink: { slug: string } | null }[];
      for (const item of items) {
        if (item.crossLink) expect(slugs, `${lang}: ${item.crossLink.slug}`).toContain(item.crossLink.slug);
      }
    }
  });

  it('llms.txt and sitemap URLs resolve to routes', () => {
    const llms = readSafe(join(ROOT, 'public', 'llms.txt'));
    const paths: string[] = [];
    for (const line of llms.split(/\r?\n/)) {
      for (const m of line.matchAll(/https:\/\/sevalys\.com(\/[^\s)]*)?/g)) paths.push(m[1] ?? '/');
    }
    expect(paths.length).toBeGreaterThan(0);
    for (const u of sitemap().map((e) => new URL(e.url).pathname)) paths.push(u);
    for (const p of paths) {
      const r = resolveHref(p, '/');
      expect(r.ok, `llms/sitemap: ${p} -> ${r.reason}`).toBe(true);
    }
  });
});
