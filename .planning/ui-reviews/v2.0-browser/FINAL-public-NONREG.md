# Non-régression pages publiques (prod https://sevalys.com, HEAD 7b45198)

Date : 2026-10-15. Lecture seule, aucun formulaire envoyé, `src/` non modifié. Avant = `shots/PW/` + `scratchpad/pw/results.json` (HEAD d94cf62). Après = `shots/final/public/` (66 captures plein écran `page-viewport.png`, `-scrolled.png` après scroll complet, `-diff.png` pour chaque écart). Script : `scratchpad/pw/nr.mjs` (même méthode que l'audit PW : 6 viewports 360x740, 390x844 mobile DPR2, 768x1024, 1024x768, 1280x800, 1440x900 ; refus du dialogue cookies, Tab, Escape, retour en haut, capture), comparaison `cmp.mjs` (pngjs + pixelmatch, seuil 0,1) installés dans le dossier pw, pas dans le repo.

## Verdict global

Les 10 pages marketing/légales sont **IDENTIQUES** (aucune règle `pt-*`, aucune variable `--pt-*` chargée). **/desinscription change visiblement** (DIFFÉRENCE MINEURE, 1 défaut cosmétique à corriger) : c'est la seule page qui charge `portal.css`, et ce fichier a reçu des règles scopées sur `.pt-auth`, que cette page utilise.

## Preuves communes

- **Hauteurs de page** : identiques à 100 % sur 66 combinaisons (même largeur x hauteur de PNG, ex. home 360 = 12332, 1280 = 12520, services 360 = 2644). Aucun overflow horizontal (`sw` = viewport partout). Mêmes mesures qu'avant : cibles < 44px non en ligne (home 8/8/8/17/17/17, services 3/10, slug 5/12, simulateur 3/10, ROI 12/12/13/20, demo 1/8, avis 3/10, politique 3/10, mentions 3/10, désinscription 0, 404 3/10), titres, h1, nombre de `<main>`, polices < 12px : **aucun écart** sur les 66 (seul `textCount` de la home varie de ±5 textes : ticker/rotation, bruit).
- **Feuilles chargées** : les 10 pages marketing/légales chargent exactement les 2 mêmes CSS (`754c8abdb279c939.css`, `505991341df969a0.css`), 728 règles (729 sur la home : 1 `<style>` en plus), **0 règle `pt-*`, 0 variable `--pt-*`**, 17 variables racine identiques entre elles. `/desinscription` charge en plus `350b63dbd5be0a09.css` (894 règles, 140 règles `pt-*`, 11 variables `--pt-*` : durées, rayons, ombres, easings).
- **Computed styles** (`nr.json`, `st`) : body, h1-h3, a, button, input, p, nav, footer (couleur, fond, police, taille, graisse, transition, rayon, padding, min-height) relevés sur chaque page x viewport ; polices chargées identiques. Les captures pixel à pixel confirment qu'ils n'ont pas bougé (si une couleur, police, transition ou taille avait changé, le pixel diff le montrerait).
- **Pixel diff** : 66 comparaisons, 40 à 0 pixel d'écart. Les 26 autres sont du bruit identifié visuellement (pas des changements) :
  - barre CTA mobile fixe « Lancer le diagnostic » et nav fixe, décalés de quelques px en capture plein écran (`*-360`, `*-390`, `*-768` : calculateur 360, avis 360, mentions 390/768, politique 390/768, simulateur 390, slug 360/390, services 360, 404 360) ;
  - home 1024 (0,66 %) : capture prise pendant le fondu de sortie du dialogue cookies (hero assombri sur la nouvelle) ; home 1440 (0,05 %), 768, 360 : défilement du ticker partenaires, point de pastille décalé de 4 px ; home 1280 : 77 px (curseur/point animé) ;
  - services 768 (0,47 %) : barre d'accent de la rangée `03 Branding` à un autre stade de son animation hover/focus ; avis 1280 et slug 1280 : 1475 px, bande de nav 0-53 px.
  Les écarts les plus gros hors /desinscription (0,66 %) ne touchent ni texte, ni couleurs, ni mise en page.
- Console et réseau : propres, sauf la 404 attendue sur `/nexiste-pas` (1 entrée). Contraste : `/demo` 1 échec (le N7 déjà connu, 4,17:1), 0 sur les autres pages hors reveals non déclenchés dans la 1re passe (même comportement qu'avant).

## Verdict page par page

| Page | Verdict | Détail |
|---|---|---|
| `/` | IDENTIQUE | Hauteurs identiques 6/6, métriques identiques, écarts pixel = ticker et fondu du dialogue cookies |
| `/services` | IDENTIQUE | 0 pixel sur 4 viewports ; 360 et 768 : barre fixe/animation hover |
| `/services/site-vitrine` | IDENTIQUE | 0 pixel sur 3 viewports ; reste = nav/CTA fixes décalés |
| `/simulateur` | IDENTIQUE | 0 pixel sauf 390 (CTA fixe) |
| `/calculateur-roi` | IDENTIQUE | 0 pixel sauf 360 (CTA fixe) ; mêmes 12 à 20 cibles < 44 |
| `/demo` | IDENTIQUE | 0 pixel sur 6 viewports, même CLS (0,067 à 768) et même contraste 4,17 |
| `/avis` | IDENTIQUE | 0 pixel sauf 360 (CTA fixe) et 1280 (bande nav 1475 px) |
| `/politique-des-avis` | IDENTIQUE | 0 pixel sauf 390 et 768 (CTA fixe) |
| `/mentions-legales` | IDENTIQUE | 0 pixel sauf 390 et 768 (CTA fixe) |
| `/nexiste-pas` (404) | IDENTIQUE | 0 pixel sauf 360 (CTA fixe), statut 404, même contenu |
| Bannière cookies | IDENTIQUE | Ouverte à la 1re visite sur `/`, `/services*`, `/simulateur`, `/calculateur-roi`, `/demo`, `/avis`, `/politique-des-avis`, `/nexiste-pas` (comme avant), bouton « Refuser » cliqué à chaque fois ; pas sur légal ni désinscription (comme avant) |
| `/desinscription` | **DIFFÉRENCE MINEURE** | voir ci-dessous |

## /desinscription : détail

Pixel diff 0,7 à 3,1 % à tous les viewports (donc réel, pas du bruit). Hauteur de page et nombre de cibles < 44 inchangés (0), contraste 6,38 (inchangé), `sw` = viewport, titre « Désinscription · Sèvalys », `noindex, nofollow, nocache`, HTTP 200. Comportement sans session identique : page statique rendue par jeton d'URL (`?t=`), `?t=bidon` donne le même écran « lien invalide », `?ok=1` « Vous êtes désinscrit » ; aucun accès à une session, aucun POST émis.

Différences visibles (toutes explicables par `git diff d94cf62 7b45198 -- src/app/portal.css`, règles `.pt-auth`) :
1. Halo radial vert très discret derrière le logo (`radial-gradient(... var(--acid) 8% ...)`), absent avant (fond uni).
2. Carte : padding 32px dès 480px (24 avant), `gap: 20px`, bordure `--line-strong`, rayon 12px, ombre `--pt-shadow-lg` ; le logo et la carte sont décalés de 16px vers le haut (carte 270-590 contre 286-573).
3. Titre 28px (avant ~24px), texte 15px / interligne 1,55.
4. Entrée en fondu + glissement de 8px (`pt-enter`, 0,4 s, décalage 60/120 ms) sur le logo et la carte ; avec `prefers-reduced-motion: reduce` l'animation est bien désactivée (`animation-name: none` mesuré, `main` est dans `.pt-root`).
5. Les 11 variables `--pt-*` et les transitions de `.pt-back` (couleur + transform) sont chargées par `portal.css` (`@import tokens.css`, `primitives.css`) ; aucune n'atteint les autres pages.

### Défaut cosmétique introduit (à corriger, MINEUR)

**Point final orphelin à 1280 (mesuré ; 768 à 1440 non mesurés mais même largeur de carte de 440 px)** : la phrase « Pour vous désinscrire, écrivez à contact@sevalys.com. » tient sur la 1re ligne jusqu'au lien mais le « . » tombe seul sur une 2e ligne (mesure : lien x=672 y=400 153x44, point x=453 y=445). Avant, le lien passait à la ligne avec son point. Cause : la carte est plus étroite (contenu 374 px au lieu de 390 px à cause du padding 32) et le lien est `inline-flex min-h-[44px]`, donc le point ne peut pas coller. Même gabarit sur `?ok=1` (point x=814 y=447 à 1280). Correctif : mettre le « . » dans le lien (ou un `<span className="whitespace-nowrap">` autour de `lien + .`) dans `src/app/desinscription/page.tsx` (3 occurrences) ; à 360 le point reste collé au lien (x=194, y=417) : pas de défaut.

Pas de régression fonctionnelle ou d'accessibilité sur cette page (focus visible, 0 cible < 44, contraste 6,38, reduced-motion respecté).

## Conclusion

Mise en prod conforme à l'objectif : aucune page destinée aux nouveaux leads n'a changé (10 pages IDENTIQUES, 0 règle/variable `pt-*` chargée hors portail). Seul écart : `/desinscription`, cohérente avec le polish des cartes d'authentification, avec un point orphelin cosmétique à corriger.
