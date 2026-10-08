import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  UTM_SOURCES,
  UTM_MEDIUMS,
  SOURCE_ALIASES,
  MEDIUM_ALIASES,
  PLATFORM_PRESETS,
  NONCONFORMITY_CODES,
  NONCONFORMITY_LABELS,
  CAMPAIGN_MAX,
  BASE_LINK_PATHS,
  canonicaliseUtmValue,
  assessUtm,
  slugifyBlock,
  composeCampaign,
  buildTrackedUrl,
} from './utm';
import { parseAttrParams } from './params';

describe('canonicaliseUtmValue', () => {
  it('maps source aliases to canonical values', () => {
    for (const a of ['facebook', 'fb', 'instagram', 'ig', 'facebook-ads', 'meta_ads', 'meta-ads']) {
      expect(canonicaliseUtmValue('utm_source', a)).toBe('meta');
    }
    for (const a of ['adwords', 'googleads', 'google-ads', 'google_ads']) {
      expect(canonicaliseUtmValue('utm_source', a)).toBe('google');
    }
    for (const a of ['gmb', 'google-business', 'googlebusiness', 'google_business', 'gmaps']) {
      expect(canonicaliseUtmValue('utm_source', a)).toBe('gbp');
    }
  });

  it('maps medium aliases to canonical values', () => {
    for (const a of ['paid', 'paidsocial', 'paid-social', 'social_paid', 'social-paid']) {
      expect(canonicaliseUtmValue('utm_medium', a)).toBe('paid_social');
    }
    for (const a of ['ppc', 'paid_search', 'paid-search']) {
      expect(canonicaliseUtmValue('utm_medium', a)).toBe('cpc');
    }
    for (const a of ['seo', 'local']) {
      expect(canonicaliseUtmValue('utm_medium', a)).toBe('organic');
    }
  });

  it('leaves conformant and unknown values unchanged', () => {
    expect(canonicaliseUtmValue('utm_source', 'meta')).toBe('meta');
    expect(canonicaliseUtmValue('utm_source', 'tiktok')).toBe('tiktok');
    expect(canonicaliseUtmValue('utm_medium', 'banner')).toBe('banner');
  });

  it('is idempotent and the alias tables are consistent', () => {
    for (const a of Object.keys(SOURCE_ALIASES)) {
      const once = canonicaliseUtmValue('utm_source', a);
      expect(canonicaliseUtmValue('utm_source', once)).toBe(once);
      expect((UTM_SOURCES as readonly string[]).includes(SOURCE_ALIASES[a])).toBe(true);
      expect((UTM_SOURCES as readonly string[]).includes(a)).toBe(false);
    }
    for (const a of Object.keys(MEDIUM_ALIASES)) {
      const once = canonicaliseUtmValue('utm_medium', a);
      expect(canonicaliseUtmValue('utm_medium', once)).toBe(once);
      expect((UTM_MEDIUMS as readonly string[]).includes(MEDIUM_ALIASES[a])).toBe(true);
      expect((UTM_MEDIUMS as readonly string[]).includes(a)).toBe(false);
    }
    for (const s of UTM_SOURCES) expect(canonicaliseUtmValue('utm_source', s)).toBe(s);
    for (const m of UTM_MEDIUMS) expect(canonicaliseUtmValue('utm_medium', m)).toBe(m);
  });

  it('defines platform presets', () => {
    expect(PLATFORM_PRESETS).toEqual({ meta: 'paid_social', google: 'cpc', gbp: 'organic' });
  });
});

