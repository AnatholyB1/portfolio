// Pure attribution parsing (no next/*, supabase or node:* imports).
// Shared by proxy.ts and route handlers.

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
export function parseAttrParams(search: URLSearchParams, opts: { allowClickIds: boolean }): AttrParams {
  const out: AttrParams = {};
  for (const key of ALLOWED_KEYS) {
    const click = isClickIdKey(key);
    if (click && !opts.allowClickIds) continue;
    const raw = search.get(key);
    if (raw == null) continue;
    // eslint-disable-next-line no-control-regex
    let v = raw.replace(/[\u0000-\u001f\u007f]/g, '').trim();
    if (!click) v = v.toLowerCase();
    if (v.length === 0 || v.length > MAX_VALUE_LENGTH) continue;
    out[key] = v;
  }
  return out;
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
