# Pré-audit CODE des zones privées, lots C / D / E

Audité sur HEAD `d94cf62` (après les 27 correctifs UI). Lecture seule, aucun navigateur (OTP indisponible). Les chiffres de contraste sont calculés à partir des jetons de `globals.css` / `portal.css`. Tout ce qui est marqué **(vérifier)** est une hypothèse de CSS à confirmer à l'écran.

Périmètre : C = `src/app/espace-client/**` + `src/components/portal/**` ; D = `admin` (page, leads, leads/[id], entonnoir, projets, projets/[id], pilotage, pilotage/couts) ; E = `admin/avis`, `admin/emails`, `admin/liens`. CSS lus : `portal.css`, `client.css`, `project.css`, `admin.css`, `leads.css`, `funnel.css`, `pilotage.css`, `projects.css`, `inline.css`, `links.css`.

---

## 1. Vérification des 10 thèmes du SUMMARY v2.0

| # | Thème | Statut | Preuve (fichier:ligne) et reste à faire |
|---|---|---|---|
| 1 | Pas de `loading` / `error` / `not-found` privés | **Corrigé**, avec résidus | Portail : `espace-client/{loading,error,not-found}.tsx` (not-found sans Navbar publique, `not-found.tsx:15-37`). Admin : `admin/{loading,error,not-found}.tsx`. Résidus : le `loading` portail affiche le titre « Espace client » (`loading.tsx:10`) puis le nom du client (saut de titre), sans `ClientNav` ni pied de page (décalage de mise en page au passage). `error.tsx` portail sans `ClientNav`. `admin/error.tsx:28` met `role="alert"` sur tout le bloc au lieu de déplacer le focus (le portail le fait). Une URL inconnue sous `/espace-client/xyz` ou `/admin/xyz` retombe sur la 404 racine publique (Next n'utilise `not-found` de segment que pour `notFound()`) **(vérifier)**. |
| 2 | Nav admin déborde à 360 px | **Corrigé** | `admin.css:30-39` `flex-wrap: wrap`, `gap: 0 20px`, liens 44 px (`:40-48`). Estimation : 8 liens ≈ 354 px + 7 gaps de 20 px, donc 2 rangées sur 328 px utiles (≈ 88 px de haut en tête de chaque page). Reste à voir si le retour à la ligne est lisible et si la rangée active est évidente. |
| 3 | `--ink-faint` à 2,6 : 1 | **Corrigé** | `globals.css:14` : `#85817A`, soit 4,84 : 1 sur `--bg-2`, 4,59 : 1 sur `--bg-3`. Plus aucune occurrence de `--ink-faint` dans `portal.css`, `client.css`, `project.css` ni `components/admin/**` (grep ; garde-fous de tests). Anneau « à venir » de la frise : `--pt-border-strong` 3,54 : 1 (`project.css:44`). |
| 4 | Parcours avis (`pt-auth-title`, throttle) | **Hors périmètre C/D/E** | Lot A (public). Côté admin, `admin/avis` ne partage pas ce composant. |
| 5 | Gestionnaire de cookies sur `/mentions-legales` | **Hors périmètre C/D/E** | Lot A. Les zones privées n'affichent pas le dialogue de consentement (`isPrivatePath`). |
| 6 | Libellés du parcours client / « qui attend » | **Partiellement corrigé, nouvelle régression de sens** | Étapes 2 et 3 passent en `waitingOn: 'client'` (`steps.ts:68,76`) et `WhoWaits` porte l'action (signer / payer / compléter) via `clientActions.ts`. **Régression** : `buildClientActions` (`clientActions.ts:26-61`) ne renvoie rien tant qu'aucun document n'est « à signer » et aucune facture « à payer ». Avant l'émission du devis, le panneau dit donc « En attente de vous » sans aucun bouton (voir F-C1). Idem étapes 5 et 6. Côté admin, le filtre « Attend Sèvalys » n'inclut plus « devis / contrat à émettre » (voir F-D1). |
| 7 | Admin sans file de travail | **Corrigé**, avec limites | `/admin` ouvre sur « À traiter » (`admin/page.tsx:88`, `WorkQueue.tsx`, `lib/admin/workQueue.ts`). Limites : « Projets en attente de Sèvalys » absent (non-correctif documenté) ; les liens de tuiles pointent vers des pages non filtrées (`workQueue.ts:25,31` : `/admin/pilotage`, `/admin/projets`). |
| 8 | Panneaux en ligne + 4 patterns de confirmation | **Largement corrigé** | `.pt-lead-panel` statique par défaut (`leads.css:184-196`) ; `.pt-inline-panel` (`inline.css:6-22`) ; `ConfirmAction` partagé, contour `--warm`, « Garder… » en premier (`shared/ConfirmAction.tsx`). Écarts restants : `LostPanel` (acide plein + « Annuler la perte », `LostPanel.tsx:58,62`), `PostFactForm` sans confirmation (`PostFactForm.tsx:105`), retrait d'accord client sans confirmation (`ConsentCard.tsx`). Le popover absolu reste pour la pastille de statut (voir F-D6). |
| 9 | Régions live montées avec du texte / pas de skip link | **Corrigé en majorité** | Portail : `SkipLink` + `main#contenu` (`ShellMain.tsx`), `.pt-live` montée vide (`portal.css:419`). Admin : `.pt-skip-link` + ancre `#admin-contenu` dans `AdminNav` (`AdminNav.tsx:46`). Résidus : erreurs de champs d'onboarding non annoncées (F-C4), URL d'avis réémis hors région live (F-E3). |
| 10 | Colonnes d'argent / erreur avalée de l'entonnoir | **Corrigé**, avec risque de débordement | `.pt-num` mono + tabulaire + droite dès 768 px (`pilotage.css:29-41`) ; `entonnoir/page.tsx` affiche « Chiffres indisponibles » + Recharger. Risques nouveaux : tuiles KPI et tableau de marge trop étroits (F-D2, F-D3). |

---

## 2. Findings

Légende de sévérité : **BLOCKER** = empêche une tâche ou perd des données ; **MAJOR** = gêne réelle ou défaut d'accessibilité sérieux ; **MINOR** = finition. Aucun BLOCKER n'est démontrable par le code seul ; les MAJOR « vérifier » deviennent des BLOCKER s'ils se confirment à 360 px.

### Lot C : portail client

**F-C1 (MAJOR, wording / parcours) « En attente de vous » sans action possible.**
`src/lib/projects/steps.ts:60-100` + `src/lib/projects/clientActions.ts:26-61` + `src/components/portal/project/WhoWaits.tsx`.
Les étapes 2, 3, 5 et 6 sont `waitingOn: 'client'` de façon statique. Tant que Sèvalys n'a pas émis le devis, le contrat, le PV ou la facture, le client voit « En attente de / vous », la phrase « Signez votre devis dès qu'il est disponible… » et aucun bouton. C'est l'inverse du bug d'origine (H1) : on dit « à vous » quand c'est « à nous ». Étape 5 « Vérifiez le résultat » idem tant que le PV n'est pas émis.
Correctif : dériver le côté qui attend de l'état réel : document `to_sign` ou facture `to_pay` présent, alors client ; sinon, Sèvalys avec un texte du type « Nous préparons votre devis, vous recevrez un e-mail ». Ajouter une action de repli (« Voir mes documents ») seulement si un document existe.

**F-C2 (MAJOR, responsive, vérifier) Deux éléments collants se recouvrent sur la recette (PV) à 360 px.**
`project.css:636-650` : `.pt-sign-bar` et `.pt-sign-summary` sont tous deux `position: sticky; bottom: 0`. Dans `AcceptanceChecklist.tsx:179-183` ils sont frères consécutifs. La barre (z-index 1, avertissement + aide + bouton, souvent 120-160 px) recouvre le résumé aria-live, et mange un quart de l'écran quand le clavier ouvre la zone de note. Probable aussi pendant la saisie d'une réserve.
Correctif : ne garder que la barre collante (le résumé passe dans la barre ou n'est plus collant) ; limiter la hauteur de la barre sur petit écran.

**F-C3 (MAJOR, responsive, vérifier) Visionneuse PDF dans un `iframe` de 480 px sur mobile.**
`project.css:471-479,626-628` ; `SigningFlow.tsx` (`pt-sign-frame`). Sur iOS Safari, un iframe PDF n'affiche que la première page et capture le défilement (piège de scroll). Le texte `SIG.read.mobileNote` existe mais le lien « Ouvrir dans un nouvel onglet » n'est qu'un `pt-btn-text` sous l'iframe.
Correctif : sur mobile, rendre « Ouvrir le document » le premier geste (bouton secondaire plein largeur) et réduire l'iframe, ou le remplacer par un résumé + lien.

**F-C4 (MAJOR, accessibilité) Erreurs de champs de l'onboarding non annoncées.**
`OnboardingCard.tsx:37-45` (`FieldError` : `<p>` monté avec son texte, sans `role="alert"` ni région live) ; l'enregistrement part au `onBlur` du bloc (`:115`), donc l'erreur arrive après que le focus a quitté le champ. Un lecteur d'écran ne l'entend jamais ; un utilisateur clavier ne sait pas qu'un champ est refusé.
Correctif : région `aria-live` du bloc (déjà présente pour « Enregistrement… ») qui annonce « N erreur(s) dans ce bloc » + `aria-invalid` déjà posé ; ou `role="alert"` sur le message.

**F-C5 (MINOR) Forme juridique affichée sous forme de code INSEE.**
`OnboardingCard.tsx:166` : `company?.forme_juridique_code` (ex. « 5710 ») dans la relecture « Votre société ». Le client ne sait pas ce que c'est. Afficher le libellé (SAS, EURL…) ou retirer la ligne.

**F-C6 (MINOR) Tiret cadratin comme valeur vide.**
`OnboardingCard.tsx:160-166`, `PaymentsList.tsx` (période), `EM_DASH` côté admin. Le projet interdit le tiret cadratin dans les textes (UX L4 non traité). Utiliser « - » ou « Non renseigné ».

**F-C7 (MINOR) Table des paiements : en-tête « Montant » à gauche, cellules à droite.**
`project.css:682-692` aligne la cellule à droite dès 768 px, mais `.pt-table th` est `text-align: left` (`portal.css:503-509`). Aligner l'en-tête sur la colonne (classe commune th/td).

**F-C8 (MINOR) Bouton « Payer » répété sans contexte.**
`PaymentsList.tsx:104` : plusieurs factures à payer produisent plusieurs « Payer » identiques en ghost, sans `aria-label` (numéro de facture) ; seule la première est mise en avant (UX M7 non traité). Idem « Télécharger » répétés (`DocumentsList.tsx`, `FilesPanel.tsx`). Au passage en cartes mobiles (`display: block` sur `table/tr/td`, `portal.css:526-533`), certains lecteurs d'écran perdent la sémantique de tableau **(vérifier avec VoiceOver/TalkBack)**.

**F-C9 (MINOR) Panneau de retour de paiement muet si la facture n'est pas trouvée.**
`paiements/page.tsx:62-76` : `?retour=succes&facture=<uuid>` sans facture correspondante n'affiche rien (ni message ni « annulé »). Et en cas d'échec de lecture, `pt-error role="alert"` sans bouton « Réessayer » (`:71-74`), contrairement à l'admin (« Recharger »).

**F-C10 (MINOR) Largeurs de cartes incohérentes sur grand écran.**
`client.css:49-52` limite `.pt-card.pt-client` (Interlocuteur) à 560 px alors que les autres cartes de la page font 960 px (`portal.css:123`). À regarder à 1280 px.

**F-C11 (MINOR) Cibles tactiles de 24 px.**
`client.css:84-90` : liens e-mail / téléphone de la carte « Votre interlocuteur » ont `min-height: 24px` (le téléphone est une action principale sur mobile). Les liens de `PortalLinks` aussi. Règle projet : 44 px.

**F-C12 (MINOR) « Depuis 0 jour ».**
`copy.ts:78` : au jour J, « Depuis 0 jour ». Préférer « Depuis aujourd'hui ».

**F-C13 (MINOR) Frise : `aria-label` en double.**
`espace-client/page.tsx` (section `aria-label` = « Avancement du projet ») contient `<ol aria-label="Avancement du projet">` (`Timeline.tsx:26`). Même nom lu deux fois.

**F-C14 (MINOR) Boutons principaux désactivés à 50 % d'opacité.**
`portal.css:285-289` : « Recevoir le code », « Enregistrer mon accord » grisés ≈ 2,5 : 1. Exempté par WCAG (désactivé) mais le texte porte l'information ; `aria-disabled` avec infobulle de raison serait plus lisible.

### Lot D : admin pilotage

**F-D1 (MAJOR, UX) L'admin n'a plus de vue « devis / contrat à émettre ».**
Conséquence du correctif F-C1 d'origine : les étapes 2-3 sont maintenant « Client » (`ProjectsTable.tsx` `Waiting`, `projets/page.tsx` filtre `blocage=client`). Le filtre « Attend Sèvalys » n'affiche plus les projets où il faut préparer le devis. La file « À traiter » ne les mentionne pas non plus (`workQueue.ts`). Le travail d'émission est invisible.
Correctif : dériver la tuile et le filtre de l'état réel (document émis / à émettre) ; tuile « Projets en attente de Sèvalys ».

**F-D2 (MAJOR, responsive, vérifier) Tableau « Marge par projet » trop large entre 768 et ~1200 px.**
`ProjectMarginTable.tsx:10,28-46` : 8 colonnes (Projet, Client + 6 colonnes d'argent) ; `pilotage.css:36-47` impose `white-space: nowrap` aux colonnes `.pt-num` dès 768 px, et le tableau n'a pas de conteneur à défilement (contrairement à l'entonnoir, `funnel.css:111`). `globals.css:52` met `overflow-x: hidden` sur le body : le surplus est coupé sans défilement. À 768 px il reste ≈ 656 px pour 8 colonnes. Même risque pour `DetailPanel` (5 colonnes) et la table des coûts récurrents (8 colonnes, `couts/page.tsx`).
Correctif : envelopper dans un `div` à `overflow-x: auto` + `tabindex="0"` + `role="region"` (modèle `FunnelTable.tsx:63`) ou basculer en cartes sous 1100 px.

**F-D3 (MAJOR, responsive, vérifier) Tuiles KPI : montants de 32 px en mono dans des tuiles étroites.**
`funnel.css:3-33` : grille 2 colonnes à 360 px (tuile ≈ 156 px, contenu ≈ 124 px) et 4 colonnes dès 1024 px (contenu ≈ 184-208 px). « 12 345,67 € » en 32 px mono mesure ≈ 211 px et déborde ; aucun `overflow-wrap`. Valable pour `FunnelKpis` et `PilotageKpis`.
Correctif : `font-size: clamp(20px, 5vw, 32px)` ou grille `repeat(auto-fit, minmax(200px, 1fr))` + `overflow-wrap: anywhere`.

**F-D4 (MAJOR, responsive, vérifier) Entonnoir à 360 px : 1re colonne collante trop large.**
`funnel.css:131-139` : `th[scope=row]` sticky `left: 0` et `white-space: nowrap` (`:115-120`) ; avec le badge « Hors convention (n) » la colonne peut dépasser 230 px sur 328 px, ne laissant presque rien à faire défiler, et le contenu glisse sous la colonne collante. Les cartes ne sont pas utilisées sous 768 px (`funnel.css:182-215`).
Correctif : retirer le sticky sous 640 px ou autoriser le retour à la ligne du badge.

**F-D5 (MAJOR, UX/cohérence) Enregistrer un fait n'a pas de confirmation, alors qu'il avance l'étape et peut envoyer un e-mail.**
`PostFactForm.tsx:105` (bouton acide « Enregistrer le fait »), `state.mailLine`. Les autres actions graves passent par `ConfirmAction`. Seul un avertissement « en avance » existe (`:62`). L'invalidation est possible a posteriori, mais l'e-mail est parti.
Correctif : récapitulatif + « Confirmer l'enregistrement » / « Garder… », ou au moins confirmation quand `ahead` ou quand un e-mail client partira.

**F-D6 (MAJOR, vérifier) Popovers de la pastille de statut.**
`leads.css:184-196` : le menu (`.pt-lead-pill-menu`) et le panneau « Perdu » restent en `position: absolute` dès 768 px, dans une cellule de tableau. Questions à lever à l'écran : recouvrement des lignes suivantes, coupure en bas de page, absence de fermeture au clic extérieur et au blur (`StatusPill.tsx`, seule Échap ferme), perte du focus après choix car la pastille devient `disabled` pendant l'envoi (`StatusPill.tsx:80`), et largeur de la pastille qui change (« Enregistrement… »). `role="menu"` avec des `<form display: contents>` comme enfants directs n'est pas un menu ARIA valide (`StatusPill.tsx:96`).

**F-D7 (MINOR) `LostPanel` hors motif de confirmation.**
`LostPanel.tsx:58,62` : « Marquer comme perdu » en acide plein, et « Annuler la perte » (qui peut se lire comme « défaire la perte »). Réutiliser `ConfirmPanel` : confirmation en contour `--warm`, « Garder le statut actuel ».

**F-D8 (MINOR) `<select>` « Fait à enregistrer » non stylé.**
`PostFactForm.tsx:51` est dans `.pt-lead-form`, dont les règles ne couvrent que `input[type=text]` et `textarea` (`leads.css:298-312`). Résultat probable : contrôle natif sans bordure cohérente, hauteur inférieure à 44 px **(vérifier)**. C'est le contrôle principal de la fiche projet.

**F-D9 (MINOR) Tri des colonnes inaccessible sur mobile.**
`ProjectsTable.tsx:76-96` : le tri se fait par les liens des `th`, or `thead` est masqué visuellement en dessous de 768 px (`portal.css:534-540`). Sur 360 px on ne peut filtrer mais plus trier.

**F-D10 (MINOR) Jetons de navigation de la file « À traiter ».**
`workQueue.ts:25,31` : « factures en retard » mène à `/admin/pilotage` (aucune liste de factures en retard n'y est isolée), « documents en attente de signature » mène à `/admin/projets` non filtré (disponible : `?blocage=client`). Le clic ne répond pas à la question posée par la tuile.

**F-D11 (MINOR) Fiche projet très longue sans repères.**
`projets/[id]/page.tsx` : étapes, fichiers, documents, facturation, puis cartes latérales empilées sous 1024 px (`leads.css:230-240`). UX M8 (navigation de sections) toujours non traitée. Sur mobile, l'action « Enregistrer le fait » est en haut mais « Relances » / « Lien d'avis » sont tout en bas.

**F-D12 (MINOR) Doublons CSS / composants.**
Deux `Pager` (`components/admin/Pager.tsx` : « Page N » ; `shared/Pager.tsx` : « Page N sur M »), `.pt-pager` défini deux fois (`admin.css:185`, `inline.css:165`), `.pt-stack` défini dans `portal.css` (24 px) et redéfini sous `.pt-admin` (32 px, `inline.css`). `accent-color: var(--acid)` sur `.pt-bill-check` (`projects.css:230`) contredit la règle « accent réservé » appliquée côté portail.

**F-D13 (MINOR) Puces de filtre actives non interactives.**
`LeadFilters.tsx:56-62` : `span.pt-lead-chip` (44 px de haut, bordure d'accent) a le même rendu que le lien « N à revoir » mais n'est pas cliquable. Pas de suppression individuelle.

**F-D14 (MINOR) `input[type=month]` de l'entonnoir.**
`entonnoir/page.tsx:162,168` : sans sélecteur de mois sous Firefox / Safari bureau, le champ devient un texte libre sans indication de format (« 2026-10 »). Ajouter un `placeholder`/aide ou `pattern` + texte.

### Lot E : admin ops

**F-E1 (MINOR) h1 et h2 indiscernables sur `/admin/liens`.**
`liens/page.tsx:60-66` : `h1` « Liens de campagne » et `h2` « Générer un lien » portent la même classe `pt-heading` (24 px). Même schéma ailleurs (`Historique de modération` en h3 `pt-heading`, `avis/page.tsx`). Utiliser `pt-subheading` pour les niveaux inférieurs.

**F-E2 (MINOR) Cartes imbriquées.**
`avis/page.tsx` : chaque avis est un `li.pt-card` dans la `section.pt-card`, et `ReissueReviewLinkCard` (une `section.pt-card`) y est de nouveau imbriquée dans « Liens d'avis ». Double bordure, pas de profondeur (déjà relevé côté portail).

**F-E3 (MINOR) Lien d'avis réémis annoncé nulle part.**
`ReissueReviewLinkCard.tsx` : le panneau avec la nouvelle URL est monté d'un bloc, hors région live ; l'URL n'est affichée qu'une fois (« Cette adresse ne sera plus affichée »). Un lecteur d'écran ne sait pas qu'elle est apparue ; pas de focus sur le champ. Placer le focus sur le champ en lecture seule ou annoncer « Nouveau lien prêt ».

**F-E4 (MINOR) Texte développeur dans l'interface.**
`liens/page.tsx:151` : « Document de convention : docs/convention-utm.md » (chemin de dépôt). Pas de lien exploitable pour l'admin.

**F-E5 (MINOR) Contrôles du générateur de liens en angles droits.**
`links.css:31,81` : `border-radius: 0` alors que le reste de l'admin utilise 4 / 8 px (`pt-input` = 8 px). Probable incohérence visuelle.

**F-E6 (MINOR) E-mails : action en colonne `nowrap` (≥ 768 px).**
`admin.css:405-415` force `nowrap` sur « Statut » et « Action » ; le panneau de réactivation passe à la ligne (`inline.css:18`) mais élargit la colonne et peut pousser le tableau hors du conteneur **(vérifier à 768 / 1024 px)**.

### Transverses (C, D, E)

**F-X1 (MINOR) Champs d'invitation sans liaison d'erreur.**
`InviteForm.tsx` : une seule erreur globale dans une région live, aucun `aria-invalid` ni `aria-describedby` sur le champ fautif (nom, e-mail). `ConvertDialog.tsx` idem.

**F-X2 (MINOR) Étiquettes non stylées dans les formulaires de coûts.**
`CostForms.tsx` : `<label htmlFor>` sans classe (16 px encre) alors que le reste utilise `pt-label` / `pt-inline-label` (14 px atténué). `couts/page.tsx` : la ligne « Statut » du tableau est du texte brut.

**F-X3 (MINOR) Sélecteur segmenté (`.pt-seg`) : sélection peu visible.**
`funnel.css:35-65` : l'option choisie se distingue par une bordure gauche de 2 px et un fond `--bg-2` contre `--bg-3` (ratio ≈ 1,05 : 1) ; le radio natif est masqué (`opacity: 0`) et l'état repose sur `:has()`. Ajouter une coche ou un fond d'accent doux (`--acid-soft`).

**F-X4 (MINOR) Montants non alignés partout.**
`.pt-funnel-num` (entonnoir) est tabulaire mais pas mono ; `.pt-num` (pilotage) est mono. Deux styles de chiffres dans le même back-office.

**Contrastes calculés (jetons) : conformes.** Texte : `--ink` 15,6 : 1, `--ink-dim` 6,38 : 1, `--ink-faint` 4,84 : 1, `--warm` 6,24 : 1 sur `--bg-2` ; noir sur acide 16,5 : 1 ; `--warm` sur fond `warm 12 %` 5,4 : 1 ; anneau de focus acide 14,7 : 1. Non-texte : bordure de champ `--pt-border-strong` 3,54 : 1 (sur `--bg-2`) et 3,36 : 1 (sur `--bg-3`), au-dessus de 3 : 1. Cartes / séparateurs `--line` 1,14 : 1 : décoratif, mais les cartes se distinguent peu du fond.

**Points qui passent :** cibles 44 px généralisées (boutons, entrées, liens de table admin `admin.css:368-380`), `tabular-nums` sur les montants, `color-scheme: dark` (`globals.css:19`) donc contrôles natifs sombres, `autocomplete` correct sur le portail (`name`, `email`, `tel`, `billing …`, `one-time-code`), `autocomplete="off"` volontaire dans l'admin, focus visible global acide, mouvement réduit, états vides / erreur présents sur chaque liste admin, `ConfirmAction` uniforme.

---

## 3. CHECKLIST navigateur (rien à modifier en base)

Compte portail : client de test permanent « Test E2E Sèvalys » ; compte admin : contact@sevalys.com. Viewports : **360×740**, **390×844**, **768×1024**, **1024×768**, **1280×800** (+ zoom navigateur 200 % à 1280, et texte agrandi). Émuler `prefers-reduced-motion` une fois. Un passage clavier seul (Tab / Maj+Tab / Entrée / Échap) par lot. Pour chaque écran : défilement horizontal du `body` ? éléments coupés ? focus visible ?

États qu'on peut provoquer sans rien modifier : réseau « Slow 3G » (état chargement), « Hors ligne » (erreurs d'actions : téléchargement, upload, paiement avant redirection, recharger), UUID invalide dans l'URL, `?page=999`, filtres sans résultat, URL inconnue.

### Lot C : portail client (`/espace-client`)

| # | Route / action | Viewports | À vérifier |
|---|---|---|---|
| C1 | `/espace-client` (projet actif) | 360, 768, 1280 | Panneau « En attente de » : texte exact selon l'étape (F-C1) ; bouton présent ou non ; « vous » en minuscule au bon endroit ; « Depuis 0 jour » (F-C12) ; hiérarchie H1 32 px / nom 24 px ; carte Interlocuteur plus étroite (F-C10) ; cartes toutes dans un `pt-card`. |
| C2 | Frise d'avancement | 360 | Marqueurs, connecteur, badge « En cours », lisibilité des 6 étapes, date « depuis le… ». |
| C3 | Onboarding (si incomplet ou « Modifier » dans `details`) | 360, 768 | Libellés 14 px, grille 1 colonne/2 colonnes, relecture société (code forme juridique, F-C5), progress, marqueur du `summary` (`pt-btn-text` en `inline-flex` : pas de flèche d'ouverture), cibles 44 px des radios TVA / cases, saisie d'un champ invalide puis sortie : l'erreur s'affiche-t-elle et est-elle annoncée (F-C4) ? Tab dans le bloc sans enregistrement parasite ; autocomplétion mobile du navigateur. |
| C4 | « Compléter mes informations » | 360 | Défilement vers `#onboarding`, focus sur le titre, marge de défilement, pas de saut sous l'en-tête. |
| C5 | Fichiers : choisir un fichier trop gros / type refusé (annuler avant envoi) | 360 | Message d'erreur dans la région live, table en cartes, noms de fichier longs. Ne rien téléverser. |
| C6 | Consentement de présentation | 360 | Case 24 px, bouton désactivé (lisibilité à 50 %), retrait d'accord sans confirmation (observation seule, ne pas valider). |
| C7 | `/espace-client/documents` | 360, 768, 1280 | Cartes mobiles (étiquettes mono, 2 actions par ligne), tableau ≥ 768 px, badges de statut avec icône, tri « à signer » en premier, titre h1 + h2 de groupe seulement si plusieurs projets. |
| C8 | `/espace-client/documents/<id>/signer` (document « à signer » si existant) | **360**, 390, 768 | Étapes, iframe PDF (hauteur 480 px, piège de défilement, F-C3), lien « Ouvrir dans un nouvel onglet », cases de consentement (cibles 44 px, focus), barre collante : recouvre-t-elle le texte ? clavier virtuel ouvert (F-C2) ; échéance du code ; **ne pas** envoyer de code. Documents `acceptance` : checklist complète à 360 px, résumé collant / barre collante (F-C2). |
| C9 | `/espace-client/documents/abc/signer` (UUID invalide) et un UUID valide inconnu | 360 | 404 portail : en-tête, déconnexion, liens de retour ; pas de Navbar publique (thème 1). |
| C10 | `/espace-client/paiements` | 360, 768, 1280 | Carte « À régler » (montant 24 px, bouton 48 px sur mobile), plusieurs factures (F-C8), colonne Montant alignée en-tête / cellule (F-C7), note TVA, avoirs. **Ne pas** cliquer « Payer » (redirection Stripe). |
| C11 | `/espace-client/paiements?retour=annule&facture=<uuid d'une facture réelle>` puis `?retour=succes&…` | 360 | Bandeau : focus sur le titre, annonce, bouton « Fermer » (efface les paramètres), polling (sans paiement réel, état « confirmation en cours »), `facture` inconnue = rien (F-C9). |
| C12 | Navigation Projet / Documents / Paiements | 360 | Onglets sur une ligne, `aria-current`, déconnexion visible dans l'en-tête, nom du client tronqué. |
| C13 | `/espace-client/inexistant` | 360 | 404 racine publique ou privée ? (thème 1). |
| C14 | Chargement (Slow 3G) puis erreur (hors ligne + `Réessayer`) | 360 | `loading.tsx` : titre « Espace client » qui change, absence de nav (thème 1). |
| C15 | Passage clavier + lecteur d'écran (si possible) | 360 | Lien « Aller au contenu » en premier, ordre de tabulation, focus visible, annonces (région live vide montée), table mobile (F-C8). |

### Lot D : admin pilotage (`/admin…`)

| # | Route / action | Viewports | À vérifier |
|---|---|---|---|
| D1 | `/admin` | 360, 768, 1280 | Nav sur 2 rangées (thème 2), lien d'évitement, « À traiter » : 1 / 2 colonnes, libellés complets, tuiles indisponibles, destinations de clic (F-D10), formulaire d'invitation (champs, aide, SIRET : ne rien soumettre ; saisir un SIRET fictif pour voir les états Recherche / non trouvé), tableau Clients en cartes mobiles, pager. |
| D2 | `/admin/leads` | 360, 768, 1280 | Filtres (selects, case, boutons), puces actives (F-D13), table en cartes mobiles, badge « Hors convention », pager ; `?statut=new`, `?retours=1`, `?statut=xxx` (ignoré), `?page=999` (vide + message). |
| D3 | Pastille de statut (ouvrir le menu **sans choisir**) | 360, 768, 1280 | Position du menu dans la table (coupé ? recouvre ?), clic extérieur, Échap, clavier haut/bas, mobile = statique (`leads.css:325-331`). Ouvrir « Perdu » : panneau, radios 44 px, textarea ; annuler. Ne pas valider. |
| D4 | `/admin/leads/<id>` | 360, 768, 1024, 1280 | En-tête (pastille, badges, bouton Convertir désactivé + motif visible, ligne qui se replie sur 360), grille 2fr/1fr à 1024, journal, cartes latérales, « Effacer les données » : ouvrir le panneau (ne pas confirmer), bouton « Effacer définitivement » désactivé tant que la saisie ne correspond pas. Dialogue « Convertir en client » (ouvrir, vérifier focus, Échap, largeur 360, **ne pas soumettre**). |
| D5 | `/admin/entonnoir` | **360**, 768, 1280 | Contrôles (`.pt-seg`, sélection visible, F-X3), mois (champ natif, F-D14), tuiles KPI avec grands nombres (F-D3), défilement horizontal du tableau, 1re colonne collante (F-D4), badge « Hors convention », « Saisir / Modifier » le coût : ouvrir le panneau (ne pas enregistrer), état vide, `?par=` invalide. |
| D6 | `/admin/projets` | 360, 768, 1280 | Tri impossible sur mobile (F-D9), filtres, badges « Client / Sèvalys / Dormant », colonne « Depuis », pager « Page x sur y », `?etape=…&blocage=…`, vide filtré. |
| D7 | `/admin/projets/<id>` | **360**, 768, 1024, 1280 | Longueur de page, ordre des sections, `Timeline` admin, `<select>` de `PostFactForm` (style, 44 px, F-D8), avertissement « en avance », journal des faits : ouvrir « Invalider ce fait » (panneau en flux, Échap, focus de retour ; ne pas valider), `FilesPanel`, Documents / Facturation (formulaires à lignes : grille 5 colonnes à 641-900 px, iframe d'aperçu 480 / 720), `PanelUnavailable`, cartes latérales, Relances (ouvrir la confirmation, ne pas valider), lien d'avis. |
| D8 | `/admin/projets/abc` (UUID invalide) et UUID valide inconnu | 360 | 404 admin avec nav (thème 1). |
| D9 | `/admin/pilotage` | **360**, 768, 1024, 1280 | Contrôles (période / montants / tests), message TVA, KPI (F-D3) et débordement de montants, `SourceTable`, **`ProjectMarginTable` (8 colonnes, F-D2) à 768 / 1024 / 1280 : coupé ?** `DetailPanel` en ouvrant un détail (`?detail=…`), graphique de trésorerie (lisibilité à 360, texte 14 px dans un viewBox mis à l'échelle, `<title>/<desc>`), tableau mensuel, alignement des montants (mono, droite). |
| D10 | `/admin/pilotage/couts` | 360, 768, 1280 | Formulaires en flux (`pt-inline-panel`, grille 2 colonnes → 1), tableau « Charges récurrentes » (8 colonnes, F-D2), « Invalider ce coût… » / « Arrêter cette charge… » : ouvrir la confirmation (ne pas valider). |

### Lot E : admin ops

| # | Route / action | Viewports | À vérifier |
|---|---|---|---|
| E1 | `/admin/avis` | 360, 768, 1280 | Carte par avis : méta sur une ligne qui se replie, extrait de 2 lignes (`line-clamp`), « Détails et historique » (h3 24 px, F-E1), cartes imbriquées (F-E2), « Masquer cet avis… » : ouvrir le `<dialog>` (largeur 360, focus piégé, Échap, `select`), **ne pas valider**. Section « Liens d'avis » : « Réémettre le lien d'avis… » ouvrir sans confirmer. |
| E2 | `/admin/emails` | 360, 768, 1024 | Tableau en cartes mobiles ; ≥ 768 : colonne Action `nowrap` + panneau de réactivation (F-E6) ; « Réactiver cette adresse… » ouvrir sans confirmer ; vide / `?page=999`. |
| E3 | `/admin/liens` | **360**, 768, 1280 | Générateur : champs 44 px, angles droits (F-E5), message d'aide, résultat (URL en mono qui se replie), bouton « Copier » (annonce « Lien copié »), erreurs de convention ; tableaux de convention en cartes (le conteneur `.pt-link-scroll` n'est plus utile) ; chemin `docs/convention-utm.md` (F-E4). Remplir le générateur ne modifie rien. |

### Transverses à confirmer partout

1. Aucun défilement horizontal de page (le `body` masque le débordement : tester en inspectant `document.documentElement.scrollWidth` vs largeur, ou en mettant `overflow-x: visible` dans les DevTools sans rien enregistrer).
2. Ordre de focus après ouverture / fermeture de chaque panneau (retour au déclencheur) ; Échap partout.
3. Cibles 44 px : mesurer les liens inline des tableaux, `summary`, puces.
4. Lecture des annonces `aria-live` (au moins une passe NVDA ou VoiceOver) sur : onboarding (F-C4), paiements, pastille de statut, Pager, copie du lien de campagne.
5. Texte agrandi 200 % à 1280 px : tableaux et KPI (F-D3).
6. Aucune requête réseau n'est déclenchée par ces vérifications (pas d'envoi de code, de paiement, de téléversement, de confirmation d'action).

---

## 4. Résumé

- Sur les 10 thèmes du SUMMARY : 6 corrigés avec résidus (1, 2, 3, 7, 9, 10), 1 largement corrigé (8), 1 partiel avec régression de sens (6), 2 hors périmètre (4, 5).
- 0 BLOCKER démontrable par le code. 10 MAJOR dont 6 à confirmer à l'écran (F-C2, F-C3, F-D2, F-D3, F-D4, F-D6) ; F-C1, F-C4, F-D1, F-D5 sont certains par le code.
- Plus gros risque produit : F-C1 / F-D1. La correction du libellé « qui attend » (steps 2-3-5-6) est devenue fausse dans l'autre sens, et l'admin ne voit plus les devis à émettre.
- Plus gros risque visuel : montants et tableaux larges (F-D2, F-D3, F-D4) et barres collantes empilées du PV (F-C2) à 360 px.
- Accessibilité : erreurs d'onboarding non annoncées (F-C4), menu de statut ARIA invalide et focus perdu (F-D6), boutons répétés sans contexte (F-C8).
- Contrastes calculés conformes (texte ≥ 4,59 : 1 partout, bordures de champ ≥ 3,36 : 1).
- Cohérence des confirmations : un seul motif sauf `LostPanel`, `PostFactForm`, retrait d'accord client.
- Checklist : 15 vérifications C, 10 D, 3 E, plus 6 contrôles transverses ; aucune ne modifie de donnée.
