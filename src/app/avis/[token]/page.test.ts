import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) =>
    createElement('a', { href, ...rest }, children),
}));
vi.mock('next/headers', () => ({ headers: async () => new Headers({ 'x-forwarded-for': '1.2.3.4' }) }));
vi.mock('@/lib/reviews/linkState', () => ({ getReviewLinkState: vi.fn() }));
vi.mock('@/lib/throttle', () => ({
  hashKey: (k: string, v: string) => `${k}:${v}`,
  hitThrottle: vi.fn(),
}));

import { getReviewLinkState } from '@/lib/reviews/linkState';
import { hitThrottle } from '@/lib/throttle';
import AvisTokenPage from './page';
import { metadata } from './layout';

const mockState = vi.mocked(getReviewLinkState);
const mockThrottle = vi.mocked(hitThrottle);

async function render(token = 'tok') {
  const el = await AvisTokenPage({ params: Promise.resolve({ token }) });
  return renderToStaticMarkup(el);
}

beforeEach(() => {
  mockState.mockReset();
  mockThrottle.mockReset();
  mockThrottle.mockResolvedValue(true);
});

describe('/avis/[token] page', () => {
  it('renders the identical form-less card for unknown, used and expired links (no oracle)', async () => {
    mockState.mockResolvedValue({ state: 'invalid' });
    const unknown = await render('unknown');
    const used = await render('used');
    const expired = await render('expired');
    expect(used).toBe(unknown);
    expect(expired).toBe(unknown);
    expect(unknown).toContain("Ce lien n&#x27;est plus valide");
    expect(unknown).toContain('mailto:contact@sevalys.com');
    expect(unknown).not.toContain('<form');
  });

  it('shows a distinct throttled message that says nothing about link validity', async () => {
    mockThrottle.mockResolvedValue(false);
    mockState.mockResolvedValue({ state: 'valid', projectTitle: 'P', companyName: 'C' });
    const throttled = await render();
    expect(throttled).toContain('Trop de tentatives');
    expect(throttled).toContain('Réessayez dans quelques minutes');
    expect(throttled).not.toContain('plus valide');
    expect(throttled).not.toContain('<form');
    // The throttle short-circuits before any link lookup.
    expect(mockState).not.toHaveBeenCalled();
    mockThrottle.mockResolvedValue(true);
    mockState.mockResolvedValue({ state: 'invalid' });
    expect(await render()).not.toBe(throttled);
  });

  it('renders exactly one h1 with a unique id, inside the form, for a valid link', async () => {
    mockState.mockResolvedValue({ state: 'valid', projectTitle: 'P', companyName: 'C' });
    const html = await render();
    expect(html.match(/<h1[ >]/g)).toHaveLength(1);
    expect(html.match(/id="rv-heading"/g)).toHaveLength(1);
    expect(html).not.toContain('pt-auth-title');
    expect(html).toContain('aria-labelledby="rv-heading"');
    expect(html).toContain('Votre avis sur votre projet');
    expect(html).toContain('id="main-content"');
  });

  it('renders the form for a valid link without any selected rating', async () => {
    mockState.mockResolvedValue({ state: 'valid', projectTitle: 'Plateforme Dupont', companyName: 'Café Dupont' });
    const html = await render();
    expect(html).toContain('Plateforme Dupont');
    expect(html).toMatch(/href="\/politique-des-avis"[^>]*>[^<]*[Pp]olitique des avis/);
    expect(html).toContain('J&#x27;accepte que mon avis soit publié');
    expect(html).toContain('Publier mon avis');
    expect(html).not.toContain('aria-checked="true"');
  });

  it('checks the link state read-only with the view throttle', async () => {
    mockState.mockResolvedValue({ state: 'invalid' });
    await render();
    expect(mockThrottle).toHaveBeenCalledWith('review-view-ip:1.2.3.4', 600, 60);
  });
});

describe('/avis/[token] layout and sources', () => {
  it('is noindex and sends no referrer', () => {
    expect(metadata.robots).toMatchObject({ index: false, follow: false });
    expect(metadata.referrer).toBe('no-referrer');
  });

  it('does not import portal components or server-only code', () => {
    for (const f of ['page.tsx', 'layout.tsx']) {
      const src = readFileSync(new URL(f, new URL('.', import.meta.url)), 'utf8');
      expect(src).not.toMatch(/@\/components\/portal|@\/lib\/server/);
    }
  });
});
