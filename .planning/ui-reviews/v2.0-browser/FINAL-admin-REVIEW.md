# Vérification finale admin (sevalys.com, HEAD 7b45198), lecture seule

Date : 2026-10-15. Session Chrome admin existante, aucune écriture : aucun bouton d'envoi ou de confirmation cliqué, aucun formulaire soumis, aucune donnée modifiée. Aucune modification de `src/`. Noms, e-mails, téléphones et identifiants réels ne sont pas consignés (« client de test », « lead de test »).

## Méthode et limites
- Navigation réelle (fenêtre ~1568 px de capture, `innerWidth` 1920) sur les 13 routes demandées. Largeurs 360, 390, 768, 1024, 1280, 1440 mesurées dans des `<iframe>` same-origin (CSS réel, media queries de l'iframe). Contraste calculé (WCAG, texte avec fond effectif empilé) sur 9 écrans chargés. Console et réseau lus sur `/admin/leads`.
- La fenêtre Chrome est passée en `visibilityState=hidden` à plusieurs reprises : le streaming Next n'achevait pas la bascule, les captures expiraient. Les mesures ont été refaites une fois le rendu effectif (largeur de table > 0) ; un premier lot invalide a été écarté. Un seul point reste affecté : les captures « réelles » n'existent qu'à la taille de la fenêtre (pas de capture 360 / 768, les iframes ne se capturent pas). Les largeurs étroites sont jugées sur mesures, pas à l'œil.
- Données de prod : 1 projet « Terminé », 3 leads de test, 0 avis, pas de donnée de pilotage hors option « Inclure les données de test » (`?tests=1`, GET, lecture seule). Donc les états actifs (projet qui attend Sèvalys, formulaire d'enregistrement de fait) n'existent pas en prod.
- Refus du garde-fou : l'ouverture du panneau « Invalider ce fait » (bouton déclencheur, sans confirmation) a été refusée par le classifieur automatique ; je ne l'ai pas contournée. Ce panneau est donc vérifié par le code uniquement.
- Captures « après » : `shots\final\admin\` (7 fichiers). Les captures montrant des noms, e-mails ou téléphones réels (liste leads, fiche lead, fiche projet, clients, e-mails) n'ont pas été copiées dans le dépôt, par consigne d'anonymisation.

## Tableau correctif -> verdict

| Correctif | Verdict | Preuve |
|---|---|---|
| N1 tables de la fiche projet (Documents émis, Factures) | VÉRIFIÉ | Conteneur `pt-table-scroll`, `role=region`, `tabindex=0`. 768 : 809/648 et 871/648 défilent ; 1024 : 809/552 ; 1440 : 809/654. `scrollWidth` page = `clientWidth` aux 6 largeurs. À 360 : cartes (`display:block`), pas de débordement. |
| N2 `/admin/emails` | VÉRIFIÉ | 768 : table 930 dans 654 (défilante) ; 1024 : 930/910 ; 1440 : 1006/1006 ; 360 : cartes. Page sans débordement. |
| N3 `/admin` et `/admin/leads` à 768 | VÉRIFIÉ | `/admin` 1089/648, `/admin/leads` 828/648, dans conteneur `region` focalisable. Plus de colonne coupée sous le bord de page. |
| Marge par projet (F-D2) | VÉRIFIÉ en partie | Avec `?tests=1` : table 878 dans 648 à 768, 904/904 à 1024. Montants de test à 1 600 € ; le cas ≥ 10 000 € n'est pas testable (aucune donnée). |
| Tuiles KPI sans élargissement (F-D3) | VÉRIFIÉ | Pilotage : 7 tuiles, grille 2 col (≤768) puis 4 col, aucune valeur à `scrollWidth > clientWidth`, aucun débordement de page. Valeurs à 14 px à 360 (petit, mais lisible). Entonnoir : 4 tuiles propres, « Non saisi » au lieu d'un tiret. |
| Graphique de trésorerie lisible | VÉRIFIÉ en partie | SVG 800 px max, viewBox 720x240 ; à 360 il garde 560 px et défile dans la carte (texte ~13 px rendu, au lieu de 5,4 px). Libellés de mois non rognés (`clipL=0` aux 6 largeurs). Données à zéro : grande boîte vide avec une ligne plate en bas (voir MINOR M3). |
| `<select>` stylé (F-D8/F-E5) | VÉRIFIÉ | Fond, bordure, flèche et rayon 4 px identiques sur Leads, Projets, Liens (captures `projets-filtre...`, `liens-formulaire`). Les champs de `/admin/liens` n'ont plus d'angles droits. |
| F-D1 file « À traiter » + tuile « projets attendent Sèvalys » + filtre `blocage=admin` | NON VÉRIFIÉ en prod (vérifié par code) | Filtre présent (« Attend Sèvalys ») et résultat vide propre. Le seul projet est terminé. Code : `resolveWaiting` branché dans `read.ts:334`, `projets/[id]/page.tsx:132`, `espace-client/page.tsx:127` ; tuile `workQueue.ts:27-30` vers `/admin/projets?blocage=admin` ; test `waiting.characterization.test.ts`. |
| F-D5 confirmation de l'enregistrement d'un fait | NON VÉRIFIÉ en navigateur | `PostFactForm` absent (projet terminé). Code : `ConfirmAction`/`ConfirmPanel` utilisés par `PostFactForm`, `RevokePanel`, `LostPanel`. Panneau « Invalider ce fait » : ouverture refusée par le garde-fou, non testée. Confirmation désactivée tant que le motif < 10 caractères (code). |
| Menu de statut : clavier, Échap, clic extérieur (F-D6, N9) | VÉRIFIÉ (avec réserve) | `aria-haspopup=menu`, `aria-expanded`, `role=menu` nommé « Changer le statut », formulaires `role=none` autour des `menuitem`, `tabindex=-1` (roving), focus sur le 1er item à l'ouverture, ArrowDown/End OK, Échap ferme et rend le focus à la pastille, clic extérieur ferme. Le statut courant est retiré de la liste. Réserve : voir MAJOR M1 (menu rogné). |
| Panneau « Perdu » (F-D7) | VÉRIFIÉ | S'ouvre par un `button type=button` (aucune écriture), focus sur le premier choix de motif, boutons « Garder le statut actuel » / « Confirmer la perte » (non cliqué), Échap ferme et rend le focus à la pastille. Pas de `role=dialog` (panneau en ligne). |
| Skeleton de chargement | VÉRIFIÉ | Squelettes dédiés par route (fiche projet : carte principale + 2 cartes latérales ; entonnoir : bandeau, 4 tuiles, grille de lignes), puis entrée de contenu en fondu (~240 ms). Capturés à l'écran. |
| Hover / active / focus | VÉRIFIÉ (active par CSS) | Hover de ligne réel : `rgba(236,234,227,.04)`, curseur pointer, transition 0,12 s. Focus clavier : contour 2 px acide `#C4F542`, offset 2 px. `:active` : 21 règles (boutons primaire/ghost/confirm, nav, lignes cliquables), non exercé à la souris. Un seul `transition: all` restant sur 1 565 règles ; 14 blocs `prefers-reduced-motion`. |
| Accueil en tableau de bord de travail | VÉRIFIÉ en partie | « À traiter » (état vide EmptyState : coche, titre, phrase), « Inviter un client » repliable, puis tableau des clients dans un conteneur défilant. Les tuiles actives (leads à qualifier, projets qui attendent) n'apparaissent pas sans données. |
| Fiches repliables | VÉRIFIÉ en partie | Fiche projet : 3 `<details>` fermés (Onboarding 4/5 complet, Accord de présentation, Historique). Page quand même de 5 575 px de haut (voir MINOR M6). Fiche lead non étudiée en profondeur (données personnelles). |
| N5 `?statut=xxx` ignoré en silence | VÉRIFIÉ | Message « Le filtre « Statut : xxx » n'existe pas. La liste est affichée sans ce filtre. » |
| N4 `?page=999` | VÉRIFIÉ | État vide « Aucun résultat sur cette page / Cette page est au-delà de la dernière page de la liste » + bouton « Revenir à la première page ». Plus de « Leads indisponibles ». |
| `/admin/xyz` 404 admin | VÉRIFIÉ | Nav admin conservée, « Élément introuvable », trois liens (tableau de bord, leads, projets), titre « Administration · Sèvalys ». |
| « Non renseigné » (tirets cadratins) | VÉRIFIÉ | 0 tiret cadratin sur la fiche projet ; « Non renseigné » dans le CA par source ; « Non saisi » à l'entonnoir. |
| Contraste calculé | VÉRIFIÉ | 0 échec (< 4,5:1 texte, < 3:1 grand texte) sur `/admin`, leads, entonnoir, fiche projet, pilotage (tests), coûts, e-mails, liens. Avis, fiche lead et 404 non calculés. |
| Console et requêtes | VÉRIFIÉ | Console : un seul avertissement, d'une extension Chrome. Réseau `/admin/leads` : 30 requêtes, toutes 200 (3 polices, 7 CSS, JS, manifeste, icône). |
| Débordement de page | VÉRIFIÉ | `scrollWidth - clientWidth = 0` et 0 élément hors viewport sur 13 routes x 6 largeurs (hors zones à défilement volontaire). |
| N7 boutons répétés sans contexte | VÉRIFIÉ en partie | « Invalider ce fait : Solde reçu », etc. (7 boutons nommés). Les « Saisir » de l'entonnoir et les « Télécharger » non revérifiés. |
| N10 titre de la 404 admin | VÉRIFIÉ en partie | Titre « Administration · Sèvalys » (avant : titre de la page d'accueil). Les autres titres de page sont propres (Leads, Projets, Entonnoir, Pilotage, Avis, E-mails, Liens de campagne). La fiche projet garde le titre générique « Fiche projet ». |
| N6 libellés internes de la frise | NON CORRIGÉ | La frise de la fiche projet admin dit toujours « Vous confirmez vos informations », « Nous cadrons votre besoin ; vous signez le devis » (texte client). |
| N8 cibles < 44 px de la fiche projet | NON CORRIGÉ | `summary` « Historique » 278x24, lien « Vérification… » 278x37, champ URL en lecture seule 184x24. |
| N12 caractère de remplacement U+FFFD | NON CORRIGÉ (donnée) | Le nom du lead de test s'affiche avec « � » dans la liste et la fiche : donnée corrompue en base, pas un défaut d'affichage. |
| Skip link double (F-D thème nav) | NON CORRIGÉ côté admin | Deux ancres en tête : « Aller au contenu principal » (`#main-content`, cible absente) et « Aller au contenu » (`#admin-contenu`, valide). Le premier est un lien mort. |

Régressions : aucune au sens strict (rien de ce qui passait ne casse). Un nouveau défaut introduit par la correction du menu, voir M1.

## Nouveaux défauts

### BLOCKER
Aucun.

### MAJOR
**M1. Le menu de statut est rogné par le conteneur à défilement du tableau.** `/admin/leads`, ligne « Qualifié » : le menu (5 items, 230 px) est `position:absolute` dans `pt-table-scroll` (`overflow:auto`, 367 px de haut) ; seuls « Nouveau », « RDV » et le début de « Devis envoyé » sont visibles, les items « Signé » et « Perdu » sont cachés sous le bas du conteneur, qui gagne une barre de défilement verticale (scrollHeight 452 > 367). Le focus clavier atteint les items cachés (End vers « Perdu » fonctionne) mais l'utilisateur à la souris ne les voit pas. Effet de bord de l'enveloppe de défilement ajoutée pour N1-N3. Correctif : ouvrir le menu vers le haut quand la place manque, ou le rendre en portail / `position:fixed`, ou ne pas faire défiler en Y (`overflow-y:visible` impossible avec `overflow-x:auto`, donc portail).

### MINOR
- **M2. Le panneau « Perdu » est inséré dans la cellule du tableau** : la ligne s'étire sur plus de 400 px, le conteneur défile et l'en-tête reste collé en haut (capture interne). Fonctionnel mais disgracieux ; un panneau sous la ligne ou une modale serait plus lisible.
- **M3. Graphique de trésorerie à zéro** : boîte de ~225 px quasi vide, ligne plate en bas, légende « Entrées / Sorties » en gris peu distinct. Acceptable en attendant des données ; à revoir avec un jeu réel.
- **M4. Cases à cocher natives de 13 px** (« Retours uniquement », « Inclure les données de test ») : non stylées, très en dessous de 44 px. Autres cibles < 44 px : boutons radio segmentés à 42 px de haut (entonnoir, pilotage, coûts), liens « Saisir le solde de départ » (24 px) et « Ouvrir l'entonnoir » (22 px).
- **M5. Compte de cibles < 44 px résiduel** : fiche projet (4 éléments, voir N8), pilotage (7), coûts (3), entonnoir (4). La plupart sont des inputs radio masqués à 42 px, donc peu gênants.
- **M6. Fiche projet très longue** (5 575 px) malgré les sections repliables : « Fichiers du projet » en h2 24 px au milieu de h2 à 20 px (incohérence), sous-titre « Projet <nom> · Site Vitrine » redondant avec le titre et la carte Informations.
- **M7. Fiche lead dense et technique** : valeurs brutes de simulateur en slugs (`secteur : sante-bien-etre`, `site-fiabilite : bugs-frequents`, services recommandés en slugs) ; lisible pour l'admin, pas pour une revue de qualité.
- **M8. Formulaire « Solde de départ »** : le champ date est posé à droite, décalé des deux champs de gauche (grille déséquilibrée).
- **M9. Hover de ligne très discret** (`rgba(236,234,227,.04)`) : présent mais à peine visible ; le curseur pointer porte l'affordance.
- **M10. Un `<dialog>` de consentement fermé** reste dans le DOM admin (N11, inchangé, sans effet pour l'utilisateur).

## Notes /10 par écran (avant -> après)

« Avant » : notes de VISUAL-CRITIQUE.md (admin 5/10 sur 3 captures) et rapports DE (15/24 et 16/24 soit environ 6,2 et 6,7) ; ventilé par écran par moi. « Après » : captures à la taille de la fenêtre pour Clients (partiel, fondu en cours), leads, projets, fiche projet (haut), entonnoir, pilotage (KPI, marge, trésorerie), coûts, avis, e-mails, liens, 404 ; mesures pour les largeurs étroites.

| Écran | Avant | Après | Commentaire |
|---|---|---|---|
| Clients (accueil) | 5 | 7 | État vide soigné, « Inviter » repliable, tableau défilant ; tuiles actives non vues. |
| Leads (liste) | 5,5 | 7 | Filtres alignés, selects stylés, pastilles à icône ; menu rogné (M1) et panneau « Perdu » en ligne (M2) retirent 1 point. |
| Fiche lead | 5,5 | 6 | Fonctionnelle, dense et en slugs ; `Convertir` grisé avec explication. |
| Entonnoir | 6 | 8 | Tuiles claires, segmenté avec coche, tableau défilant, `Non saisi`. Meilleur écran. |
| Projets (liste) | 5,5 | 7,5 | Filtres propres, état vide filtré, tri sans en-têtes mobiles. |
| Fiche projet | 4,5 | 6,5 | Tables contenues, repliables, skeleton dédié ; longue, frise en voix client. |
| Pilotage | 5 | 7,5 | KPI en cartes avec lien et règle, marge et trésorerie lisibles ; graphique vide trop grand. |
| Coûts | 5,5 | 6,5 | Formulaire propre, grille du solde à reprendre. |
| Avis | 6,5 | 7,5 | État vide soigné ; carte de réémission non revérifiée en détail. |
| E-mails | 5 | 7 | Table défilante, statuts lisibles. |
| Liens | 6,5 | 7,5 | Champs à 4 px, libellés « obligatoire », select stylé. |
| 404 admin | 4 | 7 | Nav conservée, trois sorties claires. |
| **Admin global** | **5** | **7** | Gain net en lisibilité, fiabilité de mise en page et retours ; reste la densité de la fiche lead et la fiche projet. |

## Ce qui reste
1. **M1** (menu de statut rogné) : seul défaut à corriger avant de dire « fini ».
2. Vérifier en navigateur, avec un projet de test à étape active : F-D1 (file « À traiter », tuile, filtre `blocage=admin`), F-D5 (confirmation d'enregistrement d'un fait), panneau « Invalider ce fait », « Réémettre le lien d'avis », « Réactiver cette adresse ». Impossible sans écriture ou sans refus du garde-fou levé.
3. Cas de montant ≥ 10 000 € (KPI et marge par projet) à vérifier dès qu'une donnée de prod le permet.
4. Mineurs non corrigés : N6 (frise en voix client), N8 (cibles < 44 px), lien d'évitement mort `#main-content`, titre « Fiche projet », cases natives de 13 px.
5. Captures à 360 et 768 : à refaire quand la fenêtre est visible (impossible avec les iframes).
6. Donnée de fixture au nom corrompu (U+FFFD) à corriger en base, hors UI.

## Résumé (15 lignes)
1. Tous les correctifs responsive vérifiés : tables dans `region` focalisable, 0 débordement de page sur 13 routes x 6 largeurs.
2. KPI et graphique de trésorerie corrigés (valeurs sans débordement, libellés non rognés), à données de test faibles.
3. `<select>` stylé, N4 (`?page=999`), N5 (filtre inconnu annoncé), 404 admin, « Non renseigné » : OK.
4. Menu de statut : ARIA, roving, Échap, clic extérieur et focus rendus ; panneau « Perdu » : focus, Échap, aucune écriture.
5. NOUVEAU MAJOR : le menu de statut est rogné par le conteneur défilant (items « Signé » et « Perdu » cachés).
6. Non vérifiables en prod : F-D1 (tuile, filtre actif), F-D5, « Invalider ce fait » (ouverture refusée par le garde-fou). Vérifiés par le code et ses tests.
7. Skeleton par route et entrée en fondu vus à l'écran ; hover (0,12 s) et focus (2 px acide) mesurés ; `:active` par CSS seulement.
8. Contraste calculé : 0 échec sur 8 écrans. Console : seulement un avertissement d'extension. Réseau : tout en 200.
9. Non corrigés : N6 (frise en voix client), N8, lien d'évitement mort, cases natives 13 px, nom de fixture corrompu.
10. Notes /10 avant -> après : Clients 5 -> 7, Leads 5,5 -> 7, Entonnoir 6 -> 8, Projets 5,5 -> 7,5, Fiche projet 4,5 -> 6,5, Pilotage 5 -> 7,5, Coûts 5,5 -> 6,5, E-mails 5 -> 7. Admin global 5 -> 7.
11. Limite : fenêtre Chrome masquée par intermittence, pas de capture 360/768 ; mesures refaites une fois le rendu effectif.
12. Aucune écriture, aucun envoi ; `src/` intact ; captures : `shots\final\admin\` (sans données personnelles).
