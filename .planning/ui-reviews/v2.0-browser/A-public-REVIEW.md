# Lot A, pages publiques : audit navigateur réel (prod https://sevalys.com, HEAD d94cf62)

Date : 2026-10-14. Lecture seule. Captures : `shots/A/*.jpg` (19 fichiers).

## Méthode et limites

- Chrome réel via l'extension. `resize_window` n'a **pas** modifié le viewport (innerWidth resté à 1360x599). Les mesures desktop sont donc à **1360x599**, pas 1280x800.
- Les mesures 390px ont été faites dans une `<iframe>` same-origin de 390px de large (les media queries répondent à la largeur de l'iframe). 768 et 1440 non mesurés. Les mesures mobiles sont fiables pour le CSS, pas pour le comportement du navigateur mobile (barre d'adresse, tactile).
- Aucun formulaire soumis. Cookies : un clic sur Refuser (home), le reste en ouverture seule. Pages avec jeton (`/avis/[token]`) non testables sans jeton : thèmes 2, 3 non vérifiés.
- Les captures prises juste après navigation montrent parfois des éléments en cours d'animation de reveal (opacité partielle). Ce ne sont pas des défauts de contraste.
- `/avis` est vide en prod : pagination, cartes et excerpt avec avis non observables.

## Scores 6 piliers (/24)

