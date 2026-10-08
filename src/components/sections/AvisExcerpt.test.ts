import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/reviews/publicReviews', () => ({ getPublishedReviews: vi.fn() }))

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: unknown }) =>
    createElement('a', { href, ...rest }, children as never),
}))

import { AvisExcerptView } from './AvisExcerpt'

const src = readFileSync(new URL('./AvisExcerpt.tsx', import.meta.url), 'utf8')
const cardSrc = readFileSync(new URL('../reviews/ReviewCard.tsx', import.meta.url), 'utf8')
const pageSrc = readFileSync(new URL('../../app/page.tsx', import.meta.url), 'utf8')

const mk = (i: number) => ({
  id: `r${i}`,
  rating: 5,
  body: `Avis numéro ${i}`,
  displayName: `Client ${i}`,
  publishedAt: '2026-10-08T10:00:00Z',
})
const html = (n: number) =>
  renderToStaticMarkup(createElement(AvisExcerptView, { reviews: Array.from({ length: n }, (_, i) => mk(i)) }))

describe('AvisExcerpt', () => {
  it('renders a visible, error-free empty state instead of vanishing', () => {
    const h = html(0)
    expect(h).toContain('Ce que disent nos clients')
    expect(h).toContain('Les avis arrivent après la livraison des projets')
    expect(h).toContain('href="/avis"')
    expect(h).not.toContain('<article')
    expect(h.toLowerCase()).not.toContain('erreur')
  })

  it('renders the section with links for 1-3 reviews', () => {
    const h = html(2)
    expect(h).toContain('// AVIS VÉRIFIÉS')
    expect(h).toContain('Ce que disent nos clients')
    expect(h).toContain('Voir tous les avis')
    expect(h).toContain('href="/avis"')
    expect(h).toContain('href="/politique-des-avis"')
    expect(h.split('<article').length - 1).toBe(2)
  })

  it('caps at three cards', () => {
    expect(html(5).split('<article').length - 1).toBe(3)
  })

  it('reads on the server through the cached data module, with no client fetch', () => {
    expect(src).not.toContain('use client')
    expect(src).not.toMatch(/fetch\(|useEffect|useState/)
    expect(src).toContain("getPublishedReviews(3)")
    expect(src).toContain('async function AvisExcerpt')
    expect(pageSrc).toContain('export const revalidate')
    expect(pageSrc).not.toContain("use client")
  })

  it('cards link to the full review on /avis instead of clamping silently', () => {
    expect(html(2)).toContain('href="/avis#review-r0"')
    expect(html(2)).toContain("Lire l&#x27;avis complet")
  })

  it('has no inline style mixed with Tailwind and uses 44px targets', () => {
    expect(src).not.toContain('style=')
    expect(src).toContain('min-h-[44px]')
    expect(cardSrc).not.toContain('style=')
  })

  it('has no server import, JSON-LD or price words', () => {
    expect(src).not.toContain('@/lib/server')
    expect(src).not.toContain('application/ld+json')
    for (const w of ['€', 'prix', 'tarif']) expect(src).not.toContain(w)
  })

  it('is inserted between Partners and ContactSection on the home page', () => {
    const p = pageSrc.indexOf('<Partners')
    const a = pageSrc.indexOf('<AvisExcerpt')
    const c = pageSrc.indexOf('<ContactSection')
    expect(p).toBeGreaterThan(-1)
    expect(a).toBeGreaterThan(p)
    expect(c).toBeGreaterThan(a)
  })
})
