# Audit navigateur réel, lot C : portail client (https://sevalys.com/espace-client)

Date 2026-10-14. Playwright (Chromium), session du client de test permanent, lecture seule (aucun formulaire soumis, aucune signature, aucun paiement, aucune saisie dans l'onboarding). Viewports : 360x740, 390x844 (mobile, tactile, DPR 2), 768x1024, 1024x768, 1280x800, 1440x900, plus zoom 200 % (640 px) et 400 % (320 px). Captures : `shots/C/` (84 captures plein écran + états). Lecture seule de la base (SELECT) uniquement pour retrouver les identifiants de documents du client de test.

**État réel du projet de test** : les 6 étapes sont terminées (projet livré), 4 factures (une remboursée + avoir, solde et acompte payés), aucun document « à signer », aucune facture « à payer ». Conséquence : les écrans de signature en état ouvert, la checklist de recette, la barre collante, l'iframe PDF, le bouton Payer et les messages « En attente de vous » ne sont pas observables. Je ne conclus pas pour ces états.

## 1. Scores (6 piliers, /4 chacun)

| Pilier | Note | Justification |
|---|---|---|
| Texte (copy) | 3 | Libellés clairs, états vides et 404 portail bien rédigés. Défauts : « Ce document n'est pas encore à signer » affiché pour un devis déjà « Signé » ou un cahier des charges ; titre « Signer le contrat » sur un contrat déjà signé ; « Forme juridique 1000 » (code INSEE) ; tiret cadratin comme valeur vide. |
| Visuel | 3 | Cartes cohérentes, bonne iconographie de statut. Tableau des paiements cassé à 768 px ; carte « Interlocuteur » à 560 px alors que les autres cartes font 896 px. |
| Couleur | 4 | 0 échec de contraste sur 84 pages mesurées (texte ≥ 6,38 : 1 pour le texte atténué). Anneau de focus acide 2 px partout sauf `summary`. |
| Typographie | 3 | Hiérarchie H1 32 px / H2 24 px / corps 16 px respectée, mono tabulaire pour les références. Titres de signature coupés tôt (« Signer le procès- / verbal de recette » sur 190 px de large à 360 px). |
| Espacement | 3 | Rythme régulier à 360, 390, 1024+, zoom 200 et 400 % sans débordement. Défaut net à 768 px sur `/paiements`. |
| Expérience | 3 | Parcours simple, boucle de chargement et d'erreur présents, 404 portail correcte pour les UUID. Défauts : 404 publique pour toute route inconnue sous `/espace-client`, mauvais statut « Signé » du devis v2, ligne de paiement muette si `facture` est inconnue. |
| **Total** | **19 / 24** | |

## 2. Accessibilité (WCAG 2.2 AA) : résultats mesurés

- **Contraste** : 0 échec sur toutes les routes et tous les viewports (calcul sur couleurs résolues, opacité et fonds composés). Pire cas 6,38 : 1 (`--ink-dim` sur `--bg-2`). Aucune police sous 12 px.
- **Focus visible** : anneau 2 px acide (`rgb(196,245,66)`, décalage 2 px) sur liens, boutons, entrée fichier. Exception : `summary` « Modifier mes informations » prend l'anneau par défaut du navigateur (1 px `auto` gris `#eee`, décalage 0) : pas de style cohérent (F-A1).
- **Lien d'évitement** : fonctionnel, mais il y en a **deux** à la suite (`a.skip-link` « Aller au contenu principal » du layout racine, puis `a.pt-skip` « Aller au contenu » du portail). Le premier pointe vers `#main-content`, absent du DOM portail : un script le redirige (Tab + Entrée amène bien le focus sur `main#contenu`, scroll 64 px), mais c'est un doublon (F-A2).
- **Repères** : 1 `main#contenu`, 1 `nav[aria-label="Espace client"]`, `aria-current="page"` sur l'onglet actif, 1 H1 par page (sauf signature d'un document non signable, voir F-N6), `<caption>` et `th scope=col` sur la table des paiements.
- **aria-live** : régions `polite` montées vides (conforme au correctif H4), la barre « 4 blocs sur 5 complétés » est annoncée.
- **Doublon** : `section[aria-label="Avancement du projet"]` contient `ol[aria-label="Avancement du projet"]` (F-C13 confirmé).
- **Cibles tactiles** (règle projet 44 px) : onglet actif « Projet » 40x44 px ; cases et radios de l'onboarding 24x24 px (VAT, « même adresse », consentement) ; liens e-mail et téléphone de l'interlocuteur 163x24 et 120x24 px. Aucun < 24 px (hors `input[type=file]` masqué 1x1). Sous les 44 px mais au-dessus du minimum WCAG 2.2 (24 px).
- **Boutons « Télécharger » répétés** : 4 occurrences sur `/paiements`, 3 sur `/documents`, aucun `aria-label` (F-C8 confirmé).
- **Tableau en cartes (< 768 px)** : `table`, `tr`, `td` en `display:block`, `thead` masqué visuellement, aucun `role` : la sémantique de tableau peut disparaître dans certains lecteurs d'écran. Non vérifiable ici sans NVDA / VoiceOver.
- **Clavier** : ordre logique (lien d'évitement, déconnexion, onglets, contenu). Sur une page de signature déjà signée, le focus est posé au chargement sur le titre « Document signé », donc le premier Tab atteint directement « Télécharger le document signé » et non les liens d'évitement (volontaire, à noter).
- **Mouvement réduit** : avec `prefers-reduced-motion: reduce`, aucune animation ni transition > 10 ms (0 élément) ; sans, 20 éléments ont une transition de 0,2 s. `scroll-behavior: smooth` reste déclaré dans les deux cas (vérifié sur `html`), mais `HashFocusLink` est censé le respecter ; non observé car l'onboarding est complet.
- **Console / réseau** : aucune erreur JS. Seule erreur console : le 404 de ressource sur les pages 404. Les « FAIL » du réseau sont des préchargements RSC annulés par la navigation (bruit, pas de ressource réellement en échec).

## 3. Responsive : résultats mesurés

| Route | 360 | 390 | 768 | 1024 | 1280 | 1440 | Zoom 200 % / 400 % |
|---|---|---|---|---|---|---|---|
| `/espace-client` | OK | OK | OK | OK | OK | OK | OK / OK |
| `/espace-client/documents` | OK | OK | OK | OK | OK | OK | OK / OK |
| `/espace-client/paiements` | OK | OK | **DÉBORDE (scrollWidth 848)** | OK | OK | OK | OK / OK |
| signer (4 documents) | OK | OK | OK | OK | OK | OK | OK / OK |
| 404 portail (UUID) | OK | OK | OK | OK | OK | OK | n/a |

Détail du débordement `/paiements` (F-N1) : table de 848 px de large pour une carte de 736 px à 768 px. Mesure en continu : propre à 641-700 px (cartes), cassé de 768 à ~960 px (page scroll 848 à 768 et 800 px, table qui dépasse la carte jusqu'à 900 px), propre à 1024+. `body` masque le débordement : le bouton « Télécharger » de la colonne Action est dessiné hors de la carte, l'en-tête du portail est coupé net à 768 px, et les libellés se brisent au milieu des mots (« Factur / e de / période », « Acom / pte »). Capture : `shots/C/pay-768.png`.

Barre collante F-C2 et iframe PDF F-C3 : voir la table de statuts ci-dessous (non vérifiables).

## 4. F-C1 à F-C4

| Id | Verdict | Preuve |
|---|---|---|
| F-C1 « En attente de vous » avant émission | **Non vérifiable** | Le projet de test est livré : panneau « Rien, votre projet est livré », juste. Aucun état pré-émission (devis, contrat, PV, facture non émis) disponible, sans modifier de donnée. Constat de code du pré-audit inchangé, non contredit ni confirmé à l'écran. |
| F-C2 résumé collant + barre d'action de la recette | **Non vérifiable** (CSS confirmé) | Le PV du client de test est déjà signé : la checklist ne s'affiche pas. Le CSS déployé confirme les deux `position: sticky; bottom: 0` dans `@media (max-width: 639px)` (`project.css:636-650`), la barre avec `z-index: 1`, le résumé sans `z-index`. Risque de recouvrement réel mais non mesuré. |
| F-C3 iframe PDF 480 px sur mobile | **Non vérifiable** (CSS confirmé) | Aucun document ouvert à la signature. `project.css:471-479` : `height: 480px` (720 px dès 640 px). Comportement iOS Safari (première page seule, piège de scroll) non testable avec Chromium. |
| F-C4 erreurs d'onboarding non annoncées | **Confirmé par le code, non reproduit** | `OnboardingCard.tsx:37-45` : `FieldError` monte un `<p class="pt-error">` sans `role` ni région live, l'enregistrement part au `onBlur`. Pour le reproduire il faut saisir et quitter un champ, ce qui déclenche l'enregistrement : interdit. Les champs ont bien `autocomplete`, un `<label>` et 44 px de haut ; ils sont en 16 px (pas de zoom iOS). |

## 5. Checklist du lot C

| # | Verdict | Détail |
|---|---|---|
| C1 `/espace-client` (360, 768, 1280) | **Confirmé / partiel** | H1 32 px, noms de cartes en H2 24 px, toutes les cartes dans `pt-card`. « Depuis 0 jour » (F-C12) non observable. F-C10 **confirmé** : carte « Interlocuteur » 560 px contre 896 px pour les cartes voisines à 1280 px. |
| C2 Frise | **OK** | 6 étapes lisibles à 360, coches, dates, aucune coupe. Un `aria-label` en double (F-C13 confirmé). |
| C3 Onboarding | **Partiel** | `summary` ouvert à 360, 768, 1280 : grille 1 colonne puis 2 colonnes, champs 44 px, labels 14 px, 0 contraste en échec. Relecture société affiche « Forme juridique 1000 » (F-C5 **confirmé**). Cases et radios 24 px. F-C4 non reproduit (voir §4). |
| C4 « Compléter mes informations » | **Non vérifiable** | Onboarding complet, le bouton n'existe pas. |
| C5 Fichiers (erreur de taille / type) | **Non vérifiable** | Aurait nécessité de sélectionner un fichier. Table en cartes à 360 propre, noms de fichiers courts. |
| C6 Consentement | **Observé** | « Retirer mon accord » sans confirmation visible dans l'interface (action non cliquée). Case non observable (déjà accordé). |
| C7 `/documents` | **OK** | Cartes mobiles avec étiquettes mono, tableau dès 768, statut avec icône, « Remplacé » libellé. Défaut : devis v2 « Signé » sans date ni action « document signé » alors qu'aucune signature n'existe en base (F-N4). |
| C8 Signer (états observables) | **Partiel** | 4 documents ouverts à 6 viewports : « Document signé » propre (contrat, PV), « Cette version a été remplacée » + bouton « Voir la version 2 » (v1), « Ce document n'est pas encore à signer » (v2 et cahier des charges). Parcours d'envoi de code et checklist non testables. |
| C9 UUID invalide / inconnu | **OK** | `/documents/abc/signer` et UUID nul : « Page introuvable », shell portail, déconnexion présente, liens « Retour à mes documents » et « Retour à mon projet », pas de Navbar publique, statut HTTP 200 (pas 404, à noter pour la supervision). |
| C10 `/paiements` | **Cassé à 768 px** | Voir F-N1. À 360 : cartes propres, montant aligné à gauche. F-C7 **confirmé** (en-tête « Montant » à gauche, cellule à droite). F-C8 **confirmé**. Tiret cadratin « — » pour la période vide (F-C6 **confirmé**). |
| C11 `?retour=succes|annule&facture=<uuid inconnu>` | **Confirmé F-C9** | Aucun bandeau, aucun message, aucune région live : la page est identique à `/paiements`. Même chose avec `?retour=succes` sans `facture`. Cas avec facture réelle non testé (aurait pu lancer le polling). |
| C12 Navigation | **Partiel** | Onglets sur une ligne à 320, 360, 390, 768, `aria-current` correct, déconnexion visible. Nom du client tronqué en « Test E2… » à 360 et 390 (99 px sur 183 px nécessaires), 59 px à 320 (F-N5). Lien actif 40 px de large. |
| C13 `/espace-client/inexistant` | **Public** | Status 404, 404 **publique** : Navbar marketing, CTA « Lancer le diagnostic », aucune nav ni déconnexion, aucun lien vers le portail (F-N3). Idem `/espace-client/documents/<id>` (route sans `/signer`). |
| C14 Chargement lent puis erreur | **Confirmé / partiel** | Chargement (navigation retardée 4 s) : carte « Chargement… » sous un en-tête « Espace client », sans onglets ni pied de page, puis bascule vers « Test E2E Sèvalys » (saut de titre confirmé). Erreur : `error.tsx` s'affiche (« Un problème est survenu », « Réessayer », « Retour à mon projet »), sans onglets. Hors ligne : une navigation client vers `/paiements` bascule vers la page d'erreur native du navigateur (aucun message applicatif, pas de service worker) ; un `goto` hors ligne échoue de même. Erreur serveur 500 réelle non provoquée (une interception fabriquée ne montre que le texte de l'interception, non représentatif). |
| C15 Clavier / lecteur d'écran | **Partiel** | Clavier confirmé (voir §2). Lecteur d'écran non testé. |

## 6. Nouveaux findings

Aucun BLOCKER. 1 MAJOR confirmé à l'écran, 2 MAJOR/MINOR de cohérence, le reste en MINOR.

### MAJOR

**F-N1 (MAJOR, responsive) `/espace-client/paiements` déborde de 80 px à 768-900 px.**
Preuve : à 768 px, `documentElement.scrollWidth` 848, table `right` 848 pour une carte à 736 ; 19 éléments hors écran dont `button.pt-file-action` « Télécharger » à x 684-832 ; l'en-tête est tronqué (barre à 768 px, contenu jusqu'à 848). Pas de défilement possible (`body` en `overflow-x: hidden`), donc des clients sur tablette portrait (iPad 768) ou fenêtre étroite voient l'action Télécharger hors carte et des mots coupés (« Factur-e », « Acom-pte »). Capture : `shots/C/pay-768.png`. Mesure : propre à ≤ 700 et ≥ 1024, cassé 768-~960.
Fichiers probables : `src/app/portal.css:496-548` (`.pt-table` bascule en table réelle à 768 px sans `min-width` colonne), `src/components/portal/project/project.css:683-686` (`.pt-pay-amount-cell { white-space: nowrap }`), `src/components/portal/project/PaymentsList.tsx` (colonnes Facture, Période, Montant, Statut, Action, avec un badge et un bouton `nowrap`).
Correctif : garder le rendu en cartes jusqu'à 960 px pour cette table (`@media (max-width: 959px)` à la place de 767), ou masquer la colonne Période entre 768 et 960, ou envelopper dans `overflow-x: auto` avec `role="region"` et `tabindex="0"`. Ajouter un test de non-régression à 768 px.

### MINOR (avec impact fonctionnel)

**F-N2 (MINOR, cohérence) Texte « Ce document n'est pas encore à signer » trompeur.**
Observé sur le devis v2 (« Signé » dans la liste), le cahier des charges (pas signable par nature). Le message ne dit ni « signé » ni « remplacé » ni « pas à signer ». Fichier : `src/lib/projects/copy.ts:342`, `src/app/espace-client/documents/[id]/signer/page.tsx` (branche `!sctx.signable.ok`). Correctif : message par cas (type non signable, signature non ouverte, déjà signé hors flux), avec lien de téléchargement.

**F-N3 (MINOR, navigation) Route inconnue sous `/espace-client` : 404 publique, impasse pour un client connecté.**
`/espace-client/inexistant` et `/espace-client/documents/<uuid>` (sans `/signer`) : statut 404, Navbar et pied de page marketing, CTA « Lancer le diagnostic », aucun lien vers `/espace-client`. Cause : le `not-found.tsx` du segment ne s'applique qu'à `notFound()`. Correctif : `src/app/espace-client/[...rest]/page.tsx` qui appelle `notFound()`, ou un lien « Retour à mon espace » dans la 404 publique quand une session existe.

**F-N4 (MINOR, données / cohérence) Statut « Signé » sans signature.**
Liste `/documents` : « Devis v2 » avec le badge « Signé » et l'icône coche, mais pas de « Signé le … » ni de bouton « document signé ». En base, seules `contrat` et `PV` ont une signature ; le devis v2 n'en a pas. La page de signature répond « pas encore à signer ». C'est soit une anomalie de la donnée de test (statut forcé), soit une règle qui déduit « signé » de l'avancement du projet. À trancher côté `DocumentStatus` (vue SQL ou `documents/page.tsx`).

**F-N5 (MINOR, responsive) Nom du client tronqué à 360-390 px.**
« Test E2… » dans l'en-tête (99/183 px à 360, 129/183 à 390, 59/183 à 320), le bouton « Se déconnecter » prend l'espace. Aucun `title`. Sur pages d'erreur / chargement « Espace client » est aussi tronqué en « Espace… ». Correctif : bouton de déconnexion en icône seule sous 400 px, ou nom sur sa propre ligne.

**F-N6 (MINOR, a11y) Page de signature d'un document non signable sans H1.**
`/espace-client/documents/<cahier-des-charges>/signer` : 0 `<h1>` (titre masqué pour les types hors devis / contrat / PV, `page.tsx` `titleKey`). Correctif : H1 générique « Document ».

**F-N7 (MINOR, a11y) Deux liens d'évitement consécutifs, le premier vers une cible absente du DOM portail.**
`a.skip-link` (« Aller au contenu principal », `#main-content`) puis `a.pt-skip` (« Aller au contenu », `#contenu`). Le premier fonctionne via script mais double la première tabulation. Correctif : ne rendre le lien du layout racine que hors zones privées (`isPrivatePath`), ou retirer `SkipLink` du portail.

**F-N8 (MINOR, a11y) `summary` « Modifier mes informations » sans anneau de focus de marque.**
Focus = 1 px `auto` gris `#eee`, décalage 0 (mesuré), contre 2 px acide partout ailleurs (contraste ≈ 14,7 : 1). Fichier : `project.css` (règle `.pt-onb .pt-summary:focus-visible`).

**F-N9 (MINOR) Titres de signature à largeur contrainte.**
« Signer le procès-verbal de recette » se coupe sur ~190 px à 360 px alors que la carte fait 328 px (`text-wrap: balance` + `max-width`), ce qui déforme le titre. Vérifier `max-width` du H1 de `signer/page.tsx`. Et sur un document déjà signé le titre reste « Signer le contrat » : préférer « Contrat ».

### Autres confirmations d'anciens findings

- F-C5 (code INSEE « 1000 » comme forme juridique), F-C6 (tiret cadratin « — »), F-C7 (en-tête Montant à gauche, cellule à droite), F-C8 (boutons répétés sans nom accessible), F-C9 (retour paiement muet), F-C10 (carte 560 px), F-C11 (cibles 24 px mesurées : e-mail 163x24, téléphone 120x24), F-C13 (`aria-label` en double) : **confirmés**.
- F-C12 (« Depuis 0 jour ») et F-C14 (bouton désactivé à 50 %) : **non vérifiables** dans cet état.
- Thème 1 : le `loading.tsx` et `error.tsx` existent et fonctionnent, avec les résidus signalés (titre qui change, pas d'onglets) ; la 404 portail est correcte pour UUID invalide mais la route inconnue retombe sur la 404 publique (F-N3).
- Thème 5 : un `dialog` de cookies est présent dans le DOM portail (fermé, `display: none`), aucune ouverture observée sur 84 chargements.

## 7. Résumé

1. Session valide du début à la fin, 84 chargements (14 routes x 6 viewports) + zoom 200 / 400 %, chargement lent, hors ligne, mouvement réduit, clavier.
2. Le projet de test est livré : les états F-C1, F-C2, F-C3, C4, C5 et C14 (500 réel) ne sont pas observables, je n'en conclus rien.
3. Score 19 / 24 ; 0 BLOCKER, 1 MAJOR confirmé à l'écran.
4. MAJOR : `/paiements` déborde de 80 px à 768-~960 px (table de 848 px, bouton Télécharger hors carte, mots coupés, en-tête tronqué) ; F-N1.
5. Contraste 0 échec sur toutes les pages ; focus 2 px acide partout sauf `summary` ; aucune erreur JS ; aucun débordement à 360, 390, 1024+ ni à 200 / 400 % de zoom.
6. Route inconnue sous `/espace-client` = 404 publique avec Navbar marketing et sans retour vers le portail ; UUID invalide = 404 portail propre (F-N3).
7. Incohérence de données : devis v2 « Signé » sans signature, et la page répond « pas encore à signer » ; texte d'erreur trompeur pour les documents non signables (F-N2, F-N4).
8. F-C4 reste confirmé par le code seulement (reproduction impossible sans saisir et enregistrer).
9. Deux liens d'évitement à la suite, le premier vers une cible absente ; cibles 24 px (cases, radios, liens contact) et onglet actif 40 px ; boutons « Télécharger » identiques sans nom accessible.
10. Hors ligne : écran d'erreur natif du navigateur, aucun message applicatif ; `error.tsx` s'affiche dans les autres échecs, sans onglets.
11. Nom du client tronqué (« Test E2… ») à 360-390 px.
12. Captures : `C:\portfolio\.planning\ui-reviews\v2.0-browser\shots\C\`.
