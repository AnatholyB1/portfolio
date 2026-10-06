import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { services } from '@/data/services'
import { translations } from '@/lib/translations'

const llms = readFileSync(new URL('../../public/llms.txt', import.meta.url), 'utf8')
const lines = llms.split(/\r?\n/)

describe('llms.txt (SEO-01)', () => {
  it('links every service page', () => {
    for (const s of services) {
      expect(llms).toContain(`https://sevalys.com/services/${s.slug}`)
    }
  })

  it('links /simulateur and keeps the /services index line', () => {
    expect(llms).toContain('https://sevalys.com/simulateur')
    expect(lines.some((l) => l.endsWith('https://sevalys.com/services'))).toBe(true)
  })

  it('contains no price wording', () => {
    expect(llms.toLowerCase()).not.toContain('tarif')
  })

  it('labels each service link with its French name', () => {
    for (const s of services) {
      const line = lines.find((l) => l.includes(`/services/${s.slug}`))
      expect(line).toBeDefined()
      expect(line).toContain(translations.fr.services.pages.items[s.index].name)
    }
  })

  it('does not mention private routes (D-15)', () => {
    for (const p of ['/espace-client', '/admin', '/connexion', '/desinscription', '/auth/']) {
      expect(llms).not.toContain(p)
    }
  })

  it('has no Différenciation section', () => {
    expect(llms).not.toContain('## Différenciation')
  })
})
