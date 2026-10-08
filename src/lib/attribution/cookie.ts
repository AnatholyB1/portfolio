import {
  CLICK_ID_KEYS,
  MAX_VALUE_LENGTH,
  parseAttrParamsWithRaw,
  type AttrParams,
} from './params';
import type { Touch } from './touch';
import type { UtmRaw } from './utm';

export const ATTR_FT_COOKIE = 'sv_attr_ft';
export const ATTR_LT_COOKIE = 'sv_attr_lt';
export const ATTR_MAX_AGE_SECONDS = 30 * 24 * 3600;
export const MAX_COOKIE_VALUE_BYTES = 3800;

function toBase64Url(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): string | null {
  try {
    if (!/^[A-Za-z0-9_-]+$/.test(s)) return null;
    const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function serialise(t: Touch): string {
  const o: Record<string, unknown> = { p: t.params, l: t.landing, r: t.referrer, a: t.at };
  if (t.raw) o.w = t.raw;
  if (t.eid) o.e = t.eid;
  return toBase64Url(JSON.stringify(o));
}

// Strict shape check for the client-held audit field (T-19-13).
function validateRaw(w: unknown): UtmRaw | null {
  if (!w || typeof w !== 'object' || Array.isArray(w)) return null;
  const out: UtmRaw = {};
  for (const key of ['utm_source', 'utm_medium'] as const) {
    const v = (w as Record<string, unknown>)[key];
    if (typeof v === 'string' && v.length >= 1 && v.length <= MAX_VALUE_LENGTH) out[key] = v;
  }
  return Object.keys(out).length > 0 ? out : null;
}

export function encodeTouch(touch: Touch): string {
  let current: Touch = { ...touch, params: { ...touch.params } };
  let out = serialise(current);
  const size = (s: string) => new TextEncoder().encode(s).length;
  if (size(out) <= MAX_COOKIE_VALUE_BYTES) return out;

  // Size guard: drop the least valuable fields first (audit raw, then eid).
  delete current.raw;
  out = serialise(current);
  if (size(out) <= MAX_COOKIE_VALUE_BYTES) return out;
  delete current.eid;
  out = serialise(current);
  if (size(out) <= MAX_COOKIE_VALUE_BYTES) return out;
  for (const key of ['utm_term', 'utm_content'] as const) {
    delete current.params[key];
    out = serialise(current);
    if (size(out) <= MAX_COOKIE_VALUE_BYTES) return out;
  }
  current = { ...current, referrer: null };
  out = serialise(current);
  if (size(out) <= MAX_COOKIE_VALUE_BYTES) return out;
  for (const key of ['utm_campaign', 'ttclid', 'fbclid', 'gclid', 'utm_medium'] as const) {
    delete current.params[key];
    out = serialise(current);
    if (size(out) <= MAX_COOKIE_VALUE_BYTES) return out;
  }
  return out;
}

export function decodeTouch(
  raw: string | undefined | null,
  opts: { allowClickIds: boolean },
): Touch | null {
  if (!raw) return null;
  const json = fromBase64Url(raw);
  if (json == null) return null;
  let obj: unknown;
  try {
    obj = JSON.parse(json);
  } catch {
    return null;
  }
  if (!obj || typeof obj !== 'object') return null;
  const o = obj as Record<string, unknown>;
  if (!o.p || typeof o.p !== 'object' || Array.isArray(o.p)) return null;
  if (typeof o.a !== 'number' || !Number.isFinite(o.a)) return null;

  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(o.p as Record<string, unknown>)) {
    if (typeof v === 'string') search.set(k, v);
  }
  const { params, raw: recomputed } = parseAttrParamsWithRaw(search, opts);

  const landing =
    typeof o.l === 'string' && o.l.startsWith('/') && !o.l.startsWith('//') && o.l.length <= MAX_VALUE_LENGTH
      ? o.l
      : '/';
  const referrer =
    typeof o.r === 'string' && o.r.startsWith('http') && o.r.length <= MAX_VALUE_LENGTH ? o.r : null;

  const touch: Touch = { params, landing, referrer, at: o.a };
  const auditRaw = validateRaw(o.w) ?? recomputed;
  if (auditRaw) touch.raw = auditRaw;
  if (typeof o.e === 'string' && UUID_V4_RE.test(o.e)) touch.eid = o.e;
  return touch;
}

export function stripClickIds(touch: Touch): Touch {
  const params: AttrParams = { ...touch.params };
  for (const k of CLICK_ID_KEYS) delete params[k];
  return { ...touch, params };
}
