import { describe, expect, it } from 'vitest';
import { isCrawlerUserAgent } from './crawler';

describe('isCrawlerUserAgent', () => {
  it('detects Googlebot and AI crawlers', () => {
    expect(isCrawlerUserAgent('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)')).toBe(true);
    expect(isCrawlerUserAgent('Mozilla/5.0 AppleWebKit/537.36 (compatible; GPTBot/1.0)')).toBe(true);
    expect(isCrawlerUserAgent('Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X) Chrome/120 Mobile Safari/537.36 (compatible; Googlebot/2.1)')).toBe(true);
  });
  it('lets real browsers through', () => {
    expect(isCrawlerUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36')).toBe(false);
    expect(isCrawlerUserAgent('')).toBe(false);
    expect(isCrawlerUserAgent(undefined)).toBe(false);
  });
});
