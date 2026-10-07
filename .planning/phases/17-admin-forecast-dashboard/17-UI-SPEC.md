---
phase: 17
slug: admin-forecast-dashboard
status: approved
shadcn_initialized: false
preset: none
created: 2026-10-07
---

# Phase 17 — UI Design Contract

> Contrat visuel et d'interaction de `/admin/pilotage` et `/admin/pilotage/couts`. Généré par gsd-ui-researcher, vérifié par gsd-ui-checker. Mode auto : toutes les valeurs viennent de CONTEXT.md (D-12, D-13, D-14), de RESEARCH.md (Pattern 8) et du design system admin existant (`portal.css`, `admin.css`, `funnel.css`, `globals.css`). Aucun nouveau jeton, aucune nouvelle bibliothèque.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none (projet Next.js sans `components.json` ; shadcn non applicable, passage de la gate : le back-office utilise le système maison `pt-*`, par décision héritée des phases 10-16) |
| Preset | not applicable |
| Component library | none (CSS maison scopé `.pt-admin` / `pt-*`, composants serveur React) |
| Icon library | none (aucune icône requise ; texte et glyphes Unicode `↑ ↓ →` seulement si besoin, jamais seuls) |
| Font | Display : Bricolage Grotesque (`--font-display`) ; corps : Manrope (`--font-body`) ; chiffres et montants : JetBrains Mono (`--font-mono`, `font-variant-numeric: tabular-nums`) |

