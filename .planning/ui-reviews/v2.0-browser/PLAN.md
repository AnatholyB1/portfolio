# Audit UX/UI navigateur réel — milestone v2.0 (desktop + mobile)

Statut : PLAN (discuss + research faits, exécution non lancée). Date : 2026-10-14.

## Décisions (discuss)
- Cible : prod (sevalys.com). Lecture seule stricte : aucun formulaire soumis, aucun lead créé, aucune action destructive.
- Livrable : audit + plan de correctifs. Les correctifs = phase d'exécution séparée, validée par l'utilisateur.
- Cadrage : re-audit navigateur réel + vérification des correctifs de l'audit code-only du 2026-10-08 (.planning/ui-reviews/v2.0/SUMMARY.md, 10 thèmes, 5 rapports).

## Constat de recherche (bloquant à lever)
- `master` est **27 commits en avance sur `origin/master`** : les correctifs UI du 2026-10-09 (et probablement la release Phase 19, 19-12 restée PARTIAL) ne sont PAS en prod.
- Conséquence : auditer la prod = auditer l'état d'avant correctifs. Il faut soit pousser/promouvoir d'abord (action sortante, à valider), soit auditer la preview/local pour la vérification des correctifs, et la prod pour l'état réel livré.
- Les zones privées (/admin, /espace-client) exigent une session OTP par e-mail. Comptes de test permanents : client « Test E2E Sèvalys » + admin contact@sevalys.com (voir mémoire). Il faut que l'utilisateur fournisse/valide l'accès (code OTP reçu par mail) ; sans session, ces zones restent en audit code + captures des états déconnectés.

## Surfaces (src/app)
| Lot | Routes |
|---|---|
| A. Public v2 | /, /services, /services/[slug], /simulateur, /calculateur-roi, /demo, /avis, /politique-des-avis, /mentions-legales, /desinscription, bannière cookies/consentement, 404 |
| B. Auth + avis | /connexion (email + code), /auth/confirm, /avis/[token] (formulaire + merci) |
| C. Portail client | /espace-client, /documents/[id] (signature), /paiements |
| D. Admin pilotage | /admin, /leads, /leads/[id], /entonnoir, /projets, /projets/[id], /pilotage, /pilotage/couts |
| E. Admin ops | /admin/avis, /emails, /liens |

Viewports : mobile 360x740 et 390x844, tablette 768, desktop 1280 et 1440. Thèmes/états : chargement, vide, erreur, focus clavier, reduced-motion.

## Phases (miroir GSD)
1. **Discuss / Research** (fait) : périmètre, surfaces, contraintes ci-dessus.
2. **Plan** (ce document) : grille d'audit commune + répartition par agent.
3. **Execute (audit, lecture seule)** : 5 sous-agents en parallèle, un par lot A–E, navigateur réel via Claude in Chrome, captures dans `.planning/ui-reviews/v2.0-browser/shots/` (déjà ignorées par git). Chacun produit `<lot>-REVIEW.md`.
   - Skills : `critique`, `audit`, `impeccable`, `web-design-guidelines`, `polish`, `typeset`, `layout`, `adapt`, `design-systems:accessibility-audit`, `ui-design:responsive-audit`. Perf : `vercel:performance-optimizer` sur le lot A.
   - Grille commune : 6 piliers gsd-ui-auditor (copy, visuels, couleur, typo, espacement, UX) /24 + a11y WCAG AA (contraste mesuré, cibles 44px, clavier, lecteur d'écran) + responsive (overflow, nav, tableaux) + vérification point par point des 10 thèmes de l'audit précédent (corrigé / toujours présent / régression).
   - Sévérité : BLOCKER / MAJOR / MINOR, avec capture, viewport, sélecteur ou fichier:ligne.
4. **Verify / consolider** : un agent de synthèse dédoublonne, note chaque lot, trace delta vs audit du 10-08 → `SUMMARY.md` + plan de correctifs priorisé (phases GSD proposées).
5. **Correctifs** : hors périmètre tant que tu n'as pas validé le plan.

## Garde-fous
- Aucune soumission de formulaire, aucun envoi d'e-mail, aucun paiement/signature, aucune modif de données (client de test conservé tel quel).
- Pas de push/déploiement sans accord explicite.
- Agents en lecture seule sur le code (pas d'Edit) ; seuls leurs rapports et captures sont écrits.

## À valider avant lancement
1. Push de master + promotion (ou audit de la preview Vercel pour les correctifs) ?
2. Accès aux sessions admin et client de test (OTP) : tu relaies le code, ou audit déconnecté + code seulement pour le privé ?
