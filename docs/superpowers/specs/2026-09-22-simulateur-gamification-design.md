# Design Spec — Simulateur : icônes, échelle d'humeur, question budget, correctif mobile

**Date** : 2026-09-22
**Statut** : Approuvé
**Contexte** : Le simulateur diagnostic (`/simulateur`, Phase 7 — déjà livré et testé) a deux problèmes remontés par l'utilisateur : (1) le formulaire déborde sur mobile sur certains écrans étroits, (2) l'expérience est perçue comme trop austère — uniquement des boutons texte à choix multiple, aucune question sur le budget, aucun repère visuel pour les questions de ressenti.

---

## Périmètre

Dans le périmètre :
- Correctif du débordement mobile (bug, pas un choix de design)
- Cartes avec icônes Lucide sur les questions à choix (au lieu de boutons texte plats)
- Échelle d'humeur (icônes progressives) sur les 2 questions de ressenti/satisfaction
- Nouvelle question budget, rendue en slider à paliers (pas un slider double poignée)

Hors périmètre :
- Nouvelle dépendance (tout se fait avec `lucide-react`, déjà en dépendance, et CSS natif)
- Swipe-cards / interactions gestuelles
- Slider double poignée (min/max libre)
- Vrai modal/bottom-sheet séparé pour le budget (voir Composants → Rendu du budget)
- Tout changement au backend Phase 5 (`src/app/api/simulateur/route.ts`, `prospects-schema.ts`) — non modifiable

**Deux contraintes verrouillées découvertes pendant l'écriture du plan (confirmées avec l'utilisateur) :**
1. `translations.test.ts` (SIMU-06/SIMU-08) interdit tout symbole monétaire ou mot de prix (`€`, `$`, `£`, `฿`, "prix", "tarifs", "euros", "devis", "gratuit"...) n'importe où dans `t.simulateur`, toutes locales confondues — politique "jamais de prix affiché" déjà en place depuis la Phase 8. Les libellés de la question budget doivent donc être **qualitatifs, jamais numériques/monétaires** (voir section i18n, mis à jour).
2. `questions.test.ts` verrouille `QUESTIONS.length` entre 3 et 5 (D-02, décision Phase 7). Ajouter `budget` comme 6ᵉ question nécessite de faire passer cette borne à 6 **consciemment** — traité comme une extension délibérée de D-02, pas une régression, et documenté comme tel dans le test.

---

## Bug mobile — diagnostic

Deux causes identifiées dans `src/app/globals.css`, aucune règle `@media` de repli pour aucune des deux :

1. `.sim-rgpd .row { grid-template-columns: 180px 1fr; }` — sur un écran <400px, la colonne fixe de 180px ne laisse presque plus de place à la colonne de valeur ; une valeur non-sécable (email, date) déborde du cadre au lieu de passer à la ligne.
2. `.sim-q-text { font-size: 32px; }` — fixe, aucune réduction sur petit écran.

**Correctif :**
- `.sim-rgpd .row` : sous 480px, passe en une seule colonne (`grid-template-columns: 1fr`), clé au-dessus de la valeur.
- `.sim-q-text` : `font-size: clamp(22px, 6vw, 32px)` (remplace la valeur fixe, pas de media query supplémentaire nécessaire).
- `.sim-wizard` : padding 32px → 20px sous 480px, pour maximiser la largeur utile du contenu.

---

## Modèle de données (`src/lib/simulateur/questions.ts`)

Le fichier reste strictement libre de tout import React/DOM (contrainte documentée en tête de fichier) — les icônes y sont référencées par **nom** (string), jamais par composant.

```ts
export interface QuestionOption {
  value: string;
  weights: Partial<Record<ServiceSlug, number>>;
  severity?: number;
  icon?: string; // nom d'icône Lucide, ex. "Frown" — résolu dans icons.ts
}

export interface Question {
  id: string;
  type: 'single' | 'multi';
  variant?: 'cards' | 'mood' | 'range'; // défaut: 'cards'. Pilote UNIQUEMENT le rendu.
  options: QuestionOption[];
  showIf?: (answers: Answer[]) => boolean;
}
```

