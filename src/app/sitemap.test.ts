import { describe, expect, it } from 'vitest'
import sitemap from './sitemap'
import { services } from '@/data/services'

const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://sevalys.com'
const urls = () => sitemap().map((e) => e.url)

describe('sitemap (SEO-01)', () => {
  it('lists every service page derived from services', () => {
    for (const s of services) {
      expect(urls()).toContain(`${base}/services/${s.slug}`)
    }
  })

  it('lists /simulateur', () => {
    expect(urls()).toContain(`${base}/simulateur`)
  })

  it('keeps the 5 original URLs', () => {
    for (const p of ['/', '/services', '/calculateur-roi', '/demo', '/mentions-legales']) {
      expect(urls()).toContain(`${base}${p}`)
    }
  })

  it('has unique urls and the expected count', () => {
    const u = urls()
    expect(new Set(u).size).toBe(u.length)
    expect(u.length).toBe(5 + services.length + 1)
  })
})
