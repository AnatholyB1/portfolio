import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: unknown }) =>
    createElement('a', { href, ...rest }, children as never),
}))

import {
  guides,
  getGuideBySlug,
  guideWordCount,
  guideBodyTexts,
  formatGuideDate,
} from '@/data/guides'
import { services } from '@/data/services'
import { buildPageSeo } from '@/lib/pageSeo'
import {
  buildArticleJsonLd,
  buildGuideBreadcrumbJsonLd,
  buildGuideFaqJsonLd,
  guideUrl,
} from '@/lib/guideJsonLd'
import { buildJsonLdScript } from '@/lib/serviceJsonLd'
import GuideContent from '@/components/guides/GuideContent'

const BRAND_SUFFIX = ' · Sèvalys' // ajouté par le gabarit de title du layout racine
const norm = (s: string) => s.replace(/\s+/g, ' ').trim()
const html = (slug: string) =>
  renderToStaticMarkup(createElement(GuideContent, { guide: getGuideBySlug(slug)! }))
const text = (h: string) => norm(h.replace(/<[^>]+>/g, ' ').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&'))

describe('guides : données', () => {
  it('expose les deux guides attendus, slugs uniques', () => {
    expect(guides.map((g) => g.slug)).toEqual(['prix-site-vitrine', 'seo-local'])
    expect(new Set(guides.map((g) => g.slug)).size).toBe(guides.length)
  })

  it('dates de publication et de mise à jour au 26 novembre 2026, auteur nommé', () => {
    for (const g of guides) {
      expect(g.datePublished).toBe('2026-11-26')
      expect(g.dateModified >= g.datePublished).toBe(true)
      expect(g.authorName).toBe('Anatholy Bricon')
    }
    expect(formatGuideDate('2026-11-26')).toBe('26 novembre 2026')
  })

  it('longueur dans la cible du brief', () => {
    const prix = guideWordCount(getGuideBySlug('prix-site-vitrine')!)
    const seo = guideWordCount(getGuideBySlug('seo-local')!)
    expect(prix).toBeGreaterThanOrEqual(1800)
    expect(prix).toBeLessThanOrEqual(2700)
    expect(seo).toBeGreaterThanOrEqual(1400)
    expect(seo).toBeLessThanOrEqual(1840)
  })

  it('title (marque comprise) <= 60 et meta <= 155 caractères', () => {
    for (const g of guides) {
      expect((g.metaTitle + BRAND_SUFFIX).length, g.slug).toBeLessThanOrEqual(60)
      expect(g.metaDescription.length, g.slug).toBeLessThanOrEqual(155)
      expect(g.metaDescription.length, g.slug).toBeGreaterThan(100)
      expect(g.h1).not.toBe(g.metaTitle)
    }
  })

  it('prix Sèvalys conformes : 500 € (site) et 300 €/mois (SEO), TVA art. 293 B', () => {
    const prix = guideBodyTexts(getGuideBySlug('prix-site-vitrine')!).join(' ')
    expect(prix).toContain('à partir de 500 €')
    expect(prix).toContain('art. 293 B du CGI')
    const seo = getGuideBySlug('seo-local')!
    expect(seo.cta.text).toContain('à partir de 300 € par mois')
    expect(seo.cta.text).toContain('art. 293 B du CGI')
    expect(seo.cta.text).toContain('3 mois minimum')
  })

  it('aucune promesse de position, statistique non vérifiée ni adresse de rue', () => {
    const all = guides.flatMap((g) => guideBodyTexts(g)).join(' ').toLowerCase()
    for (const bad of ['france num', 'première position', 'n°1', '1 200 €', 'saint-avertin', '37550']) {
      expect(all, bad).not.toContain(bad)
    }
    expect(all).not.toMatch(/garanti[es]?/)
  })

  it('chaque lien interne mène à une route existante', () => {
    const known = new Set([
      '/',
      '/simulateur',
      '/guides',
      ...guides.map((g) => `/guides/${g.slug}`),
      ...services.map((s) => `/services/${s.slug}`),
    ])
    for (const g of guides) {
      const raw = [
        ...guideBodyTexts(g),
        g.authorBio,
        g.cta.primary.href,
        g.cta.secondary.href,
      ].join(' ')
      const hrefs = [...raw.matchAll(/\]\(([^)]+)\)/g)].map((m) => m[1])
      hrefs.push(g.cta.primary.href, g.cta.secondary.href)
      const internal = hrefs.filter((h) => h.startsWith('/'))
      expect(internal.length, g.slug).toBeGreaterThanOrEqual(3)
      for (const h of internal) expect(known.has(h), `${g.slug}: ${h}`).toBe(true)
    }
  })

  it('maillage imposé par les briefs', () => {
    const prix = JSON.stringify(getGuideBySlug('prix-site-vitrine'))
    for (const href of ['/services/site-vitrine', '/simulateur', '/services/seo-referencement', '/services/rebranding-site-premium']) {
      expect(prix).toContain(`](${href})`)
    }
    const seo = JSON.stringify(getGuideBySlug('seo-local'))
    for (const href of ['/services/seo-referencement', '/services/site-vitrine', '/simulateur', '/guides/prix-site-vitrine']) {
      expect(seo).toContain(href)
    }
  })
})