**Changements par question existante :**
- `secteur`, `frictions` : `variant: 'cards'` (implicite, pas de changement de weights/severity), chaque option gagne un `icon`.
- `priorite` : `variant: 'cards'` également — ce n'est PAS une question de ressenti (c'est un choix d'objectif : être trouvé / convertir plus / gagner du temps / changer d'image), donc pas une échelle mood. Icônes thématiques : `Target`, `TrendingUp`, `Clock`, `Palette`.
- `presence-en-ligne` ET `site-fiabilite` : `variant: 'mood'`. Ce sont les deux vraies questions "sentiment général" du simulateur — chacune est déjà une échelle Likert état/satisfaction dans le code existant (`presence-en-ligne` : inexistante→solide, sévérité 95→15 ; `site-fiabilite` : jamais-touché→suivi-régulier, sévérité 90→15), donc l'échelle Frown → Meh → Smile → PartyPopper (sévérité décroissante) s'applique naturellement aux deux. **Aucun changement de `weights`/`severity`** — uniquement l'affichage change.

**Nouvelle question `budget` :**

```ts
{
  id: 'budget',
  type: 'single',
  variant: 'range',
  options: [
    { value: 'budget-0-500',      icon: 'Coins',        weights: { 'site-vitrine': 2, maintenance: 2 } },
    { value: 'budget-500-1500',   icon: 'Wallet',        weights: { 'site-vitrine': 2, 'meta-ads': 1, 'community-management': 1 } },
    { value: 'budget-1500-3000',  icon: 'CreditCard',    weights: { 'rebranding-site-premium': 2, 'google-ads': 1, branding: 1 } },
    { value: 'budget-3000-plus',  icon: 'Landmark',      weights: { 'projet-sur-mesure': 3, 'rebranding-site-premium': 1 } },
  ],
  // Pas de `severity` — comme `secteur`, le budget ne mesure pas un besoin
  // non satisfait (même raisonnement que D-01/D-06, à documenter en
  // commentaire dans questions.ts).
}
```

Ajoutée à la fin de `QUESTIONS` (après `priorite`) — aucune dépendance `showIf`, toujours affichée.

**Impact vérifié sur le reste du pipeline (zéro changement requis) :**
- `scoring.ts` (`forEachSelectedOption`, `computeRecommendedServices`, `computeVisualScore`) : la réponse `budget` est une string d'option classique, elle traverse le même chemin générique que toutes les autres. Comme elle n'a pas de `severity`, elle est ignorée par `computeVisualScore` (cohérent avec `secteur`).
- `wizardSteps.ts` (`buildStepSequence`, `applicableQuestionIds`, `progressRatio`) : générique sur `QUESTIONS`, aucune modification. Le nombre total de questions passe de 5 à 6 — la barre de progression s'ajuste automatiquement.
- `submit.ts` / `prospects-schema.ts` (backend Phase 5) : `reponsesDiagnostic` est un `Answer[]` générique, `budget` s'y intègre sans modification de schéma.

---

## Composants

### `src/components/simulateur/icons.ts` (nouveau)

Seul point de couplage entre la donnée pure (`questions.ts`) et React :

```ts
import { Store, UtensilsCrossed, HardHat, Briefcase, HeartPulse, MoreHorizontal,
         PhoneMissed, TrendingDown, ImageOff, Wrench, Users, Repeat, CircleCheck,
         Target, TrendingUp, Clock, Palette,
         Frown, Meh, Smile, PartyPopper,
         Coins, Wallet, CreditCard, Landmark,
         type LucideIcon } from 'lucide-react';

export const SIM_ICONS: Record<string, LucideIcon> = {
  Store, UtensilsCrossed, HardHat, Briefcase, HeartPulse, MoreHorizontal,
  PhoneMissed, TrendingDown, ImageOff, Wrench, Users, Repeat, CircleCheck,
  Target, TrendingUp, Clock, Palette,
  Frown, Meh, Smile, PartyPopper,
  Coins, Wallet, CreditCard, Landmark,
};
```

Résolution dans `Wizard.tsx` : `const Icon = option.icon ? SIM_ICONS[option.icon] : null;` — un nom d'icône absent de la table est simplement ignoré (pas d'icône affichée), jamais une erreur de rendu.

### `Wizard.tsx` — rendu par variant

Nouvelle branche selon `question.variant` (défaut `'cards'` si absent) :

- **`'cards'`** : garde `.sim-option`, ajoute l'icône à gauche du label. Grille passe de 1 à 2 colonnes dès mobile (`.sim-option-icon-grid`, `grid-template-columns: 1fr 1fr`, options multi-lignes en pleine largeur si le texte déborde 2 colonnes — géré par CSS, pas de logique JS supplémentaire).
- **`'mood'`** : rangée horizontale de 4 boutons icône+label court (`.sim-mood-row`), cibles tactiles ≥44px, sélection = anneau `--acid` autour de l'icône plutôt qu'un fond de carte plein.
- **`'range'`** : un seul `<input type="range" min={0} max={options.length - 1} step={1}>`. Le libellé du palier courant s'affiche en grand au-dessus (`t.simulateur.questions.budget.options[value]`), mis à jour sur `onInput` (pas seulement `onChange`) pour un retour visuel immédiat pendant le drag — reprend l'esthétique carte sombre + gros handle du screenshot de référence, mais **inline dans l'étape**, pas dans un overlay séparé.

