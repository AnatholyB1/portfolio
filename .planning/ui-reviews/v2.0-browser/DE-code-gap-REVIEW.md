# Relecture code des points admin non vérifiés au navigateur (lots D et E)

HEAD `d94cf62`, lecture seule, aucun navigateur. Les largeurs sont calculées à partir du CSS (`portal.css`, `admin.css`, `funnel.css`, `pilotage.css`, `inline.css`), avec les hypothèses suivantes, à confirmer à l'écran si un doute subsiste :

- JetBrains Mono : chasse 0,6 em (8,4 px à 14 px, 9,6 px à 16 px, 19,2 px à 32 px).
- En-têtes de tableau : mono 14 px, majuscules, `letter-spacing: 0.08em`, soit 9,52 px par caractère, plus 32 px de padding.
- Montants : `formatEuros` (`src/lib/documents/money.ts:43-49`) insère des **espaces insécables** (U+00A0, vérifié à l'octet) entre les milliers et avant « € ». `Intl.NumberFormat('fr-FR')` fait de même (U+202F / U+00A0). Un montant est donc **un seul mot, sans point de retour à la ligne possible**.
- Gabarit : `.pt-main` admin 1120 px max, gouttières 16 px (< 768) puis 32 px ; `.pt-card` padding 24 px + bordure 1 px. Largeur utile d'une carte : `V - 64 - 50` px (V ≥ 768), `V - 32 - 50` (V < 768), plafonnée à 1006 px à partir de V ≈ 1135.

## Tableau de verdicts

| Finding | Verdict | Sévérité retenue |
|---|---|---|
| F-D1 vue « à émettre » invisible | **Confirmé** (par le code), portée précisée : régression introduite seulement sur les étapes 2 et 3 | MAJOR |
| F-D5 enregistrer un fait sans confirmation | **Confirmé**, aggravé (e-mail client non annoncé avant ; invalidation envoie aussi un e-mail sans le dire) | MAJOR |
| F-D7 `LostPanel` | **Confirmé**, plus un défaut de focus | MINOR (focus : MAJOR clavier) |
| F-D8 `<select>` « Fait à enregistrer » | **Confirmé**, plus grave que prévu (contrôle sans bordure ni fond) | MAJOR |
| F-E3 lien d'avis réémis | **Confirmé** (focus perdu, URL non annoncée) | MAJOR (a11y) |
| F-X1 liaison d'erreur des champs d'invitation | **Confirmé**, aggravé (message faux pour un e-mail invalide) | MAJOR |
| F-D2 « Marge par projet » | **Confirmé par calcul** (casse à tous les viewports si un montant ≥ 10 000 €) | MAJOR |
| F-D3 tuiles KPI | **Confirmé, et pire que mesuré** : les montants insécables débordent au lieu de passer à la ligne ; risque d'élargissement de la grille | MAJOR |
| Graphique de trésorerie | **Trois défauts confirmés** (étiquettes d'axe rognées, texte illisible sous ≈ 690 px, boîte de 240 px) | MAJOR (mobile et tablette) |
| Panneau « Réémettre le lien d'avis » | Confirmation correcte à l'ouverture, **défaut à la réussite** | voir F-E3 |
| Panneau « Réactiver cette adresse » | Confirmation correcte à l'ouverture, **message de succès jamais annoncé, focus perdu** | MINOR/MAJOR (a11y) |
| « Invalider ce fait » | **Aucune gestion du focus**, description incomplète | MAJOR (a11y) |

---

## F-D1 : le modèle « qui attend » est faux dans les deux sens

### État du modèle

`src/lib/projects/steps.ts`, champ statique `waitingOn` par étape :

| Étape | Ligne | Valeur actuelle | Avant `fe0b1f7` | Vérité métier |
|---|---|---|---|---|
| 1 Onboarding | 60 | client | client | client |
| 2 Cadrage et devis | 68 | client | admin | Sèvalys jusqu'à l'émission du devis, puis client |
| 3 Contrat et acompte | 76 | client | admin | Sèvalys (émettre le contrat), client (signer), Sèvalys (émettre la facture d'acompte), client (payer) |
| 4 Production | 84 | admin | admin | Sèvalys |
| 5 Recette | 92 | client | client | Sèvalys (émettre le PV), puis client (signer) |
| 6 Livraison et solde | 100 | client | client | Sèvalys (émettre la facture de solde), puis client (payer) |

Correction du constat de départ : `git show fe0b1f7` ne retourne que **les étapes 2 et 3** (admin vers client). Les étapes 5 et 6 étaient déjà « client » dans le commit d'origine `d3f62e5`. Le défaut est donc double : une **régression** sur 2 et 3, et un défaut **historique** non corrigé sur 5 et 6. Aucune valeur statique ne peut être juste, parce que le côté qui attend dépend de l'existence d'un document ou d'une facture, pas du seul fait.

Un document inséré dans `sv_project_documents` est par construction « émis » (pas de statut brouillon : `documentStatus` ne renvoie que `to_sign`, `signed`, `paid`, `to_pay`, `issued`, `replaced`, `src/lib/documents/status.ts:7-22`). Donc « à émettre » équivaut à « aucun document (ou facture) signable en attente alors que la porte courante en exige un ».

### Trace par sous-état (ce que voit chaque surface)

`WhoWaits.tsx:18-20` affiche « En attente de / vous » dès que `state.waitingOn === 'client'`, et n'affiche un bouton que si `buildClientActions` en renvoie un (`clientActions.ts:26-61` : document `to_sign`, facture `to_pay`, ou onboarding incomplet). Côté admin : `classifyProject` pousse `client` ou `admin` selon le champ statique (`blocking.ts:56-57`), le badge de `ProjectsTable.tsx:42` et la fiche (`projets/[id]/page.tsx:150,181`) font de même ; la file « À traiter » ne lit que `documentsToSign` (documents émis non signés) et `overdueInvoices` (`workQueue.ts:64,107`).

| Sous-état | Vérité | Portail client (WhoWaits) | Filtre admin / badge | « À traiter » |
|---|---|---|---|---|
| 2a : aucun devis émis | Sèvalys | « vous », texte « Signez votre devis dès qu'il est disponible », **aucun bouton** : faux | « Client », exclu de `blocage=admin` : faux | silencieuse : faux |
| 2b : devis émis, non signé | client | « vous » + bouton « Signer le devis » : juste | « Client » : juste | tuile « 1 document en attente de signature » : juste (information) |
| 3a : devis signé, contrat non émis | Sèvalys | « vous », « Signez votre contrat… », aucun bouton : faux | « Client » : faux | silencieuse : faux |
| 3b : contrat à signer | client | bouton signer : juste | « Client » : juste | tuile documents : juste |
| 3c : contrat signé, facture d'acompte non émise | Sèvalys | « vous », « réglez l'acompte », aucun bouton : faux | « Client » : faux | silencieuse : faux |
| 3d : facture d'acompte à payer | client | bouton payer : juste | « Client » : juste | tuile factures en retard seulement si échue |
| 4 : production | Sèvalys | « Sèvalys » : juste | « Sèvalys » : juste | n/a |
| 5a : production terminée, PV non émis | Sèvalys | « vous », « Vérifiez le résultat » alors qu'il n'y a rien à vérifier : faux | « Client » : faux | silencieuse : faux |
| 5b : PV à signer | client | bouton : juste | « Client » : juste | tuile documents : juste |
| 6a : facture de solde non émise | Sèvalys | « vous », « Réglez le solde », aucun bouton : faux | « Client » : faux | silencieuse : faux |
| 6b : facture à payer | client | bouton : juste | « Client » : juste | selon l'échéance |
| Terminé | personne | « Rien, votre projet est livré » : juste | « Terminé » : juste | n/a |

Conséquence : le filtre « Attend Sèvalys » (`/admin/projets?blocage=admin`) ne montre jamais que l'étape 4. Tout le travail d'émission (4 documents ou factures par projet) est invisible pour l'admin, et le client reçoit une consigne d'action sans objet. Le tri par défaut (`blocking.ts:81`, `groupRank`) range lui aussi les projets « admin » en tête, donc le travail d'émission n'est pas remonté non plus.

Autre signal : la fixture de `blocking.test.ts:19-20` encode encore l'ancien modèle (`step === 1 || step >= 5 ? 'client' : 'admin'`, donc 2 et 3 « admin »), alors que `steps.test.ts:37` fige le nouveau (`['client','client','client','admin','client','client']`). Les deux suites passent, ce qui prouve que rien ne teste la cohérence des deux.

Défaut secondaire dans la même zone : `documentsToSign` (`workQueue.ts:64-77`) compte tout document signable sans ligne dans `sv_document_signatures`. Un fait posé à la main (`PostFactForm`, avertissement « Ce fait a déjà été posé par une signature électronique » dans `copy.ts:391`) ferme l'étape sans créer de ligne de signature : le document reste compté « à signer » indéfiniment. Probable, non vérifié en base.

### Correctif minimal proposé

Garder `STEPS[].waitingOn` comme valeur nominale (les tests `steps.test.ts:37` et `clientActions.test.ts:24-25` restent valides) et ajouter une fonction pure qui l'affine avec ce que chaque appelant sait déjà.

1. `src/lib/projects/steps.ts` : ajouter

```ts
const PREPARING: Partial<Record<StepIndex, string>> = {
  2: "Nous préparons votre devis. Vous recevrez un e-mail dès qu'il est disponible.",
  3: "Nous préparons votre contrat ou la facture d'acompte. Vous recevrez un e-mail dès qu'il est disponible.",
  5: 'Nous préparons le procès-verbal de recette. Vous recevrez un e-mail dès qu\'il est disponible.',
  6: 'Nous préparons votre facture de solde. Vous recevrez un e-mail dès qu\'elle est disponible.',
};

/** Affine le côté qui attend aux étapes 2, 3, 5, 6 : au client seulement s'il a un document à signer ou une facture à payer. */
export function resolveWaiting(state: ProjectState, pending: { toSign: number; toPay: number }): ProjectState {
  if (state.done || state.currentStep === null) return state;
  const text = PREPARING[state.currentStep];
  if (!text) return state; // étapes 1 et 4 : valeur statique juste
  return pending.toSign + pending.toPay > 0 ? state : { ...state, waitingOn: 'admin', expectedAction: text };
}
```

2. Portail `src/app/espace-client/page.tsx:108-125` : les deux listes sont déjà calculées ; appliquer `resolveWaiting` sur `state` avant `buildClientActions` et `WhoWaits`. **Ne pas** l'appliquer si le chargement des factures a levé `InvoicesLoadError` (sinon une panne de lecture afficherait « Nous préparons votre facture »). Conserver le texte statique dans ce cas.
3. Admin liste `src/lib/server/projects/read.ts:289-314` : charger `loadDocumentsForProjects(rls, ids)` et `loadInvoicesForProjects(rls, ids)` (chargeurs en lot déjà présents), calculer `toSign` (via `withStatuses(docs, facts)`, statut `to_sign`) et `toPay` par projet, appliquer `resolveWaiting` avant `classifyProject`. `loadDocumentsForProjects` renvoie `[]` en cas d'erreur (`read.ts:75-78`), ce qui ferait basculer à tort tous les projets en « Sèvalys ». Faire remonter l'erreur (ou un indicateur) et conserver le côté statique en cas d'échec.
4. Fiche projet admin `projets/[id]/page.tsx:150,181` : même appel (la page charge déjà documents et factures).
5. Le courriel `step_changed` (`facts.ts:92-111`) garde `expectedAction` statique : acceptable, car il part au moment où la porte se ferme, juste avant l'émission suivante.
6. Suite optionnelle : une tuile « Projets à préparer » dans « À traiter » (`workQueue.ts`) avec lien `/admin/projets?blocage=admin`, calculée avec la même fonction.

Coût : 2 requêtes supplémentaires sur la liste admin (volume actuel négligeable). Limite connue : `.in('project_id', ids)` en GET PostgREST, à surveiller au-delà de quelques centaines de projets.

### Test de caractérisation vitest (à copier, ne pas écrire dans `src/` depuis ce rapport)

À placer dans `src/lib/projects/waiting.characterization.test.ts`. Les deux premiers blocs décrivent l'état actuel (ils passent aujourd'hui) ; le troisième décrit le comportement attendu et échoue tant que `resolveWaiting` n'existe pas.

```ts
import { describe, expect, it } from 'vitest';
import { classifyProject, filterProjects, type AdminProjectRow } from './blocking';
import { buildClientActions } from './clientActions';
import { deriveProjectState, type Fact, type FactType } from './steps';
// import { resolveWaiting } from './steps'; // après correctif

const NOW = new Date('2026-02-01T12:00:00.000Z');
const START = '2026-01-01T00:00:00.000Z';
let n = 0;
const fact = (type: FactType): Fact => ({
  id: ++n, type, targetFactId: null, actorKind: 'system', createdAt: `2026-01-0${Math.min(n, 9)}T00:00:00.000Z`,
});

const BY_STEP: Record<2 | 3 | 5 | 6, FactType[]> = {
  2: ['onboarding_completed'],
  3: ['onboarding_completed', 'quote_accepted'],
  5: ['onboarding_completed', 'quote_accepted', 'contract_signed', 'deposit_received', 'production_completed'],
  6: ['onboarding_completed', 'quote_accepted', 'contract_signed', 'deposit_received', 'production_completed', 'acceptance_signed'],
};

describe('F-D1 caractérisation : état actuel (sans aucun document ni facture)', () => {
  for (const step of [2, 3, 5, 6] as const) {
    it(`étape ${step} : le projet est classé « client » alors qu'aucun document n'est à signer`, () => {
      n = 0;
      const state = deriveProjectState(BY_STEP[step].map(fact), START);
      expect(state.currentStep).toBe(step);
      expect(state.waitingOn).toBe('client');
      expect(buildClientActions({ state, onboardingComplete: true, toSignDocs: [], toPayInvoices: [] })).toEqual([]);
      const { blockers } = classifyProject(state, START, NOW);
      expect(blockers).toContain('client');
      expect(blockers).not.toContain('admin');
      const row = { projectId: 'p', clientName: 'C', title: 'T', offer: 'vitrine', state, lastActivityAt: START,
        daysWaiting: 0, isDormant: false, blockers } as AdminProjectRow;
      expect(filterProjects([row], { blocage: 'admin' })).toHaveLength(0); // le travail d'émission est invisible
    });
  }
});

describe('F-D1 comportement attendu après correctif', () => {
  // décommenter avec resolveWaiting
  it.todo('étapes 2, 3, 5, 6 sans document à signer ni facture à payer : waitingOn === "admin" et bloqueur "admin"');
  it.todo('mêmes étapes avec un document to_sign ou une facture to_pay : waitingOn === "client" et un bouton principal');
  it.todo('étapes 1 et 4 et projet terminé : inchangés');
  it.todo('lecture des factures en échec : valeur statique conservée (pas de bascule en « Sèvalys »)');
});
```

---

## F-D5 : « Enregistrer le fait » sans confirmation

**Confirmé.** `PostFactForm.tsx:105` : `type="submit"` acide plein, `disabled={!current || pending}`, aucun récapitulatif. Seul `ahead` (`:38`, `:62-66`) prévient, uniquement quand le fait est « en avance ».

Ce que l'action déclenche (`facts.ts:125-146`, `:176`) : écriture irréversible dans le journal (append-only), puis, **si `before.currentStep !== after.currentStep`**, envoi d'un e-mail `step_changed` à tous les membres du client (`notifyStepChange`, `:78-113`). Les règles précises :

- Un fait « en avance » : aucun e-mail, l'étape ne bouge pas.
- Un fait qui ferme la porte courante : l'étape avance **et** un e-mail part, avec la consigne de l'étape suivante.
- Étape 3 (deux faits) : le premier fait (`contract_signed`) n'envoie rien, le second oui. L'admin ne peut pas le deviner.
- L'invalidation est possible a posteriori, mais l'e-mail est déjà parti.

Aggravants :

1. `RevokePanel.tsx:46-48` passe par `ConfirmPanel` (donc une confirmation existe), mais `PROJECT_COPY.facts.revokeBody` (`copy.ts:58-59`) dit seulement « l'étape sera recalculée ». Or `revokeProjectFact` emprunte le même `post` : si l'étape recule, **le client reçoit un e-mail `step_changed` pour l'étape précédente**. La confirmation la plus grave tait sa conséquence la plus visible.
2. Le champ `note` n'est jamais remis à zéro après un succès (`PostFactForm.tsx:32`, aucun reset) : le motif du fait précédent reste prérempli pour le suivant.
3. Le message de succès (« Fait enregistré. L'étape est maintenant X ») reste affiché pendant la saisie du fait suivant.

**Correctif minimal** : calculer côté client si le fait fait avancer l'étape, avec le moteur pur déjà présent :

```ts
const next = current && deriveProjectState([...facts, { id: Number.MAX_SAFE_INTEGER, type: current,
  targetFactId: null, actorKind: 'admin', createdAt: new Date().toISOString() }], '1970-01-01T00:00:00Z');
const advances = current !== '' && next.currentStep !== deriveProjectState(facts, '1970-01-01T00:00:00Z').currentStep;
```

Puis remplacer le bouton par `ConfirmAction` (`triggerLabel="Enregistrer le fait…"`, `confirmLabel="Confirmer l'enregistrement"`, `keepLabel="Revenir au formulaire"`, `description` = « Étape suivante : X. Un e-mail sera envoyé au client. » ou « Aucun e-mail : le fait est en avance »), avec `projectId`, `type` et `note` en champs cachés dans les `children` (le `<select>` et la zone de texte sortent du `<form>` pour éviter l'imbrication). Il faut ajouter à `ConfirmAction` une prop `triggerDisabled`. Mettre à jour `revokeBody` : « … Si l'étape recule, le client en est informé par e-mail. »

## F-D7 : `LostPanel`

**Confirmé.** `LostPanel.tsx:58` : « Marquer comme perdu » en `pt-btn-primary` (acide plein), `:62` « Annuler la perte » en `pt-btn-ghost`. Le motif ne suit pas `ConfirmPanel` (contour `--warm`, « Garder… » en premier, `ConfirmAction.tsx:15-18`). « Annuler la perte » se lit comme « défaire la perte ».

**Défaut de focus supplémentaire** (`StatusPill.tsx:98-108`) : l'élément « Perdu » du menu appelle `setOpen(false); setLostOpen(true)`. Le menu (et donc l'élément focalisé) est démonté, `LostPanel` n'a ni `autoFocus` ni `ref`, donc le focus tombe sur `<body>`. Un utilisateur clavier doit retabuler depuis le début du document pour atteindre le panneau. À la fermeture, le focus revient bien à la pastille (`:131-133`).

**Correctif** : remplacer par `ConfirmPanel` (`confirmLabel="Confirmer la perte"`, `keepLabel="Garder le statut actuel"`, `confirmDisabled={!reason}`) et focaliser le premier radio à l'ouverture.

## F-D8 : `<select>` « Fait à enregistrer » sans style

**Confirmé, et plus grave que le pré-audit.** `PostFactForm.tsx:51-63` : `<select>` sans classe dans `.pt-lead-form`. Les règles de `.pt-lead-form` (`leads.css:298-299`) ne ciblent que `input[type="text"]` et `textarea` ; aucune règle `select` ne couvre ce contexte (recherche sur tout le CSS : seule `.pt-lead-filters select`, `leads.css:163`, et `.pt-inline-panel select`, `inline.css:37`, existent). `globals.css:1` importe Tailwind : le preflight de Tailwind v4 pose `border: 0 solid`, `border-radius: 0`, `background-color: transparent`, `font: inherit` sur `select`. Le contrôle est donc un texte « Choisir un fait » avec la flèche native, **sans bordure ni fond**, d'environ 24 px de haut. Cela explique aussi F-E5 (champs de `/admin/liens` à angles droits, confirmé par le navigateur, `border-radius: 0`).

Seul le focus clavier est visible (`portal.css:566`). Pas de cible de 44 px, pas de repère visuel du champ : c'est le contrôle principal de la fiche projet.

**Correctif (une ligne)** : ajouter `.pt-admin .pt-lead-form select` aux sélecteurs `leads.css:298` (et au `:focus-visible` `:310`), ou réutiliser la règle de `.pt-lead-filters select` (`leads.css:163-172`).

## F-E3 : lien d'avis réémis

**Confirmé.** `ReissueReviewLinkCard.tsx:60-99` :

- Déclenchement : `ConfirmAction` (déclencheur avec `aria-expanded` et `aria-controls`, focus sur le `textarea` à l'ouverture, Échap qui rend le focus au déclencheur : correct).
- Réussite : `state.ok && state.url` bascule le rendu vers `<div className="pt-inline-panel">` (`:68-84`). Le `ConfirmAction` (et sa région `.pt-confirm-live`, `ConfirmAction.tsx:163-165`) est démonté d'un bloc. Le bouton « Confirmer la réémission » qui avait le focus disparaît : le focus tombe sur `<body>`.
- Le panneau d'URL est monté déjà rempli, hors région live : aucune annonce « nouveau lien prêt ». Le texte « Cette adresse ne sera plus affichée » est donc lisible uniquement par un utilisateur qui la découvre à l'œil.
- `aria-live` du « Lien copié » (`:81`) est monté avec le panneau : correct pour le texte qui apparaît ensuite.
- Détail : `className="pt-input pt-inline-readonly"` sans `type` ne bénéficie pas de la règle `input[type="text"]` d'`inline.css:35`.

**Correctif** : `ref` sur le panneau avec `tabIndex={-1}` et `useEffect(() => ref.current?.focus(), [state.ok])`, ou focus sur le champ en lecture seule (sélectionné), et `role="status"` sur un paragraphe « Nouveau lien prêt, valable 60 jours ».

## F-X1 : champs d'invitation

**Confirmé, et le message est faux dans un cas courant.** `InviteForm.tsx:57` pose `noValidate` : aucune validation native. Côté serveur, `inviteSchema` rejette un e-mail invalide ou un nom vide (`inviteSchema.ts:22-23`) avec le code `invalid`, et `actions.ts:55-60` renvoie alors `INVITE_COPY.generic` quand le SIRET est valide : « Une erreur est survenue. Réessayez dans un instant ou écrivez à contact@sevalys.com. » (`inviteSchema.ts:48`). L'admin qui fait une faute de frappe dans l'adresse reçoit donc un message qui suggère une panne. Aucun `aria-invalid` ni `aria-describedby` sur `name` et `email` (`InviteForm.tsx:88-113`).

Dans `inviteClientAction`, un envoi d'e-mail qui échoue après création renvoie aussi `generic` (`actions.ts:38-41`) : un second essai donne « Cette adresse est déjà associée à un client ». À noter pour la suite, hors périmètre de la relecture.

`ConvertDialog.tsx` est mieux construit (`aria-labelledby`, `aria-describedby`, `role="alert"` à `:119`, focus initial `:53`), mais je n'ai pas relevé de liaison champ par champ.

**Correctif** : message précis par champ (« Adresse e-mail invalide », « Nom requis »), `aria-invalid`, `aria-describedby` et focus sur le premier champ fautif.

## F-D2 : tableau « Marge par projet »

Tableau à 8 colonnes (`ProjectMarginTable.tsx:28-46`), classes `pt-table pt-admin-table pt-pilot-table`, sans conteneur à défilement. À partir de 768 px :

- `admin.css:405-411` : `.pt-admin-table th { white-space: nowrap }`.
- `pilotage.css:36-41` : `th.pt-num, td.pt-num { white-space: nowrap; text-align: right }`.
- `globals.css:52` : `overflow-x: hidden` sur `body` : tout débordement est **coupé sans barre de défilement**.

Largeurs minimales (en-têtes nowrap, padding 32 px) :

| Colonne | En-tête | Cellule monétaire (n caractères x 9,6 px + 32) |
|---|---|---|
| Signé | 80 | 8 car. : 109 ; 10 car. : 128 ; 11 car. : 138 ; 12 car. : 147 |
| Facturé | 99 | idem |
| Encaissé | 108 | idem |
| Coûts | 80 | idem |
| Marge | 80 | idem |
| Reste à facturer | **184** | idem (l'en-tête domine) |
| Projet, Client | 89 chacun au minimum (le texte se replie mot à mot) | |

Largeur minimale du tableau (Projet et Client écrasés à 89 px) : 8 caractères (< 1 000 €) : **906 px** ; 10 caractères (1 000 à 9 999 €) : **1 002 px** ; 11 caractères (10 000 à 99 999 €) : **1 050 px** ; 12 caractères : **1 098 px**. Avec des noms de projet lisibles (≈ 160 px chacun), ajouter ≈ 140 px.

Largeur disponible : 648 px à 768 ; ≈ 895 à 1024 (scrollbar de 15 px) ; 1006 px maximum à partir de V ≈ 1135 (plafond de 1120 px).

Lecture :

- Tous les montants < 1 000 € : le tableau déborde de 768 jusqu'à **V ≈ 1035**.
- Montants entre 1 000 et 9 999 € : déborde jusqu'à **V ≈ 1130** au strict minimum, ≈ 1280 avec des noms lisibles.
- Montants ≥ 10 000 € : **déborde à tout viewport** (le plafond de 1006 px est inférieur au minimum de 1050 px). Cette situation est la plus probable en production dès que quelques devis sont signés.

La dernière colonne (« Reste à facturer », celle qui sert à relancer la facturation) est la première coupée. Le pied de tableau (`:80-91`) utilise `colSpan={6}` + 2 cellules = 8 colonnes : cohérent ; sous 768 px la dernière `<td />` vide devient un bloc vide de 16 px de padding (cosmétique).

`DetailPanel` (5 colonnes, `DetailPanel.tsx:11-17`) : minimum ≈ 615 px (type « facture ») contre 648 px à 768 px : limite, juste, sans marge pour un numéro de facture long. Le tableau des charges récurrentes (`couts/page.tsx:145-158`, 8 colonnes dont « Action » en nowrap avec formulaire de 240 à 360 px, `pilotage.css:171-175`) vaut environ 1 060 px fermé : déborde à tout viewport (estimation grossière, sans mesure des libellés).

**Correctif** : envelopper chacun dans `<div className="pt-funnel-scroll" role="region" aria-label="…" tabIndex={0}>` (classe déjà disponible, `funnel.css:111`, importée par la page pilotage) ; ou passer en cartes sous 1 100 px en élargissant la media query `portal.css:526` pour ces tables seulement. La même enveloppe règle N1 et N3 du rapport navigateur.

## F-D3 : tuiles KPI

`funnel.css:3-26` : grille `repeat(2, 1fr)` (4 colonnes à partir de 1024 px), tuile avec padding 16 px et bordure 1 px, valeur mono 32 px (19,2 px par caractère). **`1fr` vaut `minmax(auto, 1fr)`** et la tuile n'a pas de `min-width: 0`, donc une valeur insécable plus large que sa colonne **élargit la piste** au lieu de déborder proprement. Le rapport navigateur a mesuré un retour à la ligne en 3 lignes : il a simulé « 12 345,67 € » avec des espaces ordinaires. En production, `formatSignedEuros` produit des espaces insécables : **pas de retour à la ligne possible**.

Pilotage (7 tuiles, dans une carte, `PilotageKpis.tsx`) :

| Viewport | Largeur utile de valeur | Capacité en caractères | Résultat |
|---|---|---|---|
| 360 px (2 col.) | ≈ 97 px | 5 | **Tout montant déborde**, même « 0,00 € » (6 car., 115 px). Avec « 1 200,00 € » (192 px) : chaque tuile réclame 226 px, les deux pistes 468 px pour 278 px disponibles : la colonne de droite sort de l'écran (coupée par `overflow-x: hidden`) |
| 768 px (2 col.) | ≈ 282 px | 14 | Correct jusqu'à « 999 999,99 € » |
| 1024 px (4 col.) | ≈ 178 px | 9 | « 1 000,00 € » (10 car., 192 px) déborde |
| 1280 px et plus (4 col.) | ≈ 205 px | 10,7 | « 10 000,00 € » (11 car., 211 px) déborde de ≈ 6 px, « 100 000,00 € » (12 car.) de ≈ 25 px. Valable à tous les viewports ≥ 1135 |

Entonnoir (`FunnelKpis.tsx:15-22`) : « Coût par RDV (moyen) » = `formatEuroCents`, par exemple « 45,50 € » (7 car., 134 px) contre ≈ 97 à 115 px de valeur utile à 360 px : élargit la piste d'environ 20 à 70 px. « Non saisi » (avec espace ordinaire) se replie correctement.

**Correctif** : sur `.pt-funnel-kpi` ajouter `min-width: 0; container-type: inline-size;` et sur la valeur `font-size: clamp(18px, 13cqi, 32px)` (13 % de la largeur de la tuile pour tenir 12 caractères mono de 0,6 em), `overflow-wrap: anywhere` en dernier recours ; et passer la grille à `repeat(auto-fit, minmax(min(100%, 220px), 1fr))`.

## Graphique de trésorerie (`TreasuryChart.tsx`, `chartGeometry.ts`, `pilotage.css:60-71`)

Géométrie : `viewBox 0 0 720 240`, `preserveAspectRatio="xMidYMid meet"`, conteneur `width: 100%; height: 240px`, texte SVG de 14 px.

1. **Étiquettes d'axe vertical rognées** (`TreasuryChart.tsx:43-53`). Marge gauche 64 px, texte ancré en `x = 56` vers la gauche, soit 56 px disponibles ; une étiquette `formatSignedEuros(c)` fait au moins « 100,00 € » (8 car. x 8,4 = 67 px) et typiquement « 5 000,00 € » (84 px) ou « −12 000,00 € » (101 px). Le débordement sort du `viewBox`. Il n'est visible que dans les bandes de letterbox (largeur du conteneur supérieure à 720 px plus deux fois le débordement), soit pour V ≳ 900 px. En dessous (tablette, mobile) l'axe est coupé et lit « 00,00 € » à la place de « 5 000,00 € » : trompeur, pas seulement laid. `chartGeometry.test.ts` ne couvre pas la largeur des étiquettes.
2. **Texte illisible sur mobile**. Échelle = largeur / 720 : à 360 px (conteneur 278 px) le texte de 14 px est rendu à **5,4 px** ; à 768 px (654 px) à 12,7 px ; lisible (≥ 11 px) à partir d'un conteneur de ≈ 566 px, soit V ≈ 690 px. Pas de variante mobile.
3. **Boîte de 240 px, tracé de 93 px** à 360 px : le graphique est centré verticalement avec ≈ 73 px de vide au-dessus et au-dessous.
4. Accessibilité : `role="img"` + `aria-label` complet, `<desc>` mensuel et tableau mensuel de secours en dessous : bonne alternative. Les `<title>` des barres et points ne sont pas exposés dans un `role="img"` et inutilisables au toucher (information déjà dans le tableau). Contraste : barres `--ink-dim` sur `--bg`, ligne acide, segments `--warm` : conformes.
5. Le tableau mensuel (`:116-165`) utilise `.pt-pilot-num` nowrap et la mention « dont X en retard » : à vérifier avec des montants longs, non bloquant.

**Correctif** : marge gauche à 96 px (ou tick sans décimales : `formatEuros` sans « ,00 »), `height: auto` + `aspect-ratio` pour supprimer le vide, et sous 640 px masquer l'axe vertical (le tableau mensuel porte déjà les valeurs) ou rendre le SVG défilable horizontalement avec une largeur minimale de 560 px.

## Confirmations en ligne : focus et ARIA

Composants audités : `ConfirmAction.tsx` (motif partagé), `ReissueReviewLinkCard.tsx`, `LiftSuppressionForm.tsx`, `RevokePanel.tsx` + `FactJournal.tsx`, `RecurringRowActions.tsx` (même motif).

À l'ouverture via `ConfirmAction` (`Réémettre`, `Réactiver`, `Arrêter cette charge`, etc.) :

- Déclencheur : `aria-expanded` et `aria-controls` corrects (`:149-151`).
- Focus : première cible `textarea, select, input visible, [data-confirm-keep]` (`:115-119`) : correct, y compris sur « Garder… » quand le panneau n'a pas de champ.
- Échap : `ConfirmPanel` (`:78-83`) ferme et rend le focus au déclencheur (`keep()`), sauf pendant l'envoi : correct.
- « Garder… » est le premier bouton dans l'ordre DOM, confirmation en contour `--warm` : conforme à l'intention.

Lacunes communes :

1. **La phrase de conséquence n'est pas associée au contrôle focalisé.** `description` est un `<div className="pt-helper">` (`:73`) sans `id` ni `aria-describedby`. Un lecteur d'écran qui reçoit le focus sur le `textarea` entend « Détail (obligatoire…) » mais pas « l'ancien lien cesse de fonctionner immédiatement ». Le `<form>` n'a ni `role="group"` ni nom. Correctif : `aria-describedby` de la description sur le formulaire et `role="group" aria-labelledby` sur le déclencheur, ou description injectée dans le premier champ.
2. **Pendant l'envoi, le bouton focalisé devient `disabled`** (`:41-43`) : le focus reste sur un contrôle inerte, sans annonce. Préférer `aria-disabled` plus un message d'état.
3. **Après réussite, le focus est perdu** (le panneau se ferme par dérivation de rendu, `:131-135`, sans `triggerRef.current?.focus()`).

Cas particuliers :

| Panneau | Constat |
|---|---|
| Réémettre le lien d'avis | Voir F-E3 : composant démonté, focus et annonce perdus. |
| Réactiver cette adresse | `liftSuppressionAction` renvoie `Adresse réactivée.` et `revalidatePath` (`actions.ts:43-45`). La page rend alors `r.active ? <LiftSuppressionForm/> : EM_DASH` (`emails/page.tsx:105-107`) : le composant est **démonté dans la même passe**, donc le message de succès n'est jamais affiché ni annoncé, et le focus tombe sur `<body>`. La ligne change visuellement (« Réactivée le… »), rien n'est dit à un lecteur d'écran. Correctif : garder le composant monté (`active` en prop) et afficher le statut dans une région `role="status"` ; ou région live au niveau de la page alimentée par l'action. |
| Invalider ce fait | `FactJournal.tsx:69-84` remplace le bouton par `RevokePanel` (`ConfirmPanel` utilisé directement, sans la logique de focus de `ConfirmAction`). **À l'ouverture** le bouton focalisé est démonté : focus perdu sur `<body>`, aucun champ focalisé. **À la fermeture** (Garder, Échap, succès) `RevokePanel` est démonté et le bouton « Invalider ce fait » réapparaît sans focus. Le `aria-live` d'erreur (`RevokePanel.tsx:85-87`) est monté avec le panneau et fonctionne, mais le succès (`useEffect` qui appelle `onClose`, `:30-32`) démonte l'annonce. Description incomplète (voir F-D5). Correctif : réutiliser `ConfirmAction` (un déclencheur par fait, `defaultOpen` inutile) ou ajouter `ref` + focus dans `FactJournal`. |

---

## Compléments (hors liste)

- `ProjectsTable.tsx:76-96` et le rapport navigateur (F-D9) : le tri se fait par les `<Link>` d'en-tête masqués sous 768 px et restant focalisables sans repère. Un `<select>` « Trier par » sous 768 px règle le cas.
- `LostPanel` et `StatusPill` : le clic extérieur ne ferme pas le menu (confirmé au navigateur) ; `role="menu"` avec `<form>` intercalés reste invalide ARIA.
- Le texte client `PROJECT_COPY.blocage.client` = « Attend le client » et `admin` = « Attend Sèvalys » (`copy.ts:68-69`) sera juste une fois `resolveWaiting` en place.

## Ce qui reste non tranchable sans navigateur

- Les chiffres de largeur supposent la chasse 0,6 em de JetBrains Mono et l'absence de scrollbar réservée ; l'écart attendu est de quelques pourcents. Les seuils (906, 1002, 1050, 1098 px) sont assez éloignés des largeurs usuelles pour que la conclusion tienne.
- Le comportement exact de la grille `1fr` avec valeur insécable (élargissement de piste) découle de la spécification CSS Grid ; à confirmer en injectant un montant avec U+00A0 (pas un espace ordinaire) dans le DOM hydraté.
- `documentsToSign` surcompté après saisie manuelle d'un fait : probable, non vérifié en base.