describe('assessUtm', () => {
  it('returns null when no utm key is present', () => {
    expect(assessUtm({})).toBeNull();
    expect(assessUtm({ gclid: 'X' })).toBeNull();
  });

  it('accepts a fully conformant set', () => {
    expect(
      assessUtm({
        utm_source: 'meta',
        utm_medium: 'paid_social',
        utm_campaign: 'agent-vocal_restaurants_202611',
        utm_content: 'video-a',
      }),
    ).toEqual({ conform: true, reasons: [] });
  });

  it('does not flag an absent campaign and never flags utm_term', () => {
    expect(assessUtm({ utm_source: 'gbp', utm_medium: 'organic' })).toEqual({ conform: true, reasons: [] });
    expect(assessUtm({ utm_source: 'google', utm_medium: 'cpc', utm_term: 'Any Thing !!' })).toEqual({
      conform: true,
      reasons: [],
    });
  });

  it('accepts aliases as conformant after canonicalisation', () => {
    expect(assessUtm({ utm_source: 'facebook', utm_medium: 'paid' })?.conform).toBe(true);
  });

  it('flags source and medium problems', () => {
    expect(assessUtm({ utm_source: 'tiktok', utm_medium: 'cpc' })?.reasons).toEqual(['source_unknown']);
    expect(assessUtm({ utm_medium: 'cpc' })?.reasons).toEqual(['source_missing']);
    expect(assessUtm({ utm_source: 'meta', utm_campaign: 'x_y_202611' })?.reasons).toEqual(['medium_missing']);
    expect(assessUtm({ utm_source: 'meta', utm_medium: 'banner' })?.reasons).toEqual(['medium_unknown']);
  });

  it('flags malformed campaigns', () => {
    const base = { utm_source: 'meta', utm_medium: 'paid_social' };
    const long = 'a'.repeat(39) + '_' + 'b'.repeat(14) + '_202611';
    expect(long.length).toBe(61);
    for (const c of [
      'agent-vocal_restaurants',
      'agent-vocal_restaurants_202613',
      'agent vocal_restaurants_202611',
      'agent--vocal_restaurants_202611',
      'a_b_c_202611',
      long,
    ]) {
      expect(assessUtm({ ...base, utm_campaign: c })?.reasons).toEqual(['campaign_malformed']);
    }
    expect(CAMPAIGN_MAX).toBe(60);
  });

  it('flags malformed content', () => {
    const base = { utm_source: 'meta', utm_medium: 'paid_social' };
    expect(assessUtm({ ...base, utm_content: 'video_a' })?.reasons).toEqual(['content_malformed']);
    expect(assessUtm({ ...base, utm_content: 'vidéo-a' })?.reasons).toEqual(['content_malformed']);
  });

  it('returns reasons in code order and does not mutate input', () => {
    const input = { utm_source: 'zzz', utm_medium: 'yyy', utm_campaign: 'Bad', utm_content: 'bad_one' };
    const copy = { ...input };
    expect(assessUtm(input)?.reasons).toEqual([
      'source_unknown',
      'medium_unknown',
      'campaign_malformed',
      'content_malformed',
    ]);
    expect(input).toEqual(copy);
  });

  it('has exactly one non-empty French label per code', () => {
    expect(Object.keys(NONCONFORMITY_LABELS).sort()).toEqual([...NONCONFORMITY_CODES].sort());
    for (const c of NONCONFORMITY_CODES) expect(NONCONFORMITY_LABELS[c].length).toBeGreaterThan(10);
    expect(NONCONFORMITY_LABELS.source_unknown).toBe(
      'Source inconnue : valeurs attendues meta, google ou gbp.',
    );
  });
});

describe('slugifyBlock / composeCampaign', () => {
  it('slugifies', () => {
    expect(slugifyBlock('Agent Vocal')).toBe('agent-vocal');
    expect(slugifyBlock('  Équipe  été ')).toBe('equipe-ete');
    expect(slugifyBlock('a__b--c')).toBe('a-b-c');
    expect(slugifyBlock('!!!')).toBe('');
  });
  it('composes campaign', () => {
    expect(composeCampaign('Agent vocal', 'Restaurants', '2026-11')).toBe('agent-vocal_restaurants_202611');
  });
});

