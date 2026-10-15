# Critique visuelle et fluidité — v2.0 (sevalys.com, 2026-10-14)

Réponse à : « a-t-on fluidifié et embelli les pages ? » Les audits précédents jugent les défauts, pas la qualité visuelle. Ce document juge la qualité. Lecture seule, rien n'a été modifié dans `src/`.

## Méthode et limites (à lire avant les notes)
- Captures lues : home/services/service/connexion (A, B, PW), portail Projet/Documents/Paiements 360 et 1280 (C), 3 captures admin (DE). **L'admin n'a que 3 captures** : sa note est la moins sûre.
- Les captures « full page » du public montrent de grands vides noirs : ce sont des sections `[data-reveal]` non révélées au moment de la capture (artefact d'outil, pas un bug). Mesure réelle : 46/46 éléments révélés après un scroll normal.
- Mesures Playwright en lecture seule sur sevalys.com (desktop 1280 et mobile 390, contexte isolé, connexion CDN réelle, sans throttling). Pas d'INP réel (pas d'interactions utilisateur) : estimé par lecture du code.
- Pas de test réel de `:active` ni de mesure vidéo des animations : jugement sur CSS calculé et code.

## Verdict franc
Les 27 correctifs ont rendu les pages **propres et cohérentes** (contraste, gouttières, états, erreurs) mais n'ont **ni fluidifié ni embelli** : ce n'était pas leur objet. Le public a une vraie identité (acide `#C4F542` sur noir, Space Grotesk italique, marquee, reveals). Le portail est sobre mais sage au point d'être générique : une seule ligne de tokens, quasi aucune hiérarchie entre cartes. L'admin est fonctionnel et dense mais le moins soigné (tableaux en débordement, empreintes SHA affichées, pas d'état vide chaleureux). La fluidité est le point faible transversal : transitions uniformes à 0,2 s `ease`, **aucun état `:active`** sur tout le code, pas de skeleton côté client (une carte de texte « Chargement »), `transition: all` sur les boutons publics.

| Zone | Note /10 | En une phrase |
|---|---|---|
| Public | 7,5 | Identité forte et motion déjà travaillée ; handicapé par l'intro (LCP) et des détails de finition |
| Connexion | 6,5 | Propre, accessible, mais plate : carte standard, aucun moment de marque ni de feedback |
| Portail client | 6 | Lisible et cohérent, mais générique : mêmes cartes empilées, tableaux denses, rien ne célèbre l'état « livré » |
| Admin | 5 | Efficace, mais tableaux bruts, hiérarchie plate, chaînes techniques (empreintes) exposées |
| Fluidité (transverse) | 5,5 | Public animé avec soin (easings `cubic-bezier(.16,1,.3,1)`), portail/admin sans mouvement ni `:active` ; la doctrine « sobriété back-office » est devenue de l'absence de retour |

## Ce qui est déjà bien (à ne pas casser)
1. **Direction artistique publique** : un seul accent (acide), noir chaud `#0A0B0C`, serif italique en contrepoint (« *travailleur* »), hero lisible (`A/home-1280-hero`).
2. **Système de motion public** : reveals 1 s avec décalages 80 ms, `.split .line` à 1,1 s, easing expo-out `(.16,1,.3,1)` sur les lignes d'index, médias et burger ; `prefers-reduced-motion` respecté partout.
3. **Mesures solides** : CLS 0 sur les 8 mesures, 0 tâche longue, pages internes avec LCP 170–320 ms, hors mobile simulateur (1,3 s).
4. **Sections contrastées** de service (bande crème, bloc acide « Pas sûr que ce soit votre besoin ? ») : bon rythme vertical (`PW/service-slug-1280`).
5. **Portail** : en-tête et onglets sobres, onglet actif souligné acide, badges de statut avec icône (Signé / Payée / Remboursée), pied de page avec mention TVA, mobile qui bascule les tableaux en cartes empilées (`C/home-360`).
6. **Focus visible** cohérent (anneau acide) sur public, portail, admin.

## Mesures de fluidité (live, public)
| Page | LCP desktop | LCP mobile | CLS | Tâches longues |
|---|---|---|---|---|
| `/` | **5 236 ms** | 1 784 ms | 0 | 0 |
| `/services` | 168 ms | 184 ms | 0 | 0 |
| `/connexion` | 320 ms | 236 ms | 0 | 0 |
| `/simulateur` | 192 ms | 1 332 ms | 0 | 0 |

Lecture : le LCP de 5,2 s à l'accueil est probablement dû à l'intro « cinéma » (overlay noir plein écran, fondu 0,9 s + barre 1,1 s, `globals.css:172-240`) qui retient le premier rendu mesurable. À confirmer avec un test sans intro (cookie/session). 21 éléments interactifs sur 49 à l'accueil n'ont **aucune** transition (durée `0s`). Les boutons publics utilisent `transition: all .25s` (`globals.css:275`) : anime des propriétés non voulues (layout). `scroll-behavior: smooth` global.

## Améliorations concrètes (classées impact/effort)

### Impact fort, effort faible
**V1. États `:active` partout (0 occurrence dans tout le CSS).** Pages : toutes. Réf. `C/pay-1280`, `A/home-1280-hero`. Proposition : `.btn:active, .pt-btn-*:active { transform: scale(.97); transition-duration: 80ms }` ; en tactile c'est le seul retour immédiat (INP perçu). Public : annuler le `translateY(-2px)` du hover pendant l'`:active`.

**V2. Tokens de motion uniques.** `:root { --ease-out: cubic-bezier(.16,1,.3,1); --dur-fast: 120ms; --dur-base: 200ms; --dur-slow: 400ms; }`. Remplacer les `ease` par défaut (0,2 s uniforme dans portail/admin) et les 0,3/0,35/0,4/1 s épars du public. Remplacer `transition: all` par propriétés explicites (`background-color, color, border-color, transform`) sur `.btn`, `.o-cta`, `.ph-step .ico`, `.work-bridge`, `.ndot`.

**V3. Skeleton du portail à la place de la carte « Chargement ».** Page : `espace-client/loading.tsx` ; réf. `C/loading-360`. Proposition : 3 blocs (en-tête 120 px, timeline 6 lignes 20 px, carte 160 px) avec shimmer 1,4 s `linear` (`background-size: 200%`), `aria-busy` conservé, `prefers-reduced-motion` : fond fixe. Réutiliser `.pt-admin-skeleton` (`admin.css:165`) en le montant dans un partagé `pt-skeleton`.

**V4. Transition de page (portail/admin).** Entrée de contenu : `@keyframes pt-in { from { opacity:0; transform: translateY(6px) } }` à 240 ms `--ease-out` sur `.pt-main > *`, décalage 40 ms (3 enfants max). Aucune sortie. Désactivé en reduced-motion. Rend la navigation entre Projet/Documents/Paiements fluide au lieu d'un remplacement sec.

**V5. Hover de ligne dans les tableaux** (portail `pt-table`, admin). Réf. `C/docs-1280`, `DE/projet-detail-factures-overflow`. Proposition : `tbody tr:hover { background: rgba(236,234,227,.03) }` 120 ms, + curseur/souligné sur la cellule titre quand elle est cliquable.

### Impact fort, effort moyen
**V6. Réduire le coût de l'intro à l'accueil.** Page `/`, `globals.css:172-240`. Proposition : intro uniquement à la première visite de la session (`sessionStorage`), durée totale ≤ 1,2 s, et ne pas bloquer le rendu du hero (le hero doit être l'élément LCP sous l'overlay en fondu 400 ms). Cible : LCP < 2,5 s. Vérifier d'abord par mesure A/B avant de toucher à la DA.

**V7. Moment de marque sur /connexion.** Réf. `B/connexion-1280`. Aujourd'hui : carte noire sur noir, grande zone vide. Proposition : halo acide discret derrière le logo (`radial-gradient(circle at 50% 0, var(--acid-soft), transparent 60%)`, 600 px), carte avec `border: 1px solid var(--line-strong)` + ombre `0 24px 60px -30px rgba(196,245,66,.12)`, entrée de carte 300 ms `--ease-out`. Le champ e-mail : bordure acide au focus + label qui monte (150 ms). Après envoi : transition de la vue code (fondu croisé 200 ms).

**V8. Hiérarchie des cartes du portail Projet.** Réf. `C/home-1280`. Proposition : 3 niveaux au lieu d'un seul. N1 « prochaine action » (carte héros acide en filet 2 px ou fond `--acid-soft`, titre 32 px) ; N2 timeline et infos (carte standard) ; N3 fichiers/liens/consentement (repliables ou fond `--bg` + bordure fine). Aujourd'hui toutes les cartes pèsent pareil, ce qui noie la prochaine action. Dans l'état « livré » : célébration (coche qui se dessine 400 ms, `stroke-dashoffset`), 1 seule fois.

**V9. Timeline animée.** `C/home-1280`. Proposition : trait vertical qui se remplit jusqu'à l'étape courante (`scaleY` 600 ms, origine haut), pastille courante avec pulsation douce (`box-shadow` 2 s, déjà le motif `dotPulse` du public), étapes à venir en `--ink-faint`.

**V10. Tableaux du portail : densité et typographie.** Réf. `C/docs-1280`, `C/pay-1280`. Problèmes : « Version 2 » passe à la ligne, ID de facture coupé (`TFA-2026-\n0002`), bouton « Télécharger le document signé » sur 2 lignes qui décale la colonne. Proposition : `white-space: nowrap` sur Version et ID, chiffres `font-variant-numeric: tabular-nums` sur Montant, action raccourcie en « Signé » + icône avec `aria-label` complet, hauteur de ligne 56 px constante, en-têtes mono 11 px `--ink-faint` (déjà), montant en 500.

### Impact moyen, effort faible
**V11. États vides illustrés.** Admin et portail : aujourd'hui du texte nu (`DE/projet-introuvable-360ish`). Proposition : composant `EmptyState` (icône 32 px `--ink-faint`, titre 16 px, phrase de ce qui se passe ensuite, action unique), réutilisé liste vide, aucun fichier, aucun document.

**V12. Retour sur les actions admin/portail.** Réf. F-D5 du SUMMARY (aucune confirmation à l'enregistrement). Proposition : bouton passe en `Enregistrement…` (spinner 14 px 700 ms) puis `Enregistré ✓` 1,5 s, et toast 3 s en bas à droite (entrée `translateY(8px)` 200 ms). Rend visible l'effet qui, sinon, avance l'étape et envoie un e-mail.

**V13. Échelle typographique et rayons du back-office.** `portal.css`/`project.css` : 17 rayons à 8 px, 1 seul rythme. Proposition : jetons `--radius-sm 8 / --radius-md 12 / --radius-pill 100` (le public utilise 12 px et 100 px, le portail 8 px : cohérence public/portail à décider ; recommandation : cartes portail à 12 px, contrôles à 8 px). Échelle 12/14/16/20/28/40 avec `clamp()` pour titres.

### Impact moyen, effort moyen
**V14. Admin : lisibilité des tableaux.** Réf. `DE/projet-detail-factures-overflow-1360`. Proposition : wrapper `overflow-x:auto` (déjà dans le SUMMARY), colonne Empreinte réduite à 8 caractères + « Copier » (au lieu d'une pile de SHA et deux liens), colonne Actions en menu « ⋯ », première colonne collante, en-tête collant au scroll vertical. Bandeau de totaux (KPI) avec chiffres 28 px et variation, pas seulement du texte.

**V15. Cohérence public / portail / admin.** Le portail reprend l'acide et les pilules mais pas le serif italique ni les halos ; l'admin n'a ni l'un ni l'autre. Proposition : un fichier `tokens.css` partagé (couleurs, rayons, motion, ombres) importé par les trois ; un seul composant `Button` et `Card` ; titre de page du portail et de l'admin avec un mot en serif italique acide (signature de marque, 1 par page, pas plus).

**V16 (optionnel, faible priorité). Polish mobile public.** Mobile : le LCP du simulateur est de 1,3 s (reste raisonnable) ; vérifier que la barre `.mcta` fixe ne recouvre pas les derniers boutons (hauteur + `safe-area`). Cibles 44 px déjà acquises.

## Découpage en tâches exécutables pour la vague 4
Chaque tâche touche un périmètre de fichiers disjoint pour permettre l'exécution en parallèle, sans conflit.

| Tâche | Périmètre | Contenu | Dépend de |
|---|---|---|---|
| **W4-T0 Tokens et motion** | nouveau `src/app/tokens.css`, import dans `globals.css`/`portal.css` | V2 : `--ease-out`, `--dur-*`, `--radius-*`, `--shadow-*` ; remplacer `transition: all` par propriétés explicites dans `globals.css` | — (à faire en premier) |
| **W4-T1 `:active` et feedback** | `globals.css` (.btn, .o-cta, .more-btn), `portal.css` (.pt-btn-*) | V1 + V5 (hover de ligne) | T0 |
| **W4-T2 Loading et transitions portail** | `app/espace-client/loading.tsx`, `app/admin/loading.tsx`, `portal.css` | V3 skeleton partagé + V4 entrée de contenu | T0 |
| **W4-T3 Connexion** | `app/connexion/*`, `portal.css` (.pt-auth) | V7 | T0 |
| **W4-T4 Hiérarchie portail Projet** | `components/portal/project/*`, `project.css` | V8 + V9 | T0 |
| **W4-T5 Tableaux portail** | `components/portal/project/Documents*`, `Payments*`, `project.css` | V10 | T0, après W1 (« qui attend ») |
| **W4-T6 États vides et feedback d'action** | nouveau `components/ui/EmptyState`, `components/ui/Toast`, formulaires admin | V11 + V12 | T0 |
| **W4-T7 Admin tableaux** | `components/admin/**`, `admin.css`, `pilotage.css` | V14 (inclut le wrapper de débordement du SUMMARY) | T0 |
| **W4-T8 Intro et LCP accueil** | `components/**/Intro*`, `globals.css:172-240` | V6, avec mesure avant/après (script `vc.mjs`) | — |
| **W4-T9 Cohérence et revue** | CSS des 3 espaces | V13 + V15, puis re-mesure (CLS, LCP, `:active`, reduced-motion) et nouvelles captures | T1–T8 |

Critères d'acceptation transverses : CLS reste à 0 ; `prefers-reduced-motion` coupe tout nouveau mouvement ; aucune animation > 400 ms hors reveals publics ; focus visible conservé ; contraste ≥ 4,5:1 conservé ; 0 `transition: all` restant dans les fichiers touchés ; `:active` présent sur chaque bouton ; LCP accueil < 2,5 s.

## Résumé (15 lignes)
1. Verdict : propre et cohérent, mais ni fluidifié ni embelli par les 27 correctifs (qui ciblaient les défauts).
2. Notes /10 : public 7,5 ; connexion 6,5 ; portail 6 ; admin 5 (peu de captures) ; fluidité 5,5.
3. Points forts : DA publique (acide/noir/serif italique), motion public soigné, CLS 0, 0 tâche longue, focus et reduced-motion.
4. Faiblesse n°1 : 0 état `:active` dans tout le CSS ; transitions uniformes 0,2 s `ease`.
5. `transition: all` sur les boutons publics ; 21/49 éléments interactifs de l'accueil sans transition.
6. LCP de l'accueil desktop 5,2 s (intro cinéma probable), pages internes 170–320 ms.
7. Portail : chargement = une carte de texte, pas de skeleton ; aucun mouvement entre onglets.
8. Portail : toutes les cartes pèsent pareil, la prochaine action est noyée ; tableaux avec retours à la ligne gênants.
9. Connexion : correcte mais plate, aucun moment de marque.
10. Admin : tableaux bruts, empreintes SHA exposées, états vides sans soin, aucun retour sur enregistrement.
11. 16 améliorations V1–V16 classées impact/effort (V1 `:active`, V2 tokens motion, V3 skeleton, V4 entrée de page en tête).
12. Vague 4 découpée en 10 tâches W4-T0 à T9, périmètres disjoints, T0 (tokens) d'abord.
13. Limites : pas d'INP réel, pas de vidéo, admin jugé sur 3 captures et les rapports.
14. Les vides noirs des captures full-page sont des reveals non déclenchés, pas un bug.
15. Aucun fichier de `src/` modifié.
