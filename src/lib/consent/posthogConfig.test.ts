import { describe, it, expect } from 'vitest';
import { buildPostHogConfig, stripClickIdsFromEvent } from './posthogConfig';
import { CLICK_ID_KEYS } from '@/lib/attribution/params';

const H = 'https://eu.i.posthog.com';

describe('buildPostHogConfig', () => {
  for (const status of ['pending', 'refused'] as const) {
    it(`${status}: memory-only, anonymous, no recording`, () => {
      const c = buildPostHogConfig(status, H);
      expect(c.persistence).toBe('memory');
      expect(c.autocapture).toBe(false);
      expect(c.ip).toBe(false);
      expect(c.person_profiles).toBe('never');
      expect(c.disable_session_recording).toBe(true);
      expect(c.capture_pageview).toBe(false);
      expect(c.save_campaign_params).toBe(false);
      expect(c.before_send).toBe(stripClickIdsFromEvent);
      expect(c.respect_dnt).toBe(true);
      expect(c.api_host).toBe(H);
    });
  }

  it('accepted: full persistence and autocapture', () => {
    const c = buildPostHogConfig('accepted', H);
    expect(c.persistence).toBe('localStorage+cookie');
    expect(c.autocapture).toBe(true);
    expect(c.person_profiles).toBe('identified_only');
    expect(c.disable_session_recording).toBe(true);
    expect(c.before_send).toBeUndefined();
    expect(c.respect_dnt).toBe(true);
    expect(c.api_host).toBe(H);
  });
});

describe('stripClickIdsFromEvent', () => {
  it('click id key list matches the attribution module', () => {
    expect([...CLICK_ID_KEYS]).toEqual(['gclid', 'fbclid', 'ttclid']);
  });

  it('removes click id properties and $-prefixed variants', () => {
    const out = stripClickIdsFromEvent({
      event: '$pageview',
      properties: { gclid: 'a', $fbclid: 'b', ttclid: 'c', other: 1 },
      $set: { gclid: 'a', keep: 2 },
      $set_once: { $ttclid: 'c', keep: 3 },
    });
    expect(out.properties).toEqual({ other: 1 });
    expect(out.$set).toEqual({ keep: 2 });
    expect(out.$set_once).toEqual({ keep: 3 });
  });

  it('strips click ids from URL properties', () => {
    const out = stripClickIdsFromEvent({
      event: '$pageview',
      properties: {
        $current_url: 'https://sevalys.com/?gclid=x&utm_source=g',
        $referrer: 'https://x.com/?fbclid=1',
        $initial_current_url: 'https://sevalys.com/p?ttclid=2&a=b',
      },
    });
    expect(out.properties?.$current_url).toBe('https://sevalys.com/?utm_source=g');
    expect(out.properties?.$referrer).toBe('https://x.com/');
    expect(out.properties?.$initial_current_url).toBe('https://sevalys.com/p?a=b');
  });

  it('passes through null and events without properties', () => {
    expect(stripClickIdsFromEvent(null)).toBeNull();
    expect(stripClickIdsFromEvent({ event: 'x' })).toEqual({ event: 'x' });
  });

  it('leaves non-URL strings in URL fields intact', () => {
    const out = stripClickIdsFromEvent({
      event: 'x',
      properties: { $referrer: '$direct' },
    });
    expect(out?.properties?.$referrer).toBe('$direct');
  });
});
