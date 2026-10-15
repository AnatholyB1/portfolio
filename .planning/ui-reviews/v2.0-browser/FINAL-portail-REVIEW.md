# Vérification finale portail client et /connexion (sevalys.com, 2026-10-15, HEAD annoncé 7b45198)

Lecture seule. Aucun formulaire soumis, rien signé ni payé, aucun e-mail envoyé, `src/` intact.

**LIMITE MAJEURE : la session du client de test a expiré en cours de vérification.** `/espace-client` redirige désormais vers `/connexion?next=...`. Je ne me suis pas reconnecté. Le balayage principal (13 routes x 6 viewports, 78 chargements authentifiés + 18 anonymes, captures fullPage) avait été fait avant l'expiration et est valide. Ce qui n'a pas pu être mesuré est listé en « Non vérifié ».

Captures « après » : `shots/final/portail/` (`<route>-<largeur>.png`, `anon-*` pour les pages déconnectées). Mesures brutes : `fin1.json` dans le scratchpad pw.

## Correctifs : verdict et preuve

| Correctif | Verdict | Preuve |
|---|---|---|
| F-N1 `/paiements` sans débordement 768-960 | **Vérifié** (à 768 ; 360, 390, 1024, 1280, 1440 aussi) | `scrollWidth` = 768, 0 élément débordant. Le tableau reste en cartes à 768 (`pay-768.png`). Plage 800-960 non re-mesurée. |
| Même défaut sur `/documents` | **RÉGRESSION (MAJOR)** | `/documents` à 768 : `scrollWidth` 831, 22 éléments hors écran, table x 57..831 dans une carte de 736, colonne Action coupée, mots brisés (« Contra / t »). Avant : OK à 768. Capture `docs-768.png`. Cause probable : le libellé long « Télécharger le document signé » sans bascule en cartes. À corriger comme `/paiements`. |
| F-C1 « qui attend » cohérent | **Non vérifiable** | Projet de test livré : « Rien, votre projet est livré » (juste). Aucun état pré-émission observable sans écrire des données. |
| F-C4 erreurs d'onboarding annoncées | **Non vérifié** | Exige de saisir un champ (enregistrement au blur). Interdit. |
| F-C8 boutons Télécharger nommés | **Vérifié** | `aria-label` « Télécharger : Facture de période TFA-2026-0002 », « Télécharger le document signé : Contrat, version 1, émis le 03/10/2026 », etc. (avant : aucun). |
| F-C9 retour de paiement | **Vérifié** | `?retour=succes&facture=<inconnu>` affiche un H2 « Retour de paiement reçu » (avant : page muette). Cas réel non testé (aurait pu lancer le polling). |
| F-C13 aria-label en double | **Vérifié** | `section[aria-label] ol[aria-label]` : 0 occurrence. |
| Forme juridique en libellé | **Non vérifié** | Le bloc est dans le `summary` replié, la session a expiré avant son ouverture. |
| Un seul skip link | **NON CORRIGÉ** | Toujours 2 liens en tête du portail et de `/connexion` : « Aller au contenu principal » → `#main-content` (cible absente du DOM) puis « Aller au contenu » → `#contenu`. `/avis/abc` n'en a qu'un (cible présente). |
| Liens de contact >= 44 px | **Partiel** | Portail : e-mail 244x44 / 163x44, téléphone 120x44 (avant 24 px) : vérifié. `/connexion`, `/auth/confirm`, `/avis` : « contact@sevalys.com » 143x19 et 153x21, lien en ligne dans un paragraphe (exempté WCAG 2.5.8 mais pas 44 px). |
| Tiret cadratin remplacé | **Vérifié** | 0 caractère « — » ou « – » sur toutes les pages mesurées ; période vide = « Non renseigné ». |
| 404 portail pour route inconnue | **Vérifié** | `/espace-client/inexistant` : shell portail, H1 « Page introuvable » (avant : 404 publique avec Navbar marketing). Statut HTTP 200 (avant 404). |
| H1 de la signature non signable (F-N6) | **Vérifié** | `sign-spec` : H1 « Document » (avant : aucun). |
| Titre de page portail | **Vérifié** | `Espace client · Sèvalys`, `Paiements`, etc. Note : titres `Paiements | Paiements` et `Documents | Documents` sur H1/title : le `<title>` est « Documents » / « Paiements » sans suffixe de marque, incohérent avec la home. |

