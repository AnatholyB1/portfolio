# Lots A et B : re-mesure Playwright à viewports réels (prod https://sevalys.com, HEAD d94cf62)

Date : 2026-10-14. Lecture seule. Playwright/Chromium hors repo. 14 pages x 6 viewports (360x740, 390x844 mobile tactile DPR2, 768x1024, 1024x768, 1280x800, 1440x900) = 84 mesures. Captures : `shots/PW/` (84 `page-viewport.png` plein écran, plus `-cookie.png`, `nav-open-*`, `connexion-*`, `*-zoom200/zoom400/bigtext-*`).
Brut : `scratchpad/pw/results.json`, `special.json`, `c2.json` (hors repo).

## Méthode et réserves

- Chaque mesure : `networkidle` + 2,2 s, dialogue cookies refusé avant mesure (il s'ouvre seul à la première visite, voir N2), puis overflow (`scrollWidth` + éléments hors viewport non clippés), cibles interactives < 44px (hors liens en ligne dans un paragraphe, comptés à part), contraste calculé (canvas pour résoudre oklab/alpha, opacité cumulée, fond composité), polices < 12px, h1, ids dupliqués, `<main>`, skip links, 14 (1280, 360) ou 6 Tab réels, CLS (PerformanceObserver), console et requêtes en échec.
- Contraste : une 1re passe affichait des "échecs" à ratio 1 sur home, services, service, simulateur : artefacts de `opacity:0` (reveal au scroll non déclenché). Passe corrigée (scroll complet puis mesure, `c2.json`) : 0 échec réel sauf `/demo` (N7).
- Aucun e-mail valide saisi. Sur `/connexion` seuls "" et "abc" ont été soumis (2 POST server action, rejetés par la validation serveur, aucun envoi). Jeton d'avis bidon : lien invalide.
- Limites : chromium desktop uniquement (pas de WebKit/iOS), pas de lecteur d'écran réel, pas d'avis ni de jeton valide (étape OTP et formulaire d'avis non testables).

## Tableau page x viewport

Overflow horizontal : **aucun sur les 84 combinaisons** (`scrollWidth` = viewport partout, y compris 360, 768, 1024, 1440 jamais mesurés avant). Aucun id dupliqué, 1 seul h1 partout, 0 image sans alt.
Cibles < 44px = éléments non en ligne (entre parenthèses : liens en ligne dans un paragraphe). Le nav passe en burger jusqu'à 768 inclus, desktop dès 1024 (d'où le saut 8 -> 17).

| Page | 360 | 390 | 768 | 1024 | 1280 | 1440 | Pire contraste réel | CLS max | Console / réseau |
|---|---|---|---|---|---|---|---|---|---|
| `/` | 8 | 8 | 8 | 17 | 17 | 17 | 4,59 (URLs mono des cartes) | 0 | propre |
| `/services` | 3 | 3 | 3 | 10 | 10 | 10 | 5,08 | 0 | propre |
| `/services/site-vitrine` | 5 | 5 | 5 | 12 | 12 | 12 | 4,59 | 0 | propre |
| `/simulateur` | 3 | 3 | 3 | 10 | 10 | 10 | 5,08 | 0 | propre |
| `/calculateur-roi` | 12 | 12 | 13 | 20 | 20 | 20 | 4,84 | 0 | propre |
| `/demo` | 1 | 1 | 1 | 8 | 8 | 8 | **4,17 (échec)** | 0,067 (768) | propre |
| `/avis` | 3 (+3) | 3 (+3) | 3 (+3) | 10 (+3) | 10 (+3) | 10 (+3) | 5,08 | 0 | propre |
| `/politique-des-avis` | 3 (+1) | 3 (+1) | 3 (+1) | 10 (+1) | 10 (+1) | 10 (+1) | 5,08 | 0 | propre |
| `/mentions-legales` | 3 (+4) | 3 (+4) | 3 (+4) | 10 (+4) | 10 (+4) | 10 (+4) | 5,08 | 0 | propre |
| `/desinscription` | 0 | 0 | 0 | 0 | 0 | 0 | 6,38 | 0 | propre |
| `/nexiste-pas` | 3 | 3 | 3 | 10 | 10 | 10 | 5,08 | 0,009 | 404 attendue |
| `/connexion` | 0 (+1) | 0 (+1) | 0 (+1) | 0 (+1) | 0 (+1) | 0 (+1) | 6,38 | 0 | propre |
| `/auth/confirm` | 0 (+1) | 0 (+1) | 0 (+1) | 0 (+1) | 0 (+1) | 0 (+1) | 6,24 | 0 | propre |
| `/avis/<jeton bidon>` | 0 (+1) | 0 (+1) | 0 (+1) | 0 (+1) | 0 (+1) | 0 (+1) | 6,38 | 0 | propre |

Détail des cibles < 44 (identique d'un viewport à l'autre, sauf le nav desktop) : logo `a.nav-brand` 68x17 (toutes pages) ; liens nav desktop 32px de haut (Manifeste 60, Réalisations 73, Services 51, Contact 50) ; boutons FR/EN/TH 34x27 ; footer "Work" 41x44 et "Avis" 34x44 (largeur seule) ; `← Retour aux services` 170x14 ; `ÉTUDE DE CAS` 276x17 ; liens `rz-link` des cartes de la home 231x21 etc. ; champs du formulaire de contact 32px de haut ; calculateur ROI : 5 `roi-num` 56x24 et 5 `roi-range` 4px de haut ; liens en ligne légaux 19-22px ; `contact@sevalys.com` 19px (connexion) et 22px (avis invalide). Le skip link `a.pt-skip` (hors écran) est exclu.
Polices : 10px (34 nœuds sur la home, 3 à 4 ailleurs) et 11px (23 sur la home, 1 à 11 ailleurs). Aucune sur `/connexion`, `/auth/confirm`, `/avis/<jeton>`, `/desinscription`.
Boutons du dialogue cookies : 44px de haut à tous les viewports, identiques (308x44 à 390, 278x44 à 360, 211x44 dès 768).

## Verdicts sur les findings de A et B

| Réf | Verdict | Preuve Playwright |
|---|---|---|
| A-M1 formulaire contact sans labels | **Confirmé** | Home, tous viewports : 4 champs visibles sans nom accessible (+ honeypot), hauteur 32px |
| A-M2 numéro /demo | **Confirmé** | Aucun `a[href^=tel]` ; texte 36px sur 2 lignes à 360 et 390 ("+33 9 48 19 43" / "01"), 1 ligne dès 768 |
| A-M3 /demo et 404 sans `<main>` ni titre propre | **Confirmé et aggravé** | `main`=0 ; titre = celui de la home ; Tab puis Entrée sur le skip link de /demo laisse le focus sur le lien (cible absente). Voir N5 |
| A-m1 double suffixe de titre | Confirmé | `/services`, `/simulateur` : "... \| Sèvalys · Sèvalys" |
| A-m2 boutons langue 34x27 | Confirmé (desktop) | 34x27 de 1024 à 1440, 10px. Ils ne sont dans le DOM visible qu'en panneau mobile |
| A-m3, m10 liens retour, logo | Confirmé | 170x14, 276x17, logo 68x17 |
| A-m4 sliders ROI | Confirmé et aggravé | piste 4px, champs 56x24, plus N1 (sans nom accessible) |
| A-m7 footer "Work" | Confirmé | 41x44 |
| A-m9 focus 1px | **Nuancé** | Computed `1px auto rgb(238,238,238)` sur nav, mais le rendu est un anneau blanc arrondi bien visible (capture `focus-nav-1280.png`). Reste incohérent : 2px solid acide dans footer/auth, `3px auto` sur FR/EN/TH. Passe de MINOR à cosmétique |
| A-m13 polices 10-11px | Confirmé | chiffres ci-dessus |
| A, overflow 768 et 1440 non mesurés | **Infirmé (pas de défaut)** | 0 overflow à 768, 1024, 1440 |
| A, contraste | Confirmé OK | 4,59 minimum hors /demo |
| B-M1 double skip link / lien mort | **Nuancé (rétrogradé MINOR)** | 2 liens bien présents (`.skip-link` puis `.pt-skip`), `#main-content` absent du DOM. Mais Tab + Entrée sur le 1er place le focus sur `MAIN#contenu` (le composant retombe sur `main`) : il fonctionne avec JS. Reste redondant (2 arrêts) et mort sans JS |
| B-M2 lien e-mail sans soulignement | **Confirmé** | `/avis/<jeton>` : `text-decoration: none`, même couleur `rgb(154,150,144)` que le texte, 22px. `/connexion` : souligné |
| B-m1 titre /auth/confirm | Confirmé | "Connexion · Sèvalys" |
| B-m2 lien contact 19px | Confirmé | 143x19 |
| B-m4 404 publique sous /auth/* | Non retesté | hors parcours |
| B-m5 dialogue cookies sur /connexion | **Infirmé** | `dialog.open=false` à 360 et 1280, aucun footer ni bouton cookies sur `/connexion`, `/auth/confirm`, `/avis/<jeton>` : le dialogue ne s'ouvre pas et ne peut pas être ouvert (pas de lien "Gérer les cookies"). Cohérent si aucun traceur n'y tourne |
| B, validation vide / "abc" | **Vérifié, conforme avec réserve** | Formulaire `novalidate`, soumission serveur. Vide et "abc" : `aria-invalid=true`, focus conservé sur l'input, `aria-describedby=pt-email-error`, message dans une région `aria-live` : "Cette adresse e-mail n'est pas valide. Vérifiez-la et réessayez." Réserve : le même message pour un champ vide ("Saisissez votre adresse" serait plus exact) ; `validationMessage` natif en anglais invisible car `novalidate` |
| B, ordre Tab /connexion | Vérifié | skip-link global, skip-link `pt-skip`, champ e-mail, bouton, Retour au site, mailto, puis boucle. Anneaux 2px solid acide partout |
| B, étape OTP, formulaire d'avis réel | Non vérifiable | sans envoi / jeton |

## Findings nouveaux

### MAJOR

**N1. Calculateur ROI : 10 contrôles sans nom accessible.**
- Page : `/calculateur-roi`. Viewport : tous.
- Preuve : arbre d'accessibilité (`ariaSnapshot`) : `spinbutton: "15"`, `slider: "15"`, idem 5, 26, 30, 1 ; seul le `switch` a un nom. Le libellé ("Nombre d'appels par jour") est du texte voisin sans `for`/`aria-labelledby`. `labels.length===0` sur les 10 `input.roi-num` et `input.roi-range`.
- WCAG : 1.3.1, 4.1.2, 3.3.2.
- Correctif : `aria-label` ou `<label htmlFor>` sur chaque paire, `aria-valuetext` avec unité ("15 appels par jour") sur les sliders, `min-height: 44px` sur le wrapper.

**N2. Menu mobile plein écran : le focus clavier sort du panneau vers la page cachée.**
- Page : toutes sauf legal, viewport <= 768 (burger).
- Preuve : ouverture clavier sur `/services` à 390 : focus sur "Manifeste", Tab : Réalisations, Services, Contact, FR, EN, TH, "Lancer le diagnostic", puis `01 Site Vitrine`, `02 Rebranding`, `03 Branding` : contenu de la page derrière le panneau opaque. `main.inert=false`, pas de piège. Escape ferme bien et rend le focus au burger (OK).
- WCAG : 2.4.3, 2.4.11 (focus masqué).
- Correctif : `inert` sur `main`, footer et bannière quand `aria-expanded=true`, ou piège de focus Tab/Shift+Tab dans le panneau.

### MINOR

**N3. Dialogue cookies : modale ouverte automatiquement à la 1re visite de chaque page marketing, jusqu'à 66 % du viewport.** Pages : `/`, `/services`, `/services/*`, `/simulateur`, `/calculateur-roi`, `/demo`, `/avis`, `/politique-des-avis`, `/nexiste-pas` (pas sur legal, désinscription, connexion, auth, avis/jeton). Hauteur : 488/740 (66 %) à 360, 435/844 (52 %) à 390, 335/800 (42 %) à 1280. Bien fait : `<dialog>` modal, focus sur le h2, piège de focus vérifié (En savoir plus, Refuser, Accepter, Aller au contenu en boucle), boutons identiques 44px, fermeture en `display:none` (non focusable) après environ 1 s. Pas un défaut, mais coût de première visite élevé en mobile 360 : réduire la copie (une phrase) pour tenir sous 50 %. Attention : juste après Refuser, une transition de fermeture garde brièvement le lien focusable.

**N4. `prefers-reduced-motion` : respecté en partie.** `reduce` : les reveals sont neutralisés (0 élément à opacité < 0,1 contre 38), le défilement de partenaires passe en pause. Restent : `introPulse` en boucle infinie sur `.intro-mark` (animation encore `running`), et `scroll-behavior: smooth` toujours actif sur `html`. Correctif : `@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto } .intro-mark { animation: none } }`.

**N5. `/demo` : indexable mais canonique vers la home, titre dupliqué, listée dans le sitemap.** `robots: index, follow`, `canonical: https://sevalys.com/`, `<title>` de la home, `/demo` dans `sitemap.xml`. Google fusionnera la page avec la home. La 404 porte aussi le canonique `/` (avec `noindex`, sans conséquence). Fichiers : `src/app/demo/page.tsx` (client, sans metadata), `src/app/layout.tsx` (canonique racine). Correctif : layout de segment avec `title` et `alternates.canonical: '/demo'`.

**N6. Navigation desktop : liens 32px, logo 17px de haut.** Au-dessus de 24px (AA 2.5.8 conforme), sous 44px. `padding-block` suffit.

**N7. `/demo` : texte `--ink-faint` à 4,17:1 (AA = 4,5).** `p.text-sm` "Demandez les produits disponibles..." en `rgb(133,129,122)` sur fond de carte plus clair que le fond de page (le même token vaut 5,08 sur le fond de page). Correctif : utiliser `--ink-dim` (#9A9690) dans les cartes de /demo.

**N8. Skip links dont la cible `#main-content` est absente du DOM** sur `/services`, `/services/*`, `/calculateur-roi`, `/desinscription`, `/connexion`, `/auth/confirm`. Ils fonctionnent grâce à un repli JS vers `main` (focus sur `MAIN`, vérifié), mais l'ancre est morte sans JS et `/demo`, 404 n'ont aucun `main`. Correctif : `id="main-content"` sur tous les `<main>`.

**N9. Cadence des "À vérifier" dans les mesures : CLS tous < 0,1** (max 0,067 sur /demo à 768, probablement la liste produits qui se charge). Pas d'action sauf réserver la hauteur de la liste.

### Constats sans défaut (infirmés ou rassurants)

- Overflow horizontal : aucun à 360, 390, 768, 1024, 1280, 1440. Zoom 200 % (640x400 CSS) et 400 % (320x256) sur `/`, `/connexion`, `/simulateur` : `scrollWidth` = viewport ; le ticker partenaires et quelques `span` du simulateur dépassent mais sont clippés. Texte à 200 % de `font-size` + espacement WCAG 1.4.12 : pas de débordement ; seul le wordmark décoratif du footer est tronqué à 390.
- `/connexion` à 200 % et 400 % : lisible, champ et bouton à 44px.
- Nav mobile : burger 44x44 `aria-expanded`, ouverture, fermeture par burger et par Escape, retour du focus au burger, fermeture après clic sur un lien : OK à 360, 390, 768.
- Console : aucune erreur ni avertissement hors la 404 attendue ; requêtes `_rsc` annulées (`ERR_ABORTED`, préchargement Next) sans impact.
- Titre et robots : `/desinscription`, `/avis/<jeton>`, `/auth/confirm` en `noindex, nofollow, nocache`.

## Résumé (15 lignes)

1. 84 mesures Playwright (6 viewports réels x 14 pages) : **aucun overflow horizontal**, y compris 768, 1024, 1440 et zoom 200/400 %. CLS < 0,1 partout.
2. Contraste réel : aucun échec sauf `/demo` (4,17:1, N7). Les "échecs" de la 1re passe étaient des reveals à opacité 0.
3. A-M1 (formulaire home sans labels), A-M2 (numéro /demo sur 2 lignes à 360/390, sans `tel:`), A-M3 (/demo et 404 sans `main` ni titre) : **tous confirmés**.
4. B-M1 (double skip link) : le lien global fonctionne via repli JS, donc seulement redondant (MINOR). B-M2 (lien e-mail sans soulignement sur /avis/<jeton>) : confirmé.
5. B-m5 : **infirmé**, le dialogue cookies ne s'ouvre pas sur /connexion et n'a pas de point d'entrée.
6. Validation /connexion : vide et "abc" bien gérés (aria-invalid, focus, aria-live), aucun envoi ; seule réserve : même message pour vide et invalide.
7. Nouveau MAJOR N1 : calculateur ROI, 10 sliders/champs sans nom accessible.
8. Nouveau MAJOR N2 : menu mobile plein écran sans piège de focus, Tab passe derrière le panneau.
9. N3 : le dialogue cookies s'ouvre seul à la 1re visite de chaque page marketing et prend 66 % du viewport à 360.
10. N4 : reduced-motion partiel (intro en boucle, `scroll-behavior: smooth` conservé). N5 : `/demo` indexable mais canonique vers la home et listée au sitemap.
11. Cibles < 44px : 8 (mobile) à 17 (desktop) sur la home, 12 à 20 sur le calculateur, 0 sur /desinscription et les pages d'auth.
12. Focus visible partout (A-m9 nuancé : anneau réel visible, seulement incohérent).
13. Livrables : ce fichier et `shots/PW/` (84 captures plein écran, plus cookie, menu, validation, zoom).
