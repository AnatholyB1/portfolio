import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) =>
    createElement('a', { href, ...rest }, children),
}));

import { thankYouFor } from './ReviewForm';
import ReviewThankYou from './ReviewThankYou';

const GOOGLE = 'https://g.page/r/x/review';
const FORBIDDEN = ['récompense', 'offre', 'cadeau', 'en échange', 'remise', '5 étoiles', 'satisfait', 'moyenne', 'prix', 'tarif', '€'];

const html = (rating: number, url: string | null) =>
  renderToStaticMarkup(thankYouFor({ rating, body: `corps ${rating}` } as { rating: number }, url));

describe('thank-you view', () => {
  it('renders byte-identical markup for ratings 1 to 5', () => {
    const base = html(1, GOOGLE);
    for (const n of [1, 2, 3, 4, 5]) expect(html(n, GOOGLE)).toBe(base);
  });

  it('contains exactly one Google anchor with the neutral contract', () => {
    const out = html(3, GOOGLE);
    expect(out.match(/<a [^>]*href="https:\/\/g\.page\/r\/x\/review"/g)).toHaveLength(1);
    expect(out).toContain('Publier aussi sur Google');
    expect(out).toContain('target="_blank"');
    expect(out).toContain('rel="noopener noreferrer"');
    expect(out).toContain('pt-btn-ghost');
    expect(out).toContain('Si vous le souhaitez, vous pouvez aussi partager votre avis sur Google. C&#x27;est facultatif.');
  });

  it('omits the Google block when the url is null', () => {
    const out = html(5, null);
    expect(out).not.toContain('Google');
    expect(out).toContain('Merci pour votre avis');
    expect(out).toContain('href="/avis"');
  });

  it('declares no rating prop and uses no prohibited wording', () => {
    const dir = new URL('.', import.meta.url);
    const thank = readFileSync(new URL('ReviewThankYou.tsx', dir), 'utf8');
    expect(thank).not.toMatch(/rating/);
    for (const f of ['ReviewThankYou.tsx', 'ReviewForm.tsx', 'ReviewRatingInput.tsx']) {
      const src = readFileSync(new URL(f, dir), 'utf8').toLowerCase();
      for (const w of FORBIDDEN) expect(src.includes(w), `${f}: ${w}`).toBe(false);
    }
    const out = renderToStaticMarkup(createElement(ReviewThankYou, { googleUrl: GOOGLE })).toLowerCase();
    for (const w of FORBIDDEN) expect(out.includes(w), w).toBe(false);
  });
});