## Embellissement

| Point | Verdict | Preuve |
|---|---|---|
| `:active` | **Vérifié sur /connexion, non vérifié sur portail** | Bouton « Recevoir mon code » : `transform: scale(0.98)`, fond assombri, transition 0,12 s ; 6 règles `:active` dans le CSS (`.pt-btn-primary`, `.pt-btn-ghost`). Boutons du portail non mesurés (session expirée). |
| Hover | **Vérifié sur /connexion** | Fond passe d'acide à crème `rgb(236,234,227)` + ombre ; transitions explicites (`color, background-color, border-color, transform`) au lieu de `all`. Hover de ligne de tableau : non mesuré. |
| Focus | **Vérifié sur /connexion** | Champ e-mail : contour 2 px acide + halo 3 px `rgba(196,245,66,.12)`. Portail : non re-mesuré. |
| Entrée douce | **Vérifié** | `pt-enter` 400 ms sur la carte et les éléments ; `pt-fade` 200 ms. Carte de connexion `animation: pt-enter 0.4s`. |
| `prefers-reduced-motion` | **Vérifié** | Avec `reduce` : 0 animation active au chargement de `/connexion` (avec : 4). Limite : `scroll-behavior: smooth` reste déclaré (mesuré 2 fois, avec et sans). |
| Skeleton de chargement | **Non vérifié** | Test (throttle CPU 4x + RSC retardé 3 s) prévu dans `fin2.mjs`, non exécuté : session expirée. Captures « avant » seules disponibles (`polish/portail/before-loading-*`). |
| Hiérarchie de la page Projet | **Partiel (visuel)** | Voir note ci-dessous. |
| Carte de connexion | **Vérifié** | Halo acide `radial-gradient(600px at 50% 0, rgba(196,245,66,.08))`, carte `border 1px #2a2a2a`, ombre acide diffuse `0 24px 60px -30px`, rayon 12 px, largeur 440 px. |
| CLS | **Vérifié** | 0,000 sur 96 chargements sur 6 viewports. |
| Console / requêtes en échec | **Vérifié** | 0 erreur console, 0 réponse >= 400 sur toutes les pages. |
| Overflow horizontal | **1 échec** | Uniquement `/documents` à 768 (voir régression). 0 ailleurs. |
| Contraste calculé | **Vérifié** | 0 échec sur toutes les routes et viewports (couleurs résolues, opacités composées). |
| Cibles < 44 px | **Partiel** | Reste : onglet actif « Projet » 40x44 ; skip link 153x42 ; cases et radios de l'onboarding 24x24 ; liens de contact en ligne des pages publiques d'auth (19-21 px). |

## Nouveaux défauts

- **MAJOR** : `/documents` déborde de 63 px à 768 px (régression par rapport à l'état avant polish ; le correctif de `/paiements` n'a pas été appliqué ici). Colonne Action hors carte, mots brisés (« Contra/t », « Cahier des charges » sur 3 lignes).
- **MINOR** : texte « Merci, votre onboarding est complet. Nous préparons votre devis. » affiché alors que le projet est livré (incohérent avec « Rien, votre projet est livré »).
- **MINOR** : « Devis v2 » toujours « Signé » alors que `/signer` ne propose rien et que le H1 est « Signer le devis » sur un document déjà signé (F-N4/F-N9 non traités).
- **MINOR** : 2 skip links consécutifs, dont un pointant vers une cible absente (F-N7 inchangé).
- **MINOR** : statut HTTP 200 sur la page « Introuvable » du portail (la supervision ne voit plus de 404).
- **MINOR** : `<title>` des pages portail sans suffixe de marque (« Documents », « Paiements »).

## Notes /10 (avant → après)

Avant : VISUAL-CRITIQUE du 2026-10-14. Après : jugement sur captures `final/` ; l'admin n'est pas dans le périmètre.

