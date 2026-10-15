# Plan de correctifs UX/UI (issu de SUMMARY.md) — 2026-10-14

Exécution : sous-agents en worktrees isolés, commits atomiques, tests + tsc + build verts avant fusion. AUCUN push/déploiement sans accord explicite. Pas d'écriture en base de prod.

## Vagues (domaines de fichiers disjoints dans une même vague)
- **Vague 1** (parallèle)
  - W1 « Cohérence du parcours » (P1) : `resolveWaiting` pur (+ test), portail/liste/fiche admin/file « À traiter », statut documents du devis v2 (investiguer: données vs rendu, ne corriger que le rendu), confirmations F-D5 + texte `revokeBody` + vidage de la note, message F-X1, 404 portail pour routes inconnues sous /espace-client et /admin.
  - W3 « Accessibilité publique + finitions publiques » : labels/autocomplete/aria-live du formulaire de contact, noms accessibles du calculateur ROI, focus trap du menu mobile, /demo (tel:, `<main>`, titre, contraste), 404 publique, soulignement du lien e-mail /avis/<jeton>, titres dupliqués, skip links, copy (Work, pièce(s), simulateur « 4–5 questions » vs « sur 6 »), cibles 44 px publiques, reduced-motion, dialogue cookies moins envahissant sur mobile.
  - Critique visuelle (lecture seule): fluidité et embellissement, réponse à « a-t-on embelli ? ».
- **Vague 2** W2 « Responsive » (P2) : conteneur à défilement des tableaux admin, /espace-client/paiements 768–960, tuiles KPI, graphique de trésorerie, `<select>` (F-D8/F-E5), pagination page=999 en état vide ; tests Playwright de non-régression aux 6 viewports (hors repo ou en devDependency seulement si validé).
- **Vague 3** W4 « Accessibilité admin/portail + finitions » : F-D6 (menu de statut), F-D7 (panneau Perdu → ConfirmAction), F-E3 / Réactiver / Invalider (focus + annonce), F-C4, F-C8, F-C9, F-C13, liens contact 44 px, forme juridique (libellé et non code INSEE), tirets cadratins, nom client tronqué.
- **Vague 4** (selon critique visuelle) : fluidité + finition visuelle, validée par l'utilisateur avant exécution.

## Règles communes
- Lire d'abord SUMMARY.md et le(s) rapport(s) concerné(s) du dossier. Respecter UI-SPEC des phases et les tokens existants.
- Chaque correctif : test (vitest) quand c'est de la logique ; sinon vérification Playwright aux viewports concernés (script hors repo dans le scratchpad pw).
- Vérifier avant fusion : `rtk tsc --noEmit`, `rtk vitest run`, `rtk next build`.
- Hors périmètre : migrations, Stripe, e-mails réels, données.