Réutilisation obligatoire : `ShellHeader variant="admin"`, `ShellMain width="admin"`, `AdminNav` (ajout de l'entrée `pilotage`), `ShellFooter`, `SignOutButton`, `.pt-card`, `.pt-heading`, `.pt-helper`, `.pt-table` / `.pt-admin-table`, `.pt-empty`, `.pt-seg` (radios segmentés), `.pt-funnel-controls` (barre de filtres), `.pt-funnel-kpis` / `.pt-funnel-kpi` (grille de tuiles), `.pt-btn-primary|ghost|text`, `.pt-input`, `.pt-field`, `.pt-error`, `.pt-warning`, `.pt-status`, `.pt-sr-only`. Les nouvelles classes vivent dans `src/components/admin/pilotage/pilotage.css`, toutes scopées sous `.pt-admin` et préfixées `pt-pilot-`. Pas d'animation (D-11 phase 10), seulement transitions couleur/bordure 150-200 ms, désactivées sous `prefers-reduced-motion`. Aucun GSAP, curseur ou cinéma (D-14).

---

## Spacing Scale

Valeurs déclarées (multiples de 4), identiques au système admin existant :

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Écart libellé/champ, légende de tuile, marge sous `legend` |
| sm | 8px | Écart interne tuile (libellé/valeur), gap des segments, gap du pied de tableau |
| md | 16px | Padding des tuiles et de la barre de filtres, gap de grille de tuiles, gap de formulaire |
| lg | 24px | Marge sous le `h1`, padding des sections d'une carte |
| xl | 32px | Gap vertical entre blocs de page (contrôles, tuiles, tableaux, graphique) |
| 2xl | 48px | Séparation entre les deux grandes zones de `/couts` (récurrents, par projet) |
| 3xl | 64px | Non utilisé (réservé) |

Exceptions : cibles tactiles interactives à 44px minimum (segments `.pt-seg label`, boutons, chiffres cliquables via `min-height: 44px` sur la zone de lien dans les tuiles). Aucune autre exception.

Mise en page : une seule carte `.pt-card` par page, empilement vertical `gap: 32px`. Tuiles : 2 colonnes mobile, 4 colonnes dès 1024px (grille `.pt-funnel-kpis`). Tableaux : bascule en cartes empilées sous 768px via `data-label` (comportement `.pt-table` existant). Le graphique occupe 100 % de la largeur de la carte, hauteur fixe 240px (ratio SVG `viewBox="0 0 720 240"`, `preserveAspectRatio="xMidYMid meet"`).

---

## Typography

Quatre tailles, deux graisses, tels que déjà déclarés par `portal.css` (pas de nouvelle taille).

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body (texte, cellules, champs, boutons) | 16px | 400 (boutons 500) | 1.5 |
| Label (légendes de tuile, `legend`, en-têtes de colonne, aide de champ, libellé d'axe SVG, pied de règle de calcul) | 14px | 500 (aide : 400) | 1.5 |
| Heading (`h1` de page, `h2` de section) | 24px | 500 | 1.2 |
| Display (valeur d'une tuile, en JetBrains Mono, tabular-nums) | 32px | 500 | 1.2 |

Graisses : 400 (regular) et 500 (medium) uniquement. Les montants du tableau, du formulaire et du graphique sont en mono 16px (14px dans le SVG). Montants via `formatEuros` (NBSP, virgule, jamais `Intl` pour les euros). Montants négatifs : signe moins « − » (U+2212) précédé du symbole, jamais seulement une couleur. Dates : `Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris' })` ; mois en « oct. 2026 ».

---

## Color

Jetons existants uniquement (`globals.css`, `portal.css`).

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `--bg` #0A0B0C | Fond de page, fond des tuiles et de la barre de filtres, fond du graphique |
| Secondary (30%) | `--bg-2` #111213 / `--bg-3` #16181a, bordures `--pt-border-strong` #6f6b64 et `--line` #1F1F1F, texte `--ink` #ECEAE3 / `--ink-dim` #9A9690 | Carte, en-tête, segments (`--bg-3`), segment actif (`--bg-2`), lignes de tableau, grille et axes du graphique |
| Accent (10%) | `--acid` #C4F542 | voir liste ci-dessous |
| Destructive / alerte | `--warm` #E07856 | Erreurs, anomalies de réconciliation, solde projeté négatif, factures en retard |

Accent reserved for :
1. Bouton primaire unique par formulaire (« Ajouter le coût », « Enregistrer le solde », « Ajouter la charge récurrente »).
2. Filet gauche 2px et contour de focus du segment sélectionné (`.pt-seg`).
3. La courbe « trésorerie projetée » et ses points du graphique (trait plein 2px).
4. Anneau de focus clavier (`outline: 2px solid var(--acid)`) sur liens de chiffres et contrôles.

Jamais d'accent sur : valeurs de tuiles, texte courant, lignes de tableau, liens de drill-down (ceux-ci : `--ink`, souligné, offset 3px, comme `.pt-admin-table a`).

`--warm` : réservé aux états d'erreur ou d'anomalie, toujours accompagné d'un libellé texte et d'un glyphe (« ! » en `aria-hidden`) ; jamais décoratif. Ligne du solde sous zéro : segment tracé en `--warm` + zone « Découvert » étiquetée. Pas de vert/rouge de gain-perte : un écart se lit par le signe et le libellé.

Graphique, ordre de lecture sans dépendance à la couleur : courbe projetée = trait plein `--acid` ; ligne de référence zéro = trait `--ink-dim` 1px pointillé étiqueté « 0 € » ; barres de flux mensuels (entrées, sorties) = remplissage `--ink-dim` à 100 % (entrées) et contour seul `--ink-dim` 1.5px sans remplissage (sorties), distinction par forme et par `<title>`. Pas de dégradé, de halo, d'ombre ni de lueur.

---

## Copywriting Contract

Français uniquement, vouvoiement, voix directe, concrète. Aucune formule creuse.

### Navigation et en-têtes

| Element | Copy |
|---------|------|
| Entrée `AdminNav` | « Pilotage » (`/admin/pilotage` ; `/couts` garde `current="pilotage"`) |
| `<title>` pages | « Pilotage » ; « Coûts · Pilotage » |
| `h1` dashboard | « Pilotage » |
| `h1` coûts | « Coûts et solde de départ » |
| Lien croisé | Dashboard : « Gérer les coûts » (`pt-btn-ghost`) ; coûts : « Retour au pilotage » (`pt-back`) |
| Pied d'entonnoir | Sous la section coûts : « Le coût par rendez-vous se saisit dans l'entonnoir. » avec lien « Ouvrir l'entonnoir » (D-13) |

### Contrôles du dashboard (formulaire `method="get"`, `.pt-funnel-controls`)

| Contrôle | Copy |
|----------|------|
| Période (`.pt-seg`, légende « Période ») | « Mois » · « Trimestre » · « Année » ; sous les segments, la période résolue en toutes lettres : « Octobre 2026 » / « T4 2026 » / « Année 2026 » |
| Base (légende « Montants ») | « HT » · « TTC » ; aide : « Sans TVA (art. 293 B du CGI), HT et TTC sont identiques tant que le régime reste en franchise. » (affichée seulement si tous les montants sont en franchise) |
| Tests (case à cocher) | « Inclure les données de test (séries TFA et TAV) » ; état actif : bandeau `.pt-warning` « Les données de test sont incluses dans tous les chiffres. » |
| Validation | « Appliquer » (`pt-btn-ghost`) |

### Tuiles (D-12) — libellé, règle sous le chiffre (14px `--ink-dim`), lien

| Tuile | Libellé | Règle affichée | Drill-down |
|-------|---------|----------------|------------|
| Pipeline | « Pipeline » | « Devis émis non signés, à ce jour. La période ne le filtre pas. » | « Voir les devis » (`?detail=devis`) |
| Signé | « CA signé » | « Devis actif à la date de signature, avenants inclus. » | « Voir les devis signés » |
| Facturé | « CA facturé » | « Factures émises moins avoirs, sur la période. » | « Voir les factures » (`?detail=facture`) |
| Encaissé | « CA encaissé » | « Paiements reçus moins remboursements confirmés, sur la période. » | « Voir les paiements » (`?detail=paiement`) |
| Marge projetée | « Marge projetée » | « Signé (ou facturé net si supérieur) moins coûts du projet, moins coûts récurrents de la période. » | « Voir par projet » (ancre vers le tableau) |
| Marge réalisée | « Marge réalisée » | « Encaissé moins coûts payés. » | « Voir le calcul » (`?detail=cout` : détail composé, encaissements en positif et coûts payés en négatif, colonnes Date · Nature · Projet · Libellé · Montant ; « Total des lignes » = marge réalisée) |
| À facturer | « Reste à facturer » | « Signé moins facturé, sans date, hors courbe. » | « Voir par projet » |

Chaque valeur de tuile est elle-même un lien (`<a>` souligné, zone cliquable 44px) vers le drill-down ; le texte du lien est le montant, avec `aria-label` : « {Libellé} : {montant}. Voir le détail ». Seconde ligne de tuile possible en mode TTC/HT : « HT {montant} · TTC {montant} » désactivée ici (une seule base à la fois, choisie par la bascule).

### Tableaux

| Element | Copy |
|---------|------|
| Titre « par source » (`h2`) | « CA signé par source du lead » ; aide : « Source figée du lead d'origine, corrigée par vous le cas échéant. » |
| Colonnes source | « Source figée du lead » · « Campagne » · « Projets » · « CA signé » · « Part » (D-11 amendé : colonnes `sv_leads.source_*`) |
| Ligne spéciale | « Direct / hors lead » (projets sans lead) ; une source `direct` s'affiche « direct » : deux lignes distinctes |
| Ligne de total | « Total » (doit égaler la tuile CA signé) |
| Titre « par projet » (`h2`) | « Marge par projet » |
| Colonnes projet | « Projet » · « Client » · « Signé » · « Facturé » · « Encaissé » · « Coûts » · « Marge » · « Reste à facturer » |
| Pied du tableau | « Marge globale (coûts récurrents de la période déduits) » avec la valeur |
| Titre de détail (`h2`, quand `?detail=…`) | « Détail : {chiffre} » + total en mono + « Total des lignes = {montant} » + lien « Fermer le détail » |
| Colonnes détail facture | « Numéro » · « Date » · « Client » · « Type » · « Montant » |
| Colonnes détail paiement | « Date » · « Facture » · « Mode » · « Montant » |
| Colonnes détail devis | « Référence » · « Projet » · « Émis le » · « Montant » |
| Colonnes détail marge réalisée (`?detail=cout`) | « Date » · « Nature » (« Encaissement » / « Coût ») · « Projet » · « Libellé » · « Montant » ; encaissements positifs, coûts payés négatifs (signe U+2212) |
| Pagination du détail | « Page {n} sur {N} » ; liens « Précédente » · « Suivante » (50 lignes) |

### Graphique de trésorerie (SVG serveur, 6 mois)

| Element | Copy |
|---------|------|
| `h2` | « Trésorerie projetée sur 6 mois » |
| Aide | « Entrées : factures émises impayées, à leur échéance (les factures en retard comptent dans le mois courant). Sorties : coûts récurrents et coûts de projet à venir. » |
| `aria-label` du `<svg role="img">` | « Courbe de trésorerie sur 6 mois, de {mois début} à {mois fin}. Solde de clôture de {mois fin} : {montant}. » |
| `<title>` / `<desc>` | Titre : « Trésorerie projetée »; desc : phrase par mois (« octobre 2026 : entrées {…}, sorties {…}, solde de clôture {…} ») |
| Alternative texte | Tableau `.pt-table` visible sous le graphique (colonnes « Mois » · « Ouverture » · « Entrées » · « Sorties » · « Clôture »), jamais seulement `sr-only` |
| Étiquette de retard | « dont {montant} en retard » dans la cellule Entrées du mois courant, glyphe « ! » `--warm` |
| Sans solde saisi (D-09) | `.pt-warning` : « Aucun solde de départ saisi. La courbe montre le flux net cumulé depuis zéro. » + lien « Saisir le solde de départ » |
| Axe | Mois en « oct. », « nov. »… 14px `--ink-dim` ; montants d'axe arrondis à l'euro, libellé de la ligne zéro « 0 € » |
| Série | Légende sous le graphique : « Solde projeté » (trait plein) · « Entrées » (barre pleine) · « Sorties » (barre en contour) |

### États vides, chargement, erreur

| Element | Copy |
|---------|------|
| Empty dashboard heading | « Rien à piloter pour l'instant » |
| Empty dashboard body | « Les chiffres apparaissent dès le premier devis émis ou la première facture. Les données de test sont masquées : cochez « Inclure les données de test » pour les voir. » |
| Empty tableau source | « Aucun CA signé sur cette période. Changez de période ou consultez le pipeline. » |
| Empty détail | « Aucun élément ne compose ce chiffre pour cette période. » |
| Empty coûts récurrents | « Aucune charge récurrente. Ajoutez vos abonnements et outils pour projeter la trésorerie. » |
| Empty coûts projet | « Aucun coût de projet. Ajoutez la sous-traitance ou les licences payées pour un projet. » |
| Erreur de chargement (D-04, Pitfall 8) | Titre « Chiffres indisponibles » ; corps « Une lecture a échoué, aucun total n'est affiché pour éviter un chiffre faux. Rechargez la page ; si l'erreur persiste, vérifiez la connexion à la base. » + bouton « Recharger » (`pt-btn-ghost`). Jamais « 0 € » à la place d'un échec. |
| Anomalies de données | `.pt-warning` : « {n} anomalie(s) de réconciliation » + liste : « Contrat signé sans devis actif », « Devis sans montant valide », « Avoir supérieur au net de la facture », « Facture sans échéance » |
| Valeur non calculable | « — » (jamais « 0 € ») |

### Formulaires de `/admin/pilotage/couts`

Trois formulaires de server action, un seul bouton primaire par formulaire, champs `.pt-field` + `.pt-input` avec libellé visible, aide 14px.

| Formulaire | Champs (libellé → aide) | CTA primaire |
|------------|-------------------------|--------------|
| Solde de départ (en tête de page) | « Solde bancaire (€) » → « Peut être négatif en cas de découvert. » ; « Date du solde » (défaut aujourd'hui, Europe/Paris) ; « Note (facultatif) » max 200 | « Enregistrer le solde » |
| Charge récurrente | « Libellé » ; « Catégorie » (select) ; « Montant (€) » ; « Fréquence » (segments « Mensuelle » · « Annuelle ») ; « Début » ; « Fin (facultatif) » | « Ajouter la charge récurrente » |
| Coût de projet | « Projet » (select) ; « Date » ; « Catégorie » ; « Libellé » ; « Montant payé TTC (€) » → « Le montant réellement payé, TVA d'achat comprise. » ; « TVA (facultatif) » | « Ajouter le coût » |

Catégories (select, ordre fixe) : « Sous-traitance », « Outils », « Hébergement », « Publicité », « Licences », « Autre ».

Principe d'ajout seul (afficher en `.pt-helper` en tête de page) : « Les saisies ne se modifient pas. Pour corriger, ajoutez une nouvelle ligne ; l'historique est conservé. »

Listes (tables `.pt-admin-table`) :
- Solde de départ : colonnes « Date » · « Montant » · « Note » · « Saisi le » ; la dernière ligne porte le badge texte « En vigueur ».
- Charges récurrentes (regroupées par série, version la plus récente en tête) : « Libellé » · « Catégorie » · « Montant » · « Fréquence » · « Début » · « Fin » · « Statut » (« Active » / « Arrêtée » / « Remplacée ») · « Action ». Actions : « Modifier » (ouvre le formulaire pré-rempli, enregistre une nouvelle version : CTA « Enregistrer une nouvelle version »), « Arrêter » (voir destructif).
- Coûts de projet : « Date » · « Projet » · « Catégorie » · « Libellé » · « Montant » · « Statut » (« Valide » / « Annulé ») · « Action » : « Annuler ce coût ».

Messages de formulaire (`role="alert"` pour erreur, `role="status"` pour succès, `.pt-error` / `.pt-success`) :

| Cas | Copy |
|-----|------|
| Succès | « Coût ajouté. » / « Charge ajoutée. » / « Solde enregistré. » |
| Montant invalide | « Saisissez un montant supérieur à 0, par exemple 12,50. » |
| Libellé vide | « Indiquez un libellé (120 caractères maximum). » |
| Projet inconnu | « Ce projet n'existe plus. Rechargez la page et choisissez-en un autre. » |
| Date absurde | « Cette date est trop éloignée. Vérifiez l'année. » |
| Fin avant début | « La date de fin doit suivre la date de début. » |
| Erreur serveur | « L'enregistrement a échoué. Rien n'a été modifié. Réessayez ; si l'erreur persiste, rechargez la page. » |
| Session expirée | « Votre session a expiré. Reconnectez-vous pour continuer. » |

Confirmations destructives (aucune suppression physique : tout est ajout seul ; les deux actions ajoutent une ligne d'arrêt ou d'annulation). Confirmation en ligne (panneau `.pt-warning` + deux boutons, pas de modale, patron `RevokePanel`), focus placé sur le bouton « Annuler » par défaut :

| Action | Confirmation |
|--------|--------------|
| Arrêter une charge récurrente | « Arrêter cette charge : elle ne sera plus comptée à partir du mois indiqué. L'historique est conservé. » Champ « À partir du mois » ; boutons « Arrêter la charge » (`pt-btn-primary`) et « Garder la charge » (`pt-btn-text`) |
| Annuler un coût de projet | « Annuler ce coût : il sort des marges et de la trésorerie, mais reste visible dans l'historique avec le statut Annulé. Cette action ne peut pas être annulée. » Boutons « Annuler ce coût » (`pt-btn-primary`) et « Garder le coût » (`pt-btn-text`) |
| Réajuster le solde | Pas de confirmation (ajout d'une ligne, réversible par une nouvelle ligne) |

Primary CTA de la phase : sur le dashboard, aucune action primaire (page de lecture), seul « Gérer les coûts » en `pt-btn-ghost` ; sur `/couts` : « Ajouter le coût ».

---

## Interaction Contract

- **État dans l'URL** : `?periode=mois|trimestre|annee&base=ht|ttc&tests=0|1&detail=facture|paiement|devis|cout&cle=…&page=n`. Valeurs hors liste blanche : retour au défaut (`mois`, `ttc`, `0`). Pas d'état client, rendu serveur, liens partageables.
- **Défauts** : période = mois courant (Europe/Paris), base = TTC, tests = exclus.
- **Application des filtres** : bouton « Appliquer » (pas de soumission automatique, comme l'entonnoir).
- **Drill-down** : le détail s'ouvre sous le tableau « par projet » dans la même page, ancre `#detail`, focus déplacé sur le `h2` du détail (`tabindex="-1"`) ; « Fermer le détail » retire `detail`/`cle`. Total du détail = somme des lignes affichées (toutes pages), toujours rappelé.
- **Ligne de tableau cliquable** : la cellule « Projet » est un lien vers `/admin/projets/{id}` ; le montant d'une cellule « Signé / Facturé / Encaissé » est un lien de drill-down filtré sur ce projet (`cle=projet:{id}`).
- **Clavier** : ordre de tabulation = contrôles, tuiles, tableaux, graphique (non focusable ; son tableau l'est par le contenu), détail. Focus visible 2px `--acid`, offset 2px. Segments : navigation par flèches native des radios.
- **Mobile (< 768px)** : tuiles 2 colonnes, tableaux en cartes empilées, tableau de trésorerie sous le SVG, formulaires en une colonne.
- **Mouvement** : aucune animation ; survol de ligne = changement de fond `--bg-3` (150 ms).
- **Chargement** : rendu serveur, aucune pastille de chargement ; formulaires : bouton `disabled` + libellé « Enregistrement… » pendant la soumission (`useFormStatus`).

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | none (shadcn non initialisé, `Tool: none`) | not applicable |
| Third-party | none | not applicable — aucun registre tiers, aucune bibliothèque de graphiques ni de composants ajoutée (SVG inline) |

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
