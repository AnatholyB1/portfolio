// Pure attribution parsing (no next/*, supabase or node:* imports).
// Shared by proxy.ts and route handlers.
// utm_source/utm_medium are canonicalised here (D-03, phase 19); the rules live
// in the single module utm.ts.
import { canonicaliseUtmValue, type UtmRaw } from './utm';

export const ALLOWED_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'gclid',
  'fbclid',
  'ttclid',
] as const;

export const CLICK_ID_KEYS = ['gclid', 'fbclid', 'ttclid'] as const;

export const MAX_VALUE_LENGTH = 200;

export type AttrKey = (typeof ALLOWED_KEYS)[number];
export type AttrParams = Partial<Record<AttrKey, string>>;

const CLICK_ID_SET: readonly string[] = CLICK_ID_KEYS;

export function isClickIdKey(key: string): boolean {
  return CLICK_ID_SET.includes(key);
}

// Whitelist parser. Values longer than 200 chars are dropped, never truncated.
// utm_* are lowercased; click ids keep their case (case-sensitive tokens,
// deliberate deviation from the literal wording of D-09).
export function parseAttrParamsWithRaw(
  search: URLSearchParams,
  opts: { allowClickIds: boolean },
): { params: AttrParams; raw: UtmRaw | null } {
  const out: AttrParams = {};
  const raw: UtmRaw = {};
  for (const key of ALLOWED_KEYS) {
    const click = isClickIdKey(key);
    if (click && !opts.allowClickIds) continue;
    const received = search.get(key);
    if (received == null) continue;
    // eslint-disable-next-line no-control-regex
    const original = received.replace(/[\u0000-\u001f\u007f]/g, '').trim();
    let v = original;
    if (!click) v = v.toLowerCase();
    if (v.length === 0 || v.length > MAX_VALUE_LENGTH) continue;
    if (key === 'utm_source' || key === 'utm_medium') {
      const canonical = canonicaliseUtmValue(key, v);
      if (canonical !== v) raw[key] = original;
      v = canonical;
    }
    out[key] = v;
  }
  return { params: out, raw: Object.keys(raw).length > 0 ? raw : null };
}

export function parseAttrParams(search: URLSearchParams, opts: { allowClickIds: boolean }): AttrParams {
  return parseAttrParamsWithRaw(search, opts).params;
}

export const IGNORED_REFERRER_HOSTS: readonly string[] = [
  'checkout.stripe.com',
  'sevalys.com',
  'www.sevalys.com',
];

const IGNORED_REFERRER_SUFFIXES: readonly string[] = ['.supabase.co'];

export function parseReferrer(
  referer: string | null,
  siteHost: string,
  ignored: readonly string[] = IGNORED_REFERRER_HOSTS,
): string | null {
  if (!referer) return null;
  try {
    const u = new URL(referer);
    const host = u.hostname.toLowerCase();
    const site = siteHost.toLowerCase();
    if (host === site || host.endsWith('.' + site)) return null;
    if (ignored.includes(host)) return null;
    if (IGNORED_REFERRER_SUFFIXES.some((s) => host.endsWith(s))) return null;
    return (u.origin + u.pathname).slice(0, MAX_VALUE_LENGTH).toLowerCase();
  } catch {
    return null;
  }
}