**Décision actée sur le "drawer"** : pas de vrai modal/bottom-sheet. L'étape budget est déjà plein écran sur mobile comme toutes les étapes du wizard ; un drawer par-dessus ajouterait de la complexité (focus trap, z-index, fermeture) sans bénéfice UX supplémentaire. Seule l'esthétique visuelle du screenshot est reprise.

---

## i18n (`src/lib/translations.ts` — fr, en, th)

Nouvelle entrée dans les 3 locales, même forme que les questions existantes. **Labels qualitatifs uniquement — aucun chiffre, aucun symbole monétaire** (contrainte SIMU-06/SIMU-08, voir Périmètre). Les identifiants internes (`'budget-0-500'`, etc.) gardent des chiffres dans leur nom de `value` — ce sont des clés internes de `questions.ts`, jamais rendues à l'écran, donc hors de portée de `PRICE_PATTERN`/`SIMU_PRICE_PATTERN` (qui ne scannent que `translations.ts`).

Copie FR de référence (EN/TH à traduire à l'identique du reste du fichier, même ton que les questions existantes) :

```ts
budget: {
  text: 'Quel budget avez-vous en tête pour ce projet ?',
  hint: 'Une estimation suffit — elle nous aide à cadrer une recommandation réaliste.',
  options: {
    'budget-0-500': 'Budget serré, je découvre les options',
    'budget-500-1500': 'Budget modéré, prêt à investir raisonnablement',
    'budget-1500-3000': 'Budget confortable, je veux un vrai résultat',
    'budget-3000-plus': 'Budget conséquent, sans limite stricte',
  },
},
```

Aucun changement de copie pour `presence-en-ligne` / `site-fiabilite` / `priorite` (les icônes s'ajoutent au texte existant, ne le remplacent pas).

---

## Tests

- `questions.test.ts` : borne D-02 (`QUESTIONS.length` entre 3 et 5) relevée à 6, avec commentaire documentant l'extension délibérée ; `LOCKED_QUESTION_IDS` et les fixtures `FULL_PATH_ANSWERS`/`SKIPPED_PATH_ANSWERS` mises à jour pour inclure `budget` ; cas pour `budget` (présence des 4 options, `weights` corrects, absence de `severity`).
- `scoring.test.ts` : une réponse `budget` contribue à `computeRecommendedServices` mais jamais à `computeVisualScore`.
- `wizardSteps.test.ts` : `FULL_PATH_ANSWERS`/`SKIPPED_PATH_ANSWERS` gagnent une réponse `budget`, sinon `progressRatio` ne vaut plus 1 une fois "tout" répondu (5 → 6 questions applicables par défaut) ; `progressRatio`/`applicableQuestionIds` restent corrects sans changement de logique.
- `translations.test.ts` : la nouvelle entrée `budget` dans les 3 locales doit passer le test existant "no price, tariff, currency or free-of-charge language" sans modification du test lui-même — c'est une contrainte que la copie doit respecter, pas l'inverse.
- Nouveau test Wizard (rendu) : interaction sur le slider `variant: 'range'` → la valeur stockée correspond au palier sélectionné ; rendu `variant: 'mood'` → sélection change bien `aria-checked` ; rendu `variant: 'cards'` → icône affichée quand `option.icon` est défini, absente sinon (pas de crash).
- `styles.test.ts` (si existant couvre des assertions de classes CSS) : vérifier que les nouvelles classes (`sim-option-icon-grid`, `sim-mood-row`, `sim-range-*`) sont bien appliquées selon le variant.

---

## Risques / points de vigilance

- Icônes manquantes dans `SIM_ICONS` pour un nom référencé dans `questions.ts` : traité comme un no-op (pas d'icône), jamais une exception — à couvrir par un test.
- L'ajout de la question `budget` change le total de questions comptées par `applicableQuestionIds` — tout test qui hardcode "5 questions" doit être mis à jour.
- Accessibilité du slider `range` : le `<input type="range">` natif porte déjà focus/clavier ; ajouter un `aria-valuetext` avec le libellé du palier courant (pas seulement la valeur numérique 0-3) pour les lecteurs d'écran.
