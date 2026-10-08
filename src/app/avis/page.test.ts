import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const getPublishedReviews = vi.fn()
const notFound = vi.fn(() => {
  throw new Error('NEXT_NOT_FOUND')
})

vi.mock('@/lib/reviews/publicReviews', () => ({
  getPublishedReviews: (...a: unknown[]) => getPublishedReviews(...a),
}))
vi.mock('next/navigation', () => ({ notFound: () => notFound() }))
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: unknown }) =>
    createElement('a', { href, ...rest }, children as never),
}))
vi.mock('@/components/layout/Navbar', () => ({ default: () => null }))
vi.mock('@/components/layout/Footer', () => ({ default: () => null }))

import Page, { generateMetadata } from './page'

const src = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8')

function mk(i: number, over: Record<string, unknown> = {}) {
  return {
    id: `id-${i}`,
    rating: 5,
    title: null,
    body: `Corps de l'avis ${i}`,
    displayName: `Client ${i}`,
    authorKind: 'person' as const,
    publishedAt: '2026-10-08T10:00:00Z',
    experienceDate: null,
    ...over,
  }
}
const many = (n: number) => Array.from({ length: n }, (_, i) => mk(i))

async function render(page?: string) {
  const el = await Page({ searchParams: Promise.resolve(page === undefined ? {} : { page }) })
  return renderToStaticMarkup(el)
}
const count = (s: string, needle: string) => s.split(needle).length - 1

beforeEach(() => {
  getPublishedReviews.mockReset()
  notFound.mockClear()
})

describe('/avis page', () => {
  it('renders three articles and three Review scripts', async () => {
    getPublishedReviews.mockResolvedValue(many(3))
    const html = await render()
    expect(count(html, '<article')).toBe(3)
    expect(html).toContain('id="review-id-0"')
    const scripts = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)]
    expect(scripts).toHaveLength(3)
    for (const s of scripts) expect(JSON.parse(s[1])['@type']).toBe('Review')
  })

  it('paginates 50 per page with a previous-reviews link', async () => {
    getPublishedReviews.mockResolvedValue(many(51))
    const html = await render()
    expect(getPublishedReviews).toHaveBeenCalledWith(51, 0)
    expect(count(html, '<article')).toBe(50)
    expect(count(html, 'application/ld+json')).toBe(50)
    expect(html).toContain('href="/avis?page=2"')
    expect(html).toContain('Avis précédents')
  })

  it('page 2 uses offset 50 and links back to newer reviews', async () => {
    getPublishedReviews.mockResolvedValue(many(5))
    const html = await render('2')
    expect(getPublishedReviews).toHaveBeenCalledWith(51, 50)
    expect(html).toContain('Avis plus récents')
    expect(html).toContain('href="/avis"')
  })

  it.each(['0', '-1', 'abc'])('treats page %s as page 1', async (p) => {
    getPublishedReviews.mockResolvedValue(many(1))
    await render(p)
    expect(getPublishedReviews).toHaveBeenCalledWith(51, 0)
  })

  it('calls notFound for an empty page beyond the first', async () => {
    getPublishedReviews.mockResolvedValue([])
    await expect(render('2')).rejects.toThrow('NEXT_NOT_FOUND')
    expect(notFound).toHaveBeenCalled()
  })

  it('shows rating, sr-only note, time, name and badge', async () => {
    getPublishedReviews.mockResolvedValue([mk(1, { rating: 4, title: 'Super' })])
    const html = await render()
    expect(html).toContain('4 sur 5')
    expect(html).toContain('Note : 4 sur 5')
    expect(html).toContain('<time dateTime="2026-10-08"')
    expect(html).toContain('Client 1')
    expect(html).toContain('Avis vérifié')
    expect(html).toContain('Super')
  })

  it('escapes hostile bodies in markup and JSON-LD', async () => {
    getPublishedReviews.mockResolvedValue([mk(1, { body: '<b>x</b></script><i>' })])
    const html = await render()
    expect(html).not.toContain('<b>x')
    // only the single JSON-LD script closes
    expect(count(html, '</script')).toBe(1)
  })

  it('empty state: no script, no article, links to sections', async () => {
    getPublishedReviews.mockResolvedValue([])
    const html = await render()
    expect(html).toContain('Pas encore d&#x27;avis publié')
    expect(html).toContain('Réalisations')
    expect(html).toContain('Contact')
    expect(html).not.toContain('application/ld+json')
    expect(html).not.toContain('<article')
  })

  it('links to the policy at least twice', async () => {
    getPublishedReviews.mockResolvedValue(many(1))
    const html = await render()
    expect(count(html, 'href="/politique-des-avis"')).toBeGreaterThanOrEqual(2)
  })

  it('is indexable with a canonical per page', async () => {
    const m1 = await generateMetadata({ searchParams: Promise.resolve({}) })
    expect(m1.robots).toEqual({ index: true, follow: true })
    expect(m1.alternates?.canonical).toBe('/avis')
    const m2 = await generateMetadata({ searchParams: Promise.resolve({ page: '3' }) })
    expect(m2.alternates?.canonical).toBe('/avis?page=3')
  })

  it('source has no aggregate, price words or server imports', () => {
    for (const w of ['AggregateRating', 'aggregateRating', 'ratingCount', 'reviewCount', 'moyenne', 'average', '€', 'prix', 'tarif']) {
      expect(src).not.toContain(w)
    }
    expect(src).not.toContain('@/lib/server')
    expect(src).not.toContain('@/components/portal')
    expect(src).toContain('getPublishedReviews(REVIEWS_PAGE_SIZE + 1')
  })
})
