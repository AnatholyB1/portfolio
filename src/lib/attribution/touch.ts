import { CLICK_ID_KEYS, isClickIdKey, type AttrParams } from './params';

import type { UtmRaw } from './utm';

export type Touch = {
  params: AttrParams;
  landing: string;
  referrer: string | null;
  at: number;
  raw?: UtmRaw;
  eid?: string;
};

export type ArrivalInput = {
  method: string;
  secFetchDest: string | null;
  secFetchMode: string | null;
  userAgent: string | null;
  host: string;
  canonicalHost: string;
  hasAuthCookie: boolean;
  params: AttrParams;
  referrer: string | null;
};

export const BOT_UA_PATTERN =
  /googlebot|bingbot|facebookexternalhit|slackbot|twitterbot|linkedinbot|whatsapp|discordbot|headless|lighthouse|vercel-screenshot/i;

export const SEARCH_ENGINE_HOSTS: readonly string[] = [
  'google.',
  'bing.',
  'duckduckgo.',
  'qwant.',
  'ecosia.',
  'yahoo.',
];

export const CLICK_ID_ENRICH_WINDOW_MS = 10 * 60 * 1000;

export function isBotUserAgent(ua: string | null): boolean {
  return !!ua && BOT_UA_PATTERN.test(ua);
}

export function classifyArrival(input: ArrivalInput): 'arrival' | 'skip' {
  if (input.method.toUpperCase() !== 'GET') return 'skip';
  if (input.secFetchDest && input.secFetchDest !== 'document') return 'skip';
  if (input.secFetchMode && input.secFetchMode !== 'navigate') return 'skip';
  if (isBotUserAgent(input.userAgent)) return 'skip';
  if (input.host !== input.canonicalHost) return 'skip';
  if (input.hasAuthCookie) return 'skip';
  if (Object.keys(input.params).length === 0 && !input.referrer) return 'skip';
  return 'arrival';
}

export type ChannelSource = {
  source: string;
  medium: string;
  campaign: string | null;
  kind: 'touch' | 'direct';
};

const DIRECT: ChannelSource = { source: 'direct', medium: '(none)', campaign: null, kind: 'direct' };

export function classifyChannel(touch: Touch | null): ChannelSource {
  if (!touch) return { ...DIRECT };
  const p = touch.params;
  if (p.utm_source) {
    return {
      source: p.utm_source,
      medium: p.utm_medium ?? '(none)',
      campaign: p.utm_campaign ?? null,
      kind: 'touch',
    };
  }
  if (touch.referrer) {
    try {
      const host = new URL(touch.referrer).hostname.toLowerCase().replace(/^www\./, '');
      const organic = SEARCH_ENGINE_HOSTS.some((e) => host.startsWith(e) || host.includes('.' + e));
      return { source: host, medium: organic ? 'organic' : 'referral', campaign: null, kind: 'touch' };
    } catch {
      return { ...DIRECT };
    }
  }
  return { ...DIRECT };
}

export function nextTouches(
  existing: { ft: Touch | null; lt: Touch | null },
  arrival: Touch,
): { ft: Touch; lt: Touch; ftChanged: boolean } {
  if (existing.ft) return { ft: existing.ft, lt: arrival, ftChanged: false };
  return { ft: arrival, lt: arrival, ftChanged: true };
}

function nonClick(params: AttrParams): [string, string][] {
  return Object.entries(params)
    .filter(([k, v]) => !isClickIdKey(k) && v != null)
    .sort(([a], [b]) => a.localeCompare(b)) as [string, string][];
}

export function enrichFirstTouchClickIds(ft: Touch, arrival: Touch): Touch | null {
  const hasClick = (p: AttrParams) => CLICK_ID_KEYS.some((k) => p[k] != null);
  if (hasClick(ft.params) || !hasClick(arrival.params)) return null;
  if (ft.landing !== arrival.landing) return null;
  if (JSON.stringify(nonClick(ft.params)) !== JSON.stringify(nonClick(arrival.params))) return null;
  const params: AttrParams = { ...ft.params };
  for (const k of CLICK_ID_KEYS) {
    if (arrival.params[k] != null) params[k] = arrival.params[k];
  }
  return { ...ft, params };
}
