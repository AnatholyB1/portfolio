import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const src = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8')
// Normalise JSX apostrophe entities so titles and prose can be matched literally
const text = src.replace(/&apos;/g, "'").replace(/&nbsp;/g, " ")

const TITLES = [
  'Qui peut déposer un avis',
  'Comment un avis est vérifié',
  'Publication sans filtrage',
  "Refus technique d'une soumission",
  'Modération limitée à la légalité',
  "Journal et notification de l'auteur",
  'Aucune contrepartie, aucun filtrage de la demande',
  'Affichage du nom, dates et consentement',
  'Lien Google',
  'Durée de conservation',
  'Signaler un doute',
]

describe('politique des avis page (D-12)', () => {
  it('has the 11 section titles in order', () => {
    let last = -1
    for (const t of TITLES) {
      const i = text.indexOf(`title="${t}"`)
      expect(i, t).toBeGreaterThan(last)
      last = i
    }
  })

  it('lists the four moderation reasons', () => {
    for (const r of [
      'Diffamation ou injure',
      "Données personnelles d'un tiers",
      'Contenu illégal',
      'Avis non authentique ou usurpation',
    ]) {
      expect(text).toContain(r)
    }
  })

  it('contains contact, validity and list link', () => {
    expect(text).toContain('contact@sevalys.com')
    expect(text).toContain('60 jours')
    expect(text).toContain('/avis')
  })

  it('contains the owner-confirmed retention and withdrawal wording', () => {
    const flat = text.replace(/\s+/g, ' ')
    expect(flat).toContain(
      "Les avis restent publiés tant que l'activité de Sèvalys est maintenue ; ils sont conservés trois ans après la dernière action de modération.",
    )
    expect(flat).toContain('Pour retirer votre consentement ou exercer vos droits sur vos données (accès, rectification, opposition, effacement)')
    expect(flat).toContain('sous un mois')
  })

  it('contains none of the prohibited words', () => {
    const lower = text.toLowerCase()
    for (const w of [
      'récompense', 'offre', 'cadeau', 'en échange', 'remise',
      '5 étoiles', 'satisfait', 'moyenne', '€', 'tarif', 'prix',
    ]) {
      expect(lower, w).not.toContain(w)
    }
  })

  it('matches the /avis typography: medium weight, 16px body, left-aligned, no bold titles', () => {
    expect(src).not.toMatch(/font-bold|text-4xl|text-center/)
    expect(src).toContain('text-[32px] font-medium')
    expect(src).toContain('text-base')
    expect(src).not.toMatch(/text-sm leading|leading-relaxed text-sm/)
    expect(src).toContain('max-w-3xl')
    expect(src).toContain('id="main-content"')
  })

  it('uses only text-safe colours, no --ink-faint', () => {
    expect(src).not.toContain('ink-faint')
  })

  it('states the rights/contact paragraph once, with 44px contact links and non-breaking punctuation', () => {
    const flat = text.replace(/\s+/g, ' ')
    expect(flat.match(/exercer vos droits/g)).toHaveLength(1)
    expect(flat).not.toContain("droits d'accès, de rectification ou d'opposition")
    expect(src.match(/mailto:contact@sevalys\.com/g)).toHaveLength(2)
    expect(src.match(/className=\{mailClass\}/g)).toHaveLength(2)
    expect(src).toContain('min-h-[44px]')
    expect(src).toContain('&nbsp;:')
    expect(src).toContain('&nbsp;;')
  })

  it('is indexable and server-free', () => {
    expect(src).toMatch(/robots:\s*\{\s*index:\s*true/)
    expect(src).not.toContain("@/lib/server")
  })
})
