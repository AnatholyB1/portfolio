# Product

## Register

brand

## Users

Patrons de PME locales autour de Tours (restaurants, commerces, écoles, artisans, professions de service). Ils arrivent souvent par une recherche locale ou un moteur IA, sur mobile comme sur desktop, entre deux tâches. Ils ne sont pas techniques et se méfient du jargon. Le job : comprendre en moins de 60 secondes ce que fait Sèvalys, se faire confiance, et savoir comment passer à l'étape suivante (le simulateur de diagnostic, ou appeler/écrire).

## Product Purpose

Sèvalys est une agence web et IA à Tours (sites, branding, community management, Meta Ads, Google Ads, agent vocal IA, maintenance, projets sur mesure, 9 offres). Le site présente l'agence, chaque offre sur sa propre page, et qualifie les prospects via un simulateur de diagnostic. Aucun prix n'est jamais affiché. Le succès : un visiteur sur deux comprend l'offre sans lire, et les prospects qualifiés arrivent par le simulateur ou le contact direct.

## Brand Personality

Technique et précis, audacieux et énergique. Voix directe, concrète, sans jargon marketing ni formules creuses. Une agence d'ingénierie qui a du caractère : rigueur de détail (grille, mono, chiffres exacts) portée par des gestes francs (grandes échelles de type, aplats de couleur, rythme fort). Contenu en français d'abord (fr/en/th via i18n).

## Anti-references

- SaaS crème ou blanc avec dégradé violet-bleu, hero à métrique géante, glassmorphism.
- Néon sur noir générique : halos lumineux, vert fluo posé comme seule personnalité. La palette actuelle est conservée, mais jamais employée comme un effet de lueur décoratif.
- Mockups flottants : captures en perspective, orbes flous, particules sans fonction.
- Agence template : photos de stock, grilles de cartes identiques icône + titre + texte, boutons dégradés, slogans du type "votre avenir digital".

## Design Principles

1. **Preuve avant promesse.** Réalisations réelles (Feuillette, Gecko Cabane, Les Folies Temps Danse), captures et chiffres exacts passent avant les adjectifs. Pas de page sans élément visuel réel.
2. **Une idée par écran, des rythmes différents.** Chaque section a sa propre composition et sa propre densité. La répétition de la même structure est un échec, pas un système.
3. **La hiérarchie par contraste d'échelle.** Un titre dominant, un corps calme, du mono pour la précision. Les cartes ne servent que quand elles sont la meilleure affordance.
4. **La couleur s'engage.** Les couleurs clés actuelles sont conservées, mais utilisées par grands aplats et avec une fonction (action, état, repère), jamais en halo décoratif.
5. **Chaque page mène à une action.** Simulateur ou contact direct, jamais un prix, jamais une impasse.

## Accessibility & Inclusion

WCAG AA (contraste, focus visible, navigation clavier complète). Toutes les animations respectent `prefers-reduced-motion`, y compris les effets JS (GSAP, curseur custom). Multilingue fr/en/th : les mises en page doivent absorber des textes plus longs sans casser. Cibles tactiles confortables sur mobile.

## Constraints from the existing project

- Conserver la palette actuelle : acid `#C4F542`, fond `#0A0B0C`, encre `#ECEAE3`, warm `#E07856`, ligne `#1F1F1F`.
- Conserver les polices : Bricolage Grotesque (display), Manrope (corps), JetBrains Mono (mono).
- Ne jamais afficher de prix. Ne pas toucher à `/demo/feuillette`.
