import { describe, expect, it } from 'vitest'
import sitemap from './sitemap'
import robots from './robots'
import nextConfig from '../../next.config'
import { PRIVATE_PREFIXES } from '@/lib/privateRoutes'
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

  it('excludes every private prefix (D-15)', () => {
    for (const u of urls()) {
      const path = new URL(u).pathname
      for (const p of PRIVATE_PREFIXES) {
        expect(path === p || path.startsWith(`${p}/`)).toBe(false)
      }
    }
  })
})

describe('robots and noindex headers (D-15)', () => {
  it('robots disallows /api/ and every private prefix', () => {
    const rules = robots().rules
    const rule = Array.isArray(rules) ? rules[0] : rules
    const disallow = ([] as string[]).concat(rule.disallow ?? [])
    expect(disallow).toContain('/api/')
    for (const p of PRIVATE_PREFIXES) expect(disallow).toContain(p)
  })

  it('next.config sends X-Robots-Tag noindex on every private prefix', async () => {
    const rules = await nextConfig.headers!()
    const sources = rules.map((r) => r.source)
    for (const s of [
      '/espace-client/:path*',
      '/espace-client',
      '/admin/:path*',
      '/admin',
      '/connexion',
      '/auth/:path*',
    ]) {
      expect(sources).toContain(s)
    }
    for (const r of rules) {
      expect(r.headers).toContainEqual({ key: 'X-Robots-Tag', value: 'noindex, nofollow' })
    }
    for (const p of PRIVATE_PREFIXES) {
      expect(sources.some((s) => s === p || s.startsWith(`${p}/`))).toBe(true)
    }
  })
})