| Pilier | Score | Constat |
|---|---|---|
| Copy | 3/4 | FR soigné, honnête. Défauts : "Question 1 sur 6" contre "quatre ou cinq questions", "28 pièce", "Work" en anglais dans le footer FR, titres "· Sèvalys · Sèvalys" |
| Visuels | 3/4 | Hiérarchie forte, aucun overflow, pas d'image sans alt (0/7). Emoji dans le h1 de /demo, 404 avec gros wordmark immédiatement sous le CTA |
| Couleur | 4/4 | Tokens propres, `--ink-faint` corrigé (#85817A, ~5:1), footer en `--ink-dim` (#9A9690), boutons cookie identiques |
| Typo | 3/4 | /avis et /politique alignés (32/500, 24/500). /mentions-legales reste 36px/700 centré. Polices 10-11px nombreuses (eyebrows mono, labels) |
| Espacement | 3/4 | Gouttière mobile 16px confirmée. Cibles < 44px encore nombreuses (liens retour, toggle langue, liens de texte du légal) |
| UX | 3/4 | Gérer les cookies OK partout, nav mobile OK, skip link OK. Formulaire de contact home sans labels associés, numéro /demo non cliquable, 404 et /demo sans `<main>` |

**Total : 19/24** (audit code précédent : 14/24).

## A11y WCAG 2.2 AA (public)

Conforme :
- h1 unique sur toutes les pages. IDs dupliqués : 0 sur toutes les pages.
- Skip link présent partout (hors écran à y=-80, visible au focus, pointe `#main-content`).
- Focus visible partout (outline auto 1px `rgb(238,238,238)`, offset 1px). Ordre Tab logique (skip, logo, nav).
- Dialog cookies : `<dialog>` modal, focus sur le h2 à l'ouverture, 3 contrôles 44px de haut, "Refuser" et "Accepter" strictement identiques (bg `rgb(22,24,26)`, bordure `rgb(111,107,100)`, fw 500, 211x44).
- Nav mobile : bouton burger 44x44 `aria-expanded`, panneau, focus sur le 1er lien, Escape ferme et remet `aria-expanded=false`.
- Contraste mesuré : legal 14px `#9A9690` ~6,9:1 ; texte faint `#85817A` ~5,0:1 ; footer 14px `#9A9690`. Aucun échec réel (le seul "échec" de mon script, `// AVIS VÉRIFIÉS`, est un artefact oklab/alpha, couleur acide sur noir).
- `lang="fr"`, noindex correct sur /avis (vide), /desinscription (`noindex, nofollow, nocache`) et 404.

Non conforme : voir les findings M1, M2, M3, m1 à m9.

## Responsive

- 390px : `scrollWidth` 384 ou 390 sur les 12 pages, aucun overflow horizontal. h1 home 48px, services 44px, calculateur 40px, demo 24px. Gouttière 16px.
- 1360px : `scrollWidth` 1354 ou 1360, aucun overflow.
- Tournure mobile : numéro de /demo coupé en "+33 9 48 19 43 / 01" (m6).
- Une fois le panneau nav mobile ouvert, les boutons FR/EN/TH restent 34x27 (m2).

## Vérification des thèmes de l'audit précédent (public-UI-REVIEW, top 10)

| # | Thème | Verdict | Preuve |
|---|---|---|---|
| 1 | Gérer les cookies no-op sur /mentions-legales | **Corrigé** | Clic JS sur le bouton du footer de /mentions-legales : `dialog.open = true`, focus sur h2 "Votre choix sur les cookies" (capture `cookie-dialog-mentions-legales-1280`) |
| 2 | Thank-you : double h1 / id dupliqué / focus | **Non vérifiable** | Nécessite un jeton d'avis valide (pas de soumission autorisée) |
| 3 | Jeton throttlé : "lien plus valide" | **Non vérifiable** | Idem |
| 4 | Contraste `--ink-faint` footer / date policy | **Corrigé** | Footer `rgb(154,150,144)` 14px ; texte faint `rgb(133,129,122)` (#85817A) ; plus de texte 2,6:1 relevé |
| 5 | Liens texte < 44px | **Toujours présent (partiel)** | Footer : 44px de haut (corrigé). Mais `← Retour aux services` 170x14 (services/[slug], calculateur-roi), `ÉTUDE DE CAS` 276x17, liens inline /avis 22px, legal `contact@sevalys.com` 143x19, `CNIL` 29x19 |
| 6 | Pagination plus récents / plus anciens | **Non vérifiable** | /avis vide, pas de pagination rendue |
| 7 | Excerpt home client-fetched / CLS | **Corrigé** | Section "Ce que disent nos clients" présente dans le HTML serveur (`curl` : 2 occurrences), état vide explicite visible avec liens "Voir la page des avis" et "Politique des avis" |
| 8 | Typo /politique-des-avis divergente | **Corrigé** | h1 32px/500 aligné à gauche, h2 24px/500, `max-w` identique à /avis. Corps 16px non mesuré (mon échantillon était l'eyebrow). Reste : /mentions-legales h1 36px/700 centré (connu, non traité) |
| 9 | Gouttière mobile 16px vs 20px | **Corrigé** | Texte de la home à x=16 sur 390px, `/avis`, `/politique-des-avis`, 404 : padding 16px |
| 10 | Copy / i18n | **Corrigé en partie** | "et la recette signée" OK, plus de bloc "politique" redondant en bas de /avis. Restent : "Work" en anglais dans le footer FR, titres avec double suffixe, doublon "Politique des avis" (lien d'intro et lien du footer et lien de la home) |

## Findings

### BLOCKER
Aucun. Les deux blockers de l'audit précédent testables (cookies sur /mentions-legales) sont corrigés.

### MAJOR

**M1. Formulaire de contact de la home : labels non associés, champs sans nom accessible.**
- Page : `/` (section #contact). Viewport : tous.
- Preuve : les 4 champs (`input text`, `input email`, `select`, `textarea`) ont `labels.length === 0`, pas d'`aria-label`/`aria-labelledby`, pas d'`id`, pas de `autocomplete` (name/email). `<label>Vous êtes</label>` voisin mais sans `for`. Pas de zone `aria-live` dans le formulaire (0). Hauteur des champs 32px (champ texte/email/select), sous 44px.
- WCAG : 1.3.1, 3.3.2, 4.1.2, 1.3.5 (autocomplete), 2.5.8 (cible).
- Fichier : `src/components/sections/ContactSection.tsx:69-103` (`<label>{f.name_l}</label>` etc.).
- Correctif : `id` unique + `htmlFor` (comme déjà fait dans `Wizard.tsx`), `autoComplete="name"` / `"email"`, `min-height: 44px` sur `.field input/select`, `aria-live="polite"` monté vide pour le statut d'envoi.

**M2. Numéro de téléphone de /demo non cliquable et coupé sur mobile.**
- Page : `/demo`. Viewport : 390.
- Preuve : le numéro est dans un `<p>` hors `<a>` (0 lien `tel:` sur la page). Sur 390px il se coupe en "+33 9 48 19 43" puis "01" (capture `demo-390-iframe`). C'est l'action principale de la page (appeler pour tester l'agent).
- Fichier : `src/app/demo/page.tsx` (bloc du numéro, rendu dans le panneau "Appelez ce numéro").
- Correctif : `<a href="tel:+33948194301">` avec `white-space: nowrap` et taille fluide (`clamp`), ou NBSP entre les groupes de chiffres.

**M3. /demo et la 404 n'ont aucun `<main>` et gardent le titre générique de la home.**
- Pages : `/demo`, `/nexiste-pas`. Viewport : tous.
- Preuve : `document.querySelectorAll('main').length === 0`. `<title>` identique à celui de la home ("Sèvalys — Agence digitale à Tours · Sites, lead magnets..."). Le skip link est présent mais sa cible n'existe pas (pas de `main`, pas de `#main-content`). 404 : `robots: noindex` correct mais titre trompeur.
- WCAG : 1.3.1, 2.4.1, 2.4.2.
- Fichiers : `src/app/demo/page.tsx` (client component sans `metadata`), `src/app/not-found.tsx`.
- Correctif : envelopper le contenu dans `<main id="main-content">`, exporter `metadata.title = "Démo CRM boulangerie"` (via un layout de segment car la page est cliente), et `metadata.title = "Page introuvable"` dans `not-found.tsx`.

### MINOR

**m1. Titres avec double suffixe "· Sèvalys · Sèvalys".** Pages : /services, /simulateur, /calculateur-roi (relevé : "Nos 9 services — ... | Sèvalys · Sèvalys", "Simulateur de diagnostic digital à Tours · Sèvalys · Sèvalys"). Le template racine ajoute déjà `· Sèvalys` (`src/app/layout.tsx:42`). Fichiers : `src/app/services/layout.tsx:4`, `src/lib/translations.ts:780`. Correctif : retirer "· Sèvalys"/"| Sèvalys" des titres de page (ou `title: { absolute: ... }`).

**m2. Boutons de langue FR/EN/TH 34x27, y compris dans le panneau mobile.** Preuve mesurée : 34x27 (desktop et mobile), 10px, sans `aria-pressed`. Fichier : `src/app/globals.css:271` (`padding: 6px 10px`). Correctif : `min-height: 44px; min-width: 44px` sur mobile (ou >= 24px avec espacement), `aria-pressed` ou `aria-current` sur la langue active.

**m3. Liens "← Retour aux services" 170x14, "ÉTUDE DE CAS" 276x17.** Pages : /services/[slug], /calculateur-roi (11px mono). Fichiers : `src/app/globals.css:427` (`.crumb-back`), `src/app/calculateur-roi/page.tsx:108`. Correctif : `display: inline-flex; min-height: 44px; align-items: center`.

**m4. Sliders et champs du calculateur ROI sous 44px.** Preuve : `input[type=range]` 550x4 (390px : 306x4), champs nombre 56x24, toggle "Cette boutique vend beaucoup par téléphone" 550x26. Le pouce du slider est visible mais la zone tactile de la piste est de 4px. Fichier : `src/app/calculateur-roi/page.tsx` (+ son CSS). Correctif : `padding-block` ou `min-height: 44px` sur le wrapper de chaque slider, `min-height: 44px` sur le toggle et les champs numériques.

**m5. Incohérence de copy sur le simulateur.** EN BREF et FAQ : "quatre ou cinq questions" ; compteur : "Question 1 sur 6". Fichier : `src/lib/translations.ts:786` et `:791` (ou le compteur, `Wizard.tsx:199`). Correctif : aligner ("cinq ou six questions").

**m6. "28 pièce" au singulier/pluriel dans /demo.** Le stock affiche `{stock_qty} {unit}` sans accord. Fichier : `src/app/demo/page.tsx:203`. Correctif : pluraliser (`Intl.PluralRules`) ou stocker l'unité au pluriel.

**m7. Footer "Work" en anglais sur un site FR.** La nav dit "Réalisations", le footer "Work" (`/#work`). Fichier : `src/components/layout/Footer.tsx:34`. Correctif : "Réalisations" (via `translations`). "Work" et "Avis" restent aussi 41x44 et 34x44, étroits (< 44 en largeur).

**m8. /mentions-legales : typographie divergente.** h1 36px/700 centré, "Mentions Légales" (majuscule à Légales). Liens de texte légaux 19px de haut (`contact@sevalys.com` 143x19, `CNIL` 29x19, `vercel.com` 116x19). Fichier : `src/app/mentions-legales/page.tsx`. Correctif : aligner sur /politique-des-avis (32px/500, aligné à gauche, "Mentions légales"), `padding-block` sur les liens.

**m9. Focus visible d'1px.** Outline auto 1px gris clair (`rgb(238,238,238)`) sur nav et liens ; le CSS du footer utilise 2px acid (`globals.css:387,390`). Visible mais mince, incohérent entre zones. Correctif : règle globale `:focus-visible { outline: 2px solid var(--acid); outline-offset: 2px }`.

**m10. Logo `<a class="nav-brand">` 68x17.** Hit area sous 44px (desktop et mobile). Correctif : padding vertical.

**m11. Emoji dans le h1 de /demo ("🥐 Boulangerie Demo — CRM Live")** et "Demo" sans accent ("Démo"). Le h1 est lu "croissant" par les lecteurs d'écran. Fichier : `src/app/demo/page.tsx`. Correctif : `aria-hidden` sur l'emoji, "Démo".

**m12. 404 : wordmark géant "Sèvalys·services·2026" juste sous le CTA "Retour à l'accueil".** Pour une page d'erreur, visuel lourd et sans lien vers /services ou /contact. Fichier : `src/app/not-found.tsx` (+ Footer). Correctif : 404 plus sobre, deux liens utiles.

**m13. Tailles de police très petites.** 10-11px relevés (eyebrows mono, `.crumb-back`, labels formulaire), 12px pour de nombreux textes secondaires. Cible : 12px minimum.

**m14. Domaine `www.sevalys.com` sans certificat valide (hors périmètre de la page).** `curl https://www.sevalys.com/` : échec TLS (code 000). Chrome affiche "Erreur liée à la confidentialité" sur `https://www.sevalys.com/connexion` (vu dans l'onglet d'un autre agent). À corriger dans la config domaine (redirection www vers apex avec certificat). Impact : liens ou saisies manuelles avec www.

## Ce qui est bon (vérifié)

Cookies : équivalence Accepter/Refuser, `dialog` modal, ouverture depuis le footer partout y compris /mentions-legales. Nav mobile propre. Skip link. h1 uniques, zéro id dupliqué. Zéro overflow horizontal. Pas de prix affichés sur les pages de service. /avis : état vide honnête, noindex tant qu'aucun avis. Footer : cibles 44px et contraste correct. Honeypot du formulaire de contact bien masqué (`aria-hidden`, `left:-9999px`, `tabindex=-1`).

## Captures

`C:\portfolio\.planning\ui-reviews\v2.0-browser\shots\A\` : home 1280 (x2), home 390 et nav ouverte, cookie dialog home et /mentions-legales, services, site-vitrine, simulateur (1280 et 390), calculateur-roi (1280 et 390), demo (1280 et 390), avis, politique-des-avis (1280 et 390), desinscription, 404.
