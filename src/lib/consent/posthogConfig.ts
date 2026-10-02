import type { PostHogConfig } from 'posthog-js';
import { CLICK_ID_KEYS } from '@/lib/attribution/params';
import type { ConsentStatus } from './state';

const URL_PROPS = [
  '$current_url',
  '$referrer',
  '$initial_current_url',
  '$initial_referrer',
  '$pathname',
] as const;

function isClickIdKey(key: string): boolean {
  const k = key.startsWith('$') ? key.slice(1) : key;
  return (CLICK_ID_KEYS as readonly string[]).includes(k.toLowerCase());
}

function stripKeys(bag: unknown): unknown {
  if (!bag || typeof bag !== 'object') return bag;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(bag as Record<string, unknown>)) {
    if (!isClickIdKey(k)) out[k] = v;
  }
  return out;
}

function stripUrl(value: unknown): unknown {
  if (typeof value !== 'string' || !value.includes('?')) return value;
  let u: URL;
  try {
    u = new URL(value);
  } catch {
    return value;
  }
  const doomed: string[] = [];
  u.searchParams.forEach((_v, k) => {
    if (isClickIdKey(k)) doomed.push(k);
  });
  if (doomed.length === 0) return value;
  for (const k of doomed) u.searchParams.delete(k);
  return u.toString();
}

type EventLike = {
  event?: string;
  properties?: Record<string, unknown>;
  $set?: Record<string, unknown>;
  $set_once?: Record<string, unknown>;
  [key: string]: unknown;
};

/** before_send hook: click ids must never leave the browser before consent (D-05). */
export function stripClickIdsFromEvent<T extends EventLike | null>(event: T): T {
  if (!event) return event;
  const next: EventLike = { ...event };
  if (event.properties) {
    const props = stripKeys(event.properties) as Record<string, unknown>;
    for (const p of URL_PROPS) {
      if (p in props) props[p] = stripUrl(props[p]);
    }
    next.properties = props;
  }
  if (event.$set) next.$set = stripKeys(event.$set) as Record<string, unknown>;
  if (event.$set_once) next.$set_once = stripKeys(event.$set_once) as Record<string, unknown>;
  return next as T;
}

/** Pure PostHog options as a function of consent state (D-01). */
export function buildPostHogConfig(status: ConsentStatus, apiHost: string): Partial<PostHogConfig> {
  const common: Partial<PostHogConfig> = {
    api_host: apiHost,
    capture_pageview: false, // pageviews are sent manually
    capture_pageleave: true,
    respect_dnt: true,
    disable_session_recording: true,
  };
  if (status === 'accepted') {
    return {
      ...common,
      persistence: 'localStorage+cookie',
      autocapture: true,
      person_profiles: 'identified_only',
    };
  }
  return {
    ...common,
    persistence: 'memory',
    autocapture: false,
    ip: false,
    person_profiles: 'never',
    save_campaign_params: false,
    save_referrer: false,
    before_send: stripClickIdsFromEvent as unknown as PostHogConfig['before_send'],
  };
}
