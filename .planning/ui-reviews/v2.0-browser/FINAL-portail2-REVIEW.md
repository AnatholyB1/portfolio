# Vérification finale portail 2 (sevalys.com, 2026-10-15, HEAD 621b4a2)

Lecture seule. Session valide pendant toute l'exécution (0 redirection vers /connexion). Aucun formulaire soumis, rien signé/payé. Les `mouse.down` sur boutons ont été relâchés hors de l'élément (aucun clic). `src/` intact.
Mesures brutes : `p2.json` et `p3.json` (scratchpad pw). Captures fullPage : `shots/final/portail2/` (`home|docs|pay-<largeur>.png`, `skeleton-during|after-*`, `home-open-*`, `*-rowhover-1280.png`).
Viewports : 360, 390 (mobile tactile DPR2), 768, 800, 900, 960, 1024, 1280, 1440 ; 3 pages x 9 = 27 chargements.

## Points demandés

| # | Point | Verdict | Preuve |
|---|---|---|---|
| 1 | `/documents` sans débordement, cartes < 960, tableau >= 960, mots non brisés | **Vérifié (régression de 768 corrigée)** | `scrollWidth` = largeur à tous les viewports, 0 élément hors écran. Bloc (cartes) à 360 à 900, `table` à 960+. 0 mot brisé. 768 : sw 768 (avant 831). |
| 2 | `/paiements` idem, surtout 800-960 | **Vérifié** | 800, 900 : sw = vw, 0 hors écran, cartes. 960+ : tableau. Réserve visuelle : voir MINOR « tableau serré ». |
| 3 | Forme juridique en libellé | **Vérifié** | `<details>` ouvert (lecture seule) : « Forme juridique : Entrepreneur individuel ». Capture `home-open-1280.png`. Le seul « 1000 » de la page n'est pas dans ce champ (aucun select/input de forme juridique). |
| 4 | Skeleton de chargement | **Vérifié, avec réserves** | Navigation cliente Paiements vers Projet : skeleton `pt-skeleton` (5 blocs, `aria-busy`, texte « Chargement en cours ») visible dès 600 ms, 0 CLS mesuré. Même sans délai artificiel il reste affiché ~3 s (rendu serveur de l'accueil lent). Fidélité : voir MINOR. |
| 5 | `:active`, `:hover`, `:focus-visible` | **Vérifié** | Boutons (`pt-btn-ghost`, `pt-btn-text`, Télécharger, Se déconnecter, summary) : transition explicite `color, background-color, border-color, transform, box-shadow` 0,2 s (0,12 s sur transform) ; `:hover` fond crème 6 % + texte clair ; `:active` `scale(0.98)` + fond 9 % ; `:focus-visible` outline 2 px acide `rgb(196,245,66)` sur 100 % des éléments testés. 0 `transition: all` de durée non nulle (compte `transAll` = 0 sur 27 pages). Onglets, « Retour au site », liens contact : hover couleur/bordure OK, pas de `:active` visuel (sauf contact : couleur adoucie). |
| 6 | Un seul skip link | **Vérifié** | 1 seul `a[href^="#"]` par page : « Aller au contenu » → `#contenu`, cible présente, 9 viewports x 3 pages. Le skip link est hors écran (hover Playwright impossible, normal). |
| 7 | Onboarding cohérent avec projet livré | **Vérifié** | « Nous préparons votre devis » absent (`devis:false` partout). Texte : « Merci, votre onboarding est complet. » ; bandeau « Rien, votre projet est livré ». |
| 8 | Hover de ligne de tableau | **Vérifié** | `tr` : transparent vers `rgb(22,24,26)` (`transition-property: background-color`) à 1280 sur Paiements ; idem Documents. |
| 9 | reduced-motion | **Vérifié** | `reduce` : 0 animation (jamais vue, 0 en cours, 0 infinie) sur home/docs/paiements. `no-preference` : `pt-shimmer`, `pt-enter` 400 ms, `pt-draw`, `pt-fill`. Réserve : `scroll-behavior: smooth` reste actif sous `reduce` (mesuré). |
| 10 | CLS, console, requêtes, contraste, cibles | **Vérifié / partiel** | CLS 0,000 x 27 (hors navigation cliente, voir plus bas). 0 erreur console, 0 réponse >= 400. Contraste calculé : 0 échec x 27. 0 cadratin. Cibles < 44 px : « Projet » actif 40x44, cases/radios d'onboarding 24x24 (home seulement), skip link 153x42 ; docs/pay : 2 éléments sous 44 chacun (onglet actif + skip link). Contact e-mail/tél 44 px. |

Régressions par rapport à la passe précédente : **aucune**. Corrigés depuis : régression MAJOR `/documents` 768, double skip link, forme juridique, texte « devis » sur projet livré.

## Nouveaux défauts

- **MINOR** : skeleton peu fidèle. Pendant la navigation cliente la barre d'onglets (Projet/Documents/Paiements) et le nom du client + « Se déconnecter » disparaissent (en-tête « Espace client » seul), puis réapparaissent : saut visuel de 928 px (skeleton) vers 2742 px (page). Il ne reproduit ni le hero, ni la frise. Le CLS affiché 0 est faussé (décalages juste après un clic exclus) : le saut est bien visible dans `skeleton-during/after-1280.png`.
- **MINOR (perf)** : le rendu de `/espace-client` en navigation cliente prend ~3 s (skeleton visible 3 s sans throttle). À investiguer côté serveur.
- **MINOR** : tableaux 960-1280 serrés (largeur fixe 846 px) : « Avoir TAV-/2026-0001 » coupé au tiret, « Facture de / période », période « du 01/10/2026 au 05/10/2026 » sur 4 lignes, « Non / renseigné » sur 2 lignes. Le détecteur compte les numéros TAV/TFA coupés aux tirets (hors mots brisés au milieu).
- **MINOR** : 800-900 px = cartes en une colonne très longue (Documents 2320 px à 800), alors qu'il y a la place pour 2 colonnes.
- **MINOR** : `<title>` « Documents » / « Paiements » sans suffixe de marque (déjà noté, inchangé). Cases d'onboarding 24x24 et onglet actif 40 px de large inchangés.
- **MINOR** : onglets de navigation et « Retour au site » sans retour `:active`.
- Non observable avec ce projet livré : F-C1/F-C2/F-C3/F-C4 (étape active, saisie d'un champ).

## Notes /10 (avant = FINAL-portail-REVIEW → après)

| Écran | Avant | Après | Commentaire |
|---|---|---|---|
| Portail Projet | 7 | 7,5 | Bandeau livré, frise, forme juridique lisible, cohérence du message. Reste un empilement de cartes de même poids. |
| Documents | 5,5 | 7 | Débordement 768 corrigé, cartes propres, boutons nommés. Colonne unique trop longue 768-900. |
| Paiements | 7 | 7 | Stable ; tableau 960-1280 trop serré, retours à la ligne laids. |
| Skeleton / chargement | n/a | 6 | Présent, accessible, reduced-motion respecté, mais en-tête et onglets absents puis sautent. |
| Interactions (hover/active/focus) | n/a | 8 | Cohérentes, explicites, focus acide net. |

« Plus beau qu'avant » : oui, de façon cohérente et sans régression ; reste sobre.

## Résumé
1. Session valide jusqu'au bout, 27 chargements (9 viewports) et tests d'interaction faits, rien d'écrit.
2. `/documents` et `/paiements` : 0 débordement de 360 à 1440, cartes < 960, tableau >= 960 : vérifié.
3. Forme juridique : « Entrepreneur individuel » (pas de code).
4. Un seul skip link, cible `#contenu` présente : corrigé.
5. « Nous préparons votre devis » disparu ; message livré cohérent.
6. Hover/active/focus : transitions explicites (0 `all`), `scale(.98)` en `:active`, focus acide 2 px partout, hover de ligne OK.
7. reduced-motion : 0 animation avec `reduce` (smooth scroll persiste).
8. CLS 0, console propre, 0 échec de contraste, 0 requête en erreur.
9. Skeleton OK en fonction mais en-tête/onglets disparaissent pendant 3 s (rendu serveur lent) puis sautent : MINOR.
10. Tableaux 960-1280 serrés (numéros coupés aux tirets) : MINOR.
11. Aucune régression, aucun BLOCKER/MAJOR.
12. Notes : Projet 7,5, Documents 7, Paiements 7, Skeleton 6, Interactions 8.