describe('guides : métadonnées', () => {
  it('canonical propre à chaque guide, og article et twitter', () => {
    for (const g of guides) {
      const seo = buildPageSeo({ title: g.metaTitle, description: g.metaDescription, path: `/guides/${g.slug}` })
      expect(seo.alternates?.canonical).toBe(`/guides/${g.slug}`)
      expect(new URL(String(seo.alternates?.canonical), 'https://sevalys.com').href).toContain(`/guides/${g.slug}`)
      expect(seo.openGraph?.images).toBeDefined()
    }
  })
})

describe('guides : JSON-LD', () => {
  it('Article avec auteur, datePublished et dateModified, sérialisable', () => {
    for (const g of guides) {
      const a = buildArticleJsonLd(g)
      expect(a['@type']).toBe('Article')
      expect(a.datePublished).toBe(g.datePublished)
      expect(a.dateModified).toBe(g.dateModified)
      expect(a.author).toMatchObject({ '@type': 'Person', name: 'Anatholy Bricon' })
      expect(a.mainEntityOfPage['@id']).toBe(guideUrl(g.slug))
      expect(a.headline).toBe(g.h1)
      expect(JSON.parse(buildJsonLdScript(a))).toEqual(JSON.parse(JSON.stringify(a)))
    }
  })

  it('FAQPage identique à la FAQ visible', () => {
    for (const g of guides) {
      const faq = buildGuideFaqJsonLd(g)
      expect(faq['@type']).toBe('FAQPage')
      expect(faq.mainEntity).toHaveLength(g.faq.length)
      const page = text(html(g.slug))
      for (const [i, item] of faq.mainEntity.entries()) {
        expect(item.name).toBe(g.faq[i].q)
        expect(page).toContain(norm(item.acceptedAnswer.text))
        expect(page).toContain(norm(item.name))
      }
    }
  })

  it('BreadcrumbList Accueil > Guides > guide', () => {
    for (const g of guides) {
      const b = buildGuideBreadcrumbJsonLd(g)
      expect(b['@type']).toBe('BreadcrumbList')
      expect(b.itemListElement.map((i) => i.name)).toEqual(['Accueil', 'Guides', g.crumb])
      expect(b.itemListElement.map((i) => i.position)).toEqual([1, 2, 3])
      expect(b.itemListElement[2].item).toBe(guideUrl(g.slug))
    }
  })
})

describe('guides : structure HTML rendue côté serveur', () => {
  for (const g of guides) {
    describe(g.slug, () => {
      const h = html(g.slug)

      it('un seul H1, égal au H1 du guide', () => {
        expect(h.match(/<h1[\s>]/g)).toHaveLength(1)
        expect(text(h)).toContain(norm(g.h1))
      })

      it('FAQ visible avec une question en H3 par entrée (4 à 8)', () => {
        expect(g.faq.length).toBeGreaterThanOrEqual(4)
        expect(g.faq.length).toBeLessThanOrEqual(8)
        expect(h).toContain('id="faq"')
        for (const f of g.faq) expect(text(h)).toContain(norm(f.q))
      })

      it('table des matières ancrée : chaque lien pointe vers un id existant', () => {
        const toc = h.match(/<nav aria-label="Sommaire"[\s\S]*?<\/nav>/)?.[0] ?? ''
        const anchors = [...toc.matchAll(/href="#([^"]+)"/g)].map((m) => m[1])
        expect(anchors.length).toBeGreaterThanOrEqual(g.sections.length)
        for (const id of anchors) expect(h, id).toContain(`id="${id}"`)
      })

      it('tout le texte du contenu est dans le HTML initial', () => {
        const page = text(h)
        for (const s of g.sections) expect(page).toContain(norm(s.title))
        expect(page).toContain(norm(g.answer))
      })

      it('liens externes sécurisés, au moins un tableau, auteur et dates visibles', () => {
        for (const m of h.matchAll(/<a [^>]*href="https?:[^"]+"[^>]*>/g)) {
          expect(m[0]).toContain('rel="noopener noreferrer"')
        }
        expect(h).toContain('<table')
        expect(h).toContain('Anatholy Bricon')
        expect(h).toContain('26 novembre 2026')
      })
    })
  }
})

describe('guides : fichiers de la route', () => {
  const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8')
  const page = read('./[slug]/page.tsx')
  const index = read('./page.tsx')

  it('pages rendues côté serveur (pas de use client)', () => {
    expect(page).not.toContain('use client')
    expect(index).not.toContain('use client')
    expect(read('../../components/guides/GuideContent.tsx')).not.toContain('use client')
  })

  it('génération statique, metadata et trois JSON-LD', () => {
    expect(page).toContain('generateStaticParams')
    expect(page).toContain('generateMetadata')
    expect(page).toContain('buildArticleJsonLd')
    expect(page).toContain('buildGuideFaqJsonLd')
    expect(page).toContain('buildGuideBreadcrumbJsonLd')
    expect(page).toContain('id="main-content"')
  })

  it('index /guides : metadata via buildPageSeo, canonical /guides, un seul H1', () => {
    expect(index).toContain('buildPageSeo')
    expect(index).toContain('path: "/guides"')
    expect(index.match(/<h1/g)).toHaveLength(1)
  })

  it('lien Guides dans le pied de page et dans llms.txt', () => {
    expect(read('../../components/layout/Footer.tsx')).toContain('href="/guides"')
    const llms = readFileSync(new URL('../../../public/llms.txt', import.meta.url), 'utf8')
    for (const g of guides) expect(llms).toContain(`https://sevalys.com/guides/${g.slug}`)
  })
})