describe('buildTrackedUrl', () => {
  const origin = 'https://sevalys.com';
  const base = {
    origin,
    path: '/simulateur',
    source: 'meta' as const,
    medium: 'paid_social' as const,
    offre: 'Agent vocal',
    cible: 'Restaurants',
    month: '2026-11',
  };
  const allowed = BASE_LINK_PATHS;

  it('builds the expected url', () => {
    const r = buildTrackedUrl({ ...base, content: 'Vidéo A' }, allowed);
    expect(r).toMatchObject({
      ok: true,
      url: 'https://sevalys.com/simulateur?utm_source=meta&utm_medium=paid_social&utm_campaign=agent-vocal_restaurants_202611&utm_content=video-a',
      campaign: 'agent-vocal_restaurants_202611',
    });
  });

  it('keeps term only for google', () => {
    const g = buildTrackedUrl(
      { ...base, source: 'google', medium: 'cpc', term: ' Agent Vocal Tours ' },
      allowed,
    );
    expect(g.ok && g.url).toContain('utm_term=agent+vocal+tours');
    const m = buildTrackedUrl({ ...base, term: 'x' }, allowed);
    expect(m.ok && m.url).not.toContain('utm_term');
  });

  it('reports errors', () => {
    const errs = (o: object) => {
      const r = buildTrackedUrl({ ...base, ...o }, allowed);
      return r.ok ? [] : r.errors;
    };
    expect(errs({ offre: '' })).toContain('offre_missing');
    expect(errs({ cible: ' ' })).toContain('cible_missing');
    expect(errs({ month: '2026-13' })).toContain('month_invalid');
    expect(errs({ month: 'x' })).toContain('month_invalid');
    expect(errs({ offre: 'a'.repeat(50), cible: 'b'.repeat(20) })).toContain('campaign_too_long');
    expect(errs({ content: '!!!' })).toContain('content_invalid');
    expect(errs({ path: '/admin' })).toContain('path_not_allowed');
    expect(errs({ path: 'https://evil.example/' })).toContain('path_not_allowed');
    expect(errs({ path: '//evil.example' })).toContain('path_not_allowed');
    expect(errs({ origin: 'http://sevalys.com' })).toContain('origin_invalid');
    expect(errs({ origin: 'https://sevalys.com/x' })).toContain('origin_invalid');
    const long = buildTrackedUrl({ ...base, offre: 'a'.repeat(50), cible: 'b'.repeat(20) }, allowed);
    expect(!long.ok && long.campaign.length).toBeGreaterThan(60);
  });

  it('always emits urls that assessUtm accepts (property)', () => {
    const table = [
      { offre: 'Agent vocal', cible: 'Restaurants', content: 'Vidéo A' },
      { offre: 'ÉQUIPE été', cible: 'Écoles & Collèges', content: 'Carrousel 1' },
      { offre: 'Site web!!', cible: 'Commerces / Tours', content: undefined },
      { offre: '  spaced   out ', cible: 'a__b', content: 'x--y' },
      { offre: 'Fiche Google', cible: 'Local', content: '' },
      { offre: 'Numéro 1', cible: 'PME', content: 'Variante 2' },
      { offre: 'Çà et là', cible: 'Œuvre', content: 'ÀÉÎ' },
      { offre: 'UPPER', cible: 'LOWER', content: 'Mixed Case' },
      { offre: 'x', cible: 'y', content: 'z' },
      { offre: 'Agent-vocal', cible: 'Restos-bars', content: 'v1' },
      { offre: '2026 promo', cible: '100% local', content: '2' },
      { offre: 'Offre. Spéciale', cible: "L'artisan", content: "l'été" },
    ];
    const sources = Object.keys(PLATFORM_PRESETS) as (keyof typeof PLATFORM_PRESETS)[];
    let n = 0;
    for (const row of table) {
      for (const source of sources) {
        for (const path of BASE_LINK_PATHS) {
          const r = buildTrackedUrl(
            { origin, path, source, medium: PLATFORM_PRESETS[source], month: '2026-12', term: 'kw', ...row },
            allowed,
          );
          expect(r.ok).toBe(true);
          if (!r.ok) continue;
          n++;
          const u = new URL(r.url);
          expect(u.origin).toBe(origin);
          const parsed = parseAttrParams(u.searchParams, { allowClickIds: false });
          expect(assessUtm(parsed)).toEqual({ conform: true, reasons: [] });
        }
      }
    }
    expect(n).toBeGreaterThanOrEqual(12);
  });
});

describe('docs/convention-utm.md', () => {
  const doc = readFileSync(new URL('../../../docs/convention-utm.md', import.meta.url), 'utf8');

  it('stays in sync with the module', () => {
    for (const s of UTM_SOURCES) expect(doc).toContain(s);
    for (const m of UTM_MEDIUMS) expect(doc).toContain(m);
    for (const a of Object.keys(SOURCE_ALIASES)) expect(doc).toContain(a);
    for (const a of Object.keys(MEDIUM_ALIASES)) expect(doc).toContain(a);
    expect(doc).toContain('offre_cible_aaaamm');
    expect(doc).toContain(String(CAMPAIGN_MAX));
    expect(doc).toContain('Hors convention');
    for (const c of NONCONFORMITY_CODES) {
      expect(doc).toContain(c);
      expect(doc).toContain(NONCONFORMITY_LABELS[c]);
    }
  });
});