| Écran | Avant | Après | Commentaire |
|---|---|---|---|
| Portail Projet | 6 | 7 | Cartes mieux espacées, bandeau de statut acide (« Rien, votre projet est livré ») et frise lisible. Mais toujours un empilement de cartes de même poids, sans moment « livré » marquant ; 4 des 7 cartes ont la même présence. |
| Documents | 6 | 5,5 | Cartes mobiles propres, mais régression à 768 (débordement), titres coupés « Contra/t ». |
| Paiements | 5,5 | 7 | Cartes empilées lisibles à 768, étiquettes mono, badges clairs, « Non renseigné » au lieu du tiret ; très long à 768 (une colonne). |
| Signature / 404 | 6 | 6,5 | 404 portail propre, H1 présents ; titre « Signer le devis » sur document déjà signé. |
| Connexion | 6,5 | 7,5 | Halo, carte à ombre acide, entrée douce, états hover/active/focus nets. Mieux, mais le champ vide sur grande zone noire reste très sage. |
| Avis (jeton bidon) | n/a | 6,5 | Propre, 1 seul skip link, lien contact en ligne 21 px. |

« Plus beau ? » Oui, modestement : la connexion et les états d'interaction sont réellement plus soignés, `/paiements` est devenu lisible. Le portail reste sobre et peu hiérarchisé (V8 non réalisé). La régression de `/documents` annule une partie du gain.

## Ce qui reste

1. Corriger `/documents` à 768-960 (même bascule en cartes que `/paiements`).
2. Un seul skip link (rendre celui du layout racine absent des zones privées).
3. **Re-vérifier avec une session valide** : skeleton de chargement, hover/active/focus sur les boutons du portail, forme juridique dans l'onboarding replié, plage 800-960 de `/paiements`, hover de ligne de tableau.
4. Liens de contact en ligne des pages d'auth à 44 px de zone de clic si on veut l'uniformité.
5. Test avec un projet à étape active pour F-C1, F-C2, F-C3, F-C4 (toujours non observables sur un projet livré).

## Résumé (15 lignes)
1. Session du client de test expirée en cours de route ; arrêt sans reconnexion. 78 chargements authentifiés + 18 anonymes déjà faits (6 viewports) et captures dans `shots/final/portail/`.
2. Verdict global : amélioration réelle sur `/paiements`, la connexion et les interactions ; une régression nette sur `/documents` à 768 px.
3. F-N1 vérifié : `/paiements` à 768 sans débordement (cartes).
4. RÉGRESSION MAJOR : `/documents` à 768 déborde (scrollWidth 831, 22 éléments, mots brisés).
5. Vérifiés : F-C8 (aria-label), F-C9 (retour de paiement), F-C13, 404 portail, H1 de signature, cadratin remplacé, liens de contact portail 44 px.
6. NON corrigé : double skip link (cible `#main-content` absente).
7. Non vérifiables/non vérifiés : F-C1, F-C4, forme juridique, skeleton, `:active` sur portail.
8. Interactions : `:active` scale .98 en 120 ms, hover crème + ombre, focus acide + halo, transitions explicites (vérifié sur /connexion).
9. Entrée douce `pt-enter` 400 ms ; reduced-motion coupe toute animation (0 avec reduce, 4 sans) ; `scroll-behavior:smooth` persiste.
10. Carte de connexion : halo acide, bordure fine, ombre diffuse, rayon 12 px : nettement plus soignée.
11. CLS 0,000 partout ; console propre ; 0 requête en échec ; 0 échec de contraste.
12. Cibles : onglet « Projet » 40x44 et cases d'onboarding 24x24 restent ; contact en ligne 19-21 px sur /connexion, /auth/confirm, /avis.
13. Notes /10 : Projet 6→7, Documents 6→5,5, Paiements 5,5→7, Connexion 6,5→7,5.
14. Autres écarts : texte d'onboarding « Nous préparons votre devis » sur projet livré ; devis v2 « Signé » sans signature ; HTTP 200 sur 404 portail.
15. Suite : corriger `/documents`, skip link, puis re-tester avec session valide et un projet à étape active.
